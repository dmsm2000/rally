-- Court reports. Deliberately a mute table: there is no moderation screen yet, and there won't be
-- one until the backoffice exists. It ships now anyway because the signal it collects is not
-- reconstructible after the fact — 'no_longer_exists' in particular, since courts closing is the
-- main way a database like this rots, and nobody edits a listing to say a place shut down.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table public.court_reports (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts (id) on delete cascade,
  reporter_id uuid references public.profiles (id) on delete set null,
  reason text not null check (reason in ('no_longer_exists', 'duplicate', 'wrong_details', 'not_a_court', 'other')),
  note text check (note is null or char_length(note) <= 500),
  -- Set by the backoffice once it exists; until then every row simply stays open.
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index court_reports_open_idx on public.court_reports (created_at desc) where resolved_at is null;
-- One open report per player per court: reporting twice is a mis-tap, not a stronger signal.
create unique index court_reports_one_per_reporter_idx
  on public.court_reports (court_id, reporter_id)
  where resolved_at is null;

alter table public.court_reports enable row level security;

-- Reporters can see what they filed (so the UI can show "already reported") and nothing else.
-- Reports are not public: a visible pile of reports on a court is itself a way to discredit one.
create policy "Reporters can view their own reports"
  on public.court_reports for select
  to authenticated
  using (reporter_id = auth.uid());

create policy "Users can report as themselves"
  on public.court_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- No update/delete policies: a report is a record, and withdrawing one is a backoffice concern.
