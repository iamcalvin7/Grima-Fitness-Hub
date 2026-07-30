# Setup Guide — Marcus Grima PT

## Prerequisites

- Replit account with the project open
- Node.js 22 (provided by Replit's Nix environment)
- pnpm (provided by Replit)

---

## Development Setup

All workflows start automatically in Replit. If they stop:

```bash
# Start the web app (dev server on PORT=18908)
pnpm --filter @workspace/marcus-grima run dev

# Start the API server
pnpm --filter @workspace/api-server run dev
```

Or restart from the Workflows panel in the Replit UI.

---

## Environment Variables & Secrets

Managed by Replit Secrets (never commit to code).

### Required (already set up by Replit integration)
| Secret | Source | Purpose |
|---|---|---|
| `DATABASE_URL` | Replit Postgres | Database connection |
| `SESSION_SECRET` | Manual | Cookie session signing (set once, never change) |

### Optional — email delivery
| Secret | Notes |
|---|---|
| `RESEND_API_KEY` | From resend.com — required for real email delivery |
| `EMAIL_FROM` | e.g. `Marcus Grima PT <noreply@yourdomain.com>` — must be a verified sender on Resend |

Without these, all email flows work but emails are logged to the server console instead of delivered. `GET /api/auth/providers` returns `emailDelivery: "console"`.

### Optional — Google OAuth
| Secret | Notes |
|---|---|
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |

Without these, the Google button does not appear on the choice screen. Email auth works normally. `GET /api/auth/providers` returns `google: false`.

### Google OAuth setup steps
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or use an existing one)
3. Enable the "Google People API"
4. Go to APIs & Services → Credentials → Create OAuth 2.0 Client ID
5. Application type: Web application
6. Authorized redirect URI: `https://<your-replit-dev-domain>/api/auth/google/callback` (dev) and `https://<your-deployed-domain>/api/auth/google/callback` (production)
7. Copy Client ID and Client Secret → add to Replit Secrets as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
8. Restart the API workflow

---

## Database Setup

The database is provisioned and connected via Replit's Postgres integration. Schema is applied via Drizzle.

```bash
# Push schema to DB (run from workspace root)
pnpm --filter @workspace/db run push

# After any schema change, rebuild type declarations
cd lib/db && npx tsc -b
```

---

## Production Build

```bash
# Frontend
cd artifacts/marcus-grima
PORT=18908 BASE_PATH=/ pnpm run build

# API
cd artifacts/api-server
NODE_ENV=production pnpm run build
```

Replit deployment runs these automatically via `artifact.toml`.

---

## Adding the First Admin User

There is no admin UI in v1. To promote a user to admin:

```sql
UPDATE users SET role = 'admin' WHERE email = 'marcus@example.com';
```

Run via Replit's database console or via `psql $DATABASE_URL`.

---

## Resend Email Setup (production)

1. Create a [Resend](https://resend.com) account
2. Add and verify your sending domain (DNS records provided by Resend)
3. Create an API key with "Sending" access
4. Add to Replit Secrets: `RESEND_API_KEY`, `EMAIL_FROM`
5. Restart the API workflow

In dev (no Resend key), all emails are printed to the API server log — copy the link from there to test flows.
