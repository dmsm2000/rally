-- Post reports, mirroring 0027_court_reports.sql exactly — same mute-table reasoning: there is no
-- moderation screen yet and won't be until the backoffice exists, but the signal is worth
-- collecting from the day the feed can be shared publicly (see the public /posts/:id route), since
-- that is the point at which a post reaches people who never chose to follow anything.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid references public.profiles (id) on delete set null,
  reason text not null check (reason in ('spam', 'inappropriate', 'harassment', 'not_tennis', 'other')),
  note text check (note is null or char_length(note) <= 500),
  -- Set by the backoffice once it exists; until then every row simply stays open.
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index post_reports_open_idx on public.post_reports (created_at desc) where resolved_at is null;
-- One open report per player per post: reporting twice is a mis-tap, not a stronger signal. The
-- client leans on this rather than pre-checking — a 23505 comes back as "already reported".
create unique index post_reports_one_per_reporter_idx
  on public.post_reports (post_id, reporter_id)
  where resolved_at is null;

alter table public.post_reports enable row level security;

-- Reporters can see what they filed and nothing else. Reports are not public: a visible pile of
-- them on a post is itself a way to discredit one.
create policy "Reporters can view their own post reports"
  on public.post_reports for select
  to authenticated
  using (reporter_id = auth.uid());

create policy "Users can report posts as themselves"
  on public.post_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- No update/delete policies: a report is a record, and withdrawing one is a backoffice concern.
