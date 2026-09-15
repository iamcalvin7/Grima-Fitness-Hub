import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import {
  db,
  profilesTable,
  usersTable,
  type User,
} from "@workspace/db";
import { hashPassword } from "../../lib/password";
import {
  app,
  createTenant,
  createUser,
  verifySearchPath,
  type Tenant,
} from "./harness";

describe("development Marcus admin sign-in", () => {
  let tenant: Tenant;

  beforeAll(async () => {
    const path = await verifySearchPath();
    if (!path.includes(process.env.TEST_SCHEMA_NAME ?? "")) {
      throw new Error("Refusing to run dev-admin tests outside the isolated schema");
    }
    tenant = await createTenant({ slug: "marcus-grima", name: "Marcus Grima PT" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function enableDevelopment(password?: string) {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MG_ADMIN_PASSWORD", password ?? `unused-${randomBytes(8).toString("hex")}`);
  }

  async function createAdmin(
    password: string,
    opts: { isActive?: boolean; role?: User["role"] } = {},
  ) {
    return createUser(tenant.id, {
      email: `${randomBytes(8).toString("hex")}@dev-admin.test`,
      role: opts.role ?? "admin",
      isActive: opts.isActive ?? true,
      passwordHash: await hashPassword(password),
    });
  }

  it("creates the normal cookie session and ignores hostile request credentials", async () => {
    const password = `match-${randomBytes(8).toString("hex")}`;
    const user = await createAdmin(password);
    const [profileBefore] = await db
      .insert(profilesTable)
      .values({
        userId: user.id,
        firstName: "Existing",
        lastName: "Profile",
        onboardingCompleted: false,
      })
      .returning();
    enableDevelopment(password);

    const response = await request(app)
      .post("/api/auth/dev-signin/admin")
      .send({
        email: "attacker@example.test",
        password: "attacker-password",
        role: "client",
      });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      id: user.id,
      role: "admin",
    });
    const cookies = response.headers["set-cookie"];
    expect(
      Array.isArray(cookies)
        ? cookies.some((cookie: string) =>
            cookie.startsWith("mg_session=") && /HttpOnly/i.test(cookie),
          )
        : typeof cookies === "string" &&
          cookies.startsWith("mg_session=") &&
          /HttpOnly/i.test(cookies),
    ).toBe(true);
    expect(JSON.stringify(response.body)).not.toContain(password);
    expect(JSON.stringify(response.body)).not.toContain(user.passwordHash!);

    const [unchanged] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id));
    expect(unchanged).toMatchObject({
      id: user.id,
      role: "admin",
      isActive: true,
      passwordHash: user.passwordHash,
    });
    const profiles = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, user.id));
    expect(profiles).toEqual([profileBefore]);
  });

  it("is unavailable in production and for every documented deployment marker", async () => {
    for (const environment of [
      { NODE_ENV: "production" },
      { NODE_ENV: "development", REPLIT_DEPLOYMENT: "1" },
      { NODE_ENV: "development", REPLIT_DEPLOYMENT_ID: "1" },
      { NODE_ENV: "development", REPLIT_ENV: "production" },
    ]) {
      vi.stubEnv("NODE_ENV", environment.NODE_ENV);
      vi.stubEnv("MG_ADMIN_PASSWORD", "not-returned");
      if (environment.REPLIT_DEPLOYMENT) vi.stubEnv("REPLIT_DEPLOYMENT", environment.REPLIT_DEPLOYMENT);
      if (environment.REPLIT_DEPLOYMENT_ID) vi.stubEnv("REPLIT_DEPLOYMENT_ID", environment.REPLIT_DEPLOYMENT_ID);
      if (environment.REPLIT_ENV) vi.stubEnv("REPLIT_ENV", environment.REPLIT_ENV);

      const response = await request(app).post("/api/auth/dev-signin/admin");
      expect(response.status).toBe(404);
      expect(response.headers["set-cookie"]).toBeUndefined();
      vi.unstubAllEnvs();
    }
  });

  it("returns a generic unavailable response when the server secret is missing", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MG_ADMIN_PASSWORD", "");

    const response = await request(app).post("/api/auth/dev-signin/admin");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: "Development admin sign-in unavailable" });
    expect(JSON.stringify(response.body)).not.toContain("MG_ADMIN");
  });

  it("rejects zero and duplicate active matches", async () => {
    const zeroPassword = `zero-${randomBytes(8).toString("hex")}`;
    enableDevelopment(zeroPassword);
    const zero = await request(app).post("/api/auth/dev-signin/admin");
    expect(zero.status).toBe(503);

    const duplicatePassword = `duplicate-${randomBytes(8).toString("hex")}`;
    await createAdmin(duplicatePassword);
    await createAdmin(duplicatePassword);
    vi.stubEnv("MG_ADMIN_PASSWORD", duplicatePassword);
    const duplicate = await request(app).post("/api/auth/dev-signin/admin");
    expect(duplicate.status).toBe(503);
  });

  it("excludes inactive and non-admin users from the candidate set", async () => {
    const password = `active-${randomBytes(8).toString("hex")}`;
    await createAdmin(password, { isActive: false });
    await createAdmin(password, { role: "client" });
    const activeAdmin = await createAdmin(password);
    enableDevelopment(password);

    const response = await request(app).post("/api/auth/dev-signin/admin");

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(activeAdmin.id);
  });
});