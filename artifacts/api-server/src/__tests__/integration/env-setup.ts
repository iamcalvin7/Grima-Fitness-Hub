/**
 * Per-worker integration test setup.
 *
 * Runs ONCE in each test worker (with singleFork:true, once total) BEFORE
 * any test file's imports are resolved. This is the correct place to redirect
 * the shared @workspace/db pool to the isolated test schema.
 *
 * Mechanism:
 *   PostgreSQL processes commands sequentially on a single connection.
 *   By registering a `connect` event handler on the pool before any test
 *   query runs, every new connection issues `SET search_path TO <schema>`
 *   as its first command. All subsequent queries on that connection are
 *   scoped to the test schema — the development public schema is invisible.
 *
 * Safety guards enforced here (fail-closed):
 *   - TEST_SCHEMA_NAME must be set (populated by global-setup.ts).
 *   - TEST_SCHEMA_NAME must start with "test_".
 *   - TEST_SCHEMA_NAME must not equal "public".
 *   - REPLIT_DEPLOYMENT must not be set.
 */

import { beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Guard: refuse production / missing schema
// ---------------------------------------------------------------------------

const schemaName = process.env.TEST_SCHEMA_NAME;

if (!schemaName) {
  throw new Error(
    "[env-setup] TEST_SCHEMA_NAME is not set. " +
      "global-setup.ts must run before this file.",
  );
}
if (!schemaName.startsWith("test_")) {
  throw new Error(
    `[env-setup] TEST_SCHEMA_NAME "${schemaName}" is missing the "test_" ` +
      "marker. Refusing to proceed.",
  );
}
if (schemaName === "public") {
  throw new Error(
    "[env-setup] TEST_SCHEMA_NAME is 'public'. Refusing to run tests against the public schema.",
  );
}
if (process.env.REPLIT_DEPLOYMENT) {
  throw new Error(
    "[env-setup] REPLIT_DEPLOYMENT is set. Refusing to run integration tests in a production environment.",
  );
}

// ---------------------------------------------------------------------------
// Attach search_path to every new DB connection
// ---------------------------------------------------------------------------

// Dynamic import: @workspace/db has NOT been imported yet in this worker.
// Importing it here creates the pool with DATABASE_URL.
// The connect event fires for every new connection — before any test query,
// so all test connections use the isolated schema.
const { pool } = await import("@workspace/db");

pool.on("connect", (client) => {
  // PostgreSQL processes commands sequentially per connection.
  // SET search_path completes before any subsequent query on this connection.
  void client.query(`SET search_path TO "${schemaName}"`);
});

// ---------------------------------------------------------------------------
// Reset in-memory rate limiters before every test
// ---------------------------------------------------------------------------

// Dynamic import after pool setup; module is already cached from @workspace/db
// transitive import of app routes.
import { resetRateLimits } from "../../lib/rateLimit.js";

beforeEach(() => {
  resetRateLimits();
});
