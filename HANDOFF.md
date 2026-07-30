# Marcus Grima PT — Engineering Handoff Brief

**Audience:** incoming lead engineer.  
**Status:** Sprint 4 complete. Full authentication and account lifecycle is live. The app is production-ready on auth; two external-credential blockers remain before real users can be onboarded (see Launch Readiness below).

---

## 1. What this product is

A personal-training client app for Marcus Grima (PT, Malta). Clients get workouts, meal plans, session bookings, daily "story" content from their trainer, challenges, and a leaderboard. Marcus gets a coached-client relationship in one branded app.

**Strategic note:** the owner intends to white-label this and sell to other trainers later. Architect the backend so branding/content is data, not code (single-tenant now, but keep a clean seam — config-driven branding, no hard-coded "Marcus Grima" in new code). Full multi-tenancy is a later milestone, not v1.

---

## 2. Repo layout

pnpm monorepo. Relevant packages:

- `artifacts/marcus-grima` — **the app.** React + Vite + TypeScript + Tailwind + framer-motion, phosphor icons (`weight="fill"` style everywhere; carets/X use `weight="bold"`). Workflow: `artifacts/marcus-grima: web`.
- `artifacts/api-server` — Express 5 API. All routes under `/api`. Workflow: `artifacts/api-server: API Server`.
- `artifacts/mockup-sandbox` — canvas preview tooling, ignore for product work.
- `lib/db` — Drizzle ORM schema + client (`@workspace/db`). After schema changes: `pnpm --filter @workspace/db run push` then `npx tsc -b` in `lib/db`.

**Design language:** near-black (#0A0A0A) + metallic silver, green `primary` accent, uppercase tracked labels, rounded-full buttons. Do not reintroduce amber/gold. Keep this language; the client is happy with it.

---

## 3. What's built (current state)

### Authentication & Accounts (Sprint 4, complete)
- Email + password signup, signin, signout
- Google OAuth (PKCE, state cookie CSRF protection, identity linking rules) — awaits credentials
- Apple Sign-in placeholder — visible, disabled ("coming soon")
- Forgot password (hashed 30-min single-use token, anti-enumeration)
- Reset password via `?reset=<token>` query param
- Email verification + resend via `?verify=<token>`
- Change email (password-gated + confirmation-gated via verification email)
- Change password (current password required; other sessions revoked, current kept)
- Set password for OAuth-only accounts
- Account Security page (email status, password, linked identities, change email, delete account link)
- Active Sessions page (list by device/IP/time, revoke one, sign out all others)
- Delete account (hard delete, password or "DELETE" confirm, FK cascades)
- OAuth onboarding: authenticated Google users without a profile run the profile-only wizard (skips name/login steps)
- Rate limiting on all sensitive endpoints
- Provider discovery: `GET /api/auth/providers`

### Profiles (Sprint 3, complete)
- `profiles` table: create, read, update
- Onboarding wizard (8 steps): name → gender → age → weight → height → goal → activity level → create login
- Profile page: display + edit name, avatar (256px JPEG data URL), goals, personal info
- Legacy localStorage migration (one-time, server wins)

### Home & Core UI (Sprints 1–2, complete)
- Home: story ring + story viewer, sessions grid
- Sessions, Messages, Profile, Workouts, Meal Plan, Leaderboard, Offers, Memberships, Team pages
- Navigation: BottomNav (mobile) + Sidebar (desktop)

---

## 4. State routing

There is no URL router. `App.tsx` maintains a `Page` union type; all navigation is `setPage(page)`. Query params are the only external entry points:

| Param | Effect |
|---|---|
| `?reset=<token>` | Shows ResetPassword screen |
| `?verify=<token>` | Shows VerifyEmailHandler screen |
| `?oauth=success` | Shows OAuthCallback (refreshes session) |
| `?oauth_error=...` | Shows OAuthCallback error |

---

## 5. Key files

| File | Purpose |
|---|---|
| `artifacts/marcus-grima/src/App.tsx` | Root: page routing + query-param modals + auth gates |
| `artifacts/marcus-grima/src/auth/AuthContext.tsx` | Auth state, profile, all API ops |
| `artifacts/marcus-grima/src/lib/api.ts` | `apiRequest` — all fetch calls |
| `artifacts/marcus-grima/src/pages/Onboarding.tsx` | Welcome + signup + signin + forgot + profile-only (OAuth) |
| `artifacts/api-server/src/routes/auth.ts` | Auth routes + new token routes |
| `artifacts/api-server/src/routes/oauth.ts` | Google OAuth + `/auth/providers` |
| `artifacts/api-server/src/routes/account.ts` | Account management routes |
| `artifacts/api-server/src/lib/sessions.ts` | Session create/revoke/revokeAll |
| `artifacts/api-server/src/lib/tokens.ts` | Reset + verification token helpers |
| `artifacts/api-server/src/lib/email.ts` | Email service abstraction |
| `artifacts/api-server/src/lib/rateLimit.ts` | In-memory rate limiter |
| `lib/db/src/schema/` | All DB tables |
| `docs/` | Full engineering documentation |

---

## 6. Launch blockers

### 🔴 Resend (email delivery)
Without `RESEND_API_KEY` + `EMAIL_FROM` + a verified sending domain, password reset, verification, and email-change emails are only logged to the server console — not delivered.  
**See:** `docs/SETUP.md`, `docs/LAUNCH-READINESS.md`

### 🔴 Google OAuth credentials
Without `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`, the Google button does not appear. Email auth works fine without it, so this can be deferred if email-only launch is acceptable.  
**See:** `docs/SETUP.md`

### 🟡 Google OAuth app verification
Required before >100 Google users. Needs Privacy Policy + Terms of Service URLs.

### 🟡 Content / CMS
Sessions, workouts, meals, leaderboard, offers, memberships show placeholder data. Not an auth issue — a product roadmap item.

---

## 7. Documentation

All in `docs/`:

| File | Contents |
|---|---|
| `AUTH.md` | Password hashing, session model, token lifecycle, OAuth flow, linking rules, rate limits, anti-enumeration |
| `API.md` | Every endpoint: method, path, auth, body, response, errors |
| `DATABASE.md` | Full schema with column types and cascade rules |
| `ARCHITECTURE.md` | Package map, design decisions, scalability notes |
| `SETUP.md` | Dev setup, env vars, secrets, Google OAuth config, Resend setup |
| `COSTS.md` | Infrastructure costs, Resend pricing, Google OAuth (free), Apple ($99/yr) |
| `LIMITATIONS.md` | Known limits: Apple, MFA, rate-limiter scaling, avatars, GDPR |
| `LAUNCH-READINESS.md` | Hard vs soft blockers, pre-launch checklist |
| `CHANGELOG.md` | Sprint-by-sprint history |
| `ROADMAP.md` | Post-launch phases: unblocking → core product → engagement → white-labelling |

---

## 8. Development notes

- Never hard-code `marcus-grima` into new backend logic — use `getDefaultTenant()`
- Do not modify `BodyMap` or `ThreadView` (`{ThreadView()}` is called as a function deliberately)
- Avatar regex rejects SVG (security) — only raster data URLs accepted
- The splash screen is intentional loading UX, not a flash bug
- `isProfileLoading` gates the splash so no stale-state flash occurs
- E2e test accounts use `e2e-%@example.com` pattern — clean up after tests
