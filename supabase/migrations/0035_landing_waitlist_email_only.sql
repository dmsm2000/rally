-- The landing page form was simplified to ask only for an email - name/country/city never shipped
-- past a couple of live tests, so there's no real data to preserve here. Drops the columns and
-- redefines `join_waitlist` down to just (email, locale). Since the parameter list changes, the old
-- 5-arg overload is dropped explicitly rather than left behind as dead, ambiguous-looking cruft.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

drop function if exists public.join_waitlist(text, text, text, text, text);

alter table public.landing_waitlist
  drop column if exists name,
  drop column if exists country,
  drop column if exists city;

create or replace function public.join_waitlist(
  p_email text,
  p_locale text default 'pt'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.landing_waitlist (email, locale, created_at)
  values (lower(trim(p_email)), p_locale, now())
  on conflict (email) do update set
    locale = excluded.locale,
    created_at = excluded.created_at;
end;
$$;

grant execute on function public.join_waitlist(text, text) to anon, authenticated;
