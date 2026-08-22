-- Additive recurring availability v1 migration.
-- No existing rows are backfilled or inferred. Existing dated sessions and
-- bookings remain ordinary records with no recurring source.

BEGIN;

DO $$ BEGIN
  CREATE TYPE availability_exception_kind AS ENUM ('unavailable', 'override', 'additional');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE availability_occurrence_resolution AS ENUM ('generated', 'suppressed', 'dst_skipped', 'conflict');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS recurring_availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  location_id UUID NOT NULL,
  session_type_id UUID NOT NULL,
  weekday INTEGER NOT NULL,
  starts_local_time TEXT NOT NULL,
  ends_local_time TEXT NOT NULL,
  slot_interval_minutes INTEGER,
  capacity_override INTEGER,
  effective_from TEXT NOT NULL,
  effective_until TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT recurring_availability_rules_tenant_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT recurring_availability_rules_tenant_owner_fk
    FOREIGN KEY (tenant_id, owner_user_id) REFERENCES users(tenant_id, id),
  CONSTRAINT recurring_availability_rules_tenant_location_fk
    FOREIGN KEY (tenant_id, location_id) REFERENCES training_locations(tenant_id, id),
  CONSTRAINT recurring_availability_rules_tenant_type_fk
    FOREIGN KEY (tenant_id, session_type_id) REFERENCES training_session_types(tenant_id, id),
  CONSTRAINT recurring_availability_rules_tenant_creator_fk
    FOREIGN KEY (tenant_id, created_by_user_id) REFERENCES users(tenant_id, id),
  CONSTRAINT recurring_availability_rules_weekday_valid CHECK (weekday BETWEEN 1 AND 7),
  CONSTRAINT recurring_availability_rules_interval_positive CHECK (slot_interval_minutes IS NULL OR slot_interval_minutes > 0),
  CONSTRAINT recurring_availability_rules_capacity_positive CHECK (capacity_override IS NULL OR capacity_override > 0)
);

CREATE TABLE IF NOT EXISTS availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  availability_rule_id UUID,
  owner_user_id UUID NOT NULL,
  location_id UUID NOT NULL,
  session_type_id UUID NOT NULL,
  exception_date TEXT NOT NULL,
  kind availability_exception_kind NOT NULL,
  starts_local_time TEXT,
  ends_local_time TEXT,
  capacity_override INTEGER,
  reason TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT availability_exceptions_tenant_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT availability_exceptions_tenant_rule_fk
    FOREIGN KEY (tenant_id, availability_rule_id)
    REFERENCES recurring_availability_rules(tenant_id, id),
  CONSTRAINT availability_exceptions_tenant_owner_fk
    FOREIGN KEY (tenant_id, owner_user_id) REFERENCES users(tenant_id, id),
  CONSTRAINT availability_exceptions_tenant_location_fk
    FOREIGN KEY (tenant_id, location_id) REFERENCES training_locations(tenant_id, id),
  CONSTRAINT availability_exceptions_tenant_type_fk
    FOREIGN KEY (tenant_id, session_type_id) REFERENCES training_session_types(tenant_id, id),
  CONSTRAINT availability_exceptions_tenant_creator_fk
    FOREIGN KEY (tenant_id, created_by_user_id) REFERENCES users(tenant_id, id),
  CONSTRAINT availability_exceptions_capacity_positive CHECK (capacity_override IS NULL OR capacity_override > 0)
);

CREATE TABLE IF NOT EXISTS availability_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  availability_rule_id UUID NOT NULL,
  local_date TEXT NOT NULL,
  local_start_time TEXT NOT NULL,
  timezone TEXT NOT NULL,
  resolved_starts_at TIMESTAMPTZ,
  resolved_ends_at TIMESTAMPTZ,
  training_session_id UUID,
  exception_id UUID,
  resolution availability_occurrence_resolution NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT availability_occurrences_tenant_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT availability_occurrences_tenant_rule_fk
    FOREIGN KEY (tenant_id, availability_rule_id)
    REFERENCES recurring_availability_rules(tenant_id, id),
  CONSTRAINT availability_occurrences_tenant_session_fk
    FOREIGN KEY (tenant_id, training_session_id)
    REFERENCES training_sessions(tenant_id, id),
  CONSTRAINT availability_occurrences_tenant_exception_fk
    FOREIGN KEY (tenant_id, exception_id)
    REFERENCES availability_exceptions(tenant_id, id),
  CONSTRAINT availability_occurrences_tenant_rule_slot_unique
    UNIQUE (tenant_id, availability_rule_id, local_date, local_start_time),
  CONSTRAINT availability_occurrences_tenant_session_unique
    UNIQUE (tenant_id, training_session_id)
);

CREATE INDEX IF NOT EXISTS recurring_availability_rules_tenant_active_idx
  ON recurring_availability_rules(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS recurring_availability_rules_owner_idx
  ON recurring_availability_rules(tenant_id, owner_user_id, weekday);
CREATE INDEX IF NOT EXISTS availability_exceptions_tenant_date_idx
  ON availability_exceptions(tenant_id, exception_date);
CREATE INDEX IF NOT EXISTS availability_occurrences_tenant_date_idx
  ON availability_occurrences(tenant_id, local_date);

COMMIT;