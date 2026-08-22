-- Complete additive booking-domain migration.
-- Existing tenants and users are referenced but never modified except for a
-- non-destructive composite uniqueness constraint needed for tenant-safe FKs.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_id_tenant_unique' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_id_tenant_unique UNIQUE (id, tenant_id);
  END IF;
END
$$;

DO $$ BEGIN
  CREATE TYPE training_session_status AS ENUM ('scheduled', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled', 'rescheduled', 'attended', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS training_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Malta',
  address_details TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_locations_tenant_id_unique UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS training_session_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  default_capacity INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_session_types_duration_positive CHECK (duration_minutes > 0),
  CONSTRAINT training_session_types_capacity_positive CHECK (default_capacity > 0),
  CONSTRAINT training_session_types_tenant_id_unique UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_type_id UUID NOT NULL,
  location_id UUID NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL,
  status training_session_status NOT NULL DEFAULT 'scheduled',
  marcus_notes TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_sessions_capacity_positive CHECK (capacity > 0),
  CONSTRAINT training_sessions_end_after_start CHECK (ends_at > starts_at),
  CONSTRAINT training_sessions_tenant_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT training_sessions_tenant_session_type_fk
    FOREIGN KEY (tenant_id, session_type_id)
    REFERENCES training_session_types(tenant_id, id),
  CONSTRAINT training_sessions_tenant_location_fk
    FOREIGN KEY (tenant_id, location_id)
    REFERENCES training_locations(tenant_id, id),
  CONSTRAINT training_sessions_tenant_creator_fk
    FOREIGN KEY (tenant_id, created_by_user_id)
    REFERENCES users(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  training_session_id UUID NOT NULL,
  client_user_id UUID NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  idempotency_key TEXT NOT NULL,
  cancellation_reason TEXT,
  rejection_reason TEXT,
  rescheduled_from_booking_id UUID REFERENCES bookings(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  attendance_at TIMESTAMPTZ,
  CONSTRAINT bookings_tenant_training_session_fk
    FOREIGN KEY (tenant_id, training_session_id)
    REFERENCES training_sessions(tenant_id, id),
  CONSTRAINT bookings_tenant_client_fk
    FOREIGN KEY (tenant_id, client_user_id)
    REFERENCES users(tenant_id, id)
);

-- The first development schema push created empty tables before dependent
-- composite foreign keys. These guards make the migration safely repair that
-- partial state while retaining clean-schema replayability.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_locations_tenant_id_unique' AND conrelid = 'training_locations'::regclass) THEN
    ALTER TABLE training_locations ADD CONSTRAINT training_locations_tenant_id_unique UNIQUE (tenant_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_session_types_tenant_id_unique' AND conrelid = 'training_session_types'::regclass) THEN
    ALTER TABLE training_session_types ADD CONSTRAINT training_session_types_tenant_id_unique UNIQUE (tenant_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_sessions_tenant_id_unique' AND conrelid = 'training_sessions'::regclass) THEN
    ALTER TABLE training_sessions ADD CONSTRAINT training_sessions_tenant_id_unique UNIQUE (tenant_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_sessions_tenant_id_tenants_id_fk' AND conrelid = 'training_sessions'::regclass) THEN
    ALTER TABLE training_sessions ADD CONSTRAINT training_sessions_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_sessions_tenant_session_type_fk' AND conrelid = 'training_sessions'::regclass) THEN
    ALTER TABLE training_sessions ADD CONSTRAINT training_sessions_tenant_session_type_fk FOREIGN KEY (tenant_id, session_type_id) REFERENCES training_session_types(tenant_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_sessions_tenant_location_fk' AND conrelid = 'training_sessions'::regclass) THEN
    ALTER TABLE training_sessions ADD CONSTRAINT training_sessions_tenant_location_fk FOREIGN KEY (tenant_id, location_id) REFERENCES training_locations(tenant_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_sessions_tenant_creator_fk' AND conrelid = 'training_sessions'::regclass) THEN
    ALTER TABLE training_sessions ADD CONSTRAINT training_sessions_tenant_creator_fk FOREIGN KEY (tenant_id, created_by_user_id) REFERENCES users(tenant_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_tenant_training_session_fk' AND conrelid = 'bookings'::regclass) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_tenant_training_session_fk FOREIGN KEY (tenant_id, training_session_id) REFERENCES training_sessions(tenant_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_tenant_client_fk' AND conrelid = 'bookings'::regclass) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_tenant_client_fk FOREIGN KEY (tenant_id, client_user_id) REFERENCES users(tenant_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_rescheduled_from_fk' AND conrelid = 'bookings'::regclass) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_rescheduled_from_fk FOREIGN KEY (rescheduled_from_booking_id) REFERENCES bookings(id);
  END IF;
END
$$;

ALTER TABLE training_sessions DROP CONSTRAINT IF EXISTS training_sessions_created_by_user_id_users_id_fk;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_client_user_id_users_id_fk;

CREATE INDEX IF NOT EXISTS training_locations_tenant_idx ON training_locations(tenant_id);
CREATE INDEX IF NOT EXISTS training_locations_active_idx ON training_locations(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS training_session_types_tenant_idx ON training_session_types(tenant_id);
CREATE INDEX IF NOT EXISTS training_session_types_active_idx ON training_session_types(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS training_sessions_tenant_start_idx ON training_sessions(tenant_id, starts_at);
CREATE INDEX IF NOT EXISTS training_sessions_status_start_idx ON training_sessions(status, starts_at);
CREATE INDEX IF NOT EXISTS bookings_tenant_idx ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS bookings_session_status_idx ON bookings(training_session_id, status);
CREATE INDEX IF NOT EXISTS bookings_client_created_idx ON bookings(client_user_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS bookings_tenant_client_idempotency_unique
  ON bookings(tenant_id, client_user_id, idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_client_session_unique
  ON bookings(tenant_id, client_user_id, training_session_id)
  WHERE status IN ('pending', 'confirmed');

COMMIT;