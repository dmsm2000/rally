-- Registration profile data (see ProfileRepositoryService / AuthService.register()).
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- Fixed-choice fields are plain text here (not Postgres enums) — the TypeScript union types in
-- core/data/player-profile-options.ts / core/models already constrain what the frontend can send,
-- and plain text avoids an `ALTER TYPE` migration every time a choice list changes.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Auto-incrementing club membership number (identity = the DB assigns it, callers never set it), starts at 0.
  member_number int generated always as identity (start with 1),
  first_name text not null,
  last_name text not null,
  -- age/years/max_distance_km are numbers, not label sets, so a CHECK constraint fits better than an enum.
  age int check (age between 0 and 110),
  gender text,
  dominant_hand text,
  backhand text,
  city text,
  country text,
  max_distance_km int check (max_distance_km in (5, 10, 20, 50, 100)),
  level text,
  years int check (years between 0 and 40),
  play_style text,
  format text,
  surface text,
  court_pref text,
  frequency text,
  coached boolean,
  coached_frequency text,
  times_of_day text[],
  availability text[],
  bio text,
  avatar_seed text,
  avatar_style text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Each user can only ever see/create/edit their own row (id = their auth uid).
create policy "Profiles are viewable by their owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);
