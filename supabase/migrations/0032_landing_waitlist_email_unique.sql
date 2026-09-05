-- Fixes a 400 from the landing page's very first live submission: PostgREST's `on_conflict=email`
-- upsert needs a unique constraint/index on the literal `email` column to build `ON CONFLICT
-- (email)`. 0031's index was on `lower(email)` instead — a different expression, so Postgres
-- reports "no unique or exclusion constraint matching the ON CONFLICT specification" (42P10),
-- which PostgREST surfaces as 400 Bad Request. Swapping to a plain unique index on `email` fixes
-- the upsert; case-insensitive dedup is preserved anyway because `Waitlist.join()` lowercases the
-- address client-side before sending, and this table has no other writer.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

drop index if exists public.landing_waitlist_email_idx;
create unique index landing_waitlist_email_idx on public.landing_waitlist (email);
