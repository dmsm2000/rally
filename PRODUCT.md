# Rally: Product and Business Context

## Product Definition

Rally is a social tennis app built around a simple outcome: make it easy to find the right person to play tennis with, at the right time and place.

It is not a rankings app, a professional networking product, or a generic social feed. Its central promise is practical tennis connection: find players, discover courts, arrange games, and record a real tennis history.

The product is Portuguese-first but supports Portuguese, English, and Spanish. All new product-facing copy must be translated in all three languages.

## Core User Questions

The experience should answer four recurring questions:

1. **Who can I play with?** Find people based on tennis preferences, availability, and eventually real proximity/compatibility.
2. **Where can I play?** Discover courts locally and while travelling.
3. **How do I arrange a game?** Create, accept, or discuss a match without making chat the product itself.
4. **What is my tennis history?** Track courts, countries, matches, and achievements through a tennis passport.

## Personas and Access

### Registered player

A registered player has a real Supabase account and a profile. They can:

- Edit their own profile and avatar.
- Browse and open public player profiles.
- Use discovery filters and search.
- See compatibility/match-score UI when that logic exists.
- Create content and use product write actions where the feature currently supports it.
- Access their own profile and tennis passport.

### Observer / olheiro

An observer can enter without registering. This is a deliberate read-only product mode, not a partial account.

An observer can:

- Browse the app shell, Explore, player cards, and public player detail pages.
- See public profile information that the owner has chosen to share.

An observer cannot:

- Message or invite players.
- Create/accept games, publish content, or perform other writes.
- Open their own Profile or Passport because they have no player identity.
- See a match score, since compatibility requires a player profile to compare against.

## Public Profile Policy

The player detail page is a public discovery profile. It may show:

- Name, member number, avatar, city, country, and country flag.
- Opted-in gender marker: male, female, or non-binary.
- Tennis preferences: level, format, surface, dominant hand, backhand, play style, court preference, preferred times, and availability.
- Training data: game frequency, coaching status, and coaching frequency.
- Bio.

It must not show:

- Email address.
- Date of birth.
- Any other private account data.

`Prefer not to say` for gender means no public gender marker. The UI may keep the tennis-ball avatar badge as a neutral fallback.

## Registration and Profile Philosophy

Registration should feel short, playful, and useful. Ask only for data that helps form a tennis profile.

Required registration data:

- First and last name.
- Valid unique email and password (minimum six characters).
- Date of birth.
- Gender and dominant hand.
- Country, city, and maximum match distance.
- Level and years playing.
- Game frequency.
- Whether the player has a coach; coaching frequency when applicable.

Optional data:

- Backhand, play style, format, surface, court preference.
- Preferred time of day.
- Availability windows.
- Bio.

The own-profile page is an editable version of this profile, divided into independently saved sections. Users must be able to cancel/reset each section and be warned before in-app navigation with unsaved edits.

## Explore: Current Product Rules

Explore currently has a community hero and player discovery list.

- **Active player count**: count all real registered profiles, including the signed-in user even though that player is excluded from their own discovery list.
- Other hero counts can remain mock until their data is real.
- The map is intentionally removed from the Explore hero for now. It uses a globe image instead.
- Search must cover player **name, city, and country**, with case- and accent-insensitive matching.
- Filters for level, format, and surface are multi-select: OR within one category and AND across categories.
- “In my country” is available only to registered users. Do not present a fake distance filter until actual geolocation exists.
- Sort choices are: newest, name A-Z, city A-Z, and member number ascending.
- Player cards should be concise: avatar, gender marker, name, city/country, member number, level, format, and surface. Read-only chips are neutral and static.

## Public Player Detail: Current Product Rules

The public detail page is deliberately honest about data that has not been built yet.

- The hero is currently neutral. Do not add a court-photo background unless the user explicitly revisits that decision.
- A gender badge belongs in the avatar's lower-right badge position. Use colour semantics: male blue, female pink, non-binary lime. It must be visually centred on Safari/iPhone.
- “Preferências do jogador” contains play preferences, preferred time of day, and availability as separate internally labelled groups.
- “Treino” has two distinct parts: game frequency and coaching status/frequency. Do not merge them into availability.
- Match tabs are structured as upcoming, past, and open, but are empty until match data becomes real.
- Passport and courts-discovered areas use empty/zero states until real per-player data exists.
- Never fill a real player's page with unrelated mock matches, courts, passport countries, or achievements.

## Current Data Reality

### Real today

- Email/password authentication.
- Player registration and profile persistence.
- Own-profile updates.
- Public player discovery and public player detail data.
- Country/city options in profile forms.
- Direct messaging between two registered players, delivered live (Supabase Realtime), with a real typing indicator and per-participant read state.
- Trip intents ("show me around"): publishing a trip, browsing host requests for your own city, volunteering (which sends a real message to the traveller, without hiding the post), and managing your own trips from your profile. Not yet posted to the feed or community map — deliberately deferred until the feed itself is real.

### Still mock today

- Feed and social activity.
- Courts and court activity.
- Match scheduling/results/history.
- Notifications.
- Passport countries, courts, achievements, and player connections.
- World community map/activity feed and stats.
- Match compatibility, score, and geographic distance.

The visual product may contain mature-looking mock flows, but new work must not present mock activity as belonging to a real registered player.

## Design Direction

- The tone is energetic, friendly, practical, and tennis-specific. It should feel like an app someone uses to get onto a court, not a polished corporate SaaS dashboard.
- Use tennis-lime intentionally, alongside ink/bone and surface colours. Avoid one-colour UI.
- Cards are for repeated items and framed tools, not for wrapping every page section.
- Use familiar icon controls where appropriate; provide accessible labels/tooltips for icon-only buttons.
- Avoid decorative gradients/orbs and generic marketing hero treatments.
- Images should be local project assets, not hotlinked external images.
- Profile metadata chips that are not interactive should not animate, hover, or receive semantic highlight colours.

## Near-Term Product Priorities

1. Create a real match model and use it for the public player detail tabs: scheduled, past, and open games.
2. Associate real courts and passport progression with a player.
3. Introduce real location strategy and calculate distance only after privacy/precision decisions are explicit.
4. Define and implement an actual compatibility score, then expose it only to registered users.
5. Replace mock-backed features incrementally, keeping product states honest during migration.
