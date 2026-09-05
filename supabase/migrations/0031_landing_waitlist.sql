-- Waitlist signups from the public landing page (separate `rally-landing` project/repo, same
-- Supabase project). Deliberately its own table, unrelated to `profiles`: someone joining the
-- waitlist has no account and may never make one before the launch event. This table is mute by
-- design — nobody reads it back from the client, only the project owner via the Supabase dashboard.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table public.landing_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 320 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name text check (name is null or char_length(name) <= 120),
  -- Picked via the same `ui-autocomplete` + @countrystatecity/countries-browser pattern as `rally`
  -- itself (copied, not shared — separate Angular workspace), stored as plain text either way. Both
  -- optional: they inform where to seed the launch, but neither blocks joining like email/name do.
  country text check (country is null or char_length(country) <= 120),
  city text check (city is null or char_length(city) <= 120),
  locale text not null default 'pt' check (locale in ('pt', 'en', 'es')),
  created_at timestamptz not null default now()
);

-- One row per email: resubmitting the form (or an eager double-click) is a no-op, not a second lead.
create unique index landing_waitlist_email_idx on public.landing_waitlist (lower(email));

alter table public.landing_waitlist enable row level security;

-- Anyone can join, signed in or not — the landing page has no auth of its own. No select/update/
-- delete policies: a public form has no business reading back who else signed up, so the only way
-- to read this table is the Supabase dashboard as the project owner.
create policy "Anyone can join the waitlist"
  on public.landing_waitlist for insert
  to anon, authenticated
  with check (true);
