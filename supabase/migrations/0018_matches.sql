-- Real matches: direct invites (player A invites player B, who must accept/decline) and open
-- matches (anyone-can-join, later linked to a feed post — see 0019_posts_match_link.sql).
-- Every state transition beyond insert/delete goes through a security-definer RPC (mirrors
-- ensure_conversation() in 0009) rather than a generic client UPDATE policy, so a participant can
-- never rewrite status/winner/player_b outside a legitimate transition — see accept_open_match(),
-- respond_to_match_invite(), cancel_match(), complete_match() below.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct', 'open')),
  status text not null check (status in ('pending', 'open', 'upcoming', 'cancelled', 'complete')),
  player_a uuid not null references public.profiles (id) on delete cascade,
  player_b uuid references public.profiles (id) on delete cascade,
  format text not null check (format in ('Singles', 'Doubles')),
  session_type text check (session_type in ('Training', 'HittingSession', 'PracticeMatch', 'FullMatch')),
  -- Mock court reference (courts aren't real yet), purely descriptive.
  court_id text,
  -- Denormalized from the chosen mock court, or entered directly in radius mode — kept uniform so
  -- feed scoping (see 0019) and the match_open_nearby notification fan-out have one real column to
  -- filter on regardless of composer mode. Same rationale as trip_intents.destination_city/country
  -- (0015), which has no real "courts" table backing it either.
  city text not null,
  country text not null,
  radius_km integer,
  match_date date not null,
  match_time time not null,
  duration_minutes integer,
  note text,
  winner uuid references public.profiles (id) on delete set null,
  sets jsonb,
  -- Breadcrumbs so "declined" vs "you withdrew" vs "cancelled after confirming" can be told apart
  -- later without a bigger status enum.
  cancelled_by uuid references public.profiles (id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint matches_distinct_players check (player_a is distinct from player_b),
  constraint matches_direct_has_player_b check (kind <> 'direct' or player_b is not null)
);

create index matches_player_a_idx on public.matches (player_a);
create index matches_player_b_idx on public.matches (player_b);
create index matches_open_scope_idx on public.matches (kind, country, city) where kind = 'open';

alter table public.matches enable row level security;

-- Direct invites stay private to the two people involved; open-kind rows stay visible to everyone
-- forever (even once matched/cancelled/complete), same as trip_intents, so a linked feed post can
-- always hydrate and show an "already matched"/"cancelled" badge instead of disappearing.
create policy "Participants and open matches are visible"
  on public.matches for select
  to authenticated
  using (player_a = auth.uid() or player_b = auth.uid() or kind = 'open');

-- Pins the *initial* shape per kind so a client can't fabricate an already-confirmed/completed
-- match, or a direct invite with no invitee.
create policy "Users can create their own matches"
  on public.matches for insert
  to authenticated
  with check (
    player_a = auth.uid()
    and winner is null
    and cancelled_by is null
    and confirmed_at is null
    and (
      (kind = 'direct' and status = 'pending' and player_b is not null)
      or (kind = 'open' and status = 'open' and player_b is null)
    )
  );

-- Deliberately no UPDATE policy — every transition below goes through a security-definer RPC
-- instead, so status/winner/player_b can never be rewritten by a plain client .update() (mirrors
-- conversations, which also has no client update policy — only a security-definer trigger).

-- Only the creator, and only before/after commitment — not a confirmed 'upcoming' match (use
-- cancel_match for that) or a 'complete' one (history must survive).
create policy "Creators can delete their own uncommitted or cancelled matches"
  on public.matches for delete
  to authenticated
  using (player_a = auth.uid() and status in ('pending', 'open', 'cancelled'));

-- Resolves the open-match "first to accept wins" race: Postgres row locking serializes concurrent
-- UPDATEs, so a second racer's `status = 'open'` guard simply matches 0 rows once the first commits.
create or replace function public.accept_open_match(p_match_id uuid)
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
    set status = 'upcoming', player_b = auth.uid(), confirmed_at = now()
    where id = p_match_id and kind = 'open' and status = 'open' and player_a <> auth.uid()
    returning * into result;
  if result.id is null then
    raise exception 'match no longer available';
  end if;
  return result;
end;
$$;

grant execute on function public.accept_open_match(uuid) to authenticated;

-- Only the invitee (player_b, already known at insert time) can respond to a pending direct invite.
create or replace function public.respond_to_match_invite(p_match_id uuid, p_accept boolean)
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
    set status = case when p_accept then 'upcoming' else 'cancelled' end,
        confirmed_at = case when p_accept then now() else confirmed_at end,
        cancelled_by = case when p_accept then null else auth.uid() end
    where id = p_match_id and kind = 'direct' and status = 'pending' and player_b = auth.uid()
    returning * into result;
  if result.id is null then
    raise exception 'invite no longer available';
  end if;
  return result;
end;
$$;

grant execute on function public.respond_to_match_invite(uuid, boolean) to authenticated;

-- Withdraw (pending/open, creator only) or cancel a confirmed match (either participant).
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
        or (status = 'upcoming' and (player_a = auth.uid() or player_b = auth.uid()))
      )
    returning * into result;
  if result.id is null then
    raise exception 'match cannot be cancelled';
  end if;
  return result;
end;
$$;

grant execute on function public.cancel_match(uuid) to authenticated;

-- Winner-only for v1; `sets` accepted but unused by the UI until detailed stats entry ships.
create or replace function public.complete_match(p_match_id uuid, p_winner uuid, p_sets jsonb default null)
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
    set status = 'complete', winner = p_winner, sets = p_sets
    where id = p_match_id and status = 'upcoming'
      and (player_a = auth.uid() or player_b = auth.uid())
      and p_winner in (player_a, player_b)
    returning * into result;
  if result.id is null then
    raise exception 'match cannot be completed';
  end if;
  return result;
end;
$$;

grant execute on function public.complete_match(uuid, uuid, jsonb) to authenticated;

alter publication supabase_realtime add table public.matches;
