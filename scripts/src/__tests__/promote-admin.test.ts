/**
 * Unit tests for the promote-admin provisioning tool.
 *
 * Tests cover all required cases:
 *   - Dry-run by default
 *   - Missing target → refused
 *   - Ambiguous target → refused
 *   - Confirmation mismatch → refused
 *   - Existing different admin → refused
 *   - Already-admin idempotency
 *   - Successful transactional promotion
 *   - Audit failure rollback (transaction throws)
 *   - No sensitive output
 *
 * The db is injected so no real database connection is required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { promoteAdmin, type PromotionDb, type PromoteResult } from "../promote-admin";

// ---------------------------------------------------------------------------
// Mock user row factory
// ---------------------------------------------------------------------------

function makeUser(overrides: Partial<{
  id: string; email: string; role: string;
  firstName: string; lastName: string; tenantId: string;
}> = {}) {
  return {
    id: overrides.id ?? "user-uuid-1",
    email: overrides.email ?? "user@example.com",
    role: overrides.role ?? "client",
    firstName: overrides.firstName ?? "Test",
    lastName: overrides.lastName ?? "User",
    tenantId: overrides.tenantId ?? "tenant-uuid-1",
    isActive: true,
    passwordHash: null,
    avatarUrl: null,
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Mock db factory
//
// Drizzle uses method chaining: db.select().from().where() → Promise.
// We simulate this with a chainable proxy that resolves to `resolvedWith`
// on the first `.then()` / await.
// ---------------------------------------------------------------------------

function chainable(result: unknown) {
  const proxy: Record<string, unknown> = {};
  const self: unknown = new Proxy(proxy, {
    get(_t, prop) {
      if (prop === "then") {
        // Make the chain itself awaitable
        return (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
      }
      // Any method returns the same chainable proxy
      return () => self;
    },
  });
  return self;
}

type SelectCall = { result: unknown };

/**
 * Build a mock PromotionDb where:
 * - select() calls return `selectResults` sequentially (one per call order)
 * - transaction() calls the callback with a mock tx
 * - the tx's update/insert chains resolve successfully by default
 */
function makeMockDb(
  selectResults: unknown[],
  txBehaviour: "success" | "audit-failure" = "success",
): { db: PromotionDb; txCalls: unknown[][] } {
  let selectCallCount = 0;
  const txCalls: unknown[][] = [];

  const mockTx = {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    insert: txBehaviour === "audit-failure"
      ? vi.fn().mockReturnValue({
          values: vi.fn().mockRejectedValue(new Error("Audit write failed")),
        })
      : vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([]),
        }),
  };

  const mockDb: PromotionDb = {
    select: vi.fn().mockImplementation(() => {
      const result = selectResults[selectCallCount++] ?? [];
      return chainable(result);
    }) as unknown as PromotionDb["select"],
    transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const callArgs: unknown[] = [];
      txCalls.push(callArgs);
      if (txBehaviour === "audit-failure") {
        // The callback will throw due to the mock tx.insert rejection
        await fn(mockTx);
      } else {
        await fn(mockTx);
      }
    }) as unknown as PromotionDb["transaction"],
  };

  return { db: mockDb, txCalls };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("promoteAdmin — input validation", () => {
  it("refuses when neither email nor userId is provided", async () => {
    const { db } = makeMockDb([]);
    const result = await promoteAdmin(db, { confirm: "", apply: false });
    expect(result.status).toBe("refused");
  });

  it("refuses when both email and userId are provided", async () => {
    const { db } = makeMockDb([]);
    const result = await promoteAdmin(db, {
      email: "a@example.com",
      userId: "some-uuid",
      confirm: "a@example.com",
      apply: false,
    });
    expect(result.status).toBe("refused");
  });

  it("refuses when confirmation does not match email", async () => {
    const { db } = makeMockDb([]);
    const result = await promoteAdmin(db, {
      email: "a@example.com",
      confirm: "b@example.com",
      apply: false,
    });
    expect(result.status).toBe("refused");
    expect((result as { reason: string }).reason).toMatch(/confirm/i);
  });

  it("refuses when confirmation does not match userId", async () => {
    const { db } = makeMockDb([]);
    const result = await promoteAdmin(db, {
      userId: "uuid-1",
      confirm: "uuid-2",
      apply: false,
    });
    expect(result.status).toBe("refused");
  });

  it("refuses when confirmation is empty string", async () => {
    const { db } = makeMockDb([]);
    const result = await promoteAdmin(db, {
      email: "a@example.com",
      confirm: "",
      apply: false,
    });
    expect(result.status).toBe("refused");
  });
});

describe("promoteAdmin — target lookup", () => {
  it("refuses when no user is found matching the identifier", async () => {
    const { db } = makeMockDb([[]]); // empty select result
    const result = await promoteAdmin(db, {
      email: "nobody@example.com",
      confirm: "nobody@example.com",
      apply: false,
    });
    expect(result.status).toBe("refused");
    expect((result as { reason: string }).reason).toMatch(/no user found/i);
  });

  it("refuses when multiple users are returned (ambiguous)", async () => {
    const user1 = makeUser({ id: "id-1" });
    const user2 = makeUser({ id: "id-2" });
    const { db } = makeMockDb([[user1, user2]]);
    const result = await promoteAdmin(db, {
      email: "user@example.com",
      confirm: "user@example.com",
      apply: false,
    });
    expect(result.status).toBe("refused");
    expect((result as { reason: string }).reason).toMatch(/ambiguous/i);
  });
});

describe("promoteAdmin — admin conflict check", () => {
  it("refuses when a DIFFERENT admin already exists", async () => {
    const targetUser = makeUser({ role: "client", id: "target-id" });
    const existingAdmin = makeUser({ role: "admin", id: "other-admin-id", email: "marcus@mg.com" });
    // First select: finds target user; second select: finds existing admin
    const { db } = makeMockDb([[targetUser], [existingAdmin]]);
    const result = await promoteAdmin(db, {
      email: targetUser.email,
      confirm: targetUser.email,
      apply: false,
    });
    expect(result.status).toBe("refused");
    expect((result as { reason: string }).reason).toMatch(/another admin already exists/i);
  });
});

describe("promoteAdmin — idempotency", () => {
  it("returns already-admin when target is already admin", async () => {
    const adminUser = makeUser({ role: "admin" });
    const { db } = makeMockDb([[adminUser]]);
    const result = await promoteAdmin(db, {
      email: adminUser.email,
      confirm: adminUser.email,
      apply: false,
    });
    expect(result.status).toBe("already-admin");
    if (result.status === "already-admin") {
      expect(result.targetId).toBe(adminUser.id);
      expect(result.targetEmail).toBe(adminUser.email);
    }
  });
});

describe("promoteAdmin — dry-run", () => {
  it("returns dry-run status when apply=false", async () => {
    const targetUser = makeUser({ role: "client" });
    // First select: finds target; second select: no other admins
    const { db, txCalls } = makeMockDb([[targetUser], []]);
    const result = await promoteAdmin(db, {
      email: targetUser.email,
      confirm: targetUser.email,
      apply: false,
    });
    expect(result.status).toBe("dry-run");
    // No transaction should have been called
    expect(txCalls).toHaveLength(0);
  });

  it("dry-run includes targetId, targetEmail, and targetName", async () => {
    const targetUser = makeUser({ role: "client", firstName: "John", lastName: "Doe" });
    const { db } = makeMockDb([[targetUser], []]);
    const result = await promoteAdmin(db, {
      email: targetUser.email,
      confirm: targetUser.email,
      apply: false,
    });
    if (result.status === "dry-run") {
      expect(result.targetId).toBe(targetUser.id);
      expect(result.targetEmail).toBe(targetUser.email);
      expect(result.targetName).toContain("John");
    } else {
      expect.fail(`Expected dry-run, got ${result.status}`);
    }
  });

  it("dry-run does not contain passwords or secrets in the result", async () => {
    const targetUser = makeUser({ role: "client" });
    const { db } = makeMockDb([[targetUser], []]);
    const result = await promoteAdmin(db, {
      email: targetUser.email,
      confirm: targetUser.email,
      apply: false,
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/password/i);
    expect(serialized).not.toMatch(/secret/i);
    expect(serialized).not.toMatch(/token/i);
    expect(serialized).not.toMatch(/hash/i);
  });
});

describe("promoteAdmin — successful promotion (apply=true)", () => {
  it("returns promoted status when apply=true and all checks pass", async () => {
    const targetUser = makeUser({ role: "client" });
    const { db } = makeMockDb([[targetUser], []]);
    const result = await promoteAdmin(db, {
      email: targetUser.email,
      confirm: targetUser.email,
      apply: true,
    });
    expect(result.status).toBe("promoted");
    if (result.status === "promoted") {
      expect(result.targetId).toBe(targetUser.id);
      expect(result.targetEmail).toBe(targetUser.email);
    }
  });

  it("executes a transaction when apply=true", async () => {
    const targetUser = makeUser({ role: "client" });
    const { db, txCalls } = makeMockDb([[targetUser], []]);
    await promoteAdmin(db, {
      email: targetUser.email,
      confirm: targetUser.email,
      apply: true,
    });
    expect(txCalls).toHaveLength(1);
  });

  it("result contains no passwords, tokens, or secrets", async () => {
    const targetUser = makeUser({ role: "client" });
    const { db } = makeMockDb([[targetUser], []]);
    const result = await promoteAdmin(db, {
      email: targetUser.email,
      confirm: targetUser.email,
      apply: true,
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/password/i);
    expect(serialized).not.toMatch(/secret/i);
    expect(serialized).not.toMatch(/token/i);
    expect(serialized).not.toMatch(/hash/i);
  });
});

describe("promoteAdmin — audit failure rollback", () => {
  it("propagates error when the transaction (audit write) fails", async () => {
    const targetUser = makeUser({ role: "client" });
    const { db } = makeMockDb([[targetUser], []], "audit-failure");
    await expect(
      promoteAdmin(db, {
        email: targetUser.email,
        confirm: targetUser.email,
        apply: true,
      }),
    ).rejects.toThrow("Audit write failed");
  });
});
