-- Player-maintained court database, v1. Two levels, because the dedupe radius only works that way:
-- a club with 8 courts is 8 rows all within ~20 m of each other, so a proximity duplicate check run
-- at court level would flag every legitimate second court in the same club. Geography therefore
-- lives on the venue (a club/park/hotel/condo); characteristics live on the court.
--
-- Three rules are enforced here rather than in the client, because the client can't be trusted with
-- any of them (same reasoning as matches' security-definer RPCs in 0018 — there are deliberately no
-- INSERT/UPDATE policies on these tables at all):
--   1. Registering requires being there: a GPS fix is mandatory, and its reported accuracy is
--      stored and checked. A laptop without GPS reports the ISP centroid (1-5 km out), so accepting
--      an unchecked reading would fill the table with courts registered from the sofa.
--   2. Existing requires corroboration: a venue stays 'draft' — invisible to everyone but its
--      author and to players standing next to it (see nearby_venues) — until 2 distinct players
--      have checked in with a good fix. Only then does it go 'live'.
--   3. One visit captures one court: GPS can't tell court 3 from court 4, so without a per-venue
--      cooldown someone stands at the gate and captures all 8 courts of a club at once.
--
-- Rule 2 is also what keeps the competition honest: since captures and the feed announcement only
-- count once a venue is verified (see 0025_posts_venue_link.sql), a fabricated court is never
-- corroborated, therefore never scores, therefore isn't worth fabricating.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- ============================================================================
-- Geo helpers (no PostGIS: a b-tree bounding box prefilter plus haversine is plenty at this scale,
-- and keeps the extension surface as small as the text-instead-of-enum choice made in 0001)
-- ============================================================================

create or replace function public.geo_distance_m(
  p_lat_a double precision, p_lng_a double precision,
  p_lat_b double precision, p_lng_b double precision
)
returns double precision
language sql
immutable
parallel safe
as $$
  select 12742000 * asin(
    sqrt(
      power(sin(radians(p_lat_b - p_lat_a) / 2), 2)
      + cos(radians(p_lat_a)) * cos(radians(p_lat_b)) * power(sin(radians(p_lng_b - p_lng_a) / 2), 2)
    )
  );
$$;

-- Case- and accent-insensitive name key for duplicate detection. translate() is character-based on
-- UTF-8, so this handles the Portuguese/Spanish accents that actually show up in club names without
-- pulling in the unaccent extension.
create or replace function public.normalize_name(p_text text)
returns text
language sql
immutable
parallel safe
as $$
  select lower(
    translate(
      btrim(coalesce(p_text, '')),
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
    )
  );
$$;

-- ============================================================================
-- Tables
-- ============================================================================

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  kind text not null default 'club' check (kind in ('club', 'public', 'hotel', 'condo', 'other')),
  city text not null,
  country text not null,
  flag text,
  access text check (access in ('free', 'paid', 'members', 'guest')),
  hours text,
  price text,
  facilities text[] not null default '{}',
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  -- The accuracy (metres) of the fix this venue was registered with, kept for the backoffice: a
  -- venue whose whole existence rests on a 900 m fix is worth a second look even once verified.
  registered_accuracy_m double precision,
  status text not null default 'draft' check (status in ('draft', 'live')),
  -- Distinct players who have checked in here with an accurate fix. Denormalized so the client can
  -- render "1/2 confirmations" without reading court_checkins, which stays private (see below).
  confirmations integer not null default 0,
  verified_at timestamptz,
  -- SET NULL, not CASCADE — unlike posts/matches/trip_intents, this row is not the author's: if the
  -- discoverer deletes their account the club must not vanish from the passport of everyone who
  -- played there. An orphaned venue simply has no editor left; reports cover the rest.
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.courts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  -- Free text, because "3", "Central" and "Court B" are all real court names in the wild.
  number text check (number is null or char_length(btrim(number)) between 1 and 40),
  surface text not null check (surface in ('Clay', 'Hard', 'Grass', 'Carpet')),
  indoor boolean not null default false,
  lights boolean not null default false,
  -- Distinct players who have captured this court. Denormalized for the same reason as
  -- venues.confirmations.
  capture_count integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Two courts numbered "3" in the same club are a duplicate; two unnumbered courts are not, so the
-- partial index deliberately skips nulls.
create unique index courts_venue_number_idx
  on public.courts (venue_id, public.normalize_name(number))
  where number is not null;

create table public.court_checkins (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts (id) on delete cascade,
  -- Denormalized from the court so the per-venue cooldown (rule 3) is a single-table lookup.
  venue_id uuid not null references public.venues (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy_m double precision,
  source text not null default 'visit' check (source in ('visit', 'match', 'registration')),
  created_at timestamptz not null default now()
);

-- A court is captured once and stays captured — re-visiting adds nothing to the collection, so the
-- player's passport count is simply their number of check-in rows.
create unique index court_checkins_once_per_court_idx on public.court_checkins (court_id, player_id);
create index court_checkins_player_idx on public.court_checkins (player_id);
create index court_checkins_venue_player_idx on public.court_checkins (venue_id, player_id, created_at desc);

-- Bounding-box prefilter for every proximity query below.
create index venues_lat_lng_idx on public.venues (lat, lng);
create index venues_live_scope_idx on public.venues (country, city) where status = 'live';
create index courts_venue_idx on public.courts (venue_id);

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.venues enable row level security;
alter table public.courts enable row level security;
alter table public.court_checkins enable row level security;

-- Live venues are public to observers too, the same way open matches became public in 0022 and
-- trip_intents/discover_profiles always were. Drafts reach nobody through the table: their only
-- route out is nearby_venues(), which requires being physically next to them.
create policy "Live venues are visible to everyone"
  on public.venues for select
  to authenticated, anon
  using (status = 'live' or created_by = auth.uid());

create policy "Courts are visible with their venue"
  on public.courts for select
  to authenticated, anon
  using (
    exists (
      select 1 from public.venues v
      where v.id = venue_id and (v.status = 'live' or v.created_by = auth.uid())
    )
  );

-- Check-ins are a location history, so unlike post_likes they are never public. The public counts
-- (venues.confirmations, courts.capture_count) exist precisely so nothing needs to read these rows.
create policy "Players can view their own check-ins"
  on public.court_checkins for select
  to authenticated
  using (player_id = auth.uid());

-- Deliberately no INSERT/UPDATE/DELETE policies on any of the three tables: every write goes
-- through a security-definer RPC below, so a client can never fabricate a 'live' venue, bump its
-- own confirmations, or backdate a check-in.

-- ============================================================================
-- Thresholds
-- ============================================================================
-- MAX_ACCURACY_M       100   Fixes worse than this can't corroborate anything (phone GPS outdoors
--                            is 5-50 m; wifi-only geolocation is 1-5 km).
-- MAX_REGISTER_ACC_M  2000   Above this the reading carries no information at all — refuse outright
--                            rather than create a draft that nobody will ever stand next to.
-- DEDUPE_RADIUS_M      250   Same-venue radius: name-similar hits here block softly.
-- CONTEXT_RADIUS_M    3000   Browse radius: "what's already registered around here?", never a block.
-- CHECKIN_RADIUS_M     250   How close you must be to capture a court.
-- COOLDOWN_HOURS        12   One venue, one capture per this window (rule 3).
-- VERIFY_CONFIRMATIONS   2   Distinct accurate check-ins that promote a draft to live.
-- DAILY_REGISTER_CAP     5   Courts one player can register per rolling 24 h.

-- ============================================================================
-- promote_venue_if_confirmed: the one place a venue ever goes public
-- ============================================================================
-- Both registration paths can confirm a venue — checking in at one of its courts, and adding a new
-- court to somebody else's draft while standing there — so the promotion lives here rather than
-- being written twice. 0025_posts_venue_link.sql re-declares this one function to also publish the
-- feed announcement, which keeps that side effect impossible to forget on either path.
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
  end if;
  return venue;
end;
$$;

-- ============================================================================
-- nearby_venues: the proximity funnel
-- ============================================================================
-- Returns live venues *and* drafts (flagged) within the radius. This one function is both the
-- duplicate check and the verification funnel: a draft is invisible everywhere else, so the only
-- way it ever gets confirmed is by surfacing to somebody standing next to it. A draft registered
-- from a sofa has coordinates kilometres away from the real court and therefore never surfaces to
-- anyone — it self-cleans.
create or replace function public.nearby_venues(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision default 3000
)
returns table (
  id uuid,
  name text,
  kind text,
  city text,
  country text,
  flag text,
  access text,
  hours text,
  price text,
  facilities text[],
  lat double precision,
  lng double precision,
  status text,
  confirmations integer,
  verified_at timestamptz,
  created_by uuid,
  created_at timestamptz,
  distance_m double precision,
  court_count integer,
  captured_count integer
)
language sql
security definer
set search_path = public
as $$
  select
    v.id, v.name, v.kind, v.city, v.country, v.flag, v.access, v.hours, v.price, v.facilities,
    v.lat, v.lng, v.status, v.confirmations, v.verified_at, v.created_by, v.created_at,
    public.geo_distance_m(p_lat, p_lng, v.lat, v.lng) as distance_m,
    (select count(*)::integer from public.courts c where c.venue_id = v.id) as court_count,
    (select count(*)::integer from public.court_checkins ci
      where ci.venue_id = v.id and ci.player_id = auth.uid()) as captured_count
  from public.venues v
  where
    -- Bounding box first so the index does the work; 111320 m is one degree of latitude, and the
    -- longitude degree shrinks with cos(lat) (floored so this stays sane near the poles).
    v.lat between p_lat - (p_radius_m / 111320.0) and p_lat + (p_radius_m / 111320.0)
    and v.lng between
      p_lng - (p_radius_m / (111320.0 * greatest(cos(radians(p_lat)), 0.01)))
      and p_lng + (p_radius_m / (111320.0 * greatest(cos(radians(p_lat)), 0.01)))
    and public.geo_distance_m(p_lat, p_lng, v.lat, v.lng) <= p_radius_m
  order by distance_m
  limit 50;
$$;

-- Authenticated only: drafts must not leak to anonymous browsing, and only signed-in players can
-- act on the result anyway. The public catalogue reads the table directly under RLS instead.
grant execute on function public.nearby_venues(double precision, double precision, double precision) to authenticated;

-- ============================================================================
-- register_court
-- ============================================================================
-- Returns either {"status":"candidates", "candidates":[...]} — the caller must show them and ask
-- "is it one of these?" before retrying with p_force — or {"status":"created", ...}. Searching
-- first is enforced here rather than in the dialog so it holds for any future client.
create or replace function public.register_court(
  p_lat double precision,
  p_lng double precision,
  p_accuracy_m double precision,
  p_surface text,
  p_venue_id uuid default null,
  p_venue_name text default null,
  p_venue_kind text default 'club',
  p_city text default null,
  p_country text default null,
  p_flag text default null,
  p_access text default null,
  p_hours text default null,
  p_price text default null,
  p_facilities text[] default '{}',
  p_number text default null,
  p_indoor boolean default false,
  p_lights boolean default false,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  venue public.venues;
  new_court public.courts;
  candidates jsonb;
  recent_count integer;
  accurate boolean;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_lat is null or p_lng is null then
    raise exception 'location required';
  end if;
  -- A reading this vague is the ISP's centroid, not a place. Creating a draft from it would only
  -- litter the table with rows nobody can ever stand next to.
  if p_accuracy_m is null or p_accuracy_m > 2000 then
    raise exception 'gps accuracy too low';
  end if;

  select count(*) into recent_count
    from public.courts
    where created_by = uid and created_at > now() - interval '24 hours';
  if recent_count >= 5 then
    raise exception 'daily limit reached';
  end if;

  accurate := p_accuracy_m <= 100;

  if p_venue_id is null then
    if btrim(coalesce(p_venue_name, '')) = '' or btrim(coalesce(p_city, '')) = ''
       or btrim(coalesce(p_country, '')) = '' then
      raise exception 'venue details required';
    end if;

    if not p_force then
      -- Soft block: only name-similar venues within 250 m. A plain 3 km radius would fire
      -- constantly — in Lisbon there are dozens of legitimate distinct venues that close.
      select jsonb_agg(to_jsonb(hit) order by hit.distance_m) into candidates
      from (
        select v.id, v.name, v.city, v.country, v.status,
               public.geo_distance_m(p_lat, p_lng, v.lat, v.lng) as distance_m
        from public.venues v
        where public.geo_distance_m(p_lat, p_lng, v.lat, v.lng) <= 250
          and (
            public.normalize_name(v.name) = public.normalize_name(p_venue_name)
            or (
              char_length(public.normalize_name(p_venue_name)) >= 4
              and (
                public.normalize_name(v.name) like '%' || public.normalize_name(p_venue_name) || '%'
                or public.normalize_name(p_venue_name) like '%' || public.normalize_name(v.name) || '%'
              )
            )
          )
      ) hit;

      if candidates is not null then
        return jsonb_build_object('status', 'candidates', 'candidates', candidates);
      end if;
    end if;

    insert into public.venues (
      name, kind, city, country, flag, access, hours, price, facilities,
      lat, lng, registered_accuracy_m, created_by
    )
    values (
      btrim(p_venue_name), coalesce(p_venue_kind, 'club'), btrim(p_city), btrim(p_country), p_flag,
      p_access, p_hours, p_price, coalesce(p_facilities, '{}'),
      p_lat, p_lng, p_accuracy_m, uid
    )
    returning * into venue;
  else
    -- Locked for the same reason as in check_in_court(): two players attaching a court to the same
    -- draft at once must not both read confirmations = 1 and each conclude they were the second.
    select * into venue from public.venues where id = p_venue_id for update;
    if venue.id is null then
      raise exception 'venue not found';
    end if;
    -- Adding a court to an existing venue is still a registration: you have to be there.
    if public.geo_distance_m(p_lat, p_lng, venue.lat, venue.lng) > 250 then
      raise exception 'too far from venue';
    end if;
  end if;

  begin
    insert into public.courts (venue_id, number, surface, indoor, lights, created_by)
    values (
      venue.id,
      nullif(btrim(coalesce(p_number, '')), ''),
      p_surface,
      coalesce(p_indoor, false),
      coalesce(p_lights, false),
      uid
    )
    returning * into new_court;
  exception when unique_violation then
    raise exception 'court already registered';
  end;

  -- The registrar's own check-in is the first one; it only counts toward verification if the fix
  -- was accurate, so a draft born from a poor fix needs two *other* players rather than one.
  insert into public.court_checkins (court_id, venue_id, player_id, lat, lng, accuracy_m, source)
  values (new_court.id, venue.id, uid, p_lat, p_lng, p_accuracy_m, 'registration');

  update public.courts set capture_count = capture_count + 1 where id = new_court.id;

  if accurate and not exists (
    select 1 from public.court_checkins
    where venue_id = venue.id and player_id = uid and accuracy_m <= 100 and court_id <> new_court.id
  ) then
    update public.venues set confirmations = confirmations + 1 where id = venue.id;
    -- Adding a court to somebody else's draft, on site and with a good fix, *is* a confirmation —
    -- so this path promotes (and announces) exactly like check_in_court's does.
    venue := public.promote_venue_if_confirmed(venue.id);
  end if;

  return jsonb_build_object(
    'status', 'created',
    'venue_id', venue.id,
    'court_id', new_court.id,
    'venue_status', venue.status,
    'confirmations', venue.confirmations
  );
end;
$$;

grant execute on function public.register_court(
  double precision, double precision, double precision, text, uuid, text, text, text, text, text,
  text, text, text, text[], text, boolean, boolean, boolean
) to authenticated;

-- ============================================================================
-- check_in_court: capture, and corroborate
-- ============================================================================
create or replace function public.check_in_court(
  p_court_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy_m double precision
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  court public.courts;
  venue public.venues;
  first_here boolean;
  was_draft boolean;
  just_verified boolean := false;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  -- Unlike registration, a vague check-in is refused outright: it can't corroborate anything, and
  -- letting it through would burn the player's one capture slot for this court on nothing.
  if p_accuracy_m is null or p_accuracy_m > 100 then
    raise exception 'gps accuracy too low';
  end if;

  select * into court from public.courts where id = p_court_id;
  if court.id is null then
    raise exception 'court not found';
  end if;
  -- Locks the venue row so two simultaneous check-ins can't both read confirmations = 1 and each
  -- decide they were the second (mirrors accept_open_match's row-locking in 0018).
  select * into venue from public.venues where id = court.venue_id for update;

  if public.geo_distance_m(p_lat, p_lng, venue.lat, venue.lng) > 250 then
    raise exception 'too far from court';
  end if;
  if exists (select 1 from public.court_checkins where court_id = p_court_id and player_id = uid) then
    raise exception 'already captured';
  end if;
  -- Rule 3: one visit, one court. Without this someone stands at the gate of an 8-court club and
  -- collects the lot in a minute.
  if exists (
    select 1 from public.court_checkins
    where venue_id = venue.id and player_id = uid and created_at > now() - interval '12 hours'
  ) then
    raise exception 'venue cooldown';
  end if;

  was_draft := venue.status = 'draft';
  first_here := not exists (
    select 1 from public.court_checkins
    where venue_id = venue.id and player_id = uid and accuracy_m <= 100
  );

  insert into public.court_checkins (court_id, venue_id, player_id, lat, lng, accuracy_m, source)
  values (p_court_id, venue.id, uid, p_lat, p_lng, p_accuracy_m, 'visit');

  update public.courts set capture_count = capture_count + 1 where id = p_court_id;

  if first_here then
    update public.venues set confirmations = confirmations + 1 where id = venue.id;
    venue := public.promote_venue_if_confirmed(venue.id);
    just_verified := venue.status = 'live' and was_draft;
  end if;

  return jsonb_build_object(
    'venue_id', venue.id,
    'venue_status', venue.status,
    'confirmations', venue.confirmations,
    'just_verified', just_verified,
    'discovered_by', venue.created_by,
    'venue_name', venue.name,
    'city', venue.city,
    'country', venue.country
  );
end;
$$;

grant execute on function public.check_in_court(uuid, double precision, double precision, double precision) to authenticated;
grant execute on function public.promote_venue_if_confirmed(uuid) to authenticated;

-- ============================================================================
-- Creator edits
-- ============================================================================
-- "The creator edits, everyone reports" — expressed as RPCs rather than an UPDATE policy, because a
-- policy's WITH CHECK can't stop the same statement from also rewriting status/confirmations.

create or replace function public.update_venue(
  p_venue_id uuid,
  p_name text,
  p_kind text,
  p_access text default null,
  p_hours text default null,
  p_price text default null,
  p_facilities text[] default '{}'
)
returns public.venues
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.venues;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.venues
    set name = btrim(p_name), kind = p_kind, access = p_access, hours = p_hours,
        price = p_price, facilities = coalesce(p_facilities, '{}')
    where id = p_venue_id and created_by = auth.uid()
    returning * into result;
  if result.id is null then
    raise exception 'venue cannot be edited';
  end if;
  return result;
end;
$$;

grant execute on function public.update_venue(uuid, text, text, text, text, text, text[]) to authenticated;

create or replace function public.update_court(
  p_court_id uuid,
  p_number text,
  p_surface text,
  p_indoor boolean,
  p_lights boolean
)
returns public.courts
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.courts;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.courts
    set number = nullif(btrim(coalesce(p_number, '')), ''), surface = p_surface,
        indoor = coalesce(p_indoor, false), lights = coalesce(p_lights, false)
    where id = p_court_id and created_by = auth.uid()
    returning * into result;
  if result.id is null then
    raise exception 'court cannot be edited';
  end if;
  return result;
end;
$$;

grant execute on function public.update_court(uuid, text, text, boolean, boolean) to authenticated;

-- ============================================================================
-- my_captured_courts: the passport, derived
-- ============================================================================
-- No visits table to write, nothing to fake: a court is captured when a check-in row exists, and it
-- only counts once the venue it belongs to has been corroborated.
create or replace function public.my_captured_courts()
returns table (
  court_id uuid,
  venue_id uuid,
  venue_name text,
  city text,
  country text,
  flag text,
  number text,
  surface text,
  indoor boolean,
  captured_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select c.id, v.id, v.name, v.city, v.country, v.flag, c.number, c.surface, c.indoor, ci.created_at
  from public.court_checkins ci
  join public.courts c on c.id = ci.court_id
  join public.venues v on v.id = c.venue_id
  where ci.player_id = auth.uid() and v.status = 'live'
  order by ci.created_at desc;
$$;

grant execute on function public.my_captured_courts() to authenticated;
