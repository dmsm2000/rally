-- Lets a participant mark an upcoming match complete without declaring a winner — not every match
-- is competitive (a Training/HittingSession/PracticeMatch session has no result to log), so the
-- match detail page's new "log result" flow offers a "no result" option alongside picking a winner.
-- Re-declares complete_match (not edited in place, see CLAUDE.md's migration rules) with p_winner
-- now optional; p_sets was already optional. `p_winner is null or p_winner in (player_a, player_b)`
-- replaces the old bare `in` check, since `null in (...)` is never true in SQL and would otherwise
-- always reject a no-winner completion.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create or replace function public.complete_match(p_match_id uuid, p_winner uuid default null, p_sets jsonb default null)
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
      and (p_winner is null or p_winner in (player_a, player_b))
    returning * into result;
  if result.id is null then
    raise exception 'match cannot be completed';
  end if;
  return result;
end;
$$;

grant execute on function public.complete_match(uuid, uuid, jsonb) to authenticated;
