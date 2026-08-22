---
name: Booking migration ordering
description: Constraint ordering requirement for tenant-safe booking-schema migrations.
---

Tenant-pair foreign keys in the booking domain must be introduced only after their
target `(tenant_id, id)` pairs have real PostgreSQL unique constraints. Keep the
booking migration self-contained and replayable for a clean schema; do not rely
on `drizzle-kit push` to determine the safe ordering.

**Why:** Drizzle's push flow can create the new tables before attempting dependent
composite foreign keys, then fail because PostgreSQL has not yet received the
required target unique constraints. Retrying via a schema diff may subsequently
try to rebuild already-dependent constraints.

**How to apply:** For booking-schema changes, edit the declarative Drizzle schema
and the ordered SQL migration together. Replay the SQL migration in a temporary
empty schema and verify the composite tenant foreign keys directly.