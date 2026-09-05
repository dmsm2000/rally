-- Replaces direct table RLS (0031/0033) with a single `security definer` RPC, the same pattern
-- `rally` itself uses everywhere a write needs more than plain RLS can safely express (see the
-- Courts/Matches RPCs in CLAUDE.md) — this is exactly that situation, confirmed by hand:
--
-- `INSERT ... ON CONFLICT (email) DO UPDATE` (what `resolution=merge-duplicates` compiles to)
-- keeps failing with 42501 "new row violates row-level security policy" even with a correct,
-- verified UPDATE policy (`using (true) with check (true)`) in place — plain INSERT and a plain
-- PATCH both work fine under the same policies, isolating the failure to the ON CONFLICT path
-- specifically. The fix Postgres actually wants here is read visibility into the conflicting row,
-- i.e. a SELECT policy — but `using (true)` for SELECT would make the whole waitlist (real emails)
-- readable by anyone with the published anon key, since RLS has no per-row scoping available for an
-- anonymous submitter with no session identity. That trade is not acceptable for a table whose
-- entire point is that nobody reads it back but the project owner.
--
-- A `security definer` function sidesteps this cleanly: it runs as its owner (which owns the table,
-- so it isn't subject to RLS at all — no `FORCE ROW LEVEL SECURITY` is set), so the anon caller never
-- needs read visibility into existing rows. `anon`/`authenticated` get EXECUTE on the function only;
-- no policy on the table lets them touch it directly any more.
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

drop policy if exists "Anyone can join the waitlist" on public.landing_waitlist;
drop policy if exists "Resubmitting an email updates that row" on public.landing_waitlist;

create or replace function public.join_waitlist(
  p_email text,
  p_name text default null,
  p_country text default null,
  p_city text default null,
  p_locale text default 'pt'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.landing_waitlist (email, name, country, city, locale, created_at)
  values (lower(trim(p_email)), nullif(trim(p_name), ''), nullif(trim(p_country), ''), nullif(trim(p_city), ''), p_locale, now())
  on conflict (email) do update set
    name = excluded.name,
    country = excluded.country,
    city = excluded.city,
    locale = excluded.locale,
    created_at = excluded.created_at;
end;
$$;

grant execute on function public.join_waitlist(text, text, text, text, text) to anon, authenticated;
