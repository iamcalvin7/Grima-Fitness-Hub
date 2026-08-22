---
name: Commercial value lifecycle
description: Invariants for Marcus Sessions internal pricing, holds, and settlement.
---

Commercial value is internal training value in integer EUR minor units, never a payment balance. Pricing resolution is client assignment first, then tenant default; every new booking receives an immutable rate snapshot and one active hold at its maximum 1-to-1 rate.

**Why:** Future plan edits, reschedules, retries, and changing attendance must not alter the value originally reserved or accidentally double-charge a client.

**How to apply:** Releasing or settling a hold must be idempotent. A reschedule preserves the original booking snapshot as released history and creates one replacement snapshot with the only active reservation. Manual value changes require an idempotency key. Settlement is only allowed after the training session is completed, all active participants have attendance outcomes, and all no-show decisions are recorded.