import { describe, expect, it } from "vitest";
import {
  assertDevelopmentOutsideDeployment,
  isDevelopmentOutsideDeployment,
} from "../lib/developmentEnvironment.js";

describe("development-only environment guard", () => {
  it("allows explicit development outside documented deployment markers", () => {
    expect(
      isDevelopmentOutsideDeployment({ NODE_ENV: "development" }),
    ).toBe(true);
    expect(() =>
      assertDevelopmentOutsideDeployment({ NODE_ENV: "development" }),
    ).not.toThrow();
  });

  it("does not treat REPLIT_ENVIRONMENT as a deployment marker", () => {
    expect(
      isDevelopmentOutsideDeployment({
        NODE_ENV: "development",
        REPLIT_ENVIRONMENT: "production",
      }),
    ).toBe(true);
  });

  it("rejects production and every documented deployment marker", () => {
    expect(isDevelopmentOutsideDeployment({ NODE_ENV: "production" })).toBe(false);
    for (const marker of [
      "REPLIT_DEPLOYMENT",
      "REPLIT_DEPLOYMENT_ID",
      "REPLIT_ENV",
    ] as const) {
      expect(
        isDevelopmentOutsideDeployment({
          NODE_ENV: "development",
          [marker]: "1",
        }),
      ).toBe(false);
      expect(() =>
        assertDevelopmentOutsideDeployment({
          NODE_ENV: "development",
          [marker]: "1",
        }),
      ).toThrow(/development/);
    }
  });
});