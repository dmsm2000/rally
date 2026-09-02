-- Doubles matches, v1: an open match can be joined by up to 4 players, tracked as a plain roster
-- in match_participants with no team assignment (that's a deliberate follow-up, see PRODUCT.md /
-- CLAUDE.md). Direct invites stay singles-only. Follows the trip_hosts precedent (0015) for the
-- simple join-table shape, and accept_open_match's row-locking precedent (0018) for the
-- capacity-checked join RPC.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table public.match_participants (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

alter table public.match_participants enable row level security;

-- Same visibility as the parent match (open matches are visible to everyone; direct ones only to
-- their two participants) — doubles rows are always kind='open' in practice, but this stays
-- consistent with matches' own select policy rather than assuming that.
create policy "Participants visible with the parent match"
  on public.match_participants for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.player_a = auth.uid() or m.player_b = auth.uid() or m.kind = 'open')
    )
  );

create policy "Users can add themselves as a participant"
  on public.match_participants for insert
  to authenticated
  with check (player_id = auth.uid());

-- Leaving is only safe/offered while the roster isn't full yet — once a doubles match is
-- confirmed (status flips to 'upcoming' at 4/4), cancel_match is the only way out, same as singles.
create policy "Participants can leave a still-open match"
  on public.match_participants for delete
  to authenticated
  using (player_id = auth.uid() and exists (select 1 from public.matches m where m.id = match_id and m.status = 'open'));

-- Capacity-checked join: locks the match row first (mirrors accept_open_match's race handling),
-- then checks not-already-joined and count < 4, inserts, and flips the match to 'upcoming' once
-- the 4th player joins.
create or replace function public.join_doubles_match(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.matches;
  participant_count integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into result from public.matches
    where id = p_match_id and kind = 'open' and format = 'Doubles' and status = 'open'
    for update;
  if result.id is null then
    raise exception 'match no longer available';
  end if;

  if exists (select 1 from public.match_participants where match_id = p_match_id and player_id = auth.uid()) then
    raise exception 'already joined';
  end if;

  select count(*) into participant_count from public.match_participants where match_id = p_match_id;
  if participant_count >= 4 then
    raise exception 'match is full';
  end if;

  insert into public.match_participants (match_id, player_id) values (p_match_id, auth.uid());

  if participant_count + 1 = 4 then
    update public.matches set status = 'upcoming', confirmed_at = now() where id = p_match_id returning * into result;
  end if;

  return result;
end;
$$;

grant execute on function public.join_doubles_match(uuid) to authenticated;

-- Re-declared (not edited in place) to also let any already-joined doubles participant cancel a
-- confirmed match, not just player_a/player_b — mirrors the existing upcoming-match branch.
create or replace function public.cancel_match(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.matches;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.matches
    set status = 'cancelled', cancelled_by = auth.uid()
    where id = p_match_id
      and (
        (status in ('pending', 'open') and player_a = auth.uid())
        or (status = 'upcoming' and (
          player_a = auth.uid() or player_b = auth.uid()
          or exists (select 1 from public.match_participants mp where mp.match_id = id and mp.player_id = auth.uid())
        ))
      )
    returning * into result;
  if result.id is null then
    raise exception 'match cannot be cancelled';
  end if;
  return result;
end;
$$;

grant execute on function public.cancel_match(uuid) to authenticated;

alter publication supabase_realtime add table public.match_participants;
