-- Reconcile lifecycle booking notifications with the existing in-app
-- notification and timed-reminder model. Development migration only.

BEGIN;

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'booking_requested';

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS training_session_id UUID,
  ADD CONSTRAINT notifications_tenant_session_fk
    FOREIGN KEY (tenant_id, training_session_id)
    REFERENCES training_sessions(tenant_id, id) ON DELETE CASCADE;

COMMIT;