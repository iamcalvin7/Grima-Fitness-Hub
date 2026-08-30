import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  auditLogsTable,
  db,
  exerciseEquipmentTable,
  exerciseMusclesTable,
  exercisesTable,
  type Tenant,
  type User,
} from "@workspace/db";
import {
  buildExerciseImportManifest,
  EXERCISE_IMPORT_VERSION,
  extractLegacyExercises,
  type ExerciseImportManifestEntry,
} from "../../lib/exerciseCatalogueImport.js";
import { reconcileDevelopmentImport } from "../../cli/importExerciseCatalogue.js";
import { createTenant, createUser } from "./harness.js";

const source = readFileSync(
  path.resolve(process.cwd(), "../marcus-grima/src/data/programs.ts"),
  "utf8",
);
const manifest = buildExerciseImportManifest(extractLegacyExercises(source));
const sourceSha256 = createHash("sha256").update(source).digest("hex");
const originalNodeEnv = process.env.NODE_ENV;
let tenant: Tenant;
let actor: User;

async function seedOriginalImport(
  entry: ExerciseImportManifestEntry,
  tenantId: string,
  actorId: string,
) {
  const { muscles = [], equipment = [], ...fields } = entry.payload;
  const [exercise] = await db
    .insert(exercisesTable)
    .values({
      ...fields,
      tenantId,
      createdByUserId: actorId,
      updatedByUserId: actorId,
      status: "draft",
      performanceType: "weight_reps",
      laterality: "bilateral",
      internalNotes: "Obsolete inferred import metadata.",
    })
    .returning();
  if (muscles.length > 0) {
    await db.insert(exerciseMusclesTable).values(
      muscles.map((muscle) => ({
        tenantId,
        exerciseId: exercise.id,
        ...muscle,
      })),
    );
  }
  if (equipment.length > 0) {
    await db.insert(exerciseEquipmentTable).values(
      equipment.map((item) => ({
        tenantId,
        exerciseId: exercise.id,
        ...item,
      })),
    );
  }
  await db.insert(auditLogsTable).values({
    tenantId,
    actorType: "cli",
    actorId,
    action: "exercise:create",
    targetType: "exercise",
    targetId: exercise.id,
    metadata: {
      source: "bundled-programmes",
      sourceId: entry.source.sourceId,
      importVersion: EXERCISE_IMPORT_VERSION,
    },
  });
  return exercise;
}

async function seedCompleteOriginalImport(importActor: User = actor) {
  return Promise.all(
    manifest.map((entry) =>
      seedOriginalImport(entry, tenant.id, importActor.id),
    ),
  );
}

beforeAll(() => {
  process.env.NODE_ENV = "development";
  delete process.env.REPLIT_DEPLOYMENT;
  delete process.env.REPLIT_DEPLOYMENT_ID;
  delete process.env.REPLIT_ENV;
});

afterAll(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

beforeEach(async () => {
  tenant = await createTenant({
    name: "Marcus Grima PT",
    slug: "marcus-grima",
  });
  await db
    .delete(exerciseMusclesTable)
    .where(eq(exerciseMusclesTable.tenantId, tenant.id));
  await db
    .delete(exerciseEquipmentTable)
    .where(eq(exerciseEquipmentTable.tenantId, tenant.id));
  await db
    .delete(exercisesTable)
    .where(eq(exercisesTable.tenantId, tenant.id));
  await db
    .delete(auditLogsTable)
    .where(
      and(
        eq(auditLogsTable.tenantId, tenant.id),
        eq(auditLogsTable.targetType, "exercise"),
      ),
    );
  actor = await createUser(tenant.id, { role: "admin" });
});

describe("exercise catalogue import reconciliation", () => {
  it("rejects partial manifests and non-canonical tenants", async () => {
    await expect(
      reconcileDevelopmentImport(
        manifest.slice(0, 2),
        tenant.id,
        actor.id,
        sourceSha256,
        true,
      ),
    ).rejects.toThrow(/approved Gate 2C inventory/);

    const otherTenant = await createTenant();
    const otherAdmin = await createUser(otherTenant.id, { role: "admin" });
    await expect(
      reconcileDevelopmentImport(
        manifest,
        otherTenant.id,
        otherAdmin.id,
        sourceSha256,
        true,
      ),
    ).rejects.toThrow(/marcus-grima/);

    const alteredManifest = structuredClone(manifest);
    alteredManifest[0].source.name = "Unreviewed replacement";
    alteredManifest[0] = buildExerciseImportManifest(
      alteredManifest.map((entry) => entry.source),
    )[0];
    await expect(
      reconcileDevelopmentImport(
        alteredManifest,
        tenant.id,
        actor.id,
        sourceSha256,
        true,
      ),
    ).rejects.toThrow(/approved Gate 2C inventory/);
    await expect(
      reconcileDevelopmentImport(
        manifest,
        tenant.id,
        actor.id,
        sourceSha256,
        false,
      ),
    ).rejects.toThrow(/confirmation/);
  });

  it("fails fast when another import holds the advisory lock", async () => {
    const client = await db.$client.connect();
    const lockKey = `exercise-import:${tenant.id}:${EXERCISE_IMPORT_VERSION}`;
    try {
      await client.query("select pg_advisory_lock(hashtext($1))", [lockKey]);
      await expect(
        reconcileDevelopmentImport(
          manifest,
          tenant.id,
          actor.id,
          sourceSha256,
          true,
        ),
      ).rejects.toThrow(/already running/);
    } finally {
      await client.query("select pg_advisory_unlock(hashtext($1))", [lockKey]);
      client.release();
    }
  });

  it("reconciles all proven original drafts and writes one audit per mutation", async () => {
    const originals = await seedCompleteOriginalImport();
    const result = await reconcileDevelopmentImport(
      manifest,
      tenant.id,
      actor.id,
      sourceSha256,
      true,
    );
    expect(result).toMatchObject({
      rowsAlreadyExact: 0,
      rowsSafelyReconciled: 47,
      reconciliationAuditEvents: 47,
      finalVersionDistribution: { "2": 47 },
      ownership: {
        provenImportOwnedUnchanged: 47,
        importOwnedButChanged: 0,
        notProvablyImportOwned: 0,
      },
    });

    const saved = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.tenantId, tenant.id));
    expect(saved).toHaveLength(47);
    expect(saved.every((exercise) => exercise.version === 2)).toBe(true);
    expect(saved.every((exercise) => exercise.performanceType === null)).toBe(true);
    expect(saved.every((exercise) => exercise.laterality === null)).toBe(true);
    expect(saved.map((exercise) => exercise.id).sort()).toEqual(
      originals.map((exercise) => exercise.id).sort(),
    );
    const audits = await db
      .select()
      .from(auditLogsTable)
      .where(
        and(
          eq(auditLogsTable.tenantId, tenant.id),
          eq(auditLogsTable.action, "exercise:reconcile"),
        ),
      );
    expect(audits).toHaveLength(47);
  });

  it("blocks changed ownership evidence without mutating rows", async () => {
    const originals = await seedCompleteOriginalImport();
    await db
      .update(exercisesTable)
      .set({ version: 2, updatedAt: new Date() })
      .where(eq(exercisesTable.id, originals[0].id));

    await expect(
      reconcileDevelopmentImport(
        manifest,
        tenant.id,
        actor.id,
        sourceSha256,
        true,
      ),
    ).rejects.toThrow("BLOCKED — GATE 2C DATA DECISION REQUIRED");
    const saved = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.tenantId, tenant.id));
    expect(saved.filter((exercise) => exercise.version === 2)).toHaveLength(1);
    expect(saved.every((exercise) => exercise.performanceType === "weight_reps")).toBe(
      true,
    );
  });

  it("rejects an inactive import actor before mutation", async () => {
    const inactiveActor = await createUser(tenant.id, {
      role: "admin",
      isActive: false,
    });
    await seedCompleteOriginalImport(inactiveActor);

    await expect(
      reconcileDevelopmentImport(
        manifest,
        tenant.id,
        inactiveActor.id,
        sourceSha256,
        true,
      ),
    ).rejects.toThrow("active admin");
    const saved = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.tenantId, tenant.id));
    expect(saved.every((exercise) => exercise.version === 1)).toBe(true);
  });

  it("rolls back earlier rows when a later reconciliation audit fails", async () => {
    const originals = await seedCompleteOriginalImport();
    const rejectedSourceId = manifest.at(-1)!.source.sourceId.replaceAll("'", "''");
    await db.$client.query(`
      CREATE OR REPLACE FUNCTION reject_later_reconciliation_audit()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.action = 'exercise:reconcile'
          AND NEW.metadata->>'sourceId' = '${rejectedSourceId}' THEN
          RAISE EXCEPTION 'later reconciliation audit rejected by test';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER reject_later_reconciliation_audit_trigger
        BEFORE INSERT ON audit_logs
        FOR EACH ROW EXECUTE FUNCTION reject_later_reconciliation_audit();
    `);
    try {
      await expect(
        reconcileDevelopmentImport(
          manifest,
          tenant.id,
          actor.id,
          sourceSha256,
          true,
        ),
      ).rejects.toThrow();
      const saved = await db
        .select()
        .from(exercisesTable)
        .where(eq(exercisesTable.tenantId, tenant.id));
      expect(saved.every((exercise) => exercise.version === 1)).toBe(true);
      expect(
        saved.every((exercise) => exercise.performanceType === "weight_reps"),
      ).toBe(true);
      expect(saved.map((exercise) => exercise.id).sort()).toEqual(
        originals.map((exercise) => exercise.id).sort(),
      );
      const audits = await db
        .select()
        .from(auditLogsTable)
        .where(
          and(
            eq(auditLogsTable.tenantId, tenant.id),
            eq(auditLogsTable.action, "exercise:reconcile"),
          ),
        );
      expect(audits).toHaveLength(0);
    } finally {
      await db.$client.query(`
        DROP TRIGGER IF EXISTS reject_later_reconciliation_audit_trigger ON audit_logs;
        DROP FUNCTION IF EXISTS reject_later_reconciliation_audit();
      `);
    }
  });
});