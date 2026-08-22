---
name: Weekly schedule transition
description: Simplified weekly planning has replaced the recurrence workflow while preserving legacy history.
---

Use ordinary dated `training_sessions` as the weekly schedule source of truth. New slots may omit a session type, but must set capacity explicitly.

**Why:** The operator needs a direct, understandable weekly planner without auto-generation, while prior typed sessions, bookings, and recurrence records need to remain safe during the transition.

**How to apply:** Keep recurrence tables and code available for historical/transition safety, but do not re-register recurrence routes or restart automatic generation unless the product explicitly reintroduces that workflow. Treat active bookings as a lock on schedule details and deletion.