---
name: Commercial value lifecycle
description: Invariants for Marcus Sessions internal pricing, holds, and settlement.
---

Commercial value is internal training value in integer EUR minor units, never a payment balance. Pricing resolution is client assignment first, then tenant default; every new booking receives an immutable rate snapshot and one active hold at its maximum 1-to-1 rate.

Class price is established once, at class close—not from attendance. A scheduled class closes automatically when confirmed bookings reach capacity, or Marcus may close it before the start time. The confirmed count and each participant's locked amount are immutable; active holds reduce to that amount and excess immediately returns to available value. Later cancellations, no-shows, attendance outcomes, and plan edits must never reprice any remaining booking.

**Why:** Future plan edits, reschedules, retries, changing attendance, and post-close booking changes must not alter a class price that clients already rely on or accidentally double-charge a client.

**How to apply:** Releasing or settling a hold must be idempotent. A reschedule preserves the original booking snapshot as released history and creates one replacement snapshot with the only active reservation. Class close must serialize with confirmation and booking creation, persist a one-per-session close record, and block further normal bookings. Attendance and no-show decisions consume only the already-locked amount. Manual value changes require an idempotency key. Settlement is only allowed after the training session is completed, all active participants have attendance outcomes, all no-show decisions are recorded, and a class price was locked.

## Concurrency boundary

Any operation that creates, releases, or consumes a hold must serialize through the same rows as its competing lifecycle operations: lock the training session first, then the client, and read eligibility only after those locks are held. Negative value changes must use the client lock before calculating availability.

**Why:** A pre-lock eligibility check can become stale while cancellation, class close, or another financial adjustment commits, leaving an active hold on a terminal booking or consuming value already reserved elsewhere.

**How to apply:** Keep the session-then-client lock order for booking, close, cancellation, and legacy-onboarding paths. Recheck booking/session state and idempotent records after the relevant lock; concurrent terminal and replay paths must converge on a safe no-op or release, never create an extra active hold.