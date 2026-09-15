import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  exercisesTable,
  programmeDaysTable,
  programmeExercisePrescriptionsTable,
  programmeRevisionsTable,
  programmeTemplatesTable,
  tenantsTable,
  usersTable,
} from "@workspace/db";
import { writeAuditLog } from "../lib/audit.js";
import {
  EXPECTED_PROGRAMME_SOURCE_SHA256,
  buildProgrammeImportBlockerReport,
  findProgrammeExerciseMappingBlockers,
  mapProgrammeExercises,
  parseProgrammeImportSource,
  PROGRAMME_IMPORT_VERSION,
  programmeSourceSha256,
  type ProgrammeImportRecord,
} from "../lib/programmeTemplateImport.js";

interface Options {
  write: boolean;
  tenant: string;
  actorId: string;
  sourcePath: string;
  confirmedDevelopmentOnly: boolean;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function value(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export function parseProgrammeImportArgs(args: string[], cwd = process.cwd()): Options {
  const actorId = value(args, "--actor-id");
  const tenant = value(args, "--tenant");
  if (!actorId || !UUID_RE.test(actorId)) throw new Error("--actor-id must be an existing tenant admin UUID");
  if (!tenant) throw new Error("--tenant is required");
  const write = args.includes("--write") || args.includes("--apply");
  const confirmedDevelopmentOnly = args.includes("--confirm-development-only");
  if (write && !confirmedDevelopmentOnly) throw new Error("--write requires --confirm-development-only");
  return {
    write,
    tenant,
    actorId,
    confirmedDevelopmentOnly,
    sourcePath: value(args, "--source") ?? path.resolve(cwd, "../marcus-grima/src/data/programs.ts"),
  };
}

function assertDevelopmentOnly(environment: NodeJS.ProcessEnv): void {
  if (environment.NODE_ENV !== "development" || environment.REPLIT_DEPLOYMENT ||
      environment.REPLIT_DEPLOYMENT_ID || environment.REPLIT_ENV) {
    throw new Error("Programme template import is restricted to development outside a Replit deployment");
  }
}

async function main(): Promise<void> {
  const options = parseProgrammeImportArgs(process.argv.slice(2));
  assertDevelopmentOnly(process.env);
  const source = await readFile(options.sourcePath, "utf8");
  const sourceSha256 = programmeSourceSha256(source);
  if (sourceSha256 !== EXPECTED_PROGRAMME_SOURCE_SHA256) {
    throw new Error("Bundled programme source differs from the pinned approved source");
  }
  const records = parseProgrammeImportSource(source);
  const [tenant] = await db.select({ id: tenantsTable.id }).from(tenantsTable).where(eq(tenantsTable.slug, options.tenant)).limit(1);
  if (!tenant) throw new Error("Target tenant was not found");
  const [actor] = await db.select({ id: usersTable.id }).from(usersTable).where(and(
    eq(usersTable.id, options.actorId), eq(usersTable.tenantId, tenant.id),
    eq(usersTable.role, "admin"), eq(usersTable.isActive, true),
  )).limit(1);
  if (!actor) throw new Error("Actor must be an active admin in the target tenant");
  const exercises = await db.select({ id: exercisesTable.id, slug: exercisesTable.slug, status: exercisesTable.status })
    .from(exercisesTable).where(eq(exercisesTable.tenantId, tenant.id));
  const existing = await db.select().from(programmeTemplatesTable).where(eq(programmeTemplatesTable.tenantId, tenant.id));
  const mappingBlockers = findProgrammeExerciseMappingBlockers(records, exercises);
  const result = buildProgrammeImportBlockerReport({
    sourceSha256, importVersion: PROGRAMME_IMPORT_VERSION, records, write: options.write, blockers: mappingBlockers,
  });
  if (mappingBlockers.length) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  const mappings = mapProgrammeExercises(records, exercises);
  result.mappings = mappings.size;
  result.created = records.filter((record) => !existing.some((template) => template.slug === record.slug)).length;
  result.skipped = records.filter((record) => existing.some((template) => template.slug === record.slug)).length;
  if (!options.write) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  const applied = await db.transaction(async (tx) => {
    const lockedTemplates = await tx.select().from(programmeTemplatesTable)
      .where(eq(programmeTemplatesTable.tenantId, tenant.id));
    for (const template of lockedTemplates) {
      await tx.execute(sql`select id from programme_templates where tenant_id = ${tenant.id} and id = ${template.id} for update`);
    }
    const lockedExercises = await tx.select({ id: exercisesTable.id, slug: exercisesTable.slug, status: exercisesTable.status })
      .from(exercisesTable).where(eq(exercisesTable.tenantId, tenant.id));
    for (const exercise of lockedExercises) {
      await tx.execute(sql`select id from exercises where tenant_id = ${tenant.id} and id = ${exercise.id} for update`);
    }
    const recheckedExercises = await tx.select({ id: exercisesTable.id, slug: exercisesTable.slug, status: exercisesTable.status })
      .from(exercisesTable).where(eq(exercisesTable.tenantId, tenant.id));
    const lockedMappings = mapProgrammeExercises(records, recheckedExercises);
    let created = 0;
    let skipped = 0;
    for (const record of records) {
      const current = lockedTemplates.find((template) => template.slug === record.slug);
      if (current) {
        const revisions = await tx.select().from(programmeRevisionsTable)
          .where(and(eq(programmeRevisionsTable.tenantId, tenant.id), eq(programmeRevisionsTable.templateId, current.id)));
        const matching = revisions.filter((revision) => revision.sourceMetadata?.source === "bundled-programmes" &&
          revision.sourceMetadata.sourceId === record.sourceId &&
          revision.sourceMetadata.importVersion === PROGRAMME_IMPORT_VERSION &&
          revision.sourceMetadata.sourceSha256 === sourceSha256 &&
          revision.sourceMetadata.sourceRecordSha256 === record.sourceRecordSha256);
        if (matching.length === 1) { skipped += 1; continue; }
        throw new Error(`Refusing to overwrite existing programme ${record.slug}`);
      }
      const [template] = await tx.insert(programmeTemplatesTable).values({
        tenantId: tenant.id, slug: record.slug, status: "draft", createdByUserId: actor.id, updatedByUserId: actor.id,
      }).returning();
      if (!template) throw new Error("Failed to create imported programme template");
      const metadata = {
        source: "bundled-programmes", sourceId: record.sourceId, importVersion: PROGRAMME_IMPORT_VERSION,
        sourceSha256, sourceRecordSha256: record.sourceRecordSha256,
      };
      const [revision] = await tx.insert(programmeRevisionsTable).values({
        tenantId: tenant.id, templateId: template.id, revisionNumber: 1, status: "draft",
        name: record.name, description: record.description, difficulty: record.difficulty, goal: record.goal,
        sourceMetadata: metadata, createdByUserId: actor.id,
      }).returning();
      if (!revision) throw new Error("Failed to create imported programme revision");
      for (let dayIndex = 0; dayIndex < record.days.length; dayIndex += 1) {
        const day = record.days[dayIndex];
        const [insertedDay] = await tx.insert(programmeDaysTable).values({
          tenantId: tenant.id, revisionId: revision.id, dayNumber: dayIndex + 1,
          name: day.name, estimatedMinutes: day.estimatedMinutes || null,
          sourceMetadata: { sourceId: day.sourceId },
        }).returning();
        if (!insertedDay) throw new Error("Failed to create imported programme day");
        if (day.exercises.length) await tx.insert(programmeExercisePrescriptionsTable).values(day.exercises.map((exercise, index) => ({
          tenantId: tenant.id, dayId: insertedDay.id, exerciseId: lockedMappings.get(exercise.sourceExerciseId)!,
          position: index + 1, sets: exercise.sets, reps: exercise.reps, restSeconds: exercise.restSeconds,
          notes: exercise.notes, sourceExerciseId: exercise.sourceExerciseId,
        })));
      }
      await tx.update(programmeTemplatesTable).set({ currentDraftRevisionId: revision.id }).where(eq(programmeTemplatesTable.id, template.id));
      await writeAuditLog({
        tenantId: tenant.id, actorType: "cli", actorId: actor.id, action: "programme:import",
        targetType: "programme_template", targetId: template.id, metadata: { ...metadata, revisionNumber: 1, status: "draft" },
      }, tx);
      created += 1;
    }
    return { created, skipped };
  });
  process.stdout.write(`${JSON.stringify({ ...result, applied: true, application: applied }, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}