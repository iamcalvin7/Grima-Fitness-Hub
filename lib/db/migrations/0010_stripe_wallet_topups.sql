ALTER TYPE training_value_movement_type ADD VALUE IF NOT EXISTS 'stripe_top_up';

ALTER TABLE training_value_ledger
  ADD COLUMN IF NOT EXISTS external_reference TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS training_value_ledger_external_reference_unique
  ON training_value_ledger (tenant_id, external_reference)
  WHERE external_reference IS NOT NULL;

DO $$ BEGIN
  CREATE TYPE wallet_top_up_status AS ENUM ('created', 'pending', 'paid', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS wallet_top_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  status wallet_top_up_status NOT NULL DEFAULT 'created',
  client_idempotency_key TEXT NOT NULL,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  checkout_url TEXT,
  failure_reason TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wallet_top_ups_tenant_client_fk
    FOREIGN KEY (tenant_id, client_user_id) REFERENCES users(tenant_id, id),
  CONSTRAINT wallet_top_ups_tenant_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT wallet_top_ups_client_idempotency_unique
    UNIQUE (tenant_id, client_user_id, client_idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_top_ups_stripe_checkout_session_unique
  ON wallet_top_ups (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS wallet_top_ups_tenant_created_idx
  ON wallet_top_ups (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS wallet_top_ups_client_created_idx
  ON wallet_top_ups (tenant_id, client_user_id, created_at DESC);