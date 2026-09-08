import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import {
  auditLogsTable,
  db,
  exerciseEquipmentTable,
  exerciseMusclesTable,
  exercisesTable,
  usersTable,
  type Tenant,
  type User,
} from "@workspace/db";
import {
  buildExerciseImportManifest,
  buildExerciseImportProvenance,
  EXERCISE_IMPORT_VERSION,
  EXERCISE_PROVENANCE_ATTESTATION_ACTION,
  extractLegacyExercises,
  normalizedLegacySourceSha256,
  type ExerciseImportManifestEntry,
} from "../../lib/exerciseCatalogueImport.js";
import {
  attestDevelopmentImport,
  lockAndLoadCurrentOperator,
  proveImportOwnership,
  reconcileDevelopmentImport,
} from "../../cli/importExerciseCatalogue.js";
import { createTenant, createUser } from "./harness.js";

const source = readFileSync(
  path.resolve(process.cwd(), "../marcus-grima/src/data/programs.ts"),
  "utf8",
);
const manifest = buildExerciseImportManifest(extractLegacyExercises(source));
const sourceSha256 = createHash("sha256").update(source).digest("hex");
const normalizedSourceSha256 = normalizedLegacySourceSha256(
  manifest.map((entry) => entry.source),
);
const originalNodeEnv = process.env.NODE_ENV;
let tenant: Tenant;
let actor: User;

async function seedOriginalImport(
  entry: ExerciseImportManifestEntry,
  tenantId: string,
  actorId: string,
  completeProvenance = true,
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
    metadata: completeProvenance
      ? {
          ...buildExerciseImportProvenance(
            entry,
            sourceSha256,
            normalizedSourceSha256,
            exercise.id,
            1,
          ),
        }
      : {
          slug: entry.payload.slug,
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

async function seedLegacyReconciledImport(importActor: User = actor) {
  const exercises = [];
  for (const entry of manifest) {
    const exercise = await seedOriginalImport(
      entry,
      tenant.id,
      importActor.id,
      false,
    );
    const { muscles: _muscles, equipment: _equipment, ...fields } = entry.payload;
    const [updated] = await db
      .update(exercisesTable)
      .set({
        ...fields,
        version: 2,
        updatedByUserId: importActor.id,
        updatedAt: new Date(),
      })
      .where(eq(exercisesTable.id, exercise.id))
      .returning();
    await db.insert(auditLogsTable).values({
      tenantId: tenant.id,
      actorType: "cli",
      actorId: importActor.id,
      action: "exercise:reconcile",
      targetType: "exercise",
      targetId: exercise.id,
      metadata: {
        source: "bundled-programmes",
        sourceId: entry.source.sourceId,
        slug: entry.payload.slug,
        importVersion: EXERCISE_IMPORT_VERSION,
        sourceSha256,
        fromVersion: 1,
        toVersion: 2,
        differences: ["performanceType", "laterality", "internalNotes"],
      },
    });
    exercises.push(updated);
  }
  return exercises;
}

async function loadImportRows() {
  const exercises = await db
    .select()
    .from(exercisesTable)
    .where(eq(exercisesTable.tenantId, tenant.id));
  const ids = exercises.map((exercise) => exercise.id);
  const [muscles, equipment] = await Promise.all([
    db
      .select()
      .from(exerciseMusclesTable)
      .where(inArray(exerciseMusclesTable.exerciseId, ids)),
    db
      .select()
      .from(exerciseEquipmentTable)
      .where(inArray(exerciseEquipmentTable.exerciseId, ids)),
  ]);
  return exercises.map((exercise) => ({
    ...exercise,
    muscles: muscles
      .filter((item) => item.exerciseId === exercise.id)
      .map(({ muscleKey, role }) => ({ muscleKey: muscleKey as any, role })),
    equipment: equipment
      .filter((item) => item.exerciseId === exercise.id)
      .map(({ equipmentKey, required }) => ({ equipmentKey, required })),
  }));
}

function snapshotImportRows(rows: Awaited<ReturnType<typeof loadImportRows>>) {
  return JSON.stringify(
    rows
      .map((row) => ({
        ...row,
        muscles: [...row.muscles].sort((left, right) =>
          left.muscleKey.localeCompare(right.muscleKey),
        ),
        equipment: [...row.equipment].sort((left, right) =>
          left.equipmentKey.localeCompare(right.equipmentKey),
        ),
      }))
      .sort((left, right) => left.slug.localeCompare(right.slug)),
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

  it("serializes apply authorization with a concurrent operator revocation", async () => {
    const revoker = await db.$client.connect();
    try {
      await revoker.query("begin");
      await revoker.query(
        "update users set is_active = false where id = $1 and tenant_id = $2",
        [actor.id, tenant.id],
      );
      const authorization = db.transaction((tx) =>
        lockAndLoadCurrentOperator(tx, tenant.id, actor.id),
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
      await revoker.query("commit");
      await expect(authorization).rejects.toThrow(/active admin/);
    } finally {
      try {
        await revoker.query("rollback");
      } finally {
        revoker.release();
      }
    }
  });

  it("uses a replacement admin for new writes while preserving a demoted historical actor", async () => {
    const historicalActor = await createUser(tenant.id, { role: "admin" });
    const replacementAdmin = await createUser(tenant.id, { role: "admin" });
    await seedCompleteOriginalImport(historicalActor);
    await db
      .update(usersTable)
      .set({ isActive: false })
      .where(eq(usersTable.id, historicalActor.id));

    await reconcileDevelopmentImport(
      manifest,
      tenant.id,
      replacementAdmin.id,
      sourceSha256,
      true,
    );

    const saved = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.tenantId, tenant.id));
    expect(saved.every((exercise) => exercise.createdByUserId === historicalActor.id)).toBe(true);
    expect(saved.every((exercise) => exercise.updatedByUserId === replacementAdmin.id)).toBe(true);
    const audits = await db.select().from(auditLogsTable).where(
      and(eq(auditLogsTable.tenantId, tenant.id), eq(auditLogsTable.action, "exercise:reconcile")),
    );
    expect(audits.every((audit) => audit.actorId === replacementAdmin.id)).toBe(true);
    expect(
      proveImportOwnership(manifest, await loadImportRows(), await db
        .select().from(auditLogsTable).where(eq(auditLogsTable.tenantId, tenant.id)),
      replacementAdmin.id).owned.size,
    ).toBe(47);
  });

  it("reports valid version-3 ownership drift without overwriting reviewed content", async () => {
    await seedCompleteOriginalImport();
    await reconcileDevelopmentImport(manifest, tenant.id, actor.id, sourceSha256, true);
    const [reviewed] = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.tenantId, tenant.id))
      .limit(1);
    await db
      .update(exercisesTable)
      .set({
        version: 3,
        name: "Coach reviewed name",
        updatedAt: new Date(),
      })
      .where(eq(exercisesTable.id, reviewed.id));
    await db.insert(auditLogsTable).values({
      tenantId: tenant.id,
      actorType: "user",
      actorId: actor.id,
      action: "exercise:update",
      targetType: "exercise",
      targetId: reviewed.id,
      metadata: { fields: ["name"] },
    });

    const proof = proveImportOwnership(
      manifest,
      await loadImportRows(),
      await db.select().from(auditLogsTable).where(eq(auditLogsTable.tenantId, tenant.id)),
      actor.id,
    );
    expect(proof.changed).toHaveLength(0);
    expect(proof.contentDrift).toHaveLength(1);
    await expect(
      reconcileDevelopmentImport(manifest, tenant.id, actor.id, sourceSha256, true),
    ).rejects.toThrow(/Coach reviewed name|content differs|later reviewed content/);
    const [preserved] = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.id, reviewed.id));
    expect(preserved).toMatchObject({ version: 3, name: "Coach reviewed name" });
  });

  it("preserves legacy-attested ownership after a reviewed version-3 edit", async () => {
    const historicalActor = await createUser(tenant.id, { role: "admin" });
    const replacementAdmin = await createUser(tenant.id, { role: "admin" });
    await seedLegacyReconciledImport(historicalActor);
    await attestDevelopmentImport(
      manifest,
      tenant.id,
      historicalActor.id,
      sourceSha256,
      true,
    );
    await db
      .update(usersTable)
      .set({ role: "client" })
      .where(eq(usersTable.id, historicalActor.id));

    const [reviewed] = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.tenantId, tenant.id))
      .limit(1);
    await db
      .update(exercisesTable)
      .set({
        version: 3,
        name: "Coach reviewed legacy name",
        updatedByUserId: replacementAdmin.id,
        updatedAt: new Date(),
      })
      .where(eq(exercisesTable.id, reviewed.id));
    await db.insert(auditLogsTable).values({
      tenantId: tenant.id,
      actorType: "user",
      actorId: replacementAdmin.id,
      action: "exercise:update",
      targetType: "exercise",
      targetId: reviewed.id,
      metadata: { fields: ["name"] },
    });

    const proof = proveImportOwnership(
      manifest,
      await loadImportRows(),
      await db.select().from(auditLogsTable).where(eq(auditLogsTable.tenantId, tenant.id)),
      replacementAdmin.id,
    );
    expect(proof.owned.size).toBe(47);
    expect(proof.changed).toHaveLength(0);
    expect(proof.notOwned).toHaveLength(0);
    expect(proof.contentDrift).toEqual([
      expect.stringContaining("later reviewed content differs from canonical manifest"),
    ]);

    const audits = await db.select().from(auditLogsTable)
      .where(eq(auditLogsTable.tenantId, tenant.id));
    const reconciliationAudit = audits.find((item) =>
      item.targetId === reviewed.id && item.action === "exercise:reconcile")!;
    const boundaryLifecycleAudit = {
      ...reconciliationAudit,
      id: crypto.randomUUID(),
      action: "exercise:archive",
      actorType: "user" as const,
      actorId: replacementAdmin.id,
      metadata: {},
    };
    expect(
      proveImportOwnership(
        manifest,
        await loadImportRows(),
        [...audits, boundaryLifecycleAudit],
        replacementAdmin.id,
      ).owned.size,
    ).toBe(46);

    const reviewedUpdate = audits.find((item) =>
      item.targetId === reviewed.id && item.action === "exercise:update")!;
    const lateAttestationAudits = audits.map((item) =>
      item.targetId === reviewed.id &&
      item.action === EXERCISE_PROVENANCE_ATTESTATION_ACTION
        ? { ...item, createdAt: new Date(reviewedUpdate.createdAt.getTime() + 1) }
        : item,
    );
    expect(
      proveImportOwnership(
        manifest,
        await loadImportRows(),
        lateAttestationAudits,
        replacementAdmin.id,
      ).owned.size,
    ).toBe(46);
  });

  it("rejects contradictory legacy shapes and broken historical actor linkage", async () => {
    await seedLegacyReconciledImport();
    await attestDevelopmentImport(manifest, tenant.id, actor.id, sourceSha256, true);
    const rows = await loadImportRows();
    const audits = await db.select().from(auditLogsTable)
      .where(eq(auditLogsTable.tenantId, tenant.id));
    const row = rows.find((item) => item.slug === manifest[0].payload.slug)!;
    const createAudit = audits.find((item) =>
      item.targetId === row.id && item.action === "exercise:create")!;
    const reconcileAudit = audits.find((item) =>
      item.targetId === row.id && item.action === "exercise:reconcile")!;

    for (const changedAudits of [
      audits.map((item) => item.id === createAudit.id
        ? { ...item, metadata: { ...item.metadata, sourceSha256: "forged" } }
        : item),
      audits.map((item) => item.id === reconcileAudit.id
        ? { ...item, metadata: { ...item.metadata, manifestRecordSha256: "forged" } }
        : item),
    ]) {
      expect(proveImportOwnership(manifest, rows, changedAudits, actor.id).owned.size)
        .toBe(46);
    }

    const forgedActor = crypto.randomUUID();
    const changedRows = rows.map((item) => item.id === row.id
      ? { ...item, updatedByUserId: forgedActor }
      : item);
    const changedAudits = audits.map((item) => item.id === reconcileAudit.id
      ? { ...item, actorId: forgedActor }
      : item);
    expect(proveImportOwnership(manifest, changedRows, changedAudits, actor.id).owned.size)
      .toBe(46);
  });

  it("requires complete canonical provenance for future create audits", async () => {
    await seedCompleteOriginalImport();
    const rows = await loadImportRows();
    const audits = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.tenantId, tenant.id));
    const createAudit = audits.find(
      (audit) => audit.metadata?.sourceId === manifest[0].source.sourceId,
    )!;
    const complete = proveImportOwnership(
      manifest,
      rows,
      audits,
      actor.id,
    );
    expect(complete.owned.size).toBe(47);

    const invalidValues: Record<string, unknown> = {
      source: "caller-controlled",
      sourceId: "wrong-source-id",
      slug: "wrong-slug",
      importVersion: "wrong-version",
      sourceSha256: "wrong-source-hash",
      normalizedSourceSha256: "wrong-normalized-hash",
      manifestRecordSha256: "wrong-record-hash",
      exerciseId: crypto.randomUUID(),
      currentExerciseVersion: 99,
    };
    for (const [key, value] of Object.entries(invalidValues)) {
      const invalidAudit = {
        ...createAudit,
        metadata: { ...createAudit.metadata, [key]: value },
      };
      const invalidAudits = audits.map((audit) =>
        audit.id === createAudit.id ? invalidAudit : audit,
      );
      const proof = proveImportOwnership(
        manifest,
        rows,
        invalidAudits,
        actor.id,
      );
      expect(proof.owned.size, key).toBe(46);
    }
    const missingHash = {
      ...createAudit,
      metadata: { ...createAudit.metadata },
    };
    delete missingHash.metadata.sourceSha256;
    expect(
      proveImportOwnership(
        manifest,
        rows,
        audits.map((audit) =>
          audit.id === createAudit.id ? missingHash : audit,
        ),
        actor.id,
      ).owned.size,
    ).toBe(46);
    expect(
      proveImportOwnership(
        manifest,
        rows,
        audits.map((audit) =>
          audit.id === createAudit.id
            ? { ...createAudit, tenantId: crypto.randomUUID() }
            : audit,
        ),
        actor.id,
      ).owned.size,
    ).toBe(46);
    expect(
      proveImportOwnership(
        manifest,
        rows,
        audits.map((audit) =>
          audit.id === createAudit.id
            ? {
                ...createAudit,
                metadata: {
                  ...createAudit.metadata,
                  unreviewedClaim: "not-canonical",
                },
              }
            : audit,
        ),
        actor.id,
      ).owned.size,
    ).toBe(46);
  });

  it("attests all legacy reconciled drafts atomically and is idempotent", async () => {
    await seedLegacyReconciledImport();
    const before = snapshotImportRows(await loadImportRows());
    const auditsBefore = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.tenantId, tenant.id));
    const historicalAuditsBefore = JSON.stringify(
      auditsBefore
        .map((audit) => ({ ...audit }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    );

    expect(
      proveImportOwnership(
        manifest,
        await loadImportRows(),
        auditsBefore,
        actor.id,
      ).owned.size,
    ).toBe(0);

    const first = await attestDevelopmentImport(
      manifest,
      tenant.id,
      actor.id,
      sourceSha256,
      true,
    );
    expect(first).toMatchObject({
      provenanceAttestationsCreated: 47,
      exactAttestationsSkipped: 0,
      exerciseRowsChanged: 0,
      versionsChanged: 0,
      mappingsChanged: 0,
      historicalAuditsChanged: 0,
    });
    const second = await attestDevelopmentImport(
      manifest,
      tenant.id,
      actor.id,
      sourceSha256,
      true,
    );
    expect(second).toMatchObject({
      provenanceAttestationsCreated: 0,
      exactAttestationsSkipped: 47,
    });

    expect(snapshotImportRows(await loadImportRows())).toBe(before);
    const auditsAfter = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.tenantId, tenant.id));
    expect(
      auditsAfter.filter(
        (audit) => audit.action === EXERCISE_PROVENANCE_ATTESTATION_ACTION,
      ),
    ).toHaveLength(47);
    expect(
      JSON.stringify(
        auditsAfter
          .filter(
            (audit) =>
              audit.action !== EXERCISE_PROVENANCE_ATTESTATION_ACTION,
          )
          .map((audit) => ({ ...audit }))
          .sort((left, right) => left.id.localeCompare(right.id)),
      ),
    ).toBe(historicalAuditsBefore);
    expect(
      auditsAfter
        .filter(
          (audit) =>
            audit.action === EXERCISE_PROVENANCE_ATTESTATION_ACTION &&
            ["face-pulls", "face-pull-pump"].includes(
              String(audit.metadata?.sourceId),
            ),
        )
        .map((audit) => audit.metadata?.sourceId)
        .sort(),
    ).toEqual(["face-pull-pump", "face-pulls"]);
    expect(
      proveImportOwnership(
        manifest,
        await loadImportRows(),
        auditsAfter,
        actor.id,
      ).owned.size,
    ).toBe(47);
  });

  it("rejects fabricated or contradictory attestations", async () => {
    const [exercise] = await seedLegacyReconciledImport();
    const [createAudit, reconciliationAudit] = await Promise.all([
      db
        .select()
        .from(auditLogsTable)
        .where(
          and(
            eq(auditLogsTable.targetId, exercise.id),
            eq(auditLogsTable.action, "exercise:create"),
          ),
        )
        .then((rows) => rows),
      db
        .select()
        .from(auditLogsTable)
        .where(
          and(
            eq(auditLogsTable.targetId, exercise.id),
            eq(auditLogsTable.action, "exercise:reconcile"),
          ),
        )
        .then((rows) => rows),
    ]);
    await db.insert(auditLogsTable).values({
      tenantId: tenant.id,
      actorType: "cli",
      actorId: actor.id,
      action: EXERCISE_PROVENANCE_ATTESTATION_ACTION,
      targetType: "exercise",
      targetId: exercise.id,
      metadata: {
        ...buildExerciseImportProvenance(
          manifest[0],
          sourceSha256,
          normalizedSourceSha256,
          exercise.id,
          2,
        ),
        originalCreateAuditId: createAudit[0].id,
        reconciliationAuditId: reconciliationAudit[0].id,
        sourceSha256: "contradictory-hash",
      },
    });
    await expect(
      attestDevelopmentImport(
        manifest,
        tenant.id,
        actor.id,
        sourceSha256,
        true,
      ),
    ).rejects.toThrow(/conflicts with canonical provenance/);
  });

  it("rejects lock contention, inactive actors, and later manual activity", async () => {
    await seedLegacyReconciledImport();
    const client = await db.$client.connect();
    const lockKey = `exercise-import:${tenant.id}:${EXERCISE_IMPORT_VERSION}`;
    try {
      await client.query("select pg_advisory_lock(hashtext($1))", [lockKey]);
      await expect(
        attestDevelopmentImport(
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

    await db
      .update(usersTable)
      .set({ isActive: false })
      .where(eq(usersTable.id, actor.id));
    await expect(
      attestDevelopmentImport(
        manifest,
        tenant.id,
        actor.id,
        sourceSha256,
        true,
      ),
    ).rejects.toThrow(/active admin/);
    await db
      .update(usersTable)
      .set({ isActive: true })
      .where(eq(usersTable.id, actor.id));

    const [exercise] = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.tenantId, tenant.id))
      .limit(1);
    await db.insert(auditLogsTable).values({
      tenantId: tenant.id,
      actorType: "user",
      actorId: actor.id,
      action: "exercise:update",
      targetType: "exercise",
      targetId: exercise.id,
      metadata: {},
    });
    await expect(
      attestDevelopmentImport(
        manifest,
        tenant.id,
        actor.id,
        sourceSha256,
        true,
      ),
    ).rejects.toThrow(/later disqualifying audit activity/);
    const attestations = await db
      .select()
      .from(auditLogsTable)
      .where(
        and(
          eq(auditLogsTable.tenantId, tenant.id),
          eq(
            auditLogsTable.action,
            EXERCISE_PROVENANCE_ATTESTATION_ACTION,
          ),
        ),
      );
    expect(attestations).toHaveLength(0);
  });

  it("rolls back every attestation when a later audit write fails", async () => {
    await seedLegacyReconciledImport();
    const rejectedSourceId = manifest.at(-1)!.source.sourceId.replaceAll("'", "''");
    await db.$client.query(`
      CREATE OR REPLACE FUNCTION reject_later_provenance_attestation()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.action = '${EXERCISE_PROVENANCE_ATTESTATION_ACTION}'
          AND NEW.metadata->>'sourceId' = '${rejectedSourceId}' THEN
          RAISE EXCEPTION 'later provenance attestation rejected by test';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER reject_later_provenance_attestation_trigger
        BEFORE INSERT ON audit_logs
        FOR EACH ROW EXECUTE FUNCTION reject_later_provenance_attestation();
    `);
    try {
      await expect(
        attestDevelopmentImport(
          manifest,
          tenant.id,
          actor.id,
          sourceSha256,
          true,
        ),
      ).rejects.toThrow();
      const attestations = await db
        .select()
        .from(auditLogsTable)
        .where(
          and(
            eq(auditLogsTable.tenantId, tenant.id),
            eq(
              auditLogsTable.action,
              EXERCISE_PROVENANCE_ATTESTATION_ACTION,
            ),
          ),
        );
      expect(attestations).toHaveLength(0);
    } finally {
      await db.$client.query(`
        DROP TRIGGER IF EXISTS reject_later_provenance_attestation_trigger ON audit_logs;
        DROP FUNCTION IF EXISTS reject_later_provenance_attestation();
      `);
    }
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