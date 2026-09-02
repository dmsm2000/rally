-- Real user-authored feed posts (text and/or a single photo or video), likes, and the storage
-- bucket that holds the media. Replying never creates a public comment — it opens a real DM
-- (see MessagesRepository) instead, so there is no "comments" table here at all.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- ============================================================================
-- Storage: feed-media bucket
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('feed-media', 'feed-media', true)
on conflict (id) do nothing;

-- Object key convention: {authorId}/{uuid}.{ext} — storage.foldername(name)[1] is the authorId.
create policy "Feed media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'feed-media');

create policy "Users can upload their own feed media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'feed-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own feed media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'feed-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- Posts
-- ============================================================================

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  text text not null default '' check (char_length(text) <= 2000),
  media_url text,
  media_type text check (media_type in ('image', 'video')),
  created_at timestamptz not null default now(),
  constraint posts_has_content check (char_length(btrim(text)) > 0 or media_url is not null)
);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.posts enable row level security;
alter table public.post_likes enable row level security;

-- Openly readable, same as trip_intents/discover_profiles — observers browse the feed read-only.
create policy "Anyone can view posts"
  on public.posts for select
  using (true);

create policy "Users can publish their own posts"
  on public.posts for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "Users can delete their own posts"
  on public.posts for delete
  to authenticated
  using (author_id = auth.uid());

-- Like counts are public, same reasoning as posts themselves.
create policy "Anyone can view likes"
  on public.post_likes for select
  using (true);

create policy "Users can like as themselves"
  on public.post_likes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can remove their own like"
  on public.post_likes for delete
  to authenticated
  using (user_id = auth.uid());
