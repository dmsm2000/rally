-- Links a real feed post to the open match it announces (see MatchesRepository.createOpenMatch(),
-- which inserts one right after creating the match) — mirrors 0016_posts_trip_link.sql exactly.
-- One post per match: the unique constraint means a second attempt to link a post to the same
-- match fails loudly instead of creating a duplicate announcement. Direct-invite matches never get
-- a linked post (they're private between the two players), so match_id stays null for those.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

alter table public.posts
  add column match_id uuid references public.matches (id) on delete cascade,
  add constraint posts_match_id_unique unique (match_id);

-- A match announcement post carries no text/media of its own — its content is rendered from the
-- linked match — so the content check needs to allow that too.
alter table public.posts drop constraint posts_has_content;
alter table public.posts
  add constraint posts_has_content
  check (char_length(btrim(text)) > 0 or media_url is not null or trip_intent_id is not null or match_id is not null);
