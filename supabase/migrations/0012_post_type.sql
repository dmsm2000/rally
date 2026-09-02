-- Adds an optional category tag to posts (see PostType in feed.model.ts). Text/check, not an
-- enum, per this project's convention for fixed-choice columns (see CLAUDE.md).
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

alter table public.posts
  add column type text check (type in ('outfit', 'material', 'highlight', 'spot', 'other'));
