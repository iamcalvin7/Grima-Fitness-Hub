BEGIN;

CREATE TYPE pricing_plan_kind AS ENUM ('default', 'tier', 'custom');
CREATE TYPE commercial_hold_status AS ENUM ('active', 'released', 'settled');
CREATE TYPE commercial_pricing_rule AS ENUM ('actual_attendance_count');
CREATE TYPE training_value_movement_type AS ENUM (
  'manual_grant',
  'manual_adjustment',
  'attendance_charge',
  'no_show_charge'
);

CREATE TABLE pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind pricing_plan_kind NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, created_by_user_id)
    REFERENCES users(tenant_id, id)
);
CREATE INDEX pricing_plans_tenant_active_idx ON pricing_plans(tenant_id, is_active);
CREATE UNIQUE INDEX pricing_plans_one_active_default_per_tenant
  ON pricing_plans(tenant_id)
  WHERE kind = 'default' AND is_active;

CREATE TABLE pricing_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pricing_plan_id UUID NOT NULL,
  participant_count INTEGER NOT NULL CHECK (participant_count > 0),
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, id),
  UNIQUE (pricing_plan_id, participant_count),
  FOREIGN KEY (tenant_id, pricing_plan_id)
    REFERENCES pricing_plans(tenant_id, id)
);
CREATE INDEX pricing_rates_tenant_plan_idx ON pricing_rates(tenant_id, pricing_plan_id);

CREATE TABLE client_pricing_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL,
  pricing_plan_id UUID NOT NULL,
  assigned_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, client_user_id),
  FOREIGN KEY (tenant_id, client_user_id)
    REFERENCES users(tenant_id, id),
  FOREIGN KEY (tenant_id, pricing_plan_id)
    REFERENCES pricing_plans(tenant_id, id),
  FOREIGN KEY (tenant_id, assigned_by_user_id)
    REFERENCES users(tenant_id, id)
);
CREATE INDEX client_pricing_assignments_tenant_plan_idx
  ON client_pricing_assignments(tenant_id, pricing_plan_id);

CREATE TABLE training_value_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (amount_minor <> 0),
  movement_type training_value_movement_type NOT NULL,
  booking_id UUID,
  actor_user_id UUID,
  idempotency_key TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, client_user_id)
    REFERENCES users(tenant_id, id),
  FOREIGN KEY (tenant_id, booking_id)
    REFERENCES bookings(tenant_id, id),
  FOREIGN KEY (tenant_id, actor_user_id)
    REFERENCES users(tenant_id, id)
);
CREATE INDEX training_value_ledger_client_created_idx
  ON training_value_ledger(tenant_id, client_user_id, created_at);
CREATE UNIQUE INDEX training_value_ledger_booking_movement_unique
  ON training_value_ledger(tenant_id, booking_id, movement_type)
  WHERE booking_id IS NOT NULL;
CREATE UNIQUE INDEX training_value_ledger_actor_idempotency_unique
  ON training_value_ledger(tenant_id, actor_user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE booking_commercials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL,
  client_user_id UUID NOT NULL,
  pricing_plan_id UUID,
  pricing_plan_name TEXT NOT NULL,
  pricing_plan_version INTEGER NOT NULL CHECK (pricing_plan_version > 0),
  pricing_rule commercial_pricing_rule NOT NULL DEFAULT 'actual_attendance_count',
  currency TEXT NOT NULL DEFAULT 'EUR',
  rate_table JSONB NOT NULL,
  maximum_held_amount_minor INTEGER NOT NULL CHECK (maximum_held_amount_minor >= 0),
  hold_status commercial_hold_status NOT NULL DEFAULT 'active',
  hold_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hold_released_at TIMESTAMPTZ,
  hold_release_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, booking_id),
  FOREIGN KEY (tenant_id, booking_id)
    REFERENCES bookings(tenant_id, id),
  FOREIGN KEY (tenant_id, client_user_id)
    REFERENCES users(tenant_id, id),
  FOREIGN KEY (tenant_id, pricing_plan_id)
    REFERENCES pricing_plans(tenant_id, id)
);
CREATE INDEX booking_commercials_client_hold_idx
  ON booking_commercials(tenant_id, client_user_id, hold_status);

CREATE TABLE commercial_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL,
  client_user_id UUID NOT NULL,
  attendance_count INTEGER NOT NULL CHECK (attendance_count >= 0),
  held_amount_minor INTEGER NOT NULL CHECK (held_amount_minor >= 0),
  final_charge_amount_minor INTEGER NOT NULL CHECK (final_charge_amount_minor >= 0),
  released_amount_minor INTEGER NOT NULL CHECK (released_amount_minor >= 0),
  currency TEXT NOT NULL,
  pricing_rule commercial_pricing_rule NOT NULL,
  settled_by_user_id UUID NOT NULL,
  settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, booking_id),
  FOREIGN KEY (tenant_id, booking_id)
    REFERENCES bookings(tenant_id, id),
  FOREIGN KEY (tenant_id, client_user_id)
    REFERENCES users(tenant_id, id),
  FOREIGN KEY (tenant_id, settled_by_user_id)
    REFERENCES users(tenant_id, id)
);
CREATE INDEX commercial_settlements_client_settled_idx
  ON commercial_settlements(tenant_id, client_user_id, settled_at);

CREATE TABLE commercial_no_show_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL,
  client_user_id UUID NOT NULL,
  held_amount_minor INTEGER NOT NULL CHECK (held_amount_minor >= 0),
  selected_charge_amount_minor INTEGER NOT NULL CHECK (selected_charge_amount_minor >= 0),
  released_amount_minor INTEGER NOT NULL CHECK (released_amount_minor >= 0),
  waived BOOLEAN NOT NULL,
  actor_user_id UUID NOT NULL,
  note TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, booking_id),
  FOREIGN KEY (tenant_id, booking_id)
    REFERENCES bookings(tenant_id, id),
  FOREIGN KEY (tenant_id, client_user_id)
    REFERENCES users(tenant_id, id),
  FOREIGN KEY (tenant_id, actor_user_id)
    REFERENCES users(tenant_id, id)
);

COMMIT;