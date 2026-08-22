BEGIN;

ALTER TYPE commercial_pricing_rule
  ADD VALUE IF NOT EXISTS 'confirmed_participant_count';

ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS commercial_closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commercial_closed_participant_count INTEGER;

DO $$ BEGIN
  ALTER TABLE training_sessions
    ADD CONSTRAINT training_sessions_closed_participant_non_negative
      CHECK (
        commercial_closed_participant_count IS NULL
        OR commercial_closed_participant_count >= 0
      );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE booking_commercials
  ADD COLUMN IF NOT EXISTS reserved_amount_minor INTEGER,
  ADD COLUMN IF NOT EXISTS locked_participant_count INTEGER,
  ADD COLUMN IF NOT EXISTS locked_charge_amount_minor INTEGER;

UPDATE booking_commercials
  SET reserved_amount_minor = maximum_held_amount_minor
  WHERE reserved_amount_minor IS NULL;

ALTER TABLE booking_commercials
  ALTER COLUMN reserved_amount_minor SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE booking_commercials
    ADD CONSTRAINT booking_commercials_reserved_non_negative
      CHECK (reserved_amount_minor >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE booking_commercials
    ADD CONSTRAINT booking_commercials_reserved_within_maximum
      CHECK (reserved_amount_minor <= maximum_held_amount_minor);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE booking_commercials
    ADD CONSTRAINT booking_commercials_locked_participant_positive
      CHECK (locked_participant_count IS NULL OR locked_participant_count > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE booking_commercials
    ADD CONSTRAINT booking_commercials_locked_charge_non_negative
      CHECK (locked_charge_amount_minor IS NULL OR locked_charge_amount_minor >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;