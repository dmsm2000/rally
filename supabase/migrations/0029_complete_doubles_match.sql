-- Lets a doubles match be marked finished, so its players capture the court they played on.
--
-- Until now complete_match only accepted player_a/player_b, which for a doubles row means only the
-- creator (player_b stays permanently null for doubles — see 0021_doubles_matches.sql). So four
-- people could play a real match at a registered court and none of them would capture it, because
-- the match never left 'upcoming'. This widens the participant check to the match_participants
-- roster, exactly the way cancel_match was widened in 0021.
--
-- Deliberately NOT team assignment: a doubles match can only be completed with no winner, since
-- there are still no sides to declare one between. `p_winner` is forced null for doubles here
-- rather than left to the client, so a nonsensical "player_a won a doubles match" can't be written
-- even by a caller that tries.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

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
      and (
        player_a = auth.uid()
        or player_b = auth.uid()
        or exists (
          select 1 from public.match_participants mp
          where mp.match_id = id and mp.player_id = auth.uid()
        )
      )
      -- Singles: an optional winner, who must be one of the two players. Doubles: no winner at all.
      and (
        case
          when format = 'Doubles' then p_winner is null
          else p_winner is null or p_winner in (player_a, player_b)
        end
      )
    returning * into result;
  if result.id is null then
    raise exception 'match cannot be completed';
  end if;

  -- Unchanged from 0028_matches_court_fk.sql: playing a match at a registered court captures it,
  -- for everyone who played, without confirming the venue (accuracy_m stays null, and null never
  -- satisfies the <= 100 corroboration test). Only reachable on completion, so a cancelled match
  -- still captures nothing.
  if result.court_id is not null then
    select v.* into venue from public.venues v
      join public.courts c on c.venue_id = v.id
      where c.id = result.court_id;

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
