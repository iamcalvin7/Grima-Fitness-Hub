import { readFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  exerciseEquipmentTable,
  exerciseMusclesTable,
  exercisesTable,
  tenantsTable,
  usersTable,
  auditLogsTable,
  type Exercise,
  type AuditLog,
} from "@workspace/db";
import { writeAuditLog } from "../lib/audit.js";
import {
  buildExerciseImportManifest,
  compareImportEntry,
  EXERCISE_IMPORT_VERSION,
  extractLegacyExercises,
  assertExerciseImportEnvironment,
  assertApprovedLegacyExerciseSource,
  planExerciseImport,
  summarizeExerciseImport,
  type ExistingImportExercise,
} from "../lib/exerciseCatalogueImport.js";
import { parseExerciseWriteInput } from "../lib/exercises.js";
import { DEFAULT_TENANT_SLUG } from "../lib/tenant.js";

interface CliOptions {
  apply: boolean;
  reconcile: boolean;
  tenantSlug: string;
  actorId: string;
  sourcePath: string;
  mediaDir: string;
  confirmedDevelopmentOnly: boolean;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function argumentValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export function parseImportArgs(args: string[], cwd = process.cwd()): CliOptions {
  if (args.includes("--source")) {
    throw new Error("Gate 2C uses only the bundled authoritative programme source");
  }
  const actorId = argumentValue(args, "--actor-id");
  const tenantSlug = argumentValue(args, "--tenant");
  if (!actorId || !UUID_RE.test(actorId)) {
    throw new Error("--actor-id must be the UUID of an existing tenant admin");
  }
  if (!tenantSlug) throw new Error("--tenant is required");
  if (tenantSlug !== DEFAULT_TENANT_SLUG) {
    throw new Error(`Gate 2C may target only the '${DEFAULT_TENANT_SLUG}' tenant`);
  }
  const apply = args.includes("--apply");
  const reconcile = args.includes("--reconcile");
  const confirmedDevelopmentOnly = args.includes("--confirm-development-only");
  if ((apply || reconcile) && !confirmedDevelopmentOnly) {
    throw new Error(
      `${reconcile ? "--reconcile" : "--apply"} requires --confirm-development-only`,
    );
  }
  if (apply && reconcile) {
    throw new Error("--apply and --reconcile are mutually exclusive");
  }
  return {
    apply,
    reconcile,
    tenantSlug,
    actorId,
    sourcePath:
      argumentValue(args, "--source") ??
      path.resolve(cwd, "../marcus-grima/src/data/programs.ts"),
    mediaDir:
      argumentValue(args, "--media-dir") ??
      path.resolve(cwd, "../marcus-grima/public"),
    confirmedDevelopmentOnly,
  };
}

type ReadClient = Pick<typeof db, "select">;
type LockClient = Pick<typeof db, "execute">;

async function acquireImportLock(
  client: LockClient,
  tenantId: string,
): Promise<void> {
  const result = await client.execute(
    sql`select pg_try_advisory_xact_lock(hashtext(${`exercise-import:${tenantId}:${EXERCISE_IMPORT_VERSION}`})) as acquired`,
  );
  const acquired = (result as unknown as { rows: { acquired: boolean }[] }).rows[0]
    ?.acquired;
  if (!acquired) {
    throw new Error(
      "Exercise catalogue import is already running for the target tenant",
    );
  }
}

async function loadActor(
  client: ReadClient,
  tenantId: string,
  actorId: string,
): Promise<{ id: string; role: "admin" }> {
  const [actor] = await client
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.id, actorId),
        eq(usersTable.tenantId, tenantId),
        eq(usersTable.role, "admin"),
        eq(usersTable.isActive, true),
      ),
    )
    .limit(1);
  if (!actor) throw new Error("Actor must be an active admin in the target tenant");
  return actor as { id: string; role: "admin" };
}

async function loadTenantAudits(
  client: ReadClient,
  tenantId: string,
): Promise<AuditLog[]> {
  return client
    .select()
    .from(auditLogsTable)
    .where(eq(auditLogsTable.tenantId, tenantId));
}

async function loadExisting(
  client: ReadClient,
  tenantId: string,
): Promise<(ExistingImportExercise & Exercise)[]> {
  const exercises = await client
    .select()
    .from(exercisesTable)
    .where(eq(exercisesTable.tenantId, tenantId))
    .orderBy(asc(exercisesTable.slug));
  if (exercises.length === 0) return [];
  const ids = exercises.map((exercise) => exercise.id);
  const [muscles, equipment] = await Promise.all([
    client
      .select()
      .from(exerciseMusclesTable)
      .where(
        and(
          eq(exerciseMusclesTable.tenantId, tenantId),
          inArray(exerciseMusclesTable.exerciseId, ids),
        ),
      ),
    client
      .select()
      .from(exerciseEquipmentTable)
      .where(
        and(
          eq(exerciseEquipmentTable.tenantId, tenantId),
          inArray(exerciseEquipmentTable.exerciseId, ids),
        ),
      ),
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

async function verifyMedia(
  mediaDir: string,
  entries: ReturnType<typeof buildExerciseImportManifest>,
): Promise<void> {
  for (const entry of entries) {
    if (!entry.payload.mediaUrl) continue;
    await access(path.join(mediaDir, entry.payload.mediaUrl.replace(/^\//, "")));
  }
}

interface OwnershipProof {
  owned: Map<string, ExistingImportExercise & Exercise>;
  missing: string[];
  changed: string[];
  notOwned: string[];
  unexpected: string[];
}

export function proveImportOwnership(
  manifest: ReturnType<typeof buildExerciseImportManifest>,
  existing: (ExistingImportExercise & Exercise)[],
  audits: AuditLog[],
  actorId: string,
): OwnershipProof {
  const bySlug = new Map(existing.map((exercise) => [exercise.slug, exercise]));
  const expectedSlugs = new Set(manifest.map((entry) => entry.payload.slug));
  const owned = new Map<string, ExistingImportExercise & Exercise>();
  const missing: string[] = [];
  const changed: string[] = [];
  const notOwned: string[] = [];

  for (const entry of manifest) {
    const slug = entry.payload.slug;
    const current = bySlug.get(slug);
    if (!current) {
      missing.push(entry.source.sourceId);
      continue;
    }
    const targetAudits = audits.filter(
      (audit) =>
        audit.targetType === "exercise" && audit.targetId === current.id,
    );
    const createAudits = targetAudits.filter(
      (audit) =>
        audit.action === "exercise:create" &&
        audit.actorType === "cli" &&
        audit.actorId === actorId &&
        audit.metadata?.importVersion === EXERCISE_IMPORT_VERSION &&
        audit.metadata?.sourceId === entry.source.sourceId,
    );
    const createAudit = createAudits.length === 1 ? createAudits[0] : undefined;
    const ownershipReasons: string[] = [];
    if (createAudits.length !== 1) ownershipReasons.push("missing or duplicate import audit");
    if (current.status !== "draft") ownershipReasons.push("status is not draft");
    if (current.version !== 1) ownershipReasons.push("version is not the original version");
    if (current.createdByUserId !== actorId) ownershipReasons.push("creator does not match the import actor");
    if (current.updatedByUserId !== actorId) ownershipReasons.push("updater does not match the import actor");
    if (current.updatedAt.getTime() !== current.createdAt.getTime()) {
      ownershipReasons.push("updated timestamp differs from creation timestamp");
    }
    if (createAudit && current.createdAt.getTime() > createAudit.createdAt.getTime()) {
      ownershipReasons.push("creation audit predates the exercise row");
    }
    if (createAudit) {
      const laterAudits = targetAudits.filter(
        (audit) => audit.createdAt.getTime() > createAudit.createdAt.getTime(),
      );
      if (laterAudits.length > 0) ownershipReasons.push("later audit activity exists");
    }
    if (ownershipReasons.length > 0) {
      (createAudit ? changed : notOwned).push(
        `${entry.source.sourceId}: ${ownershipReasons.join(", ")}`,
      );
      continue;
    }
    owned.set(entry.source.sourceId, current);
  }

  return {
    owned,
    missing,
    changed,
    notOwned,
    unexpected: existing
      .filter((exercise) => !expectedSlugs.has(exercise.slug))
      .map((exercise) => exercise.slug),
  };
}

function incrementCategory(
  categories: Record<string, number>,
  field: string,
): void {
  categories[field] = (categories[field] ?? 0) + 1;
}

export async function reconcileDevelopmentImport(
  manifest: ReturnType<typeof buildExerciseImportManifest>,
  tenantId: string,
  actorId: string,
  sourceSha256: string,
  confirmedDevelopmentOnly: boolean,
) {
  assertExerciseImportEnvironment(process.env);
  if (!confirmedDevelopmentOnly) {
    throw new Error("Reconciliation requires explicit development-only confirmation");
  }
  assertApprovedLegacyExerciseSource(
    manifest.map((entry) => entry.source),
    sourceSha256,
  );
  const canonicalManifest = buildExerciseImportManifest(
    manifest.map((entry) => entry.source),
  );
  if (JSON.stringify(canonicalManifest) !== JSON.stringify(manifest)) {
    throw new Error("Reconciliation requires the complete canonical Gate 2C manifest");
  }
  return db.transaction(async (tx) => {
    const [targetTenant] = await tx
      .select({ id: tenantsTable.id })
      .from(tenantsTable)
      .where(
        and(
          eq(tenantsTable.id, tenantId),
          eq(tenantsTable.slug, DEFAULT_TENANT_SLUG),
        ),
      )
      .limit(1);
    if (!targetTenant) {
      throw new Error(
        `Gate 2C reconciliation may target only the '${DEFAULT_TENANT_SLUG}' tenant`,
      );
    }
    await acquireImportLock(tx, tenantId);
    const lockedExisting = await loadExisting(tx, tenantId);
    const lockedAudits = await loadTenantAudits(tx, tenantId);
    const proof = proveImportOwnership(
      manifest,
      lockedExisting,
      lockedAudits,
      actorId,
    );
    const blockers = [
      ...proof.changed,
      ...proof.notOwned,
      ...proof.missing.map((sourceId) => `${sourceId}: missing`),
      ...proof.unexpected.map((slug) => `${slug}: unexpected exercise slug`),
    ];
    if (blockers.length > 0) {
      throw new Error(
        `BLOCKED — GATE 2C DATA DECISION REQUIRED (${blockers.join("; ")})`,
      );
    }
    await loadActor(tx, tenantId, actorId);

    let rowsAlreadyExact = 0;
    let rowsSafelyReconciled = 0;
    let reconciliationAuditEvents = 0;
    const fieldsCorrectedByCategory: Record<string, number> = {};
    for (const entry of manifest) {
      const current = proof.owned.get(entry.source.sourceId);
      if (!current) throw new Error(`Missing ownership proof for ${entry.source.sourceId}`);
      const differences = compareImportEntry(entry, current);
      if (differences.length === 0) {
        rowsAlreadyExact += 1;
        continue;
      }

      const input = parseExerciseWriteInput(entry.payload, "create");
      const { muscles = [], equipment = [], ...fields } = input;
      const [updated] = await tx
        .update(exercisesTable)
        .set({
          ...fields,
          updatedByUserId: actorId,
          version: sql`${exercisesTable.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(exercisesTable.tenantId, tenantId),
            eq(exercisesTable.id, current.id),
            eq(exercisesTable.status, "draft"),
            eq(exercisesTable.version, current.version),
          ),
        )
        .returning();
      if (!updated) {
        throw new Error(
          `Reconciliation lost the version check for ${entry.source.sourceId}`,
        );
      }
      await tx
        .delete(exerciseMusclesTable)
        .where(
          and(
            eq(exerciseMusclesTable.tenantId, tenantId),
            eq(exerciseMusclesTable.exerciseId, current.id),
          ),
        );
      if (muscles.length > 0) {
        await tx.insert(exerciseMusclesTable).values(
          muscles.map((muscle) => ({
            tenantId,
            exerciseId: current.id,
            ...muscle,
          })),
        );
      }
      await tx
        .delete(exerciseEquipmentTable)
        .where(
          and(
            eq(exerciseEquipmentTable.tenantId, tenantId),
            eq(exerciseEquipmentTable.exerciseId, current.id),
          ),
        );
      if (equipment.length > 0) {
        await tx.insert(exerciseEquipmentTable).values(
          equipment.map((item) => ({
            tenantId,
            exerciseId: current.id,
            ...item,
          })),
        );
      }
      for (const difference of differences) {
        incrementCategory(fieldsCorrectedByCategory, difference);
      }
      await writeAuditLog(
        {
          tenantId,
          actorType: "cli",
          actorId,
          action: "exercise:reconcile",
          targetType: "exercise",
          targetId: current.id,
          metadata: {
            slug: entry.payload.slug,
            source: "bundled-programmes",
            sourceId: entry.source.sourceId,
            importVersion: EXERCISE_IMPORT_VERSION,
            sourceSha256,
            differences,
            fromVersion: current.version,
            toVersion: updated.version,
          },
        },
        tx as Parameters<typeof writeAuditLog>[1],
      );
      rowsSafelyReconciled += 1;
      reconciliationAuditEvents += 1;
    }

    const finalRows = await loadExisting(tx, tenantId);
    const finalVersionDistribution = finalRows.reduce<Record<string, number>>(
      (distribution, exercise) => {
        const key = String(exercise.version);
        distribution[key] = (distribution[key] ?? 0) + 1;
        return distribution;
      },
      {},
    );
    return {
      rowsAlreadyExact,
      rowsSafelyReconciled,
      fieldsCorrectedByCategory,
      rowsPreservedBecauseOfConflicts: 0,
      finalVersionDistribution,
      reconciliationAuditEvents,
      ownership: {
        provenImportOwnedUnchanged: proof.owned.size,
        importOwnedButChanged: proof.changed.length,
        notProvablyImportOwned: proof.notOwned.length,
        missing: proof.missing.length,
        unexpected: proof.unexpected.length,
      },
    };
  });
}

async function main(): Promise<void> {
  assertExerciseImportEnvironment(process.env);
  const options = parseImportArgs(process.argv.slice(2));
  const [sourceText] = await Promise.all([readFile(options.sourcePath, "utf8")]);
  const sourceSha256 = createHash("sha256").update(sourceText).digest("hex");
  const sources = extractLegacyExercises(sourceText);
  assertApprovedLegacyExerciseSource(sources, sourceSha256);
  const manifest = buildExerciseImportManifest(sources);
  await verifyMedia(options.mediaDir, manifest);
  for (const entry of manifest) parseExerciseWriteInput(entry.payload, "create");

  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, options.tenantSlug))
    .limit(1);
  if (!tenant) throw new Error(`Tenant '${options.tenantSlug}' does not exist`);
  const actor = await loadActor(db, tenant.id, options.actorId);

  const existing = await loadExisting(db, tenant.id);
  const plan = planExerciseImport(manifest, existing);
  const summary = summarizeExerciseImport(plan);
  const report = {
    mode: options.reconcile ? "reconcile" : options.apply ? "apply" : "dry-run",
    importVersion: EXERCISE_IMPORT_VERSION,
    sourceSha256,
    tenant: tenant.slug,
    summary,
    records: plan.map((item) => ({
      sourceId: item.entry.source.sourceId,
      name: item.entry.payload.name,
      slug: item.entry.payload.slug,
      disposition: item.entry.disposition,
      outcome: item.outcome,
      differences: item.differences,
      reviewReasons: item.entry.reviewReasons,
      sourcePrescription: {
        sets: item.entry.source.sets,
        reps: item.entry.source.reps,
        restSeconds: item.entry.source.restSeconds,
      },
      payload: item.entry.payload,
    })),
  };

  if (options.reconcile) {
    console.log(
      JSON.stringify(
        {
          ...report,
          reconciliation: await reconcileDevelopmentImport(
            manifest,
            tenant.id,
            actor.id,
            sourceSha256,
            options.confirmedDevelopmentOnly,
          ),
        },
        null,
        2,
      ),
    );
    return;
  }
  if (!options.apply) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (summary.conflict > 0) {
    console.log(JSON.stringify(report, null, 2));
    throw new Error("Import refused because existing slugs differ from the manifest");
  }

  const applied = await db.transaction(async (tx) => {
    await acquireImportLock(tx, tenant.id);
    const lockedPlan = planExerciseImport(manifest, await loadExisting(tx, tenant.id));
    const lockedSummary = summarizeExerciseImport(lockedPlan);
    if (lockedSummary.conflict > 0) {
      throw new Error("Import refused because existing slugs changed during apply");
    }
    await loadActor(tx, tenant.id, actor.id);
    let created = 0;
    for (const item of lockedPlan) {
      if (item.outcome === "skip") continue;
      const input = parseExerciseWriteInput(item.entry.payload, "create");
      const { muscles = [], equipment = [], ...fields } = input;
      const [exercise] = await tx
        .insert(exercisesTable)
        .values({
          ...fields,
          name: input.name!,
          slug: input.slug!,
          tenantId: tenant.id,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
          status: "draft",
        })
        .returning();
      if (muscles.length > 0) {
        await tx.insert(exerciseMusclesTable).values(
          muscles.map((muscle) => ({
            tenantId: tenant.id,
            exerciseId: exercise.id,
            ...muscle,
          })),
        );
      }
      if (equipment.length > 0) {
        await tx.insert(exerciseEquipmentTable).values(
          equipment.map((item) => ({
            tenantId: tenant.id,
            exerciseId: exercise.id,
            ...item,
          })),
        );
      }
      await writeAuditLog(
        {
          tenantId: tenant.id,
          actorType: "cli",
          actorId: actor.id,
          action: "exercise:create",
          targetType: "exercise",
          targetId: exercise.id,
          metadata: {
            slug: exercise.slug,
            source: "bundled-programmes",
            sourceId: item.entry.source.sourceId,
            importVersion: EXERCISE_IMPORT_VERSION,
            sourceSha256,
          },
        },
        tx as Parameters<typeof writeAuditLog>[1],
      );
      created += 1;
    }
    return { created, skipped: lockedSummary.skip, activated: 0 };
  });

  console.log(
    JSON.stringify(
      {
        ...report,
        applied,
      },
      null,
      2,
    ),
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}