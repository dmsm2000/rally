# Rally: Technical Context for Claude

## Read This First

Rally is a Portuguese-first social tennis web app. Read `PRODUCT.md` as well for product intent, user rules, and UX decisions. This file is the technical source of truth.

The app is an Angular 22 standalone-components SPA with Tailwind CSS v4. It is gradually moving from mock data to Supabase. Do not assume a feature is fully real just because the UI looks complete.

## Commands

```bash
npm install
npm start
npm run build
npm run lint
```

- Use `npm run build` as the source of truth after TypeScript/template changes.
- `ng lint` currently has numerous pre-existing warnings but should have no errors.
- Do not commit unless explicitly asked.

## Testing Location-Gated Flows

Court registration is the hardest thing in the app to exercise by hand: it needs a GPS fix, a
*second* distinct player standing in the same place, and a 12 h cooldown between captures at one
venue. Do not try to test it by walking somewhere. Fake the fix instead.

**Stub the fix, don't use the DevTools Sensors panel.** The Sensors override reports an accuracy
value you don't control, and if it lands above 100 m every venue you create is born as an
unconfirmable draft — which looks exactly like a bug. Paste this in the console instead, before
opening the register dialog:

```js
// Porto, 12 m accuracy — a "good" fix. Raise accuracy above 100 to test the draft path,
// and above 2000 to test outright refusal.
navigator.geolocation.getCurrentPosition = ok =>
  ok({ coords: { latitude: 41.1500, longitude: -8.6100, accuracy: 12 } });
```

**The second player needs a second browser profile** (or an incognito window) signed into a
different account, with the same stub. Two tabs of the same session will not do: confirmation counts
*distinct* players, which is the whole point.

**Useful SQL while testing.** Where a venue actually stands:

```sql
select v.name, v.status, v.confirmations, v.registered_accuracy_m,
       (select count(*) from public.courts c where c.venue_id = v.id) as courts,
       (select count(*) from public.court_checkins ci where ci.venue_id = v.id) as checkins
from public.venues v order by v.created_at desc;
```

Reset a test venue completely — courts, check-ins, photos and its feed post all cascade:

```sql
delete from public.venues where name = 'Clube de Teste';
```

Skip the 12 h cooldown without waiting for it:

```sql
update public.court_checkins set created_at = now() - interval '13 hours'
where player_id = '<uid>';
```

The migrations themselves are testable offline against any local Postgres by stubbing the four
Supabase-provided pieces (`auth.uid()`, `public.profiles`, `storage.buckets`/`objects`,
`storage.foldername`) — this is how `0024`-`0030` were verified before they were ever applied, and
it is far faster than clicking through the UI for rules that live entirely in SQL.

## Project Map

```text
src/app/
  core/
    auth/          Supabase auth, guards, Supabase client
    data/          Supabase profile repository, mock RallyDataService, country data
    i18n/          Translation service and en/pt/es dictionaries
    models/        Shared domain models
    services/      Toasts, dialogs, Twemoji, avatar generation, UI state
  features/
    auth/          Login, registration, reset-password pages
    players/       Real-profile discovery and public player details
    profile/       Own profile editing and account management, plus the change-password
                   dialog and "my trips" strip as their own components
    feed/courts/matches/passport/world/  Mostly mock-backed product areas
  layout/          App shell, fixed topbar, mobile bottom navigation
  shared/
    components/    Domain components (player card, match card, maps, etc.)
    ui/            Reusable primitives (avatar, chip, icon, autocomplete, date-picker)
public/assets/     Local images and dedicated SVG icons
supabase/migrations/
```

## Architecture Rules

- Custom components use the `rally-` selector prefix. Reusable primitives under `shared/ui` use `ui-`.
- Use Angular signals, `computed`, `input`, `output`, and standalone component imports. Follow local patterns; do not introduce NgModules.
- All user-visible copy must use the custom `TranslatePipe` / `TranslationService` — including `aria-label`, `alt` and `placeholder`, which are as user-visible as body text to anyone using a screen reader. `en.ts` is the canonical type; `pt.ts` and `es.ts` use `satisfies Translations`, so every new key must exist in all three files.
- Keys are grouped by feature, with one exception: `common.*` holds the chrome words shared by every feature (`cancel`, `close`, `back`, `dismiss`). Reach for `common` only when a word is genuinely feature-independent — a per-feature key that happens to read the same today is not duplication, it's room for the two to diverge.
- Use `ui-icon` plus a real SVG in `public/assets/icons/`; do not write inline SVG in templates. Add icon names to `shared/ui/icon/icon.component.ts`.
- `ui-icon` injects SVG through `innerHTML`. Rules targeting injected SVG must live in global `src/styles.css`, not component-scoped SCSS.
- `styles.css` imports Tailwind with `source(none)` plus an explicit `@source '../src'`. An explicit `@source` *adds to* v4's automatic
  detection rather than replacing it, so without `source(none)` Tailwind scans the whole repo — `CLAUDE.md` and `PRODUCT.md` included,
  where class names mentioned in prose quietly became real rules in the bundle (that was ~660 bytes of `.contents`, `.sticky`,
  `.lowercase`, `.ordinal` nothing used). Keep the scope on `src/`: documentation should not be able to emit CSS.
- Reuse `ui-chip`, `ui-avatar`, `ui-empty-state`, `ui-autocomplete`, and `ui-date-picker` rather than reimplementing variants.
- `ui-fab` is the floating action button (feed, courts, matches, world, messages). It projects its
  content — the messages FAB layers an unread badge over its emoji — and `[fixed]="false"` opts out
  of the shared bottom-right corner for a FAB its own wrapper positions.
- `ui-dialog` is the composer shell: bottom sheet on mobile, centred card from `sm` up, with the
  eyebrow/close header and backdrop-click-to-close. It deliberately takes **no** `open` input —
  callers keep their own `@if`, because projected content lives in the caller's view and an `@if`
  inside the dialog would build a closed composer's body anyway. `[scrollable]="false"` drops the
  `max-h-[90vh]` cap for a short body.
- `ui-chip` with `[subtle]="true"` is read-only metadata: neutral, static, no hover/transition. Use clickable chips only for actual interactions.
- Do not use `window.confirm`; use `ConfirmDialogService`.

## Styling and UX

- Existing design language: tennis-lime accent, ink/bone palette, court-grid texture, rounded cards, `text-display`, `text-eyebrow`, and compact uppercase action labels.
- Preserve the current visual language. Avoid generic dashboard/marketing-card patterns.
- Responsive rule: fixed headers and bottom navigation need special care. Validate mobile layout if changing them.
- The topbar is `fixed`, not `sticky`; the current app shell tracks a pixel `hideOffset` from the `<main>` scroll container.
- Mobile bottom nav must calculate its number of columns from `items().length`, because observers do not see Passport.
- The user wants actual local SVG icon files, not inline SVG and not icon component-per-file abstractions.

## Auth and Permissions

`core/auth/AuthService` wraps real Supabase email/password auth, plus Google OAuth:

- `isAuthenticated()` is true for either a Supabase session or observer mode.
- `isObserver()` is a read-only guest mode. Observers can access the app shell, explore players, and open public player details. They cannot write, message, invite, access `/profile`, or access `/passport`.
- `authGuard` waits for `AuthService.whenReady()` before loading the protected app shell.
- `noObserverGuard` protects own-profile and passport routes.
- Email confirmation may leave `signUp()` without a session. Registration profiles are stored in `localStorage['rally.pendingProfile']` and written after confirmation/sign-in. **As of 2026-09-04, this path is dormant by decision, not gone**: the project's Supabase instance has "Confirm email" switched off, so every `signUp()` returns an already-confirmed session immediately (`email_confirmed_at` is set in the same response) — the pending-profile flush, `auth.errorEmailNotConfirmed`, and `docs/flows/login.md`'s Fluxo 3b all stay in place correctly, they simply have no real account to exercise them against right now. Re-enabling "Confirm email" in the Supabase dashboard brings all of it back to life with no code change.
- Never expose an `sb_secret_...` key or any service-role credential. The browser uses only the publishable/anon key from ignored environment files.
- `LoginPageComponent` redirects a real signed-in session straight to `/` on load (an observer session is exempt — that's the one way to leave observer mode for a real account). See `docs/flows/login.md` for every flow this screen supports; it's the source of truth for this screen's behaviour, not this section.
- **Google sign-in:** `AuthService.loginWithGoogle()` calls `supabase.auth.signInWithOAuth()`, which redirects the whole page to Google and back to `/auth/callback` (`AuthCallbackPageComponent`, public, outside the shell like `/login`). That page is the only thing that decides where the new session goes: `/` if `AuthService.hasProfile()` finds an existing `profiles` row, `/register` in profile-completion mode (`completeGoogleProfile` nav state) otherwise. `RegisterPageComponent` reads that state to skip its email/password step (Google already supplied the email, there's no password to set), prefilling first/last name from `AuthService.googleProfileHint()` — **never** the Google account photo, since Rally avatars are always seed-generated, never uploaded (see Assets and External Data). `AuthService.completeProfile()` writes the `profiles` row directly for that case (no `signUp()` — the session already exists). Known gap: reloading `/register` mid-completion loses `completeGoogleProfile` (it's only navigation-extras state, not persisted) and falls back to the full wizard; narrow enough it's left as-is for now (see `docs/flows/login.md`, Fluxo 13's note). The Google provider itself is configured entirely in the Supabase dashboard + Google Cloud Console — no code enables it; see the "Pré-requisitos fora do código" section at the end of `docs/flows/login.md`.
- Known Supabase Auth error messages are mapped to translated copy by `core/auth/auth-errors.ts` (`authErrorKey()`) — currently "Invalid login credentials" and "Email not confirmed" for the login form. Anything not in that short list still passes through as Supabase's raw English text, same as before this mapping existed.

Environment files are deliberately gitignored:

```ts
// src/environments/environment.ts and environment.development.ts
export const environment = {
  production: false,
  supabaseUrl: '...',
  supabaseAnonKey: '...'
};
```

The GitHub Pages workflow creates production environment config from `SUPABASE_URL` and `SUPABASE_ANON_KEY` repository secrets.

## Supabase Profiles

`public.profiles` holds actual registered profile data. `ProfileRepositoryService` is the only frontend data-access boundary for it.

- Database fixed-choice columns intentionally remain `text` / `text[]`, not Postgres enums.
- TypeScript unions and option lists live in `core/data/player-profile-options.ts`; retain them as the application-level validation source.
- Store birth dates as `birth_date date`; do not reintroduce an age field. Birth date is private and must never be included in discovery RPCs.
- `member_number` is DB generated and must never be supplied by the client.
- Own profile writes use `ProfileRepositoryService.update()` and happen per page section.

### Required Manual Migrations

Migrations are run manually in the Supabase SQL Editor. Never edit an older migration after it may have been applied; add a new numbered migration.

Apply in order on a new project:

1. `0001_profiles.sql` creates `profiles` and own-row RLS.
2. `0002_delete_own_account.sql` adds secure self-delete RPC.
3. `0003_email_exists.sql` adds unauthenticated duplicate-email check.
4. `0004_birth_date.sql` replaces legacy `age` with `birth_date`.
5. `0005_discover_profiles.sql` creates initial public discovery RPC.
6. `0006_discover_profile_member_numbers.sql` replaces the discovery RPC with member number.
7. `0007_discover_profile_preferences.sql` replaces it again with public tennis preferences.
8. `0008_discover_profile_gender.sql` is the current/latest discovery RPC; it adds gender while converting `PreferNotToSay` to `null`.
9. `0009_messages_and_trips.sql` adds real-time direct messaging (`conversations`, `messages`, `conversation_reads`, the `ensure_conversation()` RPC, Realtime publication) and "show me around" trip intents (`trip_intents`, `trip_hosts`), all participant/owner-scoped RLS.
10. `0011_posts.sql` adds real feed posts (`posts`, `post_likes`) and creates the public `feed-media` Storage bucket with its own object-level policies (own-folder-only upload/delete, public read).
11. `0012_post_type.sql` adds an optional `type` column to `posts` (`outfit` | `material` | `highlight` | `spot` | `other` — see `PostType` in `feed.model.ts`), chosen from the composer dialog and shown as a tag on the post card.
12. `0013_posts_realtime.sql` adds `public.posts` to the `supabase_realtime` publication, powering the feed's live "new posts" banner.
13. `0014_post_likes_realtime.sql` adds `public.post_likes` too, so likes/unlikes and post deletions from other viewers also update the feed live (`PostsRepository.subscribeToPostEvents`).
14. `0015_trip_intents.sql` retroactively documents `trip_intents`/`trip_hosts` (added by hand in the SQL editor when trips shipped and never previously committed — every statement is `if not exists`/`drop policy if exists` so it's safe to run regardless of current state).
15. `0016_posts_trip_link.sql` adds `posts.trip_intent_id` (unique, `on delete cascade`) linking a real feed post to the trip it announces, and relaxes `posts_has_content` to allow a trip-linked post to carry no text/media of its own.
16. `0017_notifications.sql` adds generic real-time `notifications` (`recipient_id`, `actor_id`, `kind`, a `data` jsonb rendering-payload snapshot, `read`, Realtime publication), recipient/self-actor-scoped RLS. The first real producer is `trip_host_volunteered`, emitted by `TripsRepository.volunteer()`; future kinds (messages, matches, achievements, ...) reuse the same table once those features are themselves real.
17. `0018_matches.sql` adds real `matches` (direct invites and open matches — see the Matches entry above), select/insert/delete RLS plus four `security definer` RPCs (`accept_open_match`, `respond_to_match_invite`, `cancel_match`, `complete_match`) that own every state transition, Realtime publication.
18. `0019_posts_match_link.sql` adds `posts.match_id` (unique, `on delete cascade`) linking a real feed post to the open match it announces, and relaxes `posts_has_content` the same way `0016` did for trips — mirrors that migration exactly.
19. `0021_doubles_matches.sql` adds `match_participants` (a plain `match_id`/`player_id` roster, mirroring `trip_hosts`) and the `join_doubles_match()` RPC that capacity-checks and locks the parent match row the same way `accept_open_match()` does, flipping the match to `'upcoming'` once the 4th player joins. Re-declares `cancel_match()` so any joined doubles participant — not just `player_a`/`player_b` — can cancel a confirmed doubles match. See the Matches entry above.
20. `0022_matches_public_select.sql` re-declares `matches`' select policy to add the `anon` role (was `to authenticated` only), so open matches are visible to observers the same way `trip_intents`/`discover_profiles()` already are — fixes match-linked feed posts rendering blank for observers. Direct invites stay private (`auth.uid()` is null for `anon`, so only the `kind = 'open'` branch can ever pass). `match_participants`' own select policy needs no change — it re-checks visibility via a correlated `exists` against `public.matches`, so it inherits this automatically.
21. `0023_complete_match_optional_winner.sql` re-declares `complete_match` with `p_winner` now optional (was required), so a match can be marked complete with no winner — see the Matches entry above for why (non-competitive sessions).
22. `0024_venues_and_courts.sql` makes courts real: `venues` (a club/park/hotel/condo — where the geography lives) → `courts` (a specific playing surface, with its number — where the characteristics live), plus `court_checkins`. Two levels because the 250 m duplicate check only works that way: a club with 8 courts is 8 rows ~20 m apart, so a proximity check run at court level would flag every legitimate second court. Six `security definer` RPCs (`nearby_venues`, `register_court`, `check_in_court`, `promote_venue_if_confirmed`, `update_venue`/`update_court`, `my_captured_courts`) own every write — there are deliberately **no** insert/update/delete policies on any of the three tables. Distances use a b-tree bounding box plus a haversine SQL function; no PostGIS. See the Courts entry below for the rules these enforce.
23. `0025_posts_venue_link.sql` adds `posts.venue_id` (mirrors `0016`/`0019`) and re-declares `promote_venue_if_confirmed()` to insert the announcement post. Unlike trip/match announcements, this post is **not** client-inserted: it's triggered by whoever confirms the venue while its author is the discoverer, which no client could write. Putting it in the one function both confirmation paths delegate to also makes it impossible to forget on one of them.
24. `0026_court_photos.sql` adds `court_photos` (max 3 per court, enforced by a trigger counting siblings) plus the public `court-photos` Storage bucket, whose policies are a straight copy of `feed-media`'s including the `{userId}/{uuid}.{ext}` key convention.
25. `0027_court_reports.sql` adds `court_reports`. Deliberately a mute table until a backoffice exists; it ships now because `no_longer_exists` is a signal that can't be reconstructed after the fact (nobody edits a listing to say a place shut down). Reports are visible only to their own reporter — a visible pile of reports is itself a way to discredit a court.
26. `0028_matches_court_fk.sql` turns `matches.court_id` from descriptive `text` into a real `uuid references courts(id) on delete set null`, and re-declares `complete_match` so finishing a match at a registered court inserts `source = 'match'` check-ins for everyone who played. Those capture without confirming (`accuracy_m` stays null, which never satisfies the `<= 100` corroboration test) — accepting a completed match as a second confirmation is the escape valve held in reserve for thinly populated areas, not v1. The capture is tied to completion specifically, so a cancelled match captures nothing: `complete_match` only acts on `status = 'upcoming'`, and `cancel_match` puts the row out of its reach.
27. `0029_complete_doubles_match.sql` re-declares `complete_match` so any player on the `match_participants` roster can finish a match, not just `player_a`/`player_b` — mirroring how `cancel_match` was widened in `0021`. Without it a doubles match could only be completed by its creator (`player_b` is permanently null for doubles), so four people could play at a registered court and none of them would capture it. Still **not** team assignment: `p_winner` is forced null for `format = 'Doubles'` inside the RPC, so a nonsensical "player_a won a doubles match" can't be written even by a caller that tries. Singles behaviour is unchanged.
28. `0030_matches_this_week.sql` adds `count_matches_this_week()`, a `security definer` aggregate for the matches hero. It has to be an RPC: `matches`' select policy only shows a viewer their own matches plus open ones, so counting client-side would report a number that shrinks the fewer matches you personally have. It returns a count and never a row, so granting it to `anon` leaks nothing about who is playing whom.

Note: migration filenames on disk don't currently match this list's numbering 1:1 (e.g. an early renumbering shifted 0009-0011) — trust the filenames in `supabase/migrations/` over the ordinal prefix here if they ever disagree.

`discover_profiles()` is intentionally `security definer`, granted to `anon` and `authenticated`, because observers may browse public profiles while unauthenticated. It must return only carefully selected public data: name, member number, city/country, gender opted into sharing, tennis preferences, bio, and avatar inputs. Never add email, birth date, or other private identity information.

## Real vs Mock Data: Critical Boundary

### Real today

- Supabase auth: registration, login/logout, session restore, password reset/change, own-account deletion.
- Profile insert/read/update in `public.profiles`.
- Player discovery at `/world`: `PlayersRepository` loads `ProfileRepositoryService.listDiscoverable()` via `discover_profiles()`.
- Public player detail at `/players/:playerId` uses the real discovery record.
- Country and city dropdown data: `@countrystatecity/countries-browser`, via `CountryDataService` with lazy caching.
- Direct messaging: the floating `rally-messages-widget` is backed by real `conversations`/`messages` tables, delivered live via Supabase Realtime (Postgres Changes for messages, Broadcast for the ephemeral typing indicator). See `MessagesRepository` (`features/messages/data/messages.repository.ts`).
- Trip intents ("show me around") at `/world` and "My trips" on the profile page: real `trip_intents`/`trip_hosts` tables. Volunteering to host doesn't hide the trip (others may also host) — it just sends the traveller a real automatic message via `MessagesService`. See `TripsRepository` (`features/world/data/trips.repository.ts`). Publishing a trip also inserts a real, linked feed post (`posts.trip_intent_id`, see `WorldService.publishTripIntent()`), so it surfaces in the Feed too — see the Feed entry below for how that post is scoped and rendered per viewer.
- The Feed: user-authored posts (text and/or one photo/video, uploaded to the `feed-media` Storage bucket) scoped by "In my city" / "In my country" / "In the world", and a single like toggle. There is currently no reply/comment affordance on posts (removed after initial ship — DM-from-a-post may return later), and no share action either (tried a Web Share API + clipboard-copy version on 2026-09-04; pulled again the same day rather than debug it further — not worth the time yet, revisit once there's a real per-post permalink to share, which is also the more fundamental gap here: there's no post-detail route at all). See `PostsRepository` (`features/feed/data/posts.repository.ts`). The old synthetic `kind`-tagged activity (match/court/milestone auto-posts) was retired with it — deliberately deferred until courts/matches/notifications are themselves real, at which point they can post into `posts` the same way. Trip-announcement posts (`post.trip` populated, `trip_intent_id` not null) are the first case of this pattern actually landing: they carry no text/media of their own, render from the linked trip intent instead, are visible to everyone in "In the world" plus to viewers whose own city/country matches the trip's *destination* (not the traveller's home — the useful audience is potential hosts), and show a "Ser anfitrião" volunteer action (reusing `TripsRepository.volunteer()`) only to viewers in the destination country who aren't the traveller and haven't already volunteered. As of 2026-09-04, match/trip/venue posts — `FeedCardComponent.isAutomaticPost()` — no longer show the like button for anyone (they're system-generated announcements, not authored content); they can still be deleted the same way as before (a trip/match/venue post only via deleting the linked record, which cascades).
- Notifications: the bell in the topbar (`features/notifications/notifications-bell/`) is backed by a real, generic `notifications` table delivered live via Supabase Realtime — see `NotificationsRepository` (`features/notifications/data/notifications.repository.ts`) and its `NotificationsService` facade. `AppNotification.kind` plus a `data` rendering-payload snapshot keep it reusable; a `NotificationKind → { icon, textKey, detailKey }` map in the bell component is the single place to wire up a new kind's copy (translation keys live under `notifications.kinds.<camelCaseKind>`). `NotificationsRepository.notifyMany()` fans one notification out to many recipients in a single batched insert (used by the match-nearby kind below); `notify()` stays for the single-recipient case. Clicking a notification routes by kind in `NotificationsBellComponent.select()`: `match_*` kinds go to `/matches/:id`, everything else opens a DM thread with the notification's `actorId`. Do not add a `message` kind here: the messages widget already has its own live unread badge.
- Matches: real `matches` table with two creation flows — a direct invite from a player's profile ("Convidar para uma partida") that the invitee must accept/decline, and an open match published from `/matches` that also gets a linked feed post (mirrors trip-announcement posts) and can be joined by anyone. Every state transition (accept, decline, cancel, complete) goes through a `security definer` RPC (`accept_open_match`, `respond_to_match_invite`, `cancel_match`, `complete_match`) rather than a client `UPDATE` policy — there is deliberately no such policy on `matches`, the same way `conversations` has none — so a participant can never rewrite `status`/`winner`/`player_b` outside a legitimate transition. See `MatchesRepository` (`features/matches/data/matches.repository.ts`) and `MatchesService` (`features/matches/matches.service.ts`). `city`/`country` are always populated on every match row (denormalized from the chosen mock court, or entered directly), the same way `trip_intents.destination_city/country` has no real "courts" table backing it — this keeps feed scoping and the `match_open_nearby` notification fan-out (see above) uniform regardless of composer mode. Six notification kinds cover the whole flow: `match_invite_received`, `match_invite_accepted`, `match_invite_declined`, `match_joined`, `match_cancelled`, `match_open_nearby`. Courts themselves are still mock (`court_id` on a match row is a plain descriptive reference, not a foreign key). The match detail page (`MatchDetailPageComponent`) has a "Registar resultado" flow for `'upcoming'` Singles matches (gated behind `isParticipant()`, which requires a real signed-in uid — see below): pick a winner, or "Sem resultado" to complete the match with `winner: null` for a non-competitive session. `complete_match`'s `p_winner` is optional as of `0023_complete_match_optional_winner.sql` for exactly this reason (`null in (...)` is never true in SQL, so the RPC explicitly allows a null winner). `MatchCardComponent`'s status pill accounts for this third state (`enums.matchStatus.played`, neutral) alongside win/loss. `isParticipant()` requires a truthy uid before comparing — `playerB` is `undefined` for every Doubles match (and for a Singles match not yet accepted), which would otherwise spuriously equal an observer's own `undefined` uid and leak participant-only actions (cancel/leave) to them. `MatchesService`'s own load effect gates on "signed in OR observer" (`uid || isObserver()`), not a real uid alone — observers have no uid but, since `0022_matches_public_select.sql`, can see open matches, so the old uid-only gate left `/matches` stuck showing its loading skeleton forever for them (`reload()` never ran at all). Doubles (v1): an open match with `format: 'Doubles'` is joinable by up to 4 players tracked in `match_participants` (`Match.participantIds`, populated only for Doubles) — deliberately **no team assignment yet**, so there's no winner/score UI for doubles. They *can* now be marked finished, though (`0029_complete_doubles_match.sql`): any roster player can complete one, with no winner, which is what makes the four of them capture the court they played on. The detail page shows a "Dar por terminada" confirmation instead of the singles winner picker (`completeWithoutWinner()`). `player_a` stays the creator/reference column; `player_b` stays permanently null for doubles. Doubles only applies to open/join matches, not direct invites (`sendInvite()` still forces `'Singles'`). The Feed's match-announcement post supports doubles directly: `rally-feed-card` renders the roster's avatars plus empty slots and a join/leave button (`MatchPost.participantIds`, populated in `PostsRepository.hydrate()`; `FeedService.doublesParticipantsFor()`/`joinMatch()`/`leaveDoublesMatch()` call `MatchesRepository.joinDoublesMatch()`/`leaveDoublesMatch()` directly, mirroring how `FeedService.joinMatch()` already called `acceptOpenMatch()` for Singles). The join/leave buttons are hidden for the post's own author (creator) — they're auto-added to the roster by `createOpenMatch()`, but "leaving" only drops a participant's own roster row, not the match itself, so the creator manages their own post via `/matches` (`cancelMatch`/withdraw) instead (see `0021_doubles_matches.sql`).

- Courts: a player-maintained database of real courts, at `/courts` and inside the match composer. Two levels — `venues` (club/park/hotel/condo, carrying lat/lng, access, hours, facilities) and `courts` (number, surface, indoor, floodlights) — because the duplicate check only makes sense at venue level. Four rules, all enforced in `security definer` RPCs rather than the client, each for a specific reason:
  1. **Registering requires being there.** A GPS fix is mandatory and its reported `accuracy` is stored and checked. This matters more than it looks: a phone outdoors reports 5-50 m, but a laptop without GPS reports the ISP centroid — 1-5 km out while looking like a perfectly valid fix. Reading `coords` without `coords.accuracy` is what turns the rule into one that filters nothing. Above 100 m a fix can't corroborate; above 2000 m registration is refused outright. See `GeolocationService` (`core/services/`), the only new piece in core. Observer mode: the register FAB, the capture card, the report card, the "captured by me" filter and photo upload are all hidden, and `nearby_venues()`/`my_captured_courts()` are `authenticated`-only so an observer can't reach the flow at all. `CourtDetailPageComponent`'s `isMine()`/`canRemovePhoto()` require a truthy uid before comparing, for the same reason `MatchDetailPageComponent.isParticipant()` does: `venues.created_by`/`court_photos.uploaded_by` are `ON DELETE SET NULL`, so an orphaned row's `undefined` would otherwise equal an observer's `undefined` uid and hand them owner-only controls.
  2. **Existing requires corroboration.** A venue is created `status = 'draft'` and goes `'live'` only once 2 distinct players have checked in with an accurate fix. A draft is invisible in the catalogue, the feed and search — its *only* route to visibility is `nearby_venues()`, which surfaces it to someone standing within 250 m. That is deliberate and load-bearing: if drafts were invisible there too, no draft could ever be confirmed and the state would be a dead end. It also self-cleans, since a draft registered from a sofa has coordinates kilometres from the real court and never surfaces to anyone.
  3. **Captures and the feed post only happen after verification.** This is what keeps the competition honest: registering earns nothing, so a fabricated court is never corroborated, therefore never scores, therefore isn't worth fabricating. The GPS is a *filter*, never a proof — it's spoofable in three clicks — and this rule, not the fix, is what secures the data.
  4. **One visit captures one court.** GPS distinguishes venues, not court 3 from court 4, so a 12 h per-venue cooldown stops someone standing at a club's gate and collecting all 8 at once. Completing a Rally match at a court is the exception and captures it for free (see `0028`).
  `CourtsRepository` (`features/courts/data/`) is the only data-access boundary and holds a lazily-loaded catalogue signal — plus the viewer's collection from `my_captured_courts()`, which is what `capturedByMe`, the "captured by me" filter, the profile/feed stats and the whole passport all read, so no two of them can drift. Note this means a court in a still-unconfirmed venue never counts as captured, even by the player who registered it — its card shows "Por confirmar" rather than "Capturado". `CourtsRepository`, so `courtById()` stays a synchronous lookup for match cards, the world map and the profile page — it returns undefined for an unconfirmed draft, and every caller falls back to the match's own denormalized `city`/`country`. `rally-court-composer-dialog` (`shared/components/`) is the single registration UI, used by both `/courts` and the match composer, and it is driven by `CourtComposerService` (`features/courts/court-composer.service.ts`) — the whole locate → nearby → form → candidates flow, split out of `CourtsService`, which now owns only the catalogue, the viewer's collection, and capture/photos/reports. A component that both browses and registers injects both. `courtErrorKey()` (`features/courts/court-errors.ts`) is the one place an RPC refusal or a failed fix becomes a translation key, so the two services can't drift on how the same failure reads. `court-rows.ts` (`features/courts/data/`) holds the snake_case row types and their mapping to the domain models, keeping the repository's queries readable — `match-rows.ts` does the same for matches. `mapCoordsFor()` projects real lat/lng onto `rally-map`'s stylised 0-100 grid, so the abstract map stops inventing positions. Two notification kinds (`court_verified` to the discoverer, `court_added_nearby` to the city) are sent client-side on the confirming check-in, while the feed post is written by the RPC — the split exists because notifying is something a client may do as itself, and authoring a post as somebody else is not.
- The Passport (`/passport`) is real end to end, and is the one page where that matters most — a collection nobody can fake by editing a profile. Three tabs, no overview: **Countries** and **Courts** come from `my_captured_courts()` via `CourtsService` (`myCountries()`/`myCaptures()`), so a court in an unconfirmed venue never counts, even for the player who registered it. **Players met** and the hero's matches count come from `MatchesService.completed()` — everyone on a *completed* match's `playerA`/`playerB`/`participantIds`, minus yourself, deduplicated: you meet someone by playing, not by being invited. Both are live, since `MatchesService` keeps its lists fresh over Realtime. The "still to play" list is countries the real catalogue has a court in that you haven't stamped (`CourtsService.countryCourtCounts()`), which is a reachable target rather than an aspirational roster — and, because it is named from the same `venues.country` values as the stamps, it retires the old `'UK'`/`'USA'`-vs-"United Kingdom" wart where a country could show as stamped *and* still-to-play at once. Achievements were **removed**, not made real (see the Passport entry under Cleanup).

### Mock today

- `CommunityStats` and its mock `COMMUNITY_STATS` are **gone**: the matches hero's "matches this week" now comes from `count_matches_this_week()` (`0030`), and the world hero's courts/countries from the real catalogue (`CourtsService.communityCourts()/communityCountries()`). The mock `COURTS` dataset and `RallyDataService.createCourt()`/`courts()`/`courtById()` are **gone** — courts started green field, with no seeding, because fake courts in a real table would poison the passport.
- Real discovery profiles map into the older rich `Player` UI contract with neutral placeholder activity values: no distance, zero stats/match score. `Player.stats` is therefore still mock **for other players**, and the signed-in player's own numbers are no longer read from it anywhere: the feed's welcome card, the profile header and the passport all derive matches from `MatchesService.completed()` and courts/countries from `CourtsService` (`myCaptureCount()`, `myCountryCount()`). One source, so those counts can never disagree between pages.
- The player detail page's match-history tabs (`matchTab` on `PlayerDetailPageComponent`) are wired to `MatchesService.matchesForPlayer()` (`MatchesRepository.matchesForPlayer()`), rendering real `rally-match-card`s per tab (upcoming/complete/open) with a loading skeleton and the existing `players.matchesEmptyTitle/Body` empty state. Since `matches` select RLS (`0018_matches.sql`) only grants a signed-in viewer rows where they're also a participant, plus that player's public open-match posts, another player's tabs will typically only surface matches shared with the viewer, not that player's full private history — this is intended, not a bug. The player's own discovered courts and the passport block on their profile are still deliberately empty (courts are real, but per-player court activity isn't surfaced there yet). Do not reintroduce unrelated mock courts/achievements into a real player's profile.

### Discovery Behaviour

- The signed-in player is excluded from the discovery grid by the SQL RPC, but `PlayersService.activeCount` adds the authenticated user for the community total.
- Observer mode has no own country, so the “No meu país” filter is hidden for observers.
- Real profiles do not have geolocation yet: do not show `0 km` or use them in distance filtering.
- Search covers name, city, and country. It normalises case and diacritics.
- Level, format, and surface filters are multi-select: OR within a group, AND across groups.
- Sort choices: most recent (SQL order), name A-Z, city A-Z, member number numeric ascending.

## Profile and Registration Rules

The same choices are present in registration and own-profile editing. When adding a profile field, update all relevant areas:

1. `core/data/player-profile-options.ts`: union and options, when it is a constrained choice.
2. `Player` model and `ProfileRepositoryService` mapper/row type.
3. Register state/template/submit payload.
4. Own-profile draft state/template/save/reset/dirty check.
5. Current `discover_profiles()` migration and public discovery types only if it is safe and intended to be public.
6. `en.ts`, `pt.ts`, `es.ts` translation keys.

Current registration rules:

- Required: first/last name, valid unique email, password of 6+ characters, birth date, gender, dominant hand, country/city/max distance, level/years, game frequency, coaching choice, and coaching frequency if coached.
- Optional: backhand, play style, format, surface, court preference, preferred times, availability, and bio.
- Password fields have shared show/hide controls. `passwordTooShort` is shown inline, not only through a disabled button.
- Email is checked on blur by `AuthService.emailExists()`; a duplicate email disables Continue and shows toast plus inline error.
- Country and city use `ui-autocomplete`, not native massive selects/datalists. Country options include flags; city data is lazy-loaded per selected country.
- Birth date uses `ui-date-picker`, a themed custom calendar. Do not switch back to native `input[type=date]`, since the OS/browser calendar cannot match the design.

Own profile page:

- Separate saves for traits, location, game, schedule, and avatar.
- Each section supports Cancel/reset-to-persisted data.
- Route-level `unsavedChangesGuard` asks before in-app navigation with dirty drafts. It does not cover browser refresh/tab close.
- The own-profile avatar has `[showBadge]="false"`, because its edit pencil occupies the badge corner.

## Player Detail Conventions

- Public player hero is neutral (`bg-muted`); do not add a court-photo background unless the user revisits that design decision.
- Gender is public only for Male/Female/NonBinary, represented by `gender-male`, `gender-female`, and `gender-nonbinary` SVG badge icons. `PreferNotToSay` is omitted by SQL. The SVGs are used instead of text symbols because Safari/iOS font metrics caused optical misalignment.
- Male gender uses cobalt/blue, Female pink, NonBinary lime. The tennis ball remains the fallback badge when no public gender is available.
- “Preferências do jogador” includes play preferences and preferred time of day. Availability is currently included within that card as a distinct sub-block. “Treino” is separate and is split into game frequency and coached/autodidacte details.
- Observers must never see Match Score, compatibility reason, invite, or message controls.

## Assets and External Data

- Images used by the app should be committed under `public/assets/`; do not leave hero imagery as an external hotlink.
- `world-hero.jpg` is local. Court photos are local as `court-{clay,hard,grass,urban,indoor}.jpg`.
- `@countrystatecity/countries` is server-only. The app correctly uses `@countrystatecity/countries-browser` in the browser.
- The country dataset is ODbL-1.0; the project includes attribution in the profile footer.
- Twemoji is served from a jsDelivr URL pinned to `@twemoji/api` version. `TwemojiRendererService` parses dynamic DOM with a `MutationObserver`.
- Do not interpolate a reactive emoji flag where Twemoji will replace its text node. For the language selector, use `TwemojiRendererService.urlFor()` with a reactive `<img [src]>`.
- User-uploaded feed media lives in the public Supabase Storage bucket `feed-media` (see `0010_posts.sql`), one object per post at `{authorId}/{uuid}.{ext}` — this is the only real file-upload path in the app; avatars are seed-generated, not uploaded.

## High-Value Gotchas

- **The `undefined === undefined` trap.** `AuthService.currentUserId()` is `undefined` for an observer *and* for a logged-out session, while several nullable columns (`matches.player_b` on any open/doubles match, `matches.winner`, `venues.created_by` and `court_photos.uploaded_by` after their author deletes the account, an unresolved player in a doubles roster) map to `undefined` too. A bare `x === currentUserId()` therefore silently reports "this is mine" to observers. Always require a truthy uid first — `const uid = ...; return !!uid && x === uid`. Known instances, all fixed: `MatchDetailPageComponent.isParticipant()`, `CourtDetailPageComponent.isMine()`/`canRemovePhoto()`, `MatchesService.handleRealtimeMatch()`, and the `playerALink`/`playerBLink`/`participantLink` helpers (which additionally return `null` rather than `/players/undefined` for an unresolvable slot). Check this whenever comparing an id against the signed-in user.
- `RallyDataService.me()` still provides the shared displayed player object. `AuthService.refreshProfile()` overlays the real own profile into it after login/session restore. Do not mistake this bridge for fully migrated feature data. Notably `RallyDataService.me().id` is never overlaid and stays a mock id forever — code that needs the real signed-in user's id (e.g. messaging) must use `AuthService.currentUserId()` instead.
- `ProfileRepositoryService.update()` persists first, then updates the mock bridge. Keep this order so UI never claims a failed save succeeded.
- A `ui-avatar` badge is shown only for generated avatar imagery and sizes md+. It has inputs `badge`, `badgeClass`, `badgeIcon`, and `showBadge`.
- When injected SVG does not style correctly, check global `styles.css` due to Angular emulated encapsulation.
- When a header needs to hide on scroll, use the existing numeric `hideOffset`, not a boolean threshold with CSS transform transitions.
- The browser Playwright click action can occasionally stall on animated app buttons. Dispatching a bubbling `MouseEvent` through page evaluation has worked as a fallback.

## Courts: Decision Log

Written down because most of these were close calls with a real alternative, and the reasoning is
not recoverable from the code. Do not re-open one of these without a new reason.

- **Two levels (`venues` → `courts`), not one.** The argument is not naming, it's the dedupe radius:
  a club with 8 courts is 8 rows ~20 m apart, so a proximity duplicate check at court level would
  fire on every legitimate second court in the same club. Geography belongs to the venue,
  characteristics to the court.
- **The collectible unit is the individual court, but verification happens at venue level.** These
  were deliberately split. Verification is a geographic fact ("this place exists") that corroborates
  in days; requiring 2 distinct players per *court* would leave an 8-court club half-verified for
  months and the reward would never arrive. The cost is that a fabricated "court 9" inside a real
  club isn't caught by corroboration — accepted, because the return is low, the
  `unique (venue_id, number)` index bounds it, and it is exactly what reports are for.
- **Points and the feed post fire on verification, never on registration.** This is the single rule
  that keeps the collection competition from rewarding invention: an imaginary court is never
  corroborated, so it never scores and never gets announced. Everything else (GPS, rate limits) is a
  filter; this is the actual defence.
- **One visit captures one court**, with a 12 h per-venue cooldown. Without it someone stands at a
  club's gate and collects all 8 courts in a minute. Playing a Rally match at a court is the
  exception and captures it for free.
- **A poor fix creates a draft rather than being refused** (up to 2000 m, above which it is refused).
  Drafts are invisible everywhere except to someone standing within 250 m — which is what makes them
  confirmable at all, and also what makes a sofa-registered draft self-cleaning, since its
  coordinates are kilometres from anywhere anyone will stand.
- **The creator edits, everyone reports.** Expressed as RPCs rather than an UPDATE policy, because a
  policy's `WITH CHECK` cannot stop the same statement from also rewriting `status`/`confirmations`.
  A wiki model was considered and rejected: it needs change history to be recoverable, which is much
  more work and vandalisable without moderation.
- **Green field, no seeding.** The 6 mock courts were deleted rather than inserted. Fake courts in a
  real table poison the passport, and an honest empty state is better than a populated lie.
- **`created_by` is `on delete set null`, not `cascade`** — the only place in the schema that
  diverges. A venue is not its author's row: if the discoverer deletes their account, the club must
  not vanish from the passport of everyone who played there.
- **No PostGIS.** A b-tree bounding box plus a haversine SQL function is plenty at this scale, and
  keeps the extension surface as small as the text-instead-of-enums choice made in `0001`.
- **No real map tiles.** `rally-map` stays an abstract silhouette; real coordinates are projected
  onto it via `mapCoordsFor()`. A Leaflet/OSM layer was considered and rejected as a dependency that
  breaks the visual language.

Considered and deliberately cut from v1: the "would you play again?" signal, a capture leaderboard,
photo galleries beyond 3, a moderation backoffice, and wiki-style editing.

## Planned Cleanup

Agreed with the user: **once the app is stable enough**, do a general cleanup pass before adding
more features. Not now — none of this is urgent, and doing it mid-feature risks working code. This
is the running list, so nothing has to be rediscovered.

A first pass of this ran on 2026-09-04; what it did is in the Cleanup Pass section below. What
follows is what is still outstanding.

**Code duplication**

- **`MatchesRepository.subscribeToMatchEvents()` holds a single channel handle**, so a second caller
  silently steals it from the first. `FeedService` therefore opens its own `feed-open-matches`
  channel to keep its headline count live. Converting the repository to a multi-listener registry
  would let the feed drop that duplicate subscription. Deliberately deferred: it means touching
  working realtime code.
- **The centred-modal shell is still copied four times** (world host list, player invite, profile
  avatar, profile password). `ui-dialog` covers the *sheet* composers only — the centred ones differ
  enough (always centred, `px-4`, `max-w-md`/`max-w-sm`, a text `✕` instead of the icon button, no
  backdrop-click close) that folding them in would mean either a second variant input or changing
  how they look. Worth doing, but it is a design decision, not a mechanical one.
- **32 component `.scss` files contain nothing but `:host { display: block|contents }`.** They could
  all become a `host: { class: 'block' }` in the component metadata, deleting 32 files. Left alone
  because it is pure churn across 32 components for no behaviour change.

**Lint** — `npm run lint` reports **0 errors and 6 warnings**, all `max-lines` (see the Cleanup Pass
section for what the other ~705 were and where they went). The six that remain are real code files
over the 300-line limit: `courts.repository.ts` (434), `matches.repository.ts` (389),
`profile-page.component.ts` (390), `matches.service.ts` (380), `feed.service.ts` (351),
`posts.repository.ts` (335). Each needs a judgement call about what to split off rather than a
mechanical fix — the obvious row-type/mapper layers have already been extracted.

**Bundle** — the initial bundle is ~1.77 MB against a 1 MB budget, so every build warns. The obvious
suspect is the country dataset; worth measuring before assuming. Either trim it or raise the budget
deliberately rather than leaving a warning everyone learns to ignore.

**Remaining mock data** — `rally-dataset.ts` is down to ~420 lines. What's left, and what it feeds:

- `ME` / `PLAYERS` — the `RallyDataService.me()` bridge (see High-Value Gotchas). The biggest and
  most entangled piece; `Player.stats` is still mock for *other* players even though the signed-in
  player's own numbers are now all real.
- `COUNTRIES` — now only the world map's "still locked" markers and `PlayersRepository.countryCoords()`.
  It still uses `'UK'`/`'USA'` where the real country dataset says "United Kingdom"/"United States";
  that no longer causes a visible contradiction (the passport stopped reading it), but it does mean
  the world map can draw a "locked" marker for a country someone has actually played in. Fix by
  deriving the roster from the real dataset, or by dropping it the way the passport did.
- `DESTINATIONS`, `WORLD_ACTIVITY` — the world page's showcase content. (`PLAYER_INTENTS` was
  deleted in the cleanup pass: nothing had referenced it since real trip intents shipped.)

## Cleanup Pass (2026-09-04)

A pass over lint, dead code, translations and duplication. No feature behaviour was changed, and
the generated `styles.css` is byte-identical to before it — which is the check that mattered, since
several long Tailwind class strings moved from templates into `.ts` files.

**Lint went from 6 errors + 705 warnings to 0 errors + 6 warnings.** Most of that was three rules
whose defaults fight this codebase, resolved in `eslint.config.js` rather than by rewriting code to
suit them — the reasoning is in comments there:

- `label-has-associated-control` (the 6 errors) now declares `ui-autocomplete`/`ui-date-picker`/
  `ui-time-picker` as `controlComponents`. Each renders a real `<input>`, so a `<label>` wrapping one
  *is* associated in the DOM; the rule simply can't see through a custom element.
- `member-ordering` (572 warnings) now enforces the coarse shape — fields, constructor, methods —
  instead of the default's public-before-private field order, which Angular's
  `private readonly x = inject(...)` idiom violates in every service. The ~110 real violations left
  after that were fixed by moving members, not by loosening it further.
- `no-void` (61) allows `void somePromise()` as a statement, which is the deliberate fire-and-forget
  marker used throughout.
- `id-denylist` keeps `number` only outside the courts feature: `Court.number` is the number painted
  on the ground and mirrors the `courts.number` column.
- `max-lines` is off for the translation dictionaries and `rally-dataset.ts` — flat data tables where
  the rule measures nothing.

Everything else was fixed in code: `promise-function-async` (31, including rewriting the lazy route
loaders as `async () => (await import(...)).ROUTES`), `no-non-null-assertion` (9 — the
`register_court` RPC payload became a discriminated union, and `MessagesService.conversations`
narrows with a type predicate instead of pushing a `!` onto its consumer), `curly` (10, an if-chain
that became the `RPC_ERROR_REASONS` table), `component-class-suffix` (`App` → `AppComponent`), and
`arrow-body-style`.

**Dead code removed:** `CountryBadgeComponent`, `PageHeaderComponent`, `NavigationStateService`,
`PLAYER_INTENTS`/`PlayerIntent`, `CourtFacility`. Nothing referenced any of them. A re-scan of all
238 exported symbols and every private/protected class member now finds none unused. `tsconfig.json`
also referenced a `tsconfig.spec.json` that does not exist; the dangling reference is gone.

**Translations:** 27 unused keys deleted, the 7 per-feature `cancel` copies collapsed into
`common.cancel`, and 13 never-translated `aria-label`/`alt` strings ("Close", "Back", "Dismiss",
"Rally home", the feed hero's alt text) given real keys in all three languages. `enums.surface.Hard`
was still "Hard" in `pt.ts` while Clay/Grass/Carpet were translated — it is now "Rápido". The three
dictionaries carry identical key sets (639 keys), every key is reachable, and every `| translate`
target resolves. Note two things left alone deliberately: PT uses "Courts", "Backhand" and "Match
score" as loanwords, which reads as a product-voice choice rather than a gap; and the lowercase "vs"
in `rally-match-card` is still hardcoded, being identical in all three languages like "km" and "min".

Also found along the way: Tailwind was scanning the repo's Markdown, so prose describing class
names was emitting real (unused) CSS. `styles.css` now uses `source(none)` — see Styling and UX.

**Duplication removed:** `ui-fab` (the five FABs) and `ui-dialog` (the four sheet composers, which
also had three copies of the same `onBackdropClick` handler — including the comment explaining why
it must be a method and not an inline expression, now carried into the primitive).

**Files split**, each because it was over the line limit *and* had two jobs:
`CourtsService` → `CourtComposerService`; `profile-page.component.ts` → `ChangePasswordDialogComponent`
and `MyTripsSectionComponent`; the repositories' row types and mappers → `court-rows.ts` /
`match-rows.ts`.

### Passport (same pass)

Cut down to what is real, at the user's request.

- **Achievements are gone for now** — the tab, the hero stat, the "almost there" nudge, the profile
  card's ratio, `AchievementCardComponent`, the `Achievement` model, `ACHIEVEMENTS`, the whole
  `achievements.*` translation group, the `--achievement`/`--silver` colour tokens and the
  `/achievements` redirect. They were a static mock list: every player saw the same "unlocked"
  badges regardless of what they had actually done, which is worse than showing nothing on a page
  whose entire point is that it cannot be faked. **This is a deferral, not a rejection** — the user
  confirmed on 2026-09-04 that achievements come back once the app is more stable. Do not treat the
  removal as a decision against the feature; see Current Product Priorities for how to rebuild them.
- **The Overview tab went with them.** Once the achievement nudge was gone it was three buttons
  restating the three numbers in the hero directly above it. Tabs are now Countries / Courts /
  Players, defaulting to Countries.
- **"Players met" is real**: everyone on a *completed* match with you (`playerA`/`playerB`/
  `participantIds`, minus yourself). `MOCK_MATCH_PAIRINGS` and `RallyDataService.playersMetBy()` are
  deleted. The hero's fourth stat is now matches played, also real.
- **"Still to play" is real**: countries the catalogue has a court in that you haven't stamped.
- **A real bug fixed on the way:** `complete_match` inserts check-ins for everyone who played at a
  registered court (`0028`), but nothing client-side re-read the collection afterwards, so a court
  captured by finishing a match stayed invisible in the passport, the profile counts and the
  "captured by me" filter until a full page reload. `MatchesService` now calls
  `CourtsService.refreshCaptures()` both when *you* complete a match and when a realtime event says
  a match of yours became complete at a court — which covers a doubles partner finishing it.

## Current Product Priorities

Courts are now real, which was the big one. A player-maintained database where registering requires
standing at the court (GPS accuracy checked server-side), existing requires a second player's
on-site confirmation, and captures/feed posts only count once a place is confirmed — the rule that
stops the collection competition from rewarding invention. Migrations `0024`-`0030`; see the
Decision Log above for why each choice was made, and Testing Location-Gated Flows for how to
exercise any of it without leaving the house.

**Shipped incomplete — read this before assuming a court feature works end to end:**

- **There is no edit UI.** `update_venue()`/`update_court()` (0024) and
  `CourtsRepository.updateVenue()/updateCourt()` exist and are tested, but nothing calls them. So
  "the creator edits, everyone reports" is currently only half true: a typo in a venue name cannot
  be fixed by anyone, including its author. This is the most conspicuous hole in v1, and the
  plumbing for it is already there — it needs a form on the court detail page, gated on `isMine()`.
- **Drafts never expire.** The design says an unconfirmed venue should drop out of the proximity
  list after ~60 days so abandoned ones stop being offered; that was never built. Nothing breaks
  without it (a sofa-registered draft is already invisible to everyone, since its coordinates are
  nowhere near a real court), but the table accumulates them. A `where created_at > now() -
  interval '60 days' or status = 'live'` in `nearby_venues()` is the whole fix.
- **`court_reports.note` is never populated.** The report UI sends a reason only; the column and the
  repository parameter both accept a note. Add a text field when the backoffice exists to read it.
- **The catalogue can't filter by access or facilities.** Both are stored on `venues` and rendered
  on the detail page, but the filter row only offers surface/indoor/captured.

Everything below was discussed and deliberately deferred, not forgotten. Roughly in the order that
makes sense to build:

1. **The capture leaderboard.** The competition currently has scoring but no scoreboard. Deferred
   until there is enough real data to be worth ordering — it's the natural next step once a handful
   of players are actually capturing.
2. **Bring achievements back.** Agreed with the user on 2026-09-04: they were pulled from the
   passport to get that page onto real data, and they return **once the app is more stable** — not
   before. They are a wanted feature, not a rejected one.

   When rebuilding, two things carry over from why they were pulled:

   - **Compute them, never store them.** Thresholds derived from `my_captured_courts()` and
     `MatchesService.completed()` (courts captured, countries stamped, matches played, players met —
     every input already exists and is already real). A stored `unlocked` flag is exactly what made
     the old ones a lie: the mock list showed every player the same badges regardless of what they
     had done. On a page whose whole point is that it cannot be faked, a fakeable badge is worse
     than no badge.
   - **Wait for the numbers to mean something.** A "25 courts" badge is noise while the catalogue
     has a handful of courts in it. Until then the raw counts in the passport hero say the same
     thing without the machinery — which is why pulling them cost nothing.

   The deleted code is still in git (nothing from the cleanup pass was committed, so it is all in
   `HEAD`) and is worth reading before rewriting rather than starting cold — the card's tier styling
   in particular:

   ```bash
   git show HEAD:src/app/shared/components/achievement-card/achievement-card.component.ts
   git show HEAD:src/app/core/models/achievement.model.ts
   git show HEAD:src/app/core/data/rally-dataset.ts          # the ACHIEVEMENTS list
   git show HEAD:src/app/core/i18n/translations/pt.ts        # the achievements.* group, all 3 langs
   git show HEAD:src/styles.css                              # --achievement / --silver tokens
   ```

   Note this recovery path only holds until the cleanup pass is committed and `HEAD` moves; after
   that it is `git show <that commit>^:<path>`.
3. **"Would you play again?"** A one-tap yes/no offered after completing a match at a court, feeding
   the `playAgain` percentage the old mock UI used to show. Cut from v1 because it served neither
   registration, verification nor the competition — but it's the natural way to make a court listing
   say something about quality rather than just existence. Deliberately not 1-5 stars: with three
   reviews an average means nothing, and one tap gets an order of magnitude more responses.
4. **A moderation backoffice.** `court_reports` has been collecting signal since day one with
   nothing reading it — `no_longer_exists` in particular, which is the main way a database like this
   rots. This is the first thing that becomes urgent as the court count grows.
5. **Team assignment for doubles.** Pairing the 4 roster slots into two sides. Once that exists,
   doubles gets a real winner and the "Dar por terminada" confirmation (`0029`) can become a proper
   result flow.
6. **Rich score entry.** Per-set scores; `matches.sets jsonb` already supports it schema-wise, and
   the "Registar resultado" flow currently captures only an optional winner.
7. **Real compatibility and distance.** Courts now carry real coordinates — the first real geo data
   in the app — but players still have none. Distance between a player and a court is computable
   today; player-to-player is not.
8. **A real map layer**, if the abstract `rally-map` ever stops being enough. Rejected for v1 as a
   dependency that breaks the visual language, so this is a deliberate reversal, not an oversight.

Known limits worth remembering rather than re-deriving:

- **The GPS fix is spoofable** in devtools and is treated as a filter, not a proof. Rule 3 (nothing
  counts before corroboration) is what actually secures the data. Don't invest in harder client-side
  location checks; they only add friction for honest players.
- **Thin areas verify slowly.** A legitimate court can sit unconfirmed for a long time where few
  players are. The escape valve is already designed but not built: accept a completed Rally match at
  the court as a second confirmation. `0028`/`0029` deliberately make match check-ins capture
  *without* confirming (`accuracy_m` is null, which never satisfies the `<= 100` test), so switching
  this on is a small, contained change if it's ever needed.
- **A fabricated court inside a real club** isn't caught by venue-level corroboration. Bounded by
  the `unique (venue_id, number)` index and left to reports. If it ever becomes a real problem, the
  answer is to require court-level corroboration *for scoring only* — not to change the model.
