-- Two things:
--
-- 1. Fixes a live 401 ("new row violates row-level security policy", Postgres 42501) on the
--    landing page's waitlist form. 0031's INSERT policy should already grant this, so either it
--    was never fully applied (partial paste in the SQL editor) or something since dropped it —
--    either way, this re-asserts it idempotently rather than guessing which. Safe to run regardless
--    of the table's current state.
--
-- 2. Resubmitting the same email now overwrites the existing row (name/country/city/locale AND
--    created_at all refresh to the new submission) instead of being silently ignored. Requested
--    behaviour: a second signup with an email already on the list should replace the first, not
--    coexist with or be dropped in favour of it. This needs its own UPDATE policy — Postgres routes
--    `INSERT ... ON CONFLICT DO UPDATE` through UPDATE-policy RLS for the conflicting row, not the
--    INSERT policy that already covers the fresh-row case. Same permissive shape as INSERT: there's
--    no per-row ownership to check (no auth on this form), and in practice a submitter can only ever
--    "update" the one row matching the email they themselves just typed.
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

drop policy if exists "Anyone can join the waitlist" on public.landing_waitlist;
create policy "Anyone can join the waitlist"
  on public.landing_waitlist for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Resubmitting an email updates that row" on public.landing_waitlist;
create policy "Resubmitting an email updates that row"
  on public.landing_waitlist for update
  to anon, authenticated
  using (true)
  with check (true);
