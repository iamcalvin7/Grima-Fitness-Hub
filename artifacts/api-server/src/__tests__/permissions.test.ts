/**
 * Gate 0 Permission Tests
 *
 * Tests current, already-approved behaviour only.
 * No DB connection required for middleware unit tests.
 *
 * Integration tests that require an isolated test database are marked
 * BLOCKED — they must not run against the development or production DB.
 */

import { describe, it, expect, vi, type Mock } from "vitest";
import type { Request, Response, NextFunction } from "express";
import type { User } from "@workspace/db";

// ---------------------------------------------------------------------------
// Helper: build minimal mock Express req/res/next
// ---------------------------------------------------------------------------
function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    cookies: {},
    user: undefined,
    sessionToken: undefined,
    body: {},
    params: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): { res: Response; status: Mock; json: Mock } {
  const json = vi.fn().mockReturnThis();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  return { res, status, json };
}

function mockNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

function makeUser(role: User["role"]): User {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    tenantId: "00000000-0000-0000-0000-000000000002",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    role,
    emailVerified: true,
    passwordHash: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as User;
}

// ---------------------------------------------------------------------------
// Import middleware under test
// ---------------------------------------------------------------------------
// Dynamic import so mocks can be set up first if needed
import { requireAuth, requireRole } from "../middlewares/auth.js";

// ---------------------------------------------------------------------------
// 1. requireAuth — unauthenticated request is denied
// ---------------------------------------------------------------------------
describe("requireAuth", () => {
  it("returns 401 when req.user is undefined", () => {
    const req = mockReq({ user: undefined });
    const { res, status, json } = mockRes();
    const next = mockNext();

    requireAuth(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: "Not authenticated" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when req.user is present", () => {
    const req = mockReq({ user: makeUser("client") });
    const { res } = mockRes();
    const next = mockNext();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// 2. requireRole — client denied access to privileged routes
// ---------------------------------------------------------------------------
describe("requireRole — client denied", () => {
  it("returns 403 for a client on a route requiring admin", () => {
    const req = mockReq({ user: makeUser("client") });
    const { res, status, json } = mockRes();
    const next = mockNext();

    requireRole("admin")(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 for a client on a route requiring admin or trainer (content routes)", () => {
    const req = mockReq({ user: makeUser("client") });
    const { res, status, json } = mockRes();
    const next = mockNext();

    requireRole("admin", "trainer")(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 for a client on proposal routes", () => {
    const req = mockReq({ user: makeUser("client") });
    const { res, status, json } = mockRes();
    const next = mockNext();

    // Same guard used on all proposal-feature and proposal-decision routes
    requireRole("admin", "trainer")(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. requireRole — Marcus-compatible privileged role is allowed through
//    (trainer and admin both currently hold Marcus-equivalent privileges)
// ---------------------------------------------------------------------------
describe("requireRole — privileged roles allowed", () => {
  it("allows a user with role=admin through content-route guard", () => {
    const req = mockReq({ user: makeUser("admin") });
    const { res } = mockRes();
    const next = mockNext();

    requireRole("admin", "trainer")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("allows a user with role=trainer through content-route guard", () => {
    const req = mockReq({ user: makeUser("trainer") });
    const { res } = mockRes();
    const next = mockNext();

    requireRole("admin", "trainer")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("allows a user with role=admin through proposal-route guard", () => {
    const req = mockReq({ user: makeUser("admin") });
    const { res } = mockRes();
    const next = mockNext();

    requireRole("admin", "trainer")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// 4. requireRole — unauthenticated request (no req.user) fails closed
// ---------------------------------------------------------------------------
describe("requireRole — no req.user fails closed", () => {
  it("returns 403 when req.user is undefined", () => {
    const req = mockReq({ user: undefined });
    const { res, status, json } = mockRes();
    const next = mockNext();

    requireRole("admin", "trainer")(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PENDING — Integration tests requiring an isolated test database
// These are marked skip and will be unblocked when a test DB is provisioned.
// Do NOT run these against development or production databases.
// ---------------------------------------------------------------------------
describe.skip("BLOCKED — requires isolated test database", () => {
  it("signup body with role field is ignored — user always created as client");
  it("OAuth-created user cannot assign privileged role to themselves");
  it("PUT /profile ignores role field in request body");
  it("PUT /profile ignores tenantId field — tenant comes from authenticated user");
  it("GET /profile uses authenticated user ID, not a body or query param");
  it("DELETE /account/sessions/:id verifies session belongs to authenticated user");
  it("client cannot reach GET /content/admin — 403 from server");
  it("client cannot reach GET /proposal-features — 403 from server");
  it("client cannot reach POST /content — 403 from server");
  it("client cannot reach DELETE /proposal-decisions/:id — 403 from server");
  it("tenant A cannot read tenant B content via tenantId manipulation");
});

// ---------------------------------------------------------------------------
// PENDING — RED-dependent: requires capability map (Gate 1+)
// ---------------------------------------------------------------------------
describe.skip("PENDING — requires capability map (Gate 1)", () => {
  it("legacy trainer role maps correctly under approved v1 capability model");
  it("missing role value fails closed — not passed through as unknown");
  it("Marcus receives both coaching and administrative capabilities");
  it("client cannot access Content Admin page via direct UI state manipulation");
});

describe.skip("PENDING — requires session infrastructure in tests (Gate 1+)", () => {
  it("role change during active session takes effect on the next request");
  it("cross-tenant record access is rejected at the API layer");
});

describe.skip("PENDING — requires audit-log table (Gate 2+)", () => {
  it("sensitive Marcus action records actor, action, target, and timestamp");
});

describe.skip("PENDING — requires provisioning tool (Gate 2+)", () => {
  it("Marcus provisioning script sets role=admin and creates an audit record");
  it("user-scoped upload paths bind signed URL to the requesting user");
});
