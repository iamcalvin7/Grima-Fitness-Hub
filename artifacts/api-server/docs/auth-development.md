# Development authentication

The API exposes `POST /api/auth/dev-signin/admin` only from an explicit
`NODE_ENV=development` process with none of the documented deployment markers
(`REPLIT_DEPLOYMENT`, `REPLIT_DEPLOYMENT_ID`, or `REPLIT_ENV`) set.

The route accepts no identity or credential fields. It uses the server-held
`MG_ADMIN_PASSWORD` to find exactly one active admin whose stored password hash
matches in the default Marcus tenant, then creates the normal database-backed
HttpOnly session. It is unavailable when the secret is missing or the match is
missing/ambiguous. `MG_ADMIN_EMAIL` is intentionally not consulted.