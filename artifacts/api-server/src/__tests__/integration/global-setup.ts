/**
 * Global setup for integration tests.
 *
 * Runs ONCE in the main vitest thread before any test worker starts.
 * Creates an isolated PostgreSQL schema, creates all application tables
 * inside it, and stores the schema name in process.env.TEST_SCHEMA_NAME
 * so it is inherited by forked test workers.
 *
 * Returns a teardown function that drops the schema and verifies cleanup.
 *
 * Safety guards (any failure stops the suite):
 *   - REPLIT_DEPLOYMENT must NOT be set.
 *   - Schema name must start with "test_integ_" (unmistakable test prefix).
 *   - Schema name must NOT be "public".
 *   - A schema/database name without a test marker is refused.
 *   - Production/deployment indicators fail closed.
 *   - Cleanup is physically verified after teardown.
 */

import pg from "pg";
import { randomBytes } from "node:crypto";

const { Client } = pg;

// ---------------------------------------------------------------------------
// Safety guards
// ---------------------------------------------------------------------------

function assertNotProduction(): void {
  if (process.env.REPLIT_DEPLOYMENT) {
    throw new Error(
      "STOP: REPLIT_DEPLOYMENT is set. " +
        "Integration tests refuse to run against a production environment.",
    );
  }
  // Additional belt-and-suspenders check: these env vars are set by the
  // deployment platform; any of them present means we may be in production.
  for (const key of ["REPLIT_DEPLOYMENT_KEY", "REPLIT_DEPLOYMENT_ID"]) {
    if (process.env[key]) {
      throw new Error(
        `STOP: ${key} is set. Refusing to run against a production environment.`,
      );
    }
  }
}

function buildSchemaName(): string {
  const runId = randomBytes(8).toString("hex"); // 16 hex chars
  const name = `test_integ_${runId}`;
  if (!name.startsWith("test_")) {
    throw new Error(
      `Schema name "${name}" is missing the "test_" marker. Refusing.`,
    );
  }
  if (name === "public") {
    throw new Error("Refusing to use the public schema for tests.");
  }
  return name;
}

// ---------------------------------------------------------------------------
// DDL for all application tables — mirrors lib/db/src/schema exactly.
// Executed inside the test schema (search_path = test_schema).
// ---------------------------------------------------------------------------

function buildDDL(): string {
  return /* sql */ `
-- ── Enums ─────────────────────────────────────────────────────────────────
-- Created inside the test schema because PostgreSQL enums are schema-scoped.

CREATE TYPE user_role AS ENUM ('admin', 'trainer', 'client');
CREATE TYPE audit_actor_type AS ENUM ('user', 'system', 'cli');
CREATE TYPE content_type AS ENUM ('video', 'image', 'article');
CREATE TYPE content_status AS ENUM ('draft', 'published');
CREATE TYPE training_session_status AS ENUM ('scheduled', 'cancelled', 'completed');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled', 'rescheduled', 'attended', 'no_show');
CREATE TYPE availability_exception_kind AS ENUM ('unavailable', 'override', 'additional');
CREATE TYPE availability_occurrence_resolution AS ENUM ('generated', 'suppressed', 'dst_skipped', 'conflict');

-- ── tenants ────────────────────────────────────────────────────────────────
CREATE TABLE tenants (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT         NOT NULL,
  slug        TEXT         NOT NULL UNIQUE,
  branding    JSONB        NOT NULL DEFAULT
    '{"appName":"Marcus Grima","shortName":"MG","primaryColour":"#E6E6E6","accentColour":"#65D46E","backgroundColour":"#080808","logoUrl":null}'::jsonb,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── users ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id                UUID       DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         UUID       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email             TEXT       NOT NULL,
  password_hash     TEXT,
  first_name        TEXT       NOT NULL,
  last_name         TEXT       NOT NULL,
  avatar_url        TEXT,
  role              user_role  NOT NULL DEFAULT 'client',
  is_active         BOOLEAN    NOT NULL DEFAULT TRUE,
  email_verified_at TIMESTAMPTZ,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, tenant_id)
);
CREATE UNIQUE INDEX users_tenant_email_unique ON users(tenant_id, email);
CREATE INDEX users_tenant_id_idx ON users(tenant_id);

-- ── sessions ───────────────────────────────────────────────────────────────
CREATE TABLE sessions (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT        NOT NULL UNIQUE,
  user_agent   TEXT,
  ip_address   TEXT,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX sessions_user_id_idx    ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

-- ── profiles ───────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id                    UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID    NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  first_name            TEXT,
  last_name             TEXT,
  gender                TEXT,
  date_of_birth         DATE,
  height_cm             INTEGER,
  weight_kg             INTEGER,
  goal                  TEXT,
  activity_level        TEXT,
  experience_level      TEXT,
  avatar_url            TEXT,
  onboarding_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── auth_identities ────────────────────────────────────────────────────────
CREATE TABLE auth_identities (
  id               UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         TEXT  NOT NULL,
  provider_user_id TEXT  NOT NULL,
  email            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX auth_identities_provider_subject_unique
  ON auth_identities(provider, provider_user_id);
CREATE INDEX auth_identities_user_id_idx ON auth_identities(user_id);

-- ── password_reset_tokens ──────────────────────────────────────────────────
CREATE TABLE password_reset_tokens (
  id           UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT  NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX password_reset_tokens_hash_unique
  ON password_reset_tokens(token_hash);
CREATE INDEX password_reset_tokens_user_id_idx ON password_reset_tokens(user_id);

-- ── verification_tokens ────────────────────────────────────────────────────
CREATE TABLE verification_tokens (
  id          UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT  NOT NULL,
  purpose     TEXT  NOT NULL,
  new_email   TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX verification_tokens_hash_unique ON verification_tokens(token_hash);
CREATE INDEX verification_tokens_user_id_idx ON verification_tokens(user_id);

-- ── content_posts ──────────────────────────────────────────────────────────
CREATE TABLE content_posts (
  id            UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  author_id     UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT           NOT NULL,
  description   TEXT,
  body          TEXT,
  type          content_type   NOT NULL DEFAULT 'article',
  category      TEXT,
  status        content_status NOT NULL DEFAULT 'draft',
  featured      BOOLEAN        NOT NULL DEFAULT FALSE,
  publish_date  TIMESTAMPTZ,
  media_url     TEXT,
  thumbnail_url TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX content_posts_tenant_idx   ON content_posts(tenant_id);
CREATE INDEX content_posts_status_idx   ON content_posts(status);
CREATE INDEX content_posts_author_idx   ON content_posts(author_id);
CREATE INDEX content_posts_featured_idx ON content_posts(featured);

-- ── training locations and bookings ───────────────────────────────────────
CREATE TABLE training_locations (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  timezone        TEXT        NOT NULL DEFAULT 'Europe/Malta',
  address_details TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, id)
);
CREATE INDEX training_locations_tenant_idx ON training_locations(tenant_id);
CREATE INDEX training_locations_active_idx ON training_locations(tenant_id, is_active);

CREATE TABLE training_session_types (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  description      TEXT,
  duration_minutes INTEGER     NOT NULL CHECK (duration_minutes > 0),
  default_capacity INTEGER     NOT NULL CHECK (default_capacity > 0),
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, id)
);
CREATE INDEX training_session_types_tenant_idx ON training_session_types(tenant_id);
CREATE INDEX training_session_types_active_idx ON training_session_types(tenant_id, is_active);

CREATE TABLE training_sessions (
  id                 UUID                    DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          UUID                    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_type_id    UUID                    NOT NULL,
  location_id        UUID                    NOT NULL,
  starts_at          TIMESTAMPTZ             NOT NULL,
  ends_at            TIMESTAMPTZ             NOT NULL,
  capacity           INTEGER                 NOT NULL CHECK (capacity > 0),
  status             training_session_status NOT NULL DEFAULT 'scheduled',
  marcus_notes       TEXT,
  created_by_user_id UUID                    NOT NULL,
  created_at         TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, session_type_id)
    REFERENCES training_session_types(tenant_id, id),
  FOREIGN KEY (tenant_id, location_id)
    REFERENCES training_locations(tenant_id, id),
  FOREIGN KEY (tenant_id, created_by_user_id)
    REFERENCES users(tenant_id, id)
);
CREATE UNIQUE INDEX training_sessions_tenant_id_unique ON training_sessions(tenant_id, id);
CREATE INDEX training_sessions_tenant_start_idx ON training_sessions(tenant_id, starts_at);
CREATE INDEX training_sessions_status_start_idx ON training_sessions(status, starts_at);

CREATE TABLE bookings (
  id                          UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id                   UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  training_session_id         UUID           NOT NULL,
  client_user_id              UUID           NOT NULL,
  status                      booking_status NOT NULL DEFAULT 'pending',
  idempotency_key             TEXT           NOT NULL,
  cancellation_reason         TEXT,
  rejection_reason            TEXT,
  rescheduled_from_booking_id UUID           REFERENCES bookings(id),
  created_at                  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  confirmed_at                TIMESTAMPTZ,
  cancelled_at                TIMESTAMPTZ,
  attendance_at               TIMESTAMPTZ,
  FOREIGN KEY (tenant_id, training_session_id)
    REFERENCES training_sessions(tenant_id, id),
  FOREIGN KEY (tenant_id, client_user_id)
    REFERENCES users(tenant_id, id)
);
CREATE INDEX bookings_tenant_idx ON bookings(tenant_id);
CREATE INDEX bookings_session_status_idx ON bookings(training_session_id, status);
CREATE INDEX bookings_client_created_idx ON bookings(client_user_id, created_at);
CREATE UNIQUE INDEX bookings_tenant_client_idempotency_unique
  ON bookings(tenant_id, client_user_id, idempotency_key);
CREATE UNIQUE INDEX bookings_active_client_session_unique
  ON bookings(tenant_id, client_user_id, training_session_id)
  WHERE status IN ('pending', 'confirmed');

-- ── recurring availability ────────────────────────────────────────────────
CREATE TABLE recurring_availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  location_id UUID NOT NULL,
  session_type_id UUID NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  starts_local_time TEXT NOT NULL,
  ends_local_time TEXT NOT NULL,
  slot_interval_minutes INTEGER CHECK (slot_interval_minutes IS NULL OR slot_interval_minutes > 0),
  capacity_override INTEGER CHECK (capacity_override IS NULL OR capacity_override > 0),
  effective_from TEXT NOT NULL,
  effective_until TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, owner_user_id) REFERENCES users(tenant_id, id),
  FOREIGN KEY (tenant_id, location_id) REFERENCES training_locations(tenant_id, id),
  FOREIGN KEY (tenant_id, session_type_id) REFERENCES training_session_types(tenant_id, id),
  FOREIGN KEY (tenant_id, created_by_user_id) REFERENCES users(tenant_id, id)
);
CREATE INDEX recurring_availability_rules_tenant_active_idx ON recurring_availability_rules(tenant_id, is_active);
CREATE INDEX recurring_availability_rules_owner_idx ON recurring_availability_rules(tenant_id, owner_user_id, weekday);

CREATE TABLE availability_exceptions (
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
  capacity_override INTEGER CHECK (capacity_override IS NULL OR capacity_override > 0),
  reason TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, availability_rule_id) REFERENCES recurring_availability_rules(tenant_id, id),
  FOREIGN KEY (tenant_id, owner_user_id) REFERENCES users(tenant_id, id),
  FOREIGN KEY (tenant_id, location_id) REFERENCES training_locations(tenant_id, id),
  FOREIGN KEY (tenant_id, session_type_id) REFERENCES training_session_types(tenant_id, id),
  FOREIGN KEY (tenant_id, created_by_user_id) REFERENCES users(tenant_id, id)
);
CREATE INDEX availability_exceptions_tenant_date_idx ON availability_exceptions(tenant_id, exception_date);

CREATE TABLE availability_occurrences (
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
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, availability_rule_id, local_date, local_start_time),
  UNIQUE (tenant_id, training_session_id),
  FOREIGN KEY (tenant_id, availability_rule_id) REFERENCES recurring_availability_rules(tenant_id, id),
  FOREIGN KEY (tenant_id, training_session_id) REFERENCES training_sessions(tenant_id, id),
  FOREIGN KEY (tenant_id, exception_id) REFERENCES availability_exceptions(tenant_id, id)
);
CREATE INDEX availability_occurrences_tenant_date_idx ON availability_occurrences(tenant_id, local_date);

-- ── proposal_features ─────────────────────────────────────────────────────
CREATE TABLE proposal_features (
  id               UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID  NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  author_id        UUID  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            TEXT  NOT NULL,
  category         TEXT  NOT NULL,
  priority         TEXT  NOT NULL DEFAULT 'Medium',
  phase            INTEGER NOT NULL DEFAULT 2,
  status           TEXT  NOT NULL DEFAULT 'Planned',
  tagline          TEXT  NOT NULL DEFAULT '',
  what             TEXT  NOT NULL DEFAULT '',
  member_benefit   TEXT  NOT NULL DEFAULT '',
  business_benefit TEXT  NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX proposal_features_tenant_idx ON proposal_features(tenant_id);

-- ── proposal_sprints ──────────────────────────────────────────────────────
CREATE TABLE proposal_sprints (
  id          UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID  NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_id  TEXT  NOT NULL,
  sprint      INTEGER,
  status      TEXT,
  placement   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX proposal_sprints_tenant_feature
  ON proposal_sprints(tenant_id, feature_id);

-- ── proposal_decisions ────────────────────────────────────────────────────
CREATE TABLE proposal_decisions (
  id          UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID  NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  author_id   UUID  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question    TEXT  NOT NULL,
  detail      TEXT  NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX proposal_decisions_tenant_idx ON proposal_decisions(tenant_id);

-- ── audit_logs ────────────────────────────────────────────────────────────
-- Append-only: no updated_at column by design.
CREATE TABLE audit_logs (
  id          UUID               DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID               NOT NULL REFERENCES tenants(id),
  actor_type  audit_actor_type   NOT NULL,
  actor_id    UUID               REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT               NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX audit_logs_tenant_idx      ON audit_logs(tenant_id);
CREATE INDEX audit_logs_actor_id_idx    ON audit_logs(actor_id);
CREATE INDEX audit_logs_action_idx      ON audit_logs(action);
CREATE INDEX audit_logs_target_type_id_idx ON audit_logs(target_type, target_id);
CREATE INDEX audit_logs_created_at_idx  ON audit_logs(created_at);
`;
}

// ---------------------------------------------------------------------------
// Setup entry point (called by vitest before workers start)
// ---------------------------------------------------------------------------

export async function setup(): Promise<void> {
  assertNotProduction();

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not set. Cannot run integration tests.");

  const schemaName = buildSchemaName();

  // ── Create schema + tables ───────────────────────────────────────────────
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schemaName}"`);
    await client.query(`SET search_path TO "${schemaName}"`);
    await client.query(buildDDL());

    // Verify the schema was created and has the expected tables.
    const check = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM information_schema.tables
        WHERE table_schema = $1`,
      [schemaName],
    );
    const tableCount = parseInt(check.rows[0]?.count ?? "0", 10);
    if (tableCount < 10) {
      throw new Error(
        `Schema "${schemaName}" should have at least 10 tables, found ${tableCount}.`,
      );
    }
  } finally {
    await client.end();
  }

  // Share the schema name with test workers via process.env (forks inherit).
  process.env.TEST_SCHEMA_NAME = schemaName;
}

// ---------------------------------------------------------------------------
// Teardown entry point (called by vitest after all tests complete)
// ---------------------------------------------------------------------------

export async function teardown(): Promise<void> {
  const schemaName = process.env.TEST_SCHEMA_NAME;
  if (!schemaName) {
    console.warn("[integration teardown] TEST_SCHEMA_NAME not set — nothing to drop.");
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not set during teardown.");

  // ── Drop schema ──────────────────────────────────────────────────────────
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  } finally {
    await client.end();
  }

  // ── Physical cleanup verification ─────────────────────────────────────────
  const verify = new Client({ connectionString: dbUrl });
  await verify.connect();
  try {
    const result = await verify.query<{ schema_name: string }>(
      `SELECT schema_name
         FROM information_schema.schemata
        WHERE schema_name = $1`,
      [schemaName],
    );
    if (result.rows.length > 0) {
      throw new Error(
        `[CLEANUP FAILURE] Schema "${schemaName}" still exists after DROP. ` +
          "Manual cleanup required.",
      );
    }
  } finally {
    await verify.end();
  }

  console.info(`[integration teardown] Schema "${schemaName}" dropped and verified.`);
}
