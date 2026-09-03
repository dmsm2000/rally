-- Turns matches.court_id from the descriptive text placeholder it has been since 0018 into a real
-- reference to a registered court, now that courts exist. city/country stay denormalized for the
-- same reason as before: feed scoping and the match_open_nearby fan-out need one column to filter
-- on regardless of whether the composer picked a court or an area.
--
-- Also re-declares complete_match so finishing a match at a registered court captures it. This is
-- the exception to "one visit, one court" (0024, rule 3): actually playing a match somewhere is a
-- better claim to the place than walking past it, so it never spends the venue cooldown. It
-- deliberately does *not* count toward verifying the venue — accepting a completed match as a
-- second confirmation is the escape valve held in reserve for thinly populated areas, not v1.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- Any pre-existing value is a mock id like 'court-1' (the composer's court mode was disabled until
-- now, so in practice the column is null everywhere) — drop those rather than fail the cast.
update public.matches
  set court_id = null
  where court_id is not null
    and court_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

alter table public.matches alter column court_id type uuid using court_id::uuid;
alter table public.matches
  add constraint matches_court_id_fkey foreign key (court_id) references public.courts (id) on delete set null;

create index matches_court_idx on public.matches (court_id) where court_id is not null;

create or replace function public.complete_match(p_match_id uuid, p_winner uuid default null, p_sets jsonb default null)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.matches;
  venue public.venues;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.matches
    set status = 'complete', winner = p_winner, sets = p_sets
    where id = p_match_id and status = 'upcoming'
      and (player_a = auth.uid() or player_b = auth.uid())
      and (p_winner is null or p_winner in (player_a, player_b))
    returning * into result;
  if result.id is null then
    raise exception 'match cannot be completed';
  end if;

  if result.court_id is not null then
    select v.* into venue from public.venues v
      join public.courts c on c.venue_id = v.id
      where c.id = result.court_id;

    -- Everyone who played: both named players plus any doubles roster (0021). accuracy_m stays null
    -- on purpose — there is no GPS reading here, and null never satisfies the `<= 100` test that
    -- gates corroboration, so these rows capture without confirming.
    insert into public.court_checkins (court_id, venue_id, player_id, lat, lng, accuracy_m, source)
    select result.court_id, venue.id, p.player_id, venue.lat, venue.lng, null::double precision, 'match'
    from (
      select unnest(array_remove(array[result.player_a, result.player_b], null)) as player_id
      union
      select mp.player_id from public.match_participants mp where mp.match_id = result.id
    ) p
    on conflict (court_id, player_id) do nothing;

    update public.courts
      set capture_count = (select count(*) from public.court_checkins where court_id = result.court_id)
      where id = result.court_id;
  end if;

  return result;
end;
$$;

grant execute on function public.complete_match(uuid, uuid, jsonb) to authenticated;
