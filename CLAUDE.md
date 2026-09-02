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
    profile/       Own profile editing and account management
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
- All user-visible copy must use the custom `TranslatePipe` / `TranslationService`. `en.ts` is the canonical type; `pt.ts` and `es.ts` use `satisfies Translations`, so every new key must exist in all three files.
- Use `ui-icon` plus a real SVG in `public/assets/icons/`; do not write inline SVG in templates. Add icon names to `shared/ui/icon/icon.component.ts`.
- `ui-icon` injects SVG through `innerHTML`. Rules targeting injected SVG must live in global `src/styles.css`, not component-scoped SCSS.
- Reuse `ui-chip`, `ui-avatar`, `ui-empty-state`, `ui-autocomplete`, and `ui-date-picker` rather than reimplementing variants.
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

`core/auth/AuthService` wraps real Supabase email/password auth:

- `isAuthenticated()` is true for either a Supabase session or observer mode.
- `isObserver()` is a read-only guest mode. Observers can access the app shell, explore players, and open public player details. They cannot write, message, invite, access `/profile`, or access `/passport`.
- `authGuard` waits for `AuthService.whenReady()` before loading the protected app shell.
- `noObserverGuard` protects own-profile and passport routes.
- Email confirmation may leave `signUp()` without a session. Registration profiles are stored in `localStorage['rally.pendingProfile']` and written after confirmation/sign-in.
- Never expose an `sb_secret_...` key or any service-role credential. The browser uses only the publishable/anon key from ignored environment files.

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
- The Feed: user-authored posts (text and/or one photo/video, uploaded to the `feed-media` Storage bucket) scoped by "In my city" / "In my country" / "In the world", and a single like toggle. There is currently no reply/comment affordance on posts (removed after initial ship — DM-from-a-post may return later). See `PostsRepository` (`features/feed/data/posts.repository.ts`). The old synthetic `kind`-tagged activity (match/court/milestone auto-posts) was retired with it — deliberately deferred until courts/matches/notifications are themselves real, at which point they can post into `posts` the same way. Trip-announcement posts (`post.trip` populated, `trip_intent_id` not null) are the first case of this pattern actually landing: they carry no text/media of their own, render from the linked trip intent instead, are visible to everyone in "In the world" plus to viewers whose own city/country matches the trip's *destination* (not the traveller's home — the useful audience is potential hosts), can be liked but never deleted from the feed card (only by deleting the trip itself, which cascades), and show a "Ser anfitrião" volunteer action (reusing `TripsRepository.volunteer()`) only to viewers in the destination country who aren't the traveller and haven't already volunteered.
- Notifications: the bell in the topbar (`features/notifications/notifications-bell/`) is backed by a real, generic `notifications` table delivered live via Supabase Realtime — see `NotificationsRepository` (`features/notifications/data/notifications.repository.ts`) and its `NotificationsService` facade. `AppNotification.kind` plus a `data` rendering-payload snapshot keep it reusable; a `NotificationKind → { icon, textKey, detailKey }` map in the bell component is the single place to wire up a new kind's copy (translation keys live under `notifications.kinds.<camelCaseKind>`). `NotificationsRepository.notifyMany()` fans one notification out to many recipients in a single batched insert (used by the match-nearby kind below); `notify()` stays for the single-recipient case. Clicking a notification routes by kind in `NotificationsBellComponent.select()`: `match_*` kinds go to `/matches/:id`, everything else opens a DM thread with the notification's `actorId`. Do not add a `message` kind here: the messages widget already has its own live unread badge.
- Matches: real `matches` table with two creation flows — a direct invite from a player's profile ("Convidar para uma partida") that the invitee must accept/decline, and an open match published from `/matches` that also gets a linked feed post (mirrors trip-announcement posts) and can be joined by anyone. Every state transition (accept, decline, cancel, complete) goes through a `security definer` RPC (`accept_open_match`, `respond_to_match_invite`, `cancel_match`, `complete_match`) rather than a client `UPDATE` policy — there is deliberately no such policy on `matches`, the same way `conversations` has none — so a participant can never rewrite `status`/`winner`/`player_b` outside a legitimate transition. See `MatchesRepository` (`features/matches/data/matches.repository.ts`) and `MatchesService` (`features/matches/matches.service.ts`). `city`/`country` are always populated on every match row (denormalized from the chosen mock court, or entered directly), the same way `trip_intents.destination_city/country` has no real "courts" table backing it — this keeps feed scoping and the `match_open_nearby` notification fan-out (see above) uniform regardless of composer mode. Six notification kinds cover the whole flow: `match_invite_received`, `match_invite_accepted`, `match_invite_declined`, `match_joined`, `match_cancelled`, `match_open_nearby`. Courts themselves are still mock (`court_id` on a match row is a plain descriptive reference, not a foreign key). Doubles (v1): an open match with `format: 'Doubles'` is joinable by up to 4 players tracked in `match_participants` (`Match.participantIds`, populated only for Doubles) — deliberately **no team assignment yet**, so there's no winner/score UI for doubles and they never reach `'complete'`. `player_a` stays the creator/reference column; `player_b` stays permanently null for doubles. Doubles only applies to open/join matches, not direct invites (`sendInvite()` still forces `'Singles'`). The Feed's match-announcement post stays read-mostly for doubles — it shows the roster count and a link into `/matches/:id` rather than a join button, to keep `rally-feed-card` singles-only for now (see `MatchesService.joinDoublesMatch()`/`leaveDoublesMatch()` and `0021_doubles_matches.sql`).

### Mock today

- Courts, passport countries/courts/achievements and community stats (including the matches hero's "matches this week" stat) still originate in `RallyDataService` / `rally-dataset.ts`. `RallyDataService.playersMetBy()` — Passport's "players met" connections graph — is now backed by a small standalone `MOCK_MATCH_PAIRINGS` list (`rally-dataset.ts`), not by real match rows, since Passport itself is still mock; do not wire it to `MatchesRepository` without also making Passport real.
- Real discovery profiles map into the older rich `Player` UI contract with neutral placeholder activity values: no distance, zero stats/match score.
- The player detail deliberately shows empty states for real player match tabs (`matchTab` on `PlayerDetailPageComponent` is not yet wired to `MatchesService`, even though matches themselves are real — an explicit, deferred follow-up) and discovered courts, and a zeroed passport block. Do not reintroduce unrelated mock courts/achievements into a real player's profile.

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

- `RallyDataService.me()` still provides the shared displayed player object. `AuthService.refreshProfile()` overlays the real own profile into it after login/session restore. Do not mistake this bridge for fully migrated feature data. Notably `RallyDataService.me().id` is never overlaid and stays a mock id forever — code that needs the real signed-in user's id (e.g. messaging) must use `AuthService.currentUserId()` instead.
- `ProfileRepositoryService.update()` persists first, then updates the mock bridge. Keep this order so UI never claims a failed save succeeded.
- A `ui-avatar` badge is shown only for generated avatar imagery and sizes md+. It has inputs `badge`, `badgeClass`, `badgeIcon`, and `showBadge`.
- When injected SVG does not style correctly, check global `styles.css` due to Angular emulated encapsulation.
- When a header needs to hide on scroll, use the existing numeric `hideOffset`, not a boolean threshold with CSS transform transitions.
- The browser Playwright click action can occasionally stall on animated app buttons. Dispatching a bubbling `MouseEvent` through page evaluation has worked as a fallback.

## Current Product Priorities

The user has just made matches real (direct invites, open matches published to the feed, a generic real-time notifications system now covering trip hosting and matches, and — v1 — doubles open matches with a 4-player roster and no team assignment yet). Likely next work:

1. Team assignment for doubles once there's a real need for it (pairing the 4 roster slots into two sides) — deliberately deferred, see the Matches/Doubles entry above.
2. Wire the doubles roster + join button into the Feed's `rally-feed-card` itself, instead of the current read-mostly roster-count-plus-link treatment.
3. Wire the public player detail page's real match-history tabs to `MatchesService` (currently a static empty state for all three tabs — explicitly deferred when matches went real, see the Matches entry above).
4. Build rich score/stats entry (per-set scores, `MatchStat` rows) — `matches.sets jsonb` already supports it schema-wise, only the completion UI is a minimal winner-picker today (singles only; doubles has no completion UI yet at all).
5. Replace empty player passports and discovered courts with actual per-user activity.
6. Calculate genuine compatibility/match score and distance only after real location and matching logic exist.
7. Continue replacing mock feature data carefully, feature by feature, without exposing private profile fields.
