BEGIN;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'session_reminder_24h';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'session_reminder_2h';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_delivery_status AS ENUM ('pending', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS delivery_status notification_delivery_status NOT NULL DEFAULT 'delivered',
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS notifications_due_idx
  ON notifications(delivery_status, scheduled_for);

COMMIT;