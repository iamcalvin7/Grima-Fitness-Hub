---
name: Deployment environment markers
description: Which Replit environment variables reliably distinguish a published deployment from the development workspace.
---

Use `REPLIT_DEPLOYMENT`, `REPLIT_DEPLOYMENT_ID`, or `REPLIT_ENV` as deployment
markers. Do not treat `REPLIT_ENVIRONMENT=production` by itself as proof that a
process is running in a published deployment.

**Why:** The development agent shell exposed `REPLIT_ENVIRONMENT=production`
while the documented deployment variables were unset, causing a development-only
catalogue tool to reject every legitimate development run. Replit documentation
identifies `REPLIT_ENV`/`REPLIT_DEPLOYMENT` as the automatic deployment markers.

**How to apply:** For development-only scripts, require an explicit local
development flag and fail closed when any documented deployment marker is set.
Do not bypass those documented markers; simply avoid the unrelated
`REPLIT_ENVIRONMENT` false positive.