---
name: Integration test harness (api-server)
description: How the DB-backed integration tests are isolated, how to run them, and key design decisions.
---

# Integration test harness — api-server

## How to run
```
pnpm --filter @workspace/api-server test:integration
```
Uses `vitest.integration.config.ts` (separate from the unit config).

## Isolation model
- `global-setup.ts` creates a temporary PostgreSQL schema (`test_integ_<16-hex>`) inside the dev DB before tests start; drops it with physical verification after.
- `env-setup.ts` (setupFiles) attaches a `pool.on('connect', ...)` handler that issues `SET search_path TO "<schema>"` on every new pg connection. Because pg processes commands sequentially per connection, all app and fixture queries land in the test schema.
- `singleFork: true` — all integration test files share one worker, one module cache, one pool.
- No mocks. No production data touched. Dev schema (public) is invisible during the run.

## Safety guards (fail-closed)
- REPLIT_DEPLOYMENT must NOT be set.
- TEST_SCHEMA_NAME must start with "test_integ_".
- TEST_SCHEMA_NAME must not be "public".
- Cleanup is physically verified (schema absence confirmed after DROP CASCADE).

## File layout
```
artifacts/api-server/
  vitest.config.ts                           ← unit tests, excludes integration/
  vitest.integration.config.ts               ← integration tests only
  src/__tests__/integration/
    global-setup.ts                          ← schema create + DDL + teardown
    env-setup.ts                             ← connect-event + rate-limit reset
    harness.ts                               ← fixtures (createTenant, createUser, createSession, createContent, ...)
    privilege-escalation.test.ts             ← Stage 2 (43 tests)
    cross-tenant-role-change.test.ts         ← Stage 3 (19 tests)
```

## Key decisions

**Why connect-event for search_path (not DATABASE_URL options)?**
pg processes commands sequentially per connection. Registering `pool.on('connect', cb)` before any query runs guarantees all connections use the test schema. The `options=-c search_path=...` URL approach was considered but is less portable across pg versions.

**Why singleFork?**
The pool is created once. The connect-event handler is attached once. All test files use the same pool → same search_path → consistent isolation without per-file module re-loading.

**Audit route response shape:** `{ records, page, limit }` — not `{ logs }`.

**Tenant module cache:** `getDefaultTenant()` caches in a module-level `let cached`. Tests that call signup routes populate this cache with the test-schema tenant (slug 'marcus-grima'). Cross-tenant tests create Tenant B directly via `createTenant()` fixture.
