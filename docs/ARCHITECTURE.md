# Architecture — Marcus Grima PT

## Overview

pnpm monorepo with three artifacts: a React/Vite web app, an Express API, and a Vite-based canvas/mockup sandbox. All three share a `lib/db` package for database access.

---

## Package Map

```
/ (workspace root)
├── artifacts/
│   ├── marcus-grima/    React + Vite + Tailwind web app (client-facing)
│   ├── api-server/      Express 5 API (Node.js)
│   └── mockup-sandbox/  Design tooling (canvas/iframe previews)
├── lib/
│   └── db/              Drizzle ORM schema + client (@workspace/db)
├── docs/                Engineering documentation
└── HANDOFF.md           Living project brief
```

---

## Web App (artifacts/marcus-grima)

**Stack:** React 18, Vite 7, TypeScript, Tailwind CSS 4, Framer Motion, Phosphor Icons

**State routing:** no URL router. `App.tsx` manages a `Page` union type and renders the appropriate page component. Navigation is handled by `setPage(page)` passed through props.

**Query-param entry points:** `App.tsx` reads `window.location.search` on mount for deep-link tokens:
- `?reset=<token>` → `ResetPassword` screen
- `?verify=<token>` → `VerifyEmailHandler` screen
- `?oauth=success` → `OAuthCallback` screen (refreshes AuthContext)
- `?oauth_error=...` → `OAuthCallback` error screen

**Auth state:** `AuthContext` (React context + provider) holds `user`, `profile`, loading states, and all auth operations. All API calls go through `src/lib/api.ts`:`apiRequest`. Session cookie is HTTP-only — the frontend never touches it.

**Profile loading:** `AuthContext` loads the profile immediately after resolving the session. The splash screen is held until both the auth check and (for signed-in users) the profile load have settled, preventing any FOUC of stale state.

**Design conventions:**
- Background: `#0A0A0A` (near-black)
- Primary accent: `#22c55e` (green, Tailwind `primary`)
- Typography: uppercase tracked labels, bold numbers
- Icons: Phosphor, `weight="fill"` everywhere; back/close use `weight="bold"`
- No amber/gold — premium styling is silver/white

---

## API Server (artifacts/api-server)

**Stack:** Node.js 22, Express 5, TypeScript, esbuild (production build), Pino (structured logging)

**Port:** reads `PORT` env var (default 8080 in dev). Accessed by the Replit proxy at `/api`.

**Middleware chain:** cookie-parser → CORS → JSON body → routes

**CORS:** allowlist from `REPLIT_DEV_DOMAIN` and `REPLIT_DOMAINS`. Never `origin: true`.

**Route structure:**
```
routes/index.ts        → mounts all routers under /
routes/auth.ts         → /auth/* (signup, signin, signout, me, forgot, reset, verify, providers)
routes/oauth.ts        → /auth/google, /auth/google/callback + /auth/providers
routes/profile.ts      → /profile (GET, POST, PATCH)
routes/account.ts      → /account/* (security, password, email, sessions, delete)
```

**No JWT.** All auth flows use the `mg_session` cookie → `sessions` DB table.

---

## Database (lib/db)

Drizzle ORM + node-postgres. `DATABASE_URL` from Replit Postgres integration.

See `docs/DATABASE.md` for full schema.

Build: after any schema change, `pnpm --filter @workspace/db run push` then `npx tsc -b` in `lib/db`.

---

## Deployment

Replit monorepo deployment. `artifact.toml` registers:
1. `artifacts/marcus-grima` as a static artifact (Vite `dist/public`)
2. `artifacts/api-server` as a runnable artifact (Express process on port 8080)

The Replit proxy routes `/api/*` to the Express process and `/` to the static files.

---

## Key Architectural Decisions

1. **Cookie sessions over JWT** — No token refresh complexity, trivial server-side revocation, no token storage in JS.
2. **scrypt via node:crypto** — No bcrypt dependency, modern algorithm, built-in.
3. **Tokens stored hashed** — SHA-256 hash in DB; raw token only in the email link. A leaked DB row gives no working token.
4. **Single-use tokens** — Consumed with an `UPDATE … WHERE usedAt IS NULL` pattern; concurrent redemption is safe.
5. **Anti-enumeration everywhere** — Auth endpoints never confirm whether an email exists. Timing is equalized with dummy-hash calls.
6. **State routing** — No URL router in v1. Simpler to reason about, no browser history entanglement. Query params used sparingly for external entry points (email links, OAuth callbacks).
7. **Provider-independent email** — `EmailService` interface; swap `RESEND_API_KEY` presence to toggle between console logging and real delivery.
8. **Tenant seam** — `getDefaultTenant()` returns the single tenant. Multi-tenancy is a future upgrade without rearchitecting.
9. **`passwordHash` nullable** — OAuth-only accounts have no password. Sign-in endpoint runs dummy hash to equalize timing.

---

## Scalability Notes

- Rate limiter is in-memory and per-process. Replace with Redis store before horizontal scaling.
- Session cleanup (`deleteExpiredSessions`) is not yet scheduled as a cron job — run it manually or add a `node-cron` job.
- Avatar storage as data URLs in PostgreSQL is interim. Swap to Replit Object Storage when avatars grow in size or count.
