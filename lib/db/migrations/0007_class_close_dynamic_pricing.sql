ALTER TYPE commercial_pricing_rule
  ADD VALUE IF NOT EXISTS 'class_close_confirmed_count';

DO $$ BEGIN
  CREATE TYPE commercial_class_close_reason AS ENUM ('full', 'marcus_manual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS commercial_class_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  training_session_id UUID NOT NULL,
  close_reason commercial_class_close_reason NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by_user_id UUID,
  confirmed_participant_count INTEGER NOT NULL CHECK (confirmed_participant_count > 0),
  pricing_rule commercial_pricing_rule NOT NULL DEFAULT 'class_close_confirmed_count',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT commercial_class_locks_tenant_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT commercial_class_locks_one_per_session UNIQUE (tenant_id, training_session_id),
  CONSTRAINT commercial_class_locks_tenant_session_fk
    FOREIGN KEY (tenant_id, training_session_id)
    REFERENCES training_sessions(tenant_id, id),
  CONSTRAINT commercial_class_locks_tenant_closer_fk
    FOREIGN KEY (tenant_id, closed_by_user_id)
    REFERENCES users(tenant_id, id)
);

ALTER TABLE booking_commercials
  ADD COLUMN IF NOT EXISTS held_amount_minor INTEGER,
  ADD COLUMN IF NOT EXISTS class_lock_id UUID,
  ADD COLUMN IF NOT EXISTS locked_participant_count INTEGER,
  ADD COLUMN IF NOT EXISTS locked_amount_minor INTEGER,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

UPDATE booking_commercials
  SET held_amount_minor = maximum_held_amount_minor
  WHERE held_amount_minor IS NULL;

ALTER TABLE booking_commercials
  ALTER COLUMN held_amount_minor SET NOT NULL;

ALTER TABLE booking_commercials
  ADD CONSTRAINT booking_commercials_held_non_negative
    CHECK (held_amount_minor >= 0),
  ADD CONSTRAINT booking_commercials_locked_amount_non_negative
    CHECK (locked_amount_minor IS NULL OR locked_amount_minor >= 0),
  ADD CONSTRAINT booking_commercials_held_not_above_maximum
    CHECK (held_amount_minor <= maximum_held_amount_minor),
  ADD CONSTRAINT booking_commercials_tenant_class_lock_fk
    FOREIGN KEY (tenant_id, class_lock_id)
    REFERENCES commercial_class_locks(tenant_id, id);

CREATE INDEX IF NOT EXISTS booking_commercials_class_lock_idx
  ON booking_commercials(tenant_id, class_lock_id);
