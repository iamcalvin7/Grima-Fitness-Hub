import { defineConfig } from "vitest/config";
import { resolve } from "path";

/**
 * Unit / component test config.
 *
 * Excludes the integration test directory — those tests require a live
 * database and must be run via:
 *   pnpm --filter @workspace/api-server test:integration
 */
export default defineConfig({
  resolve: {
    alias: {
      "@workspace/db": resolve(__dirname, "../../lib/db/src/index.ts"),
    },
  },
  test: {
    name: "unit",
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "src/__tests__/integration/**",
    ],
    environment: "node",
  },
});
