-- Adds public.post_likes to the Realtime publication, alongside public.posts (0013), so the feed
-- can reflect likes/unlikes and post deletions from other viewers live without a manual refresh.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

alter publication supabase_realtime add table public.post_likes;
