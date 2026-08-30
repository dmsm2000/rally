# 🎾 Rally

**Your next tennis partner is closer than you think.**

Rally is a social network built around a simple idea: tennis is better with company. It's the app for finding someone to play with tonight, discovering a new court on your next trip, and keeping track of every country you've ever hit a ball in — like a passport, but for tennis.

This repository is the full working prototype of that experience: no server, no real accounts behind the scenes, but everything behaves as if there were. Every screen, animation and interaction was designed to feel like a product ready to ship.

---

## 🧠 The idea

Social tennis isn't really about rankings and results — it's about finding the right people, on the right courts, at the right time. Rally is built around four questions every player asks themselves:

- **"Who can play with me right now?"** → player discovery by level, format, availability and distance.
- **"Where can I play around here?"** → a living map of courts discovered by the community, with ratings and real photos.
- **"Where have I already played?"** → a tennis passport with countries, courts and unlocked achievements.
- **"How do I set up a game without leaving the app?"** → open matches, invites, and a light chat just to sort out the details.

None of this requires a tedious "professional profile" to fill in — sign-up is a handful of quick, slightly fun questions (dominant hand, playing style, "do you play to win or to hang out?"), and your avatar generates itself from your name.

## ✨ What you can already do

| | |
|---|---|
| 🏠 **Feed** | A daily digest of what's happening around you — who played, who discovered a court, who's about to unlock a new country. |
| 🌍 **Explore the world** | A map of destinations, players by city, and "I'll be in town — show me the local tennis scene?" requests. |
| 🎾 **Courts** | Discovery and filtering by surface, indoor/outdoor and location, with community ratings. |
| 🥎 **Matches** | Booked matches, results, match stats, and a board of open challenges to arrange a game with whoever's free. |
| 🛂 **Passport** | Countries visited, players met, and achievements — from "First International Match" to "Tennis Around The World". |
| 💬 **Messages** | A discreet floating chat (this isn't an app for chatting all day — it's just to arrange the game), with a "typing" indicator and simulated replies. |
| 🔔 **Notifications** | A bell always close by to flag new messages, accepted matches and unlocked achievements. |
| 🪪 **Profile** | A single page where everything is editable — no separate "view" and "edit" modes. |
| 👀 **Observer mode** | Come in without signing up, just to browse — no booking games, posting or messaging. |
| 🌗 **Theme & language** | Light/dark and Portuguese, Spanish and English, all switchable in one click. |

And by the way: every filter chip in the app is literally shaped like an empty tennis-ball can. Just because.

## 🎨 How it feels

The whole design breathes tennis: the primary colour is tennis-ball lime, cards use a court grid as background texture, the active nav indicator is a "ball" that slides between tabs, and avatars (auto-generated, one per person) always sit on a clay, grass or hard-court coloured background. Small personality touches — like the chat icon being a tennis ball that "bounces" when there are new messages — are part of the experience, not an afterthought.

## 🏗️ Under the hood (the technical bit, briefly)

There's no backend at all — on purpose. This is a product prototype, not infrastructure. The entire "database" lives in memory, organised exactly as it would be if it were wired up to a real service tomorrow (the design already accounts for that swap without touching the rest of the app).

- **Angular 22**, standalone components and signals only — no legacy modules.
- **Tailwind CSS v4** for the design system, with custom tokens (colours, typography, animations).
- **DiceBear** to generate every player's avatar, always from the same "seed" — the same name always produces the same avatar.
- A single data layer standing in for what would be Supabase: per-feature services and repositories, all pointing at the same source of truth.
- Support for 3 languages (EN/ES/PT) through a custom translation service, with no external i18n dependencies.

## 🚀 Getting started

```bash
npm install
npm start
```

Then just open `http://localhost:4200` — the app reloads automatically whenever a file changes.

Other useful commands:

```bash
npm run build   # production build
npm run lint    # lint the codebase
```

---

*Rally is a demo prototype — every player, match and conversation in it is fictional (but hopefully inspiring).*
