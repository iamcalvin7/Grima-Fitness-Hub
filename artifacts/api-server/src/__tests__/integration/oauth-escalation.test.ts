/**
 * OAuth internal boundary — escalation tests.
 *
 * Exercises resolveGoogleUser() directly with malicious GoogleUserInfo
 * payloads that a compromised OAuth provider could return.  Proves that:
 *
 *   - injected `role` fields are completely ignored
 *   - every OAuth-created user receives role = 'client'
 *   - injected `tenantId` fields cannot override the server-selected tenant
 *   - the created user has no admin capabilities whatsoever
 *   - combined role + tenantId injection still fails closed
 *
 * The Google token exchange / userinfo fetch is NOT called (no live OAuth
 * provider is contacted).  resolveGoogleUser() is the boundary we need to
 * exercise — it is the only place that converts a GoogleUserInfo payload
 * into a DB row.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { randomBytes } from "node:crypto";
import { resolveGoogleUser, type GoogleUserInfo } from "../../routes/oauth.js";
import { hasCapability } from "../../lib/capabilities.js";
import {
  createTenant,
  getUserRole,
  verifySearchPath,
  type Tenant,
} from "./harness";

// ---------------------------------------------------------------------------
// Fixture — default tenant (shared across tests in this file)
// ---------------------------------------------------------------------------

let tenant: Tenant;

beforeAll(async () => {
  // Safety guard: confirm we are inside the isolated test schema.
  const path = await verifySearchPath();
  const schema = process.env.TEST_SCHEMA_NAME ?? "";
  if (!path.includes(schema)) {
    throw new Error(
      `[oauth-escalation] search_path "${path}" does not include test schema. Refusing.`,
    );
  }

  // Seed the default tenant so getDefaultTenant() resolves to the test schema.
  tenant = await createTenant({ name: "Marcus Grima PT", slug: "marcus-grima" });
});

// ---------------------------------------------------------------------------
// Helper — build a unique, valid base payload
// ---------------------------------------------------------------------------

function baseInfo(extra: Record<string, unknown> = {}): GoogleUserInfo {
  return {
    sub: `google-test-${randomBytes(6).toString("hex")}`,
    email: `oauth-${randomBytes(6).toString("hex")}@integ-oauth.local`,
    email_verified: true,
    given_name: "OAuth",
    family_name: "User",
    ...extra,
  } as unknown as GoogleUserInfo;
}

// ---------------------------------------------------------------------------
// 1. Injected `role` field is ignored — user gets client
// ---------------------------------------------------------------------------

describe("OAuth escalation — injected role field", () => {
  it("role:'admin' in provider payload → created user has role=client", async () => {
    const info = baseInfo({ role: "admin" });
    const user = await resolveGoogleUser(info);

    expect(user).not.toBeNull();
    expect(user!.role).toBe("client");
    expect(user!.role).not.toBe("admin");
  });

  it("role:'trainer' in provider payload → created user has role=client", async () => {
    const info = baseInfo({ role: "trainer" });
    const user = await resolveGoogleUser(info);

    expect(user).not.toBeNull();
    expect(user!.role).toBe("client");
    expect(user!.role).not.toBe("trainer");
  });

  it("role:'superuser' (unknown value) in provider payload → created user has role=client", async () => {
    const info = baseInfo({ role: "superuser" });
    const user = await resolveGoogleUser(info);

    expect(user).not.toBeNull();
    expect(user!.role).toBe("client");
  });

  it("DB-persisted role matches — confirmed by getUserRole()", async () => {
    const info = baseInfo({ role: "admin", isAdmin: true, admin: 1 });
    const user = await resolveGoogleUser(info);

    expect(user).not.toBeNull();
    const dbRole = await getUserRole(user!.id);
    expect(dbRole).toBe("client");
  });
});

// ---------------------------------------------------------------------------
// 2. Injected `tenantId` field is ignored — tenant from getDefaultTenant()
// ---------------------------------------------------------------------------

describe("OAuth escalation — injected tenantId field", () => {
  it("tenantId injection in provider payload → user belongs to the default tenant", async () => {
    const fakeTenantId = "00000000-dead-beef-0000-ffffffffffff";
    const info = baseInfo({ tenantId: fakeTenantId });
    const user = await resolveGoogleUser(info);

    expect(user).not.toBeNull();
    // The user must be in the server-selected default tenant, not the injected one.
    expect(user!.tenantId).toBe(tenant.id);
    expect(user!.tenantId).not.toBe(fakeTenantId);
  });

  it("tenantId injection via snake_case field → user still in default tenant", async () => {
    const fakeTenantId = "11111111-dead-beef-1111-ffffffffffff";
    const info = baseInfo({ tenant_id: fakeTenantId });
    const user = await resolveGoogleUser(info);

    expect(user).not.toBeNull();
    expect(user!.tenantId).toBe(tenant.id);
    expect(user!.tenantId).not.toBe(fakeTenantId);
  });
});

// ---------------------------------------------------------------------------
// 3. Combined role + tenantId injection — must fail closed on both axes
// ---------------------------------------------------------------------------

describe("OAuth escalation — combined role and tenantId injection", () => {
  it("combined role:admin + tenantId injection → client role + correct tenant", async () => {
    const fakeTenantId = "22222222-dead-beef-2222-ffffffffffff";
    const info = baseInfo({
      role: "admin",
      tenantId: fakeTenantId,
      isAdmin: true,
      admin: true,
      scope: "admin",
    });
    const user = await resolveGoogleUser(info);

    expect(user).not.toBeNull();
    expect(user!.role).toBe("client");
    expect(user!.tenantId).toBe(tenant.id);
    expect(user!.tenantId).not.toBe(fakeTenantId);
  });

  it("combined injection: user has zero admin capabilities", async () => {
    const info = baseInfo({
      role: "admin",
      tenantId: "00000000-dead-beef-0000-000000000099",
    });
    const user = await resolveGoogleUser(info);

    expect(user).not.toBeNull();
    // None of the Marcus-only capabilities may be granted.
    expect(hasCapability(user!.role, "content:manage")).toBe(false);
    expect(hasCapability(user!.role, "proposal:manage")).toBe(false);
    expect(hasCapability(user!.role, "audit:read")).toBe(false);
    expect(hasCapability(user!.role, "memberships:manage")).toBe(false);
    expect(hasCapability(user!.role, "configuration:manage")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Existing account linking — role is preserved, not downgraded or upgraded
// ---------------------------------------------------------------------------

describe("OAuth escalation — existing account linking", () => {
  it("linking to an existing client account: role stays client", async () => {
    // Create a client user via signup to match by email.
    const email = `link-client-${randomBytes(5).toString("hex")}@integ-oauth.local`;
    const { db, usersTable } = await import("@workspace/db");
    await db.insert(usersTable).values({
      tenantId: tenant.id,
      email,
      firstName: "Existing",
      lastName: "Client",
      passwordHash: null,
      // role defaults to 'client'
    });

    // OAuth sign-in with the same email + malicious role field.
    const info = baseInfo({ email, role: "admin" });
    const user = await resolveGoogleUser(info);

    expect(user).not.toBeNull();
    expect(user!.role).toBe("client");
    expect(user!.email).toBe(email);
  });

  it("linking to an existing admin account: role is preserved (not downgraded)", async () => {
    // Create an admin user (e.g. Marcus) and simulate a Google sign-in link.
    const email = `link-admin-${randomBytes(5).toString("hex")}@integ-oauth.local`;
    const { db, usersTable } = await import("@workspace/db");
    await db.insert(usersTable).values({
      tenantId: tenant.id,
      email,
      firstName: "Admin",
      lastName: "User",
      passwordHash: null,
      role: "admin",
    });

    // The existing admin links their Google account.
    // resolveGoogleUser returns the EXISTING user record — role is unchanged.
    const info = baseInfo({ email, role: "client" }); // attacker tries to downgrade
    const user = await resolveGoogleUser(info);

    expect(user).not.toBeNull();
    // The user's role comes from the DB record, not from the provider payload.
    expect(user!.role).toBe("admin"); // admin is preserved
    expect(user!.email).toBe(email);
  });
});

// ---------------------------------------------------------------------------
// 5. Re-auth of an existing OAuth user — role not re-set on subsequent sign-in
// ---------------------------------------------------------------------------

describe("OAuth escalation — subsequent OAuth sign-in", () => {
  it("second sign-in with malicious role field: role not re-set", async () => {
    const sub = `google-reauth-${randomBytes(5).toString("hex")}`;
    const email = `reauth-${randomBytes(5).toString("hex")}@integ-oauth.local`;

    // First sign-in: creates the user.
    const first = await resolveGoogleUser(baseInfo({ sub, email, role: "admin" }));
    expect(first).not.toBeNull();
    expect(first!.role).toBe("client");

    // Promote the user to admin manually (simulating Marcus provisioning).
    const { db, usersTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");
    await db
      .update(usersTable)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(usersTable.id, first!.id));

    // Second OAuth sign-in with role: 'client' injection — must not downgrade.
    // resolveGoogleUser() on a known identity just looks up the existing user.
    const second = await resolveGoogleUser(baseInfo({ sub, email, role: "client" }));
    expect(second).not.toBeNull();
    // The DB role is preserved.  resolveGoogleUser() does not re-apply role.
    expect(second!.role).toBe("admin");
  });
});
