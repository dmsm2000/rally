-- Community-wide "matches this week" for the matches hero, which was the last mock number left on
-- that page.
--
-- It has to be an RPC rather than a count query: matches' select policy (0018/0022) only shows a
-- viewer their own matches plus open ones, so counting client-side would report a number that
-- shrinks the fewer matches you personally have — the opposite of a community pulse. This returns a
-- single aggregate and never any row, so widening visibility this way leaks nothing about who is
-- playing whom.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create or replace function public.count_matches_this_week()
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::integer
  from public.matches
  where match_date between current_date - interval '7 days' and current_date
    and status <> 'cancelled';
$$;

-- Granted to anon too: observers see the same hero, and this exposes only a count.
grant execute on function public.count_matches_this_week() to authenticated, anon;
