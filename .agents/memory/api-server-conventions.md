---
name: API server routing & monorepo build
description: How the api-server is routed in dev and how TypeScript project references behave after db schema changes.
---

- The Express API is reachable at `https://$REPLIT_DEV_DOMAIN/api/...` — its artifact.toml maps `paths = ["/api"]`. Do NOT use `/api-server/...`; that falls through to the web app and returns Vite HTML.
- **Why:** artifact routing is path-based via each artifact's `.replit-artifact/artifact.toml`, not the artifact directory name.
- **How to apply:** curl tests and frontend API calls use the `/api` prefix.

- After changing `lib/db/src/schema/*`, run `npx tsc -b` in `lib/db` (or from api-server) before typechecking api-server; the workspace uses composite project references with emitted `.d.ts` in `lib/db/dist`, so stale declarations cause "has no exported member" errors.
