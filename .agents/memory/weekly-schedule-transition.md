---
name: Weekly schedule and recurrence
description: Weekly planner and recurring availability coexist while all bookable sessions remain ordinary dated records.
---

Use ordinary dated `training_sessions` as the weekly schedule source of truth. New slots may omit a session type, but must set capacity explicitly. Admin-managed recurring availability may materialize typed future sessions into that same table.

**Why:** The operator needs both direct control of one-off weekly slots and a safe way to keep recurring, typed availability bookable without changing the established booking domain.

**How to apply:** Keep dated sessions as the only client-bookable records. Reconcile recurrence changes through the protected admin workflow, preserve manually created sessions, and treat active bookings as a lock on automatic deletion or schedule details. The convenience materializer remains development-only unless a separate production scheduling decision is made.