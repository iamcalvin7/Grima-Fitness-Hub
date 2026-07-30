# Database — Marcus Grima PT

## Engine

PostgreSQL (Replit managed). Accessed via Drizzle ORM (`lib/db` package, `@workspace/db`).

Connection: `DATABASE_URL` environment variable (injected by Replit; never hardcode).

---

## Schema

### `tenants`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | Display name |
| `slug` | text unique | `marcus-grima` in production |
| `createdAt` | timestamptz | |

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `tenantId` | uuid FK → tenants | |
| `email` | text | unique per tenant |
| `passwordHash` | text **nullable** | null for OAuth-only accounts |
| `firstName` | text | |
| `lastName` | text | |
| `avatarUrl` | text nullable | |
| `role` | enum | `client` / `trainer` / `admin` |
| `isActive` | boolean | default true |
| `emailVerifiedAt` | timestamptz nullable | |
| `lastLoginAt` | timestamptz nullable | |
| `createdAt` | timestamptz | |
| `updatedAt` | timestamptz | |

### `sessions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK → users CASCADE | |
| `tokenHash` | text unique | SHA-256 of opaque token |
| `userAgent` | text nullable | |
| `ipAddress` | text nullable | |
| `lastUsedAt` | timestamptz nullable | touched on each request |
| `createdAt` | timestamptz | |
| `expiresAt` | timestamptz | 30 days from creation |

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK → users unique | one profile per user |
| `firstName` | text nullable | |
| `lastName` | text nullable | |
| `gender` | text nullable | |
| `dateOfBirth` | date nullable | age→DOB is Jan 1 of birth year |
| `heightCm` | integer nullable | |
| `weightKg` | integer nullable | |
| `goal` | text nullable | |
| `activityLevel` | text nullable | reserved for real activity data |
| `experienceLevel` | text nullable | Beginner/Intermediate/Advanced |
| `avatarUrl` | text nullable | 256px JPEG data URL, ~300k char cap |
| `onboardingCompleted` | boolean | false until wizard is finished |
| `createdAt` | timestamptz | |
| `updatedAt` | timestamptz | |

### `auth_identities`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK → users CASCADE | |
| `provider` | text | `google` / `apple` |
| `providerUserId` | text | OIDC `sub` claim |
| `email` | text nullable | email from provider at time of linking |
| `createdAt` | timestamptz | |
| **unique** | `(provider, providerUserId)` | one identity row per provider account |

### `password_reset_tokens`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK → users CASCADE | |
| `tokenHash` | text unique | SHA-256 of raw token |
| `expiresAt` | timestamptz | 30 minutes from creation |
| `usedAt` | timestamptz nullable | set when consumed (single-use) |
| `createdAt` | timestamptz | |

### `verification_tokens`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK → users CASCADE | |
| `tokenHash` | text unique | |
| `purpose` | enum | `email_verify` / `email_change` |
| `newEmail` | text nullable | set when `purpose = email_change` |
| `expiresAt` | timestamptz | 24 hours |
| `usedAt` | timestamptz nullable | |
| `createdAt` | timestamptz | |

---

## Schema Management

Drizzle-managed. To apply schema changes:

```bash
# From repo root:
pnpm --filter @workspace/db run push    # pushes to DB (interactive if destructive)
npx tsc -b                              # rebuild type declarations
```

**After any schema change, always run `tsc -b` in `lib/db`.** The API server imports from `@workspace/db` and sees stale types otherwise.

Schema files: `lib/db/src/schema/*.ts`  
Index: `lib/db/src/schema/index.ts` — must re-export new table files.

---

## Cascade Rules

- `users` deleted → `sessions`, `profiles`, `auth_identities`, `password_reset_tokens`, `verification_tokens` all cascade delete
- Account deletion is currently hard delete. There is no `deletedAt` column.

---

## Indexes (recommended for production)

Add these before launching at scale:

```sql
CREATE INDEX ON sessions (user_id);
CREATE INDEX ON sessions (expires_at);      -- for cleanup jobs
CREATE INDEX ON password_reset_tokens (user_id);
CREATE INDEX ON verification_tokens (user_id);
CREATE INDEX ON auth_identities (user_id);
```
