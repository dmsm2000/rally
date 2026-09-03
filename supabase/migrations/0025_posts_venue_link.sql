-- Links a real feed post to the venue it announces. Mirrors 0016_posts_trip_link.sql and
-- 0019_posts_match_link.sql exactly, with one deliberate difference: this post is not inserted by
-- the client.
--
-- A trip or open-match announcement is written by the same person who created the thing, so the
-- client can insert it under posts' own "author_id = auth.uid()" policy. A venue announcement is
-- triggered by the *second* player — whoever's on-site confirmation tips it over — while its author
-- is the discoverer. No client could insert that row, so promote_venue_if_confirmed() is
-- re-declared below to do it.
--
-- That function is the single place a venue ever goes from draft to live (both register_court() and
-- check_in_court() delegate to it), which is exactly why the announcement belongs there: it cannot
-- then be forgotten on one of the two confirmation paths. And because it only fires on promotion,
-- the announcement structurally cannot exist before a place has been corroborated. That is the
-- whole point — registering earns nothing, being confirmed does.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

alter table public.posts
  add column venue_id uuid references public.venues (id) on delete cascade,
  add constraint posts_venue_id_unique unique (venue_id);

-- A venue announcement carries no text/media of its own — it renders from the linked venue — so the
-- content check has to allow that, same as trips (0016) and matches (0019) before it.
alter table public.posts drop constraint posts_has_content;
alter table public.posts
  add constraint posts_has_content
  check (
    char_length(btrim(text)) > 0
    or media_url is not null
    or trip_intent_id is not null
    or match_id is not null
    or venue_id is not null
  );

-- Re-declared (never edited in place) to publish the announcement at the moment a draft is promoted.
-- Everything else is identical to 0024_venues_and_courts.sql.
create or replace function public.promote_venue_if_confirmed(p_venue_id uuid)
returns public.venues
language plpgsql
security definer
set search_path = public
as $$
declare
  venue public.venues;
begin
  select * into venue from public.venues where id = p_venue_id;
  if venue.status = 'draft' and venue.confirmations >= 2 then
    update public.venues set status = 'live', verified_at = now()
      where id = p_venue_id returning * into venue;

    -- Credited to the discoverer, not to whoever confirmed it. An orphaned venue (its author
    -- deleted their account — see venues.created_by's SET NULL) simply gets no announcement.
    if venue.created_by is not null then
      insert into public.posts (author_id, venue_id, text)
      values (venue.created_by, venue.id, '')
      on conflict (venue_id) do nothing;
    end if;
  end if;
  return venue;
end;
$$;

grant execute on function public.promote_venue_if_confirmed(uuid) to authenticated;
