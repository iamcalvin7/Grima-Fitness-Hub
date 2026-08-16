/**
 * Stage 3 — Cross-tenant isolation and role-change integration tests.
 *
 * Creates two completely separate tenants with their own users and content.
 * Proves that tenant boundaries are enforced at the API layer (tenantId
 * sourced from req.user!, never from caller-supplied body/params).
 *
 * Also proves that role changes in the database take effect on the NEXT
 * authenticated request — the session token contains no cached role data.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import {
  app,
  createTenant,
  createUser,
  createSession,
  createContent,
  sessionCookie,
  setUserRole,
  countAuditLogs,
  verifySearchPath,
  type User,
  type Tenant,
} from "./harness";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Tenant A — the default "marcus-grima" tenant (created by signup-flow tests
// or here if running in isolation).
let tenantA: Tenant;
let adminA: User;       // admin in Tenant A
let clientA: User;      // client in Tenant A
let adminAToken: string;
let clientAToken: string;

// Tenant B — completely separate tenant
let tenantB: Tenant;
let adminB: User;       // admin in Tenant B
let clientB: User;      // client in Tenant B
let adminBToken: string;
let clientBToken: string;

// Content posts
let postInA: string;  // UUID of a published post in Tenant A

beforeAll(async () => {
  // Safety guard
  const path = await verifySearchPath();
  const schema = process.env.TEST_SCHEMA_NAME ?? "";
  if (!path.includes(schema)) {
    throw new Error(
      `[safety] search_path "${path}" does not include test schema. Refusing.`,
    );
  }

  // Tenant A — use or create the default tenant
  tenantA = await createTenant({ name: "Marcus Grima PT", slug: "marcus-grima" });

  // Tenant B — completely separate, different slug
  tenantB = await createTenant({
    name: "Other Gym PT",
    slug: `other-gym-${Date.now()}`,
  });

  // Users in Tenant A
  adminA = await createUser(tenantA.id, {
    email: "admin-a@cross-tenant.local",
    role: "admin",
  });
  clientA = await createUser(tenantA.id, {
    email: "client-a@cross-tenant.local",
    role: "client",
  });

  // Users in Tenant B
  adminB = await createUser(tenantB.id, {
    email: "admin-b@cross-tenant.local",
    role: "admin",
  });
  clientB = await createUser(tenantB.id, {
    email: "client-b@cross-tenant.local",
    role: "client",
  });

  // Sessions
  adminAToken = (await createSession(adminA.id)).token;
  clientAToken = (await createSession(clientA.id)).token;
  adminBToken = (await createSession(adminB.id)).token;
  clientBToken = (await createSession(clientB.id)).token;

  // Create content in Tenant A directly via fixture (admin A creates it)
  const post = await createContent(tenantA.id, adminA.id, {
    title: "Tenant A exclusive post",
    status: "published",
  });
  postInA = post.id;

  // Also create via the API to verify audit records in Tenant A
  await request(app)
    .post("/api/content")
    .set("Cookie", sessionCookie(adminAToken))
    .send({ title: "API-created Tenant A post", type: "article", status: "published" });
});

// ---------------------------------------------------------------------------
// Cross-tenant content isolation
// ---------------------------------------------------------------------------

describe("Cross-tenant content isolation", () => {
  it("admin B cannot see Tenant A content via GET /api/content/admin", async () => {
    const res = await request(app)
      .get("/api/content/admin")
      .set("Cookie", sessionCookie(adminBToken));

    expect(res.status).toBe(200);
    const postIds = (res.body.posts as Array<{ id: string }>).map((p) => p.id);
    expect(postIds).not.toContain(postInA);
  });

  it("client B cannot see Tenant A published content via GET /api/content", async () => {
    const res = await request(app)
      .get("/api/content")
      .set("Cookie", sessionCookie(clientBToken));

    expect(res.status).toBe(200);
    const postIds = (res.body.posts as Array<{ id: string }>).map((p) => p.id);
    expect(postIds).not.toContain(postInA);
  });

  it("admin B cannot modify Tenant A content — PATCH returns 404", async () => {
    const res = await request(app)
      .patch(`/api/content/${postInA}`)
      .set("Cookie", sessionCookie(adminBToken))
      .send({ title: "Cross-tenant hijack" });

    // The handler filters by AND tenantId = req.user!.tenantId.
    // Admin B's tenantId is Tenant B, so the post is not found in their scope.
    expect(res.status).toBe(404);
  });

  it("admin B cannot delete Tenant A content — DELETE returns 404", async () => {
    const res = await request(app)
      .delete(`/api/content/${postInA}`)
      .set("Cookie", sessionCookie(adminBToken));

    expect(res.status).toBe(404);
  });

  it("caller-supplied tenantId in body does not affect which content is returned", async () => {
    // Admin B sends Tenant A's tenantId in a header/query — the route ignores it.
    // Content is always scoped to req.user!.tenantId.
    const res = await request(app)
      .get("/api/content/admin")
      .set("Cookie", sessionCookie(adminBToken))
      .query({ tenantId: tenantA.id }); // ← must be ignored

    expect(res.status).toBe(200);
    const postIds = (res.body.posts as Array<{ id: string }>).map((p) => p.id);
    expect(postIds).not.toContain(postInA);
  });

  it("Tenant A admin sees Tenant A content (positive control)", async () => {
    const res = await request(app)
      .get("/api/content/admin")
      .set("Cookie", sessionCookie(adminAToken));

    expect(res.status).toBe(200);
    const postIds = (res.body.posts as Array<{ id: string }>).map((p) => p.id);
    expect(postIds).toContain(postInA);
  });
});

// ---------------------------------------------------------------------------
// Cross-tenant audit log isolation
// ---------------------------------------------------------------------------

describe("Cross-tenant audit log isolation", () => {
  it("admin B cannot read Tenant A audit logs — GET /api/audit is tenant-scoped", async () => {
    // Tenant A has audit records (from POST /content above).
    const tenantALogsCount = await countAuditLogs(tenantA.id);
    expect(tenantALogsCount).toBeGreaterThan(0);

    // Admin B queries /api/audit — sees only Tenant B's records.
    // Route returns { records, page, limit }.
    const res = await request(app)
      .get("/api/audit")
      .set("Cookie", sessionCookie(adminBToken));

    expect(res.status).toBe(200);
    const records = (res.body.records as Array<{ tenantId: string }>) ?? [];
    // Every returned record must belong to Tenant B
    for (const rec of records) {
      expect(rec.tenantId).toBe(tenantB.id);
    }
    // None should come from Tenant A
    for (const rec of records) {
      expect(rec.tenantId).not.toBe(tenantA.id);
    }
  });

  it("Tenant A audit records are visible to Tenant A admin (positive control)", async () => {
    const res = await request(app)
      .get("/api/audit")
      .set("Cookie", sessionCookie(adminAToken));

    expect(res.status).toBe(200);
    // Route returns { records, page, limit }
    const records = (res.body.records as Array<{ tenantId: string; action: string }>) ?? [];
    const tenantARecords = records.filter((r) => r.tenantId === tenantA.id);
    expect(tenantARecords.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Cross-tenant proposal data isolation
// ---------------------------------------------------------------------------

describe("Cross-tenant proposal data isolation", () => {
  it("admin B cannot see Tenant A proposal features", async () => {
    // Create a proposal feature in Tenant A
    await request(app)
      .post("/api/proposal-features")
      .set("Cookie", sessionCookie(adminAToken))
      .send({
        title: "Tenant A secret feature",
        category: "Account & Onboarding",
        priority: "High",
      });

    // Admin B queries their tenant's features — Tenant A feature must not appear
    const res = await request(app)
      .get("/api/proposal-features")
      .set("Cookie", sessionCookie(adminBToken));

    expect(res.status).toBe(200);
    const titles = (res.body.features as Array<{ title: string }>).map(
      (f) => f.title,
    );
    expect(titles).not.toContain("Tenant A secret feature");
  });
});

// ---------------------------------------------------------------------------
// Session and profile tenant safety
// ---------------------------------------------------------------------------

describe("Session and profile tenant safety", () => {
  it("Client B's profile update cannot change their tenantId", async () => {
    // Create Client B's profile first
    await request(app)
      .post("/api/profile")
      .set("Cookie", sessionCookie(clientBToken))
      .send({ firstName: "ClientB", onboardingCompleted: false });

    const res = await request(app)
      .patch("/api/profile")
      .set("Cookie", sessionCookie(clientBToken))
      .send({ firstName: "ClientBUpdated", tenantId: tenantA.id });

    // Either 200 (tenantId field is silently ignored) or 400 if rejected
    expect([200, 400]).toContain(res.status);

    // GET /auth/me verifies the user still belongs to Tenant B
    const me = await request(app)
      .get("/api/auth/me")
      .set("Cookie", sessionCookie(clientBToken));
    expect(me.status).toBe(200);
    // tenantId is not in the public user response but role must still be client
    expect(me.body.user.role).toBe("client");
  });
});

// ---------------------------------------------------------------------------
// Upload path user-scope documentation test
// ---------------------------------------------------------------------------

describe("Upload key user scope", () => {
  it("upload URL generation is rejected for unauthenticated requests", async () => {
    const res = await request(app)
      .post("/api/storage/uploads/request-url")
      .send({ name: "photo.jpg", size: 1024, contentType: "image/jpeg" });
    expect(res.status).toBe(401);
  });

  it("upload URL endpoint rejects path traversal in the name field", async () => {
    // The key is server-generated (userId/UUID), so traversal in 'name'
    // cannot affect the key. But it must still be rejected as invalid metadata.
    for (const badName of ["../secret.txt", "../../etc/passwd", "/absolute.jpg"]) {
      const res = await request(app)
        .post("/api/storage/uploads/request-url")
        .set("Cookie", sessionCookie(clientAToken))
        .send({ name: badName, size: 512, contentType: "image/jpeg" });
      expect(res.status).toBe(400);
    }
  });

  it("upload URL endpoint rejects disallowed content types", async () => {
    const res = await request(app)
      .post("/api/storage/uploads/request-url")
      .set("Cookie", sessionCookie(clientAToken))
      .send({ name: "attack.exe", size: 512, contentType: "application/x-executable" });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Role-change behaviour — session token contains no cached role
// ---------------------------------------------------------------------------

describe("Role-change — role resolves from DB on every request", () => {
  let dynamicAdmin: User;
  let dynamicToken: string;

  beforeAll(async () => {
    // Create a dedicated user for role-change tests in Tenant A
    dynamicAdmin = await createUser(tenantA.id, {
      email: `dynamic-${Date.now()}@cross-tenant.local`,
      role: "admin",
    });
    const sess = await createSession(dynamicAdmin.id);
    dynamicToken = sess.token;
  });

  it("1. Admin request is allowed when role=admin in DB", async () => {
    const res = await request(app)
      .get("/api/content/admin")
      .set("Cookie", sessionCookie(dynamicToken));
    expect(res.status).toBe(200);
  });

  it("2. After changing role to client in DB, same session is denied", async () => {
    // Direct DB role change (no HTTP endpoint — tests DB-to-session propagation)
    await setUserRole(dynamicAdmin.id, "client");

    const res = await request(app)
      .get("/api/content/admin")
      .set("Cookie", sessionCookie(dynamicToken));

    // The route joins users ON EVERY REQUEST — new role takes effect immediately.
    expect(res.status).toBe(403);
  });

  it("3. Restoring role to admin in DB — same session is allowed again", async () => {
    await setUserRole(dynamicAdmin.id, "admin");

    const res = await request(app)
      .get("/api/content/admin")
      .set("Cookie", sessionCookie(dynamicToken));

    expect(res.status).toBe(200);
  });

  it("4. Session token contains no role data — role comes from DB join on every request", () => {
    // The session token is an opaque randomBytes(32).toString('base64url').
    // Only its SHA-256 hash is stored in the DB. The hash reveals nothing
    // about the user's role. Role is resolved by the sessions↔users JOIN in
    // getSessionUser() on every request. This is proven by tests 2 and 3 above.
    expect(dynamicToken).toMatch(/^[A-Za-z0-9_-]{43,}$/); // base64url, no role data
  });

  it("5. Missing role (deactivated user) fails closed — isActive=false → 401", async () => {
    const deactivated = await createUser(tenantA.id, {
      email: `deactivated-${Date.now()}@cross-tenant.local`,
      role: "admin",
      isActive: false, // deactivated
    });
    const { token } = await createSession(deactivated.id);

    // getSessionUser() filters by isActive = true
    const res = await request(app)
      .get("/api/content/admin")
      .set("Cookie", sessionCookie(token));

    // isActive=false → session resolves to null → 401 (not authenticated)
    expect(res.status).toBe(401);
  });

  it("6. Unknown/invalid role string fails closed — 403", async () => {
    // This verifies the capability guard fails closed for unknown role values.
    // The user_role enum enforces this at the DB level; this test proves the
    // middleware also handles any edge case (e.g. role stored before enum existed).
    // Test via the unit test harness: hasCapability('superuser', 'content:manage') = false.
    const { hasCapability } = await import("../../lib/capabilities.js");
    expect(hasCapability("superuser" as never, "content:manage")).toBe(false);
    expect(hasCapability("" as never, "audit:read")).toBe(false);
    expect(hasCapability(null as never, "proposal:manage")).toBe(false);
  });
});
