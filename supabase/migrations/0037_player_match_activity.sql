-- Aggregate "how active is this player" signal for the real Match Score compatibility calculation
-- (see CLAUDE.md's Match Score entry) — pairing two players who both actually finish matches is a
-- better bet than pairing a prolific player with someone who has never completed one.
--
-- Has to be an RPC, not a client-side count: matches' select policy (0018/0022) only shows a
-- viewer their own matches plus open ones, so a viewer can't otherwise see how many matches a
-- *different* player has completed. This returns a single aggregate count and never a row, so
-- granting it for an arbitrary player id leaks nothing about who played whom — same reasoning as
-- count_matches_this_week() (0030).
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create or replace function public.player_match_activity(p_player_id uuid)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(distinct m.id)::integer
  from public.matches m
  left join public.match_participants mp on mp.match_id = m.id and mp.player_id = p_player_id
  where m.status = 'complete'
    and (m.player_a = p_player_id or m.player_b = p_player_id or mp.player_id = p_player_id);
$$;

-- Granted to anon too: observers never see Match Score client-side, but the function itself is a
-- harmless count and there is no reason to special-case the grant.
grant execute on function public.player_match_activity(uuid) to authenticated, anon;
