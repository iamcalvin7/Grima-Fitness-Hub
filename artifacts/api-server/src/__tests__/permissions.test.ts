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
import type { Capability } from "../lib/capabilities.js";

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
import { requireAuth, requireRole, requireCapability } from "../middlewares/auth.js";

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
// Stage 1B — requireCapability middleware
// ---------------------------------------------------------------------------
describe("requireCapability — fail closed: missing user", () => {
  it("returns 401 when req.user is undefined", () => {
    const req = mockReq({ user: undefined });
    const { res, status, json } = mockRes();
    const next = mockNext();

    requireCapability("content:manage")(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: "Not authenticated" });
    expect(next).not.toHaveBeenCalled();
  });

  it("does not call the handler after denial when user is absent", () => {
    const req = mockReq({ user: undefined });
    const { res } = mockRes();
    const next = mockNext();

    requireCapability("content:manage")(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireCapability — fail closed: role missing / unknown", () => {
  it("returns 403 when the user role is an unknown value", () => {
    const req = mockReq({ user: { ...makeUser("client"), role: "hacker" as User["role"] } });
    const { res, status, json } = mockRes();
    const next = mockNext();

    requireCapability("content:manage")(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireCapability — client denied", () => {
  it("returns 403 for a client requesting content:manage", () => {
    const req = mockReq({ user: makeUser("client") });
    const { res, status, json } = mockRes();
    const next = mockNext();

    requireCapability("content:manage")(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });

  it("does not call the handler after denying a client", () => {
    const req = mockReq({ user: makeUser("client") });
    const { res } = mockRes();
    const next = mockNext();

    requireCapability("content:manage")(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireCapability — legacy trainer denied (v1 model)", () => {
  it("returns 403 for a trainer requesting content:manage", () => {
    const req = mockReq({ user: makeUser("trainer") });
    const { res, status, json } = mockRes();
    const next = mockNext();

    requireCapability("content:manage")(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 for a trainer requesting proposal:manage", () => {
    const req = mockReq({ user: makeUser("trainer") });
    const { res, status, json } = mockRes();
    const next = mockNext();

    requireCapability("proposal:manage")(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireCapability — admin (Marcus) allowed", () => {
  it("calls next() for admin with content:manage", () => {
    const req = mockReq({ user: makeUser("admin") });
    const { res } = mockRes();
    const next = mockNext();

    requireCapability("content:manage")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("calls next() for admin with proposal:manage", () => {
    const req = mockReq({ user: makeUser("admin") });
    const { res } = mockRes();
    const next = mockNext();

    requireCapability("proposal:manage")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});

describe("requireCapability — existingRequireAuth behaviour unchanged", () => {
  it("requireAuth still returns 401 for missing user (Gate 0 regression check)", () => {
    const req = mockReq({ user: undefined });
    const { res, status, json } = mockRes();
    const next = mockNext();

    requireAuth(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: "Not authenticated" });
    expect(next).not.toHaveBeenCalled();
  });

  it("requireAuth still calls next() for an authenticated user (Gate 0 regression check)", () => {
    const req = mockReq({ user: makeUser("client") });
    const { res } = mockRes();
    const next = mockNext();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Gate 1 — previously-pending capability-map cases (now implementable)
// ---------------------------------------------------------------------------
describe("Gate 1 — legacy trainer receives no Marcus capabilities (now verified)", () => {
  it("trainer cannot access content:manage via requireCapability", () => {
    const req = mockReq({ user: makeUser("trainer") });
    const { res, status } = mockRes();
    const next = mockNext();

    requireCapability("content:manage")(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("Gate 1 — missing / unknown role fails closed (now verified)", () => {
  it("unknown role string is denied by requireCapability", () => {
    const req = mockReq({ user: { ...makeUser("client"), role: "unknown_role" as User["role"] } });
    const { res, status } = mockRes();
    const next = mockNext();

    requireCapability("content:manage")(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("Gate 1 — Marcus (admin) receives coaching and administrative capabilities (now verified)", () => {
  it("admin reaches handler for content:manage", () => {
    const req = mockReq({ user: makeUser("admin") });
    const { res } = mockRes();
    const next = mockNext();

    requireCapability("content:manage")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("admin reaches handler for proposal:manage", () => {
    const req = mockReq({ user: makeUser("admin") });
    const { res } = mockRes();
    const next = mockNext();

    requireCapability("proposal:manage")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
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
// PENDING — Frontend integration test: requires a browser test runner
// The guard is implemented in App.tsx (useEffect + render guard).
// The automated coverage is BLOCKED until a frontend test framework is added.
// ---------------------------------------------------------------------------
describe.skip("BLOCKED — requires frontend test runner (Playwright or Vitest-browser)", () => {
  it("client cannot access Content Admin by manually setting activePage to 'content-admin' in dev tools");
  it("loading/null user state does not render Content Admin");
  it("admin reaches Content Admin normally");
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
