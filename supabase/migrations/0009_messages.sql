-- Real-time direct messaging between two registered players.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- One row per participant pair. user_a < user_b is enforced so a pair only ever has one
-- canonical row regardless of who started the conversation (see ensure_conversation() below).
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint conversations_user_order check (user_a < user_b),
  constraint conversations_unique_pair unique (user_a, user_b)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- Per-participant read cursor — avoids a single shared "unread" counter, so each side's
-- unread count is correct independently (and survives reading from multiple devices).
create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_reads enable row level security;

create policy "Participants can view their conversations"
  on public.conversations for select
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "Participants can start a conversation"
  on public.conversations for insert
  with check (auth.uid() = user_a or auth.uid() = user_b);

create policy "Participants can view their messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.user_a or auth.uid() = c.user_b)
    )
  );

create policy "Participants can send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.user_a or auth.uid() = c.user_b)
    )
  );

create policy "Users can view their own read state"
  on public.conversation_reads for select
  using (user_id = auth.uid());

create policy "Users can upsert their own read state"
  on public.conversation_reads for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_reads.conversation_id
        and (auth.uid() = c.user_a or auth.uid() = c.user_b)
    )
  );

create policy "Users can update their own read state"
  on public.conversation_reads for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Finds (or atomically starts) the conversation between the caller and another player. Keeps the
-- user_a < user_b canonical-ordering rule server-side instead of duplicating it in the frontend.
create or replace function public.ensure_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  lo uuid := least(auth.uid(), other_user_id);
  hi uuid := greatest(auth.uid(), other_user_id);
  conversation_id uuid;
begin
  if auth.uid() is null or other_user_id is null or auth.uid() = other_user_id then
    raise exception 'invalid conversation participants';
  end if;

  insert into public.conversations (user_a, user_b)
  values (lo, hi)
  on conflict (user_a, user_b) do nothing;

  select id into conversation_id from public.conversations where user_a = lo and user_b = hi;
  return conversation_id;
end;
$$;

grant execute on function public.ensure_conversation(uuid) to authenticated;

-- Keeps conversations.last_message_at current for list ordering. Runs as the function owner
-- (security definer), so it works even though clients have no UPDATE policy on conversations.
create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_insert on public.messages;
create trigger on_message_insert
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- Lets Realtime stream inserts to subscribers (still filtered per-subscriber by the RLS policies above).
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
