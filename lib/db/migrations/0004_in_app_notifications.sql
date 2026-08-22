-- In-app notifications for authenticated users. Notification creation is
-- performed inside the booking transaction and is idempotent by event_key.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'notification_type'
  ) THEN
    CREATE TYPE notification_type AS ENUM (
      'booking_created',
      'booking_confirmed',
      'booking_rejected',
      'booking_cancelled',
      'booking_rescheduled',
      'booking_attended',
      'booking_no_show'
      ,'session_reminder_24h'
      ,'session_reminder_2h'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_tenant_id_unique'
      AND conrelid = 'bookings'::regclass
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_tenant_id_unique UNIQUE (tenant_id, id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_user_id   UUID NOT NULL,
  type                notification_type NOT NULL,
  event_key           TEXT NOT NULL,
  booking_id          UUID,
  title               TEXT NOT NULL,
  body                TEXT NOT NULL,
  read_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notifications_tenant_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT notifications_event_key_unique UNIQUE (event_key),
  CONSTRAINT notifications_tenant_recipient_fk
    FOREIGN KEY (tenant_id, recipient_user_id)
    REFERENCES users(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT notifications_tenant_booking_fk
    FOREIGN KEY (tenant_id, booking_id)
    REFERENCES bookings(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON notifications(recipient_user_id, created_at);
CREATE INDEX IF NOT EXISTS notifications_recipient_unread_idx
  ON notifications(recipient_user_id, read_at);
CREATE INDEX IF NOT EXISTS notifications_booking_idx
  ON notifications(booking_id);

COMMIT;