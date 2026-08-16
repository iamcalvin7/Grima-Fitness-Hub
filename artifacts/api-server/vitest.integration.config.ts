import { defineConfig } from "vitest/config";
import { resolve } from "path";

/**
 * Separate vitest config for database-backed integration tests.
 *
 * Run with: pnpm --filter @workspace/api-server test:integration
 *
 * Isolation model:
 *   - A uniquely-named temporary PostgreSQL schema is created before all
 *     tests and dropped after (see global-setup.ts).
 *   - All tests run in a single forked worker so they share one module
 *     cache and one pool — the pool's `connect` event sets search_path to
 *     the test schema on every new connection.
 *   - The development (public) schema is never read or written.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@workspace/db": resolve(__dirname, "../../lib/db/src/index.ts"),
    },
  },
  // Tell vite-node not to try to bundle CJS packages — let Node resolve them.
  server: {
    deps: {
      external: [
        /node_modules\/pg/,
        /node_modules\/supertest/,
        /node_modules\/@types/,
      ],
    },
  },
  test: {
    name: "integration",
    include: ["src/__tests__/integration/**/*.test.ts"],
    globalSetup: ["src/__tests__/integration/global-setup.ts"],
    setupFiles: ["src/__tests__/integration/env-setup.ts"],
    environment: "node",
    pool: "forks",
    poolOptions: {
      forks: {
        // Single fork: all integration tests share one module cache.
        // This means @workspace/db is imported exactly once, with the
        // search_path connect-event already attached.
        singleFork: true,
      },
    },
    // Longer timeout for real database operations.
    testTimeout: 15_000,
    hookTimeout: 30_000,
    // Disable concurrent test execution within a file to avoid DB races.
    sequence: { concurrent: false },
  },
});
