import { readFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  exerciseEquipmentTable,
  exerciseMusclesTable,
  exercisesTable,
  tenantsTable,
  usersTable,
  type Exercise,
} from "@workspace/db";
import { writeAuditLog } from "../lib/audit.js";
import {
  buildExerciseImportManifest,
  EXERCISE_IMPORT_VERSION,
  extractLegacyExercises,
  planExerciseImport,
  summarizeExerciseImport,
  type ExistingImportExercise,
} from "../lib/exerciseCatalogueImport.js";
import { parseExerciseWriteInput } from "../lib/exercises.js";
import { DEFAULT_TENANT_SLUG } from "../lib/tenant.js";

interface CliOptions {
  apply: boolean;
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
  const confirmedDevelopmentOnly = args.includes("--confirm-development-only");
  if (apply && !confirmedDevelopmentOnly) {
    throw new Error("--apply requires --confirm-development-only");
  }
  return {
    apply,
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

async function main(): Promise<void> {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.REPLIT_DEPLOYMENT ||
    process.env.REPLIT_DEPLOYMENT_ID ||
    process.env.REPLIT_ENVIRONMENT === "production"
  ) {
    throw new Error("Exercise catalogue import is restricted to NODE_ENV=development");
  }
  const options = parseImportArgs(process.argv.slice(2));
  const [sourceText] = await Promise.all([readFile(options.sourcePath, "utf8")]);
  const sourceSha256 = createHash("sha256").update(sourceText).digest("hex");
  const manifest = buildExerciseImportManifest(extractLegacyExercises(sourceText));
  await verifyMedia(options.mediaDir, manifest);
  for (const entry of manifest) parseExerciseWriteInput(entry.payload, "create");

  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, options.tenantSlug))
    .limit(1);
  if (!tenant) throw new Error(`Tenant '${options.tenantSlug}' does not exist`);
  const [actor] = await db
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.id, options.actorId),
        eq(usersTable.tenantId, tenant.id),
        eq(usersTable.role, "admin"),
        eq(usersTable.isActive, true),
      ),
    )
    .limit(1);
  if (!actor) throw new Error("Actor must be an existing admin in the target tenant");

  const existing = await loadExisting(db, tenant.id);
  const plan = planExerciseImport(manifest, existing);
  const summary = summarizeExerciseImport(plan);
  const report = {
    mode: options.apply ? "apply" : "dry-run",
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

  if (!options.apply) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (summary.conflict > 0) {
    console.log(JSON.stringify(report, null, 2));
    throw new Error("Import refused because existing slugs differ from the manifest");
  }

  const applied = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`exercise-import:${tenant.id}:${EXERCISE_IMPORT_VERSION}`}))`,
    );
    const lockedPlan = planExerciseImport(manifest, await loadExisting(tx, tenant.id));
    const lockedSummary = summarizeExerciseImport(lockedPlan);
    if (lockedSummary.conflict > 0) {
      throw new Error("Import refused because existing slugs changed during apply");
    }
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});