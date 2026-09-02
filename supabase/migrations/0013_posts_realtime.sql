-- Adds public.posts to the Realtime publication so the feed can notify viewers of new posts
-- live (see PostsRepository.subscribeToNewPosts), the same way messages/conversations already do
-- (migration 0009_messages.sql).
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

alter publication supabase_realtime add table public.posts;
