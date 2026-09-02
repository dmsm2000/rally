-- Retroactively documents "show me around" trip intents (see PRODUCT.md / TripsRepository) as a
-- proper migration. `trip_intents` and `trip_hosts` were originally created by hand in the Supabase
-- SQL editor and never committed, so this file's job is to bring the schema under version control —
-- every statement is written to be safe to run even if the tables/policies already exist.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table if not exists public.trip_intents (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles (id) on delete cascade,
  destination_country text not null,
  destination_city text not null,
  from_date date not null,
  to_date date not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint trip_intents_date_range check (to_date >= from_date)
);

create table if not exists public.trip_hosts (
  trip_intent_id uuid not null references public.trip_intents (id) on delete cascade,
  host_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trip_intent_id, host_id)
);

alter table public.trip_intents enable row level security;
alter table public.trip_hosts enable row level security;

-- Openly readable, same as posts/discover_profiles — observers browse trips read-only, and any
-- signed-in player can see open trips to a country to decide whether to volunteer to host.
drop policy if exists "Anyone can view trip intents" on public.trip_intents;
create policy "Anyone can view trip intents"
  on public.trip_intents for select
  using (true);

drop policy if exists "Users can publish their own trip intents" on public.trip_intents;
create policy "Users can publish their own trip intents"
  on public.trip_intents for insert
  to authenticated
  with check (player_id = auth.uid());

drop policy if exists "Users can delete their own trip intents" on public.trip_intents;
create policy "Users can delete their own trip intents"
  on public.trip_intents for delete
  to authenticated
  using (player_id = auth.uid());

drop policy if exists "Anyone can view trip hosts" on public.trip_hosts;
create policy "Anyone can view trip hosts"
  on public.trip_hosts for select
  using (true);

drop policy if exists "Users can volunteer as themselves" on public.trip_hosts;
create policy "Users can volunteer as themselves"
  on public.trip_hosts for insert
  to authenticated
  with check (host_id = auth.uid());
