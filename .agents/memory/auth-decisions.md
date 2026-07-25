---
name: Auth architecture decisions
description: Security and architecture rules for the Marcus Grima PT backend auth, agreed in Sprint 1.
---

- **DB-backed cookie sessions, no JWTs.** Opaque 32-byte token in an HTTP-only `mg_session` cookie (SameSite=Lax, Secure in prod, 30-day TTL); only its SHA-256 hash is stored in the `sessions` table.
- **Password hashing: scrypt via `node:crypto`** (format `scrypt:<salt>:<hash>`, timing-safe compare). Do not install bcrypt/argon2 — explicit constraint from the lead engineer's spec.
- **Single-tenant but tenant-aware.** All user lookups scope by `tenantId`; default tenant slug `marcus-grima` is auto-seeded (cached in `src/lib/tenant.ts`). Branding lives in `tenants.branding` jsonb — white-label seam.
- **CORS:** credentialed CORS restricted to this project's own domains (REPLIT_DEV_DOMAIN + REPLIT_DOMAINS allowlist in app.ts). Never `origin: true` with credentials — flagged as critical in review.
- **No account enumeration:** signup returns a generic 400 for existing emails; signin uses one generic message and hashes a dummy password when the user is missing to keep timing uniform.
- **Why:** review round rejected open CORS + 409 "already exists" as enumeration/security leaks; these rules keep future auth endpoints (password reset etc.) consistent.
