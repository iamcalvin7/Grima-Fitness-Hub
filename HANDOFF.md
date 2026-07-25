# Marcus Grima PT — Engineering Handoff Brief

**Audience:** incoming lead engineer.
**Status:** polished client-side prototype, client has signed off. Next phase: build the real product (backend, accounts, integrations) for launch.

---

## 1. What this product is

A personal-training client app for Marcus Grima (PT, Malta). Clients get workouts, meal plans, session bookings, daily "story" content from their trainer, challenges, and a leaderboard. Marcus gets a coached-client relationship in one branded app.

**Strategic note:** the owner intends to white-label this and sell to other trainers later. Architect the backend so branding/content is data, not code (single-tenant now, but keep a clean seam — config-driven branding, no hard-coded "Marcus Grima" in new code). Full multi-tenancy is a later milestone, not v1.

## 2. Repo layout

pnpm monorepo. Relevant packages:

- `artifacts/marcus-grima` — **the app.** React + Vite + TypeScript + Tailwind + framer-motion, phosphor icons (`weight="fill"` style everywhere; carets/X use `weight="bold"`). Workflow: `artifacts/marcus-grima: web`.
- `artifacts/api-server` — Express skeleton, currently unused by the app. This is where the real backend goes.
- `artifacts/mockup-sandbox` — canvas preview tooling, ignore for product work.

App structure: `src/pages/*` (one file per screen, routed by a `Page` union in `App.tsx` — no router), `src/components/*` (BottomNav, Sidebar, BurgerMenu, BodyMap, Layout, Logo), `src/data/*` (static content: programs, sessions), `public/` (all images: program art, team photos, story images, logo).

**Design language:** near-black (#0A0A0A) + metallic silver, green `primary` accent, uppercase tracked labels, rounded-2xl cards. Premium styling is silver (was gold — do not reintroduce amber). Keep this language; the client is happy with it.

## 3. What's built (all client-side today)

- **Onboarding/auth (fake):** multi-step signup + signin. Users stored in localStorage `mg_users` (plaintext passwords), session in `mg_auth` (30-day expiry), profile in `mg_profile`. Built-in demo logins: `marcus/grima2024`, `client/mgpt2024` (see `BUILTIN` in Onboarding.tsx).
- **Home:** hero with avatar + IG-style story ring (green unseen / orange seen, `mg_story_seen` by date). StoryViewer: multi-story (daily quote + "What I'm Reading" book), progress bars, 7s auto-advance, hold-to-pause, tap left/right nav. Story content is hard-coded in Home.tsx.
- **Workouts:** free program (name personalized via getters in `programs.ts`) + premium programs with simulated unlock/paywall (ownership in localStorage). Card style: image, floating stat-chip bar on photo, title/description below.
- **Muscle map (BodyMap.tsx):** SVG front/back figure with tap-to-highlight muscle regions; both view images stay mounted (instant switching — keep it that way).
- **Sessions, Meal Plans, Leaderboard, Members Offers, Memberships:** fully designed screens on demo/static data.
- **Messages:** demo conversations, nothing sent. NOTE: `ThreadView` is rendered as `{ThreadView()}` deliberately — rendering it as a component remounts the input per keystroke and closes the mobile keyboard. Don't "fix" that.
- **Team page:** Jan Tanti & Amy Zahra, profile sheets, WhatsApp deep links (numbers are placeholders +356 79 000 001/002; photos are AI-generated placeholders — swap when real ones arrive).
- **Profile:** avatar upload (canvas-resized to 256px JPEG in localStorage `mg_avatar`), inline username editing with validation.
- **Navigation:** mobile bottom nav (Home, Sessions, Messages, More) + More sheet (Workouts, Meals, Leaderboard, Memberships, Offers, Team, Profile); desktop sidebar.

TypeScript is clean: `npx tsc --noEmit` passes with zero errors in both marcus-grima and api-server. Keep it that way.

## 4. The build ahead (agreed with client, in dependency order)

1. **Backend + real accounts (critical path — everything depends on it).**
   Express API in `artifacts/api-server`, Replit PostgreSQL, hashed passwords, sessions (SESSION_SECRET exists), password reset, admin (Marcus) vs client roles. Migrate all localStorage state (users, profiles, avatars, progress, premium ownership, story-seen) to the API. Branding/content as data (white-label seam).
2. **Story uploads:** admin screen for Marcus to post the daily photo/quote/book; files in Replit App Storage; all clients fetch today's story; per-user seen state.
3. **Sessions & booking:** Marcus manages a real calendar; clients book/cancel with rules; package credits tracked per client.
4. **Memberships/payments:** Stripe for session packages and premium program unlocks (real ownership server-side). Client may opt for "contact to buy" in v1 — confirm before building checkout.
5. **Activity metrics via Strava** (decision made: Strava OAuth + webhooks; reframe Home metrics from daily steps to weekly training activity — sessions, active minutes, calories from recorded workouts). No Apple Health (web app; no native wrapper in v1).
6. **Photo food logging (AI):** camera upload → vision model (use Replit AI integrations) → calories/macros estimate → editable → daily diary Marcus can see, tied to prescribed meal plans. Photos in App Storage. Barcode/Open Food Facts is a later add.
7. **Leaderboard:** real weekly points computed server-side from actual activity.
8. **Messaging:** likely defer to WhatsApp for v1 — confirm with owner before building.
9. **Content & polish:** real WhatsApp numbers/photos for team, real offers, real program/meal content from Marcus, remaining purple-styling cleanup (open task #2), challenge midnight reset verification (open task #3), publish + custom domain.

## 5. Environment facts & gotchas

- Vite app reads `PORT`; preview is proxied — use `import.meta.env.BASE_URL` for asset/API URLs, never root-relative `/api/...`.
- Workflow occasionally dies with "Port already in use" — restart fixes it.
- The app is gated behind onboarding; `/?onboarding` query param forces the onboarding flow (useful for testing).
- Screenshot tooling can't get past the auth gate to inner pages; test inner pages with e2e tooling or demo login.
- Pre-existing Onboarding type errors were fixed; don't regress.
- Icons: @phosphor-icons/react everywhere except `src/components/ui/` (shadcn internals stay lucide).

## 6. Cost/scale context (already communicated to client)

Steady-state target ~€25–50/month (hosting + DB + App Storage); Stripe per-transaction; Strava/AI usage negligible at PT scale. Keep infra simple — this serves tens of clients, not thousands.
