/**
 * Unit tests for the writeAuditLog helper.
 *
 * The helper must:
 *   - Insert one record into auditLogsTable with exactly the supplied params.
 *   - Accept a custom client (transaction) instead of the default db instance.
 *   - Propagate errors — it must NEVER swallow audit failures.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeAuditLog, type AuditParams } from "../lib/audit";

// ── Mock @workspace/db ────────────────────────────────────────────────────
// Prevents the module from connecting to a real database.
vi.mock("@workspace/db", () => {
  const auditLogsTable = { _: "auditLogsTable" };
  const mockDb = {
    insert: vi.fn(),
  };
  return { db: mockDb, auditLogsTable };
});

import { db, auditLogsTable } from "@workspace/db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValuesCapture() {
  const captured: unknown[] = [];
  const valuesFn = vi.fn().mockImplementation((v: unknown) => {
    captured.push(v);
    return Promise.resolve();
  });
  const insertResult = { values: valuesFn };
  return { captured, valuesFn, insertResult };
}

const BASE_PARAMS: AuditParams = {
  tenantId: "tenant-uuid-1",
  actorType: "user",
  actorId: "actor-uuid-1",
  action: "content:create",
  targetType: "content_post",
  targetId: "post-uuid-1",
  metadata: { title: "Test post" },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("writeAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls client.insert with auditLogsTable", async () => {
    const { insertResult } = makeValuesCapture();
    const mockClient = { insert: vi.fn().mockReturnValue(insertResult) };

    await writeAuditLog(BASE_PARAMS, mockClient);

    expect(mockClient.insert).toHaveBeenCalledWith(auditLogsTable);
  });

  it("passes all required params as insert values", async () => {
    const { captured, insertResult } = makeValuesCapture();
    const mockClient = { insert: vi.fn().mockReturnValue(insertResult) };

    await writeAuditLog(BASE_PARAMS, mockClient);

    const inserted = captured[0] as Record<string, unknown>;
    expect(inserted.tenantId).toBe("tenant-uuid-1");
    expect(inserted.actorType).toBe("user");
    expect(inserted.actorId).toBe("actor-uuid-1");
    expect(inserted.action).toBe("content:create");
    expect(inserted.targetType).toBe("content_post");
    expect(inserted.targetId).toBe("post-uuid-1");
    expect(inserted.metadata).toEqual({ title: "Test post" });
  });

  it("omits actorId (undefined) when actorId param is null", async () => {
    const { captured, insertResult } = makeValuesCapture();
    const mockClient = { insert: vi.fn().mockReturnValue(insertResult) };
    const params: AuditParams = { ...BASE_PARAMS, actorId: null };

    await writeAuditLog(params, mockClient);

    const inserted = captured[0] as Record<string, unknown>;
    // null actorId becomes undefined so drizzle omits the column (uses DB default NULL)
    expect(inserted.actorId).toBeUndefined();
  });

  it("omits targetId (undefined) when targetId param is null", async () => {
    const { captured, insertResult } = makeValuesCapture();
    const mockClient = { insert: vi.fn().mockReturnValue(insertResult) };
    const params: AuditParams = { ...BASE_PARAMS, targetId: null };

    await writeAuditLog(params, mockClient);

    const inserted = captured[0] as Record<string, unknown>;
    expect(inserted.targetId).toBeUndefined();
  });

  it("omits metadata (undefined) when metadata param is absent", async () => {
    const { captured, insertResult } = makeValuesCapture();
    const mockClient = { insert: vi.fn().mockReturnValue(insertResult) };
    const { metadata: _m, ...params } = BASE_PARAMS;

    await writeAuditLog(params, mockClient);

    const inserted = captured[0] as Record<string, unknown>;
    expect(inserted.metadata).toBeUndefined();
  });

  it("uses the default db instance when no client is supplied", async () => {
    // The default db mock from @workspace/db
    const mockedDb = db as unknown as { insert: ReturnType<typeof vi.fn> };
    const { insertResult } = makeValuesCapture();
    mockedDb.insert.mockReturnValue(insertResult);

    await writeAuditLog(BASE_PARAMS);

    expect(mockedDb.insert).toHaveBeenCalled();
  });

  it("uses the provided client and does NOT fall back to the default db", async () => {
    const mockedDb = db as unknown as { insert: ReturnType<typeof vi.fn> };
    const { insertResult } = makeValuesCapture();
    const mockClient = { insert: vi.fn().mockReturnValue(insertResult) };

    await writeAuditLog(BASE_PARAMS, mockClient);

    expect(mockClient.insert).toHaveBeenCalled();
    expect(mockedDb.insert).not.toHaveBeenCalled();
  });

  it("propagates insert errors — does not swallow audit failures", async () => {
    const boom = new Error("DB connection lost");
    const mockClient = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockRejectedValue(boom),
      }),
    };

    await expect(writeAuditLog(BASE_PARAMS, mockClient)).rejects.toThrow(
      "DB connection lost",
    );
  });

  it("accepts actor type 'cli' for provisioning actions", async () => {
    const { captured, insertResult } = makeValuesCapture();
    const mockClient = { insert: vi.fn().mockReturnValue(insertResult) };
    const params: AuditParams = {
      ...BASE_PARAMS,
      actorType: "cli",
      actorId: null,
      action: "user:promote_admin",
      targetType: "user",
    };

    await writeAuditLog(params, mockClient);

    const inserted = captured[0] as Record<string, unknown>;
    expect(inserted.actorType).toBe("cli");
    expect(inserted.action).toBe("user:promote_admin");
  });

  it("accepts actor type 'system' for background actions", async () => {
    const { captured, insertResult } = makeValuesCapture();
    const mockClient = { insert: vi.fn().mockReturnValue(insertResult) };
    const params: AuditParams = {
      ...BASE_PARAMS,
      actorType: "system",
      actorId: null,
    };

    await writeAuditLog(params, mockClient);

    const inserted = captured[0] as Record<string, unknown>;
    expect(inserted.actorType).toBe("system");
  });
});
