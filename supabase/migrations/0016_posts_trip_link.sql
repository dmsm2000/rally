-- Links a real feed post to the trip intent it announces (see TripsRepository.publish(), which
-- inserts one right after creating the trip). One post per trip: the unique constraint means a
-- second attempt to link a post to the same trip fails loudly instead of creating a duplicate
-- announcement. Existing posts (trip_intent_id null) are unaffected, and the existing
-- `public.posts` Realtime publication (0013) already covers these — no extra publication needed.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

alter table public.posts
  add column trip_intent_id uuid references public.trip_intents (id) on delete cascade,
  add constraint posts_trip_intent_id_unique unique (trip_intent_id);

-- A trip announcement post carries no text/media of its own — its content is rendered from the
-- linked trip intent — so the original "must have text or media" check needs to allow that too.
alter table public.posts drop constraint posts_has_content;
alter table public.posts
  add constraint posts_has_content
  check (char_length(btrim(text)) > 0 or media_url is not null or trip_intent_id is not null);
