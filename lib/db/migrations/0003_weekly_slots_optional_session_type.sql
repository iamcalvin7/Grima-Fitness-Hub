-- Simplified weekly scheduling correction.
-- Existing typed sessions, bookings, and recurrence records are preserved.
-- New dated schedule slots may omit a session type.

BEGIN;

ALTER TABLE training_sessions
  ALTER COLUMN session_type_id DROP NOT NULL;

COMMIT;