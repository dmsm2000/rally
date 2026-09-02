-- Adds an optional end time to matches, so a match can offer a flexible window ("any time between
-- 18:00 and 20:00 works") instead of only ever a single fixed start time. Null means a fixed
-- time, exactly like every row created before this migration.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

alter table public.matches
  add column match_time_end time,
  add constraint matches_time_range_valid check (match_time_end is null or match_time_end > match_time);
