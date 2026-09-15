import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  exercisesTable,
  programmeDaysTable,
  programmeExercisePrescriptionsTable,
  programmeRevisionsTable,
  programmeTemplatesTable,
} from "@workspace/db";
import { attachUser, requireAuth, requireCapability, requireRole } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import {
  changedProgrammeFields,
  parseProgrammeWriteInput,
  ProgrammeInputError,
  requireProgrammeId,
  revisionToWriteInput,
  type ProgrammeDayInput,
  type ProgrammeWriteInput,
} from "../lib/programmes";

const router: IRouter = Router();

function expectedVersion(req: Request): number {
  const value = req.get("If-Match");
  if (!value) {
    throw new ProgrammeInputError("version_precondition_required", "If-Match with the reviewed programme version is required", 400);
  }
  const match = /^(?:"([1-9]\d*)"|([1-9]\d*))$/.exec(value.trim());
  const version = Number(match?.[1] ?? match?.[2]);
  if (!match || !Number.isSafeInteger(version)) {
    throw new ProgrammeInputError("invalid_version_precondition", "If-Match must be a positive integer programme version", 400);
  }
  return version;
}

async function lockTemplate(client: Pick<typeof db, "execute">, tenantId: string, id: string) {
  await client.execute(sql`select id from programme_templates where tenant_id = ${tenantId} and id = ${id} for update`);
}

async function loadRevisionDays(client: Pick<typeof db, "select">, tenantId: string, revisionId: string) {
  const days = await client.select().from(programmeDaysTable)
    .where(and(eq(programmeDaysTable.tenantId, tenantId), eq(programmeDaysTable.revisionId, revisionId)))
    .orderBy(asc(programmeDaysTable.dayNumber));
  const exercises = days.length
    ? await client.select().from(programmeExercisePrescriptionsTable)
      .where(and(eq(programmeExercisePrescriptionsTable.tenantId, tenantId), inArray(programmeExercisePrescriptionsTable.dayId, days.map((day) => day.id))))
      .orderBy(asc(programmeExercisePrescriptionsTable.position))
    : [];
  return days.map((day) => ({ ...day, exercises: exercises.filter((exercise) => exercise.dayId === day.id) }));
}

async function loadTemplate(client: Pick<typeof db, "select">, tenantId: string, id: string, includeArchived = false) {
  const [template] = await client.select().from(programmeTemplatesTable).where(and(
    eq(programmeTemplatesTable.tenantId, tenantId),
    eq(programmeTemplatesTable.id, id),
    ...(includeArchived ? [] : [sql`${programmeTemplatesTable.status} <> 'archived'`]),
  )).limit(1);
  if (!template) return null;
  const revisions = await client.select().from(programmeRevisionsTable)
    .where(and(eq(programmeRevisionsTable.tenantId, tenantId), eq(programmeRevisionsTable.templateId, id)))
    .orderBy(desc(programmeRevisionsTable.revisionNumber));
  const detailRevisions = await Promise.all(revisions.map(async (revision) => ({
    ...revision,
    days: await loadRevisionDays(client, tenantId, revision.id),
  })));
  return {
    ...template,
    revisions: detailRevisions,
    draftRevision: detailRevisions.find((revision) => revision.id === template.currentDraftRevisionId) ?? null,
    publishedRevision: detailRevisions.find((revision) => revision.id === template.currentPublishedRevisionId) ?? null,
  };
}

function toClient(template: any) {
  const published = template.revisions.find((revision: any) => revision.id === template.currentPublishedRevisionId);
  return {
    id: template.id,
    slug: template.slug,
    status: template.status,
    version: template.version,
    revision: published ? {
      id: published.id,
      revisionNumber: published.revisionNumber,
      version: published.version,
      name: published.name,
      description: published.description,
      difficulty: published.difficulty,
      goal: published.goal,
      days: published.days.map((day: any) => ({
        dayNumber: day.dayNumber, name: day.name, estimatedMinutes: day.estimatedMinutes,
        exercises: day.exercises.map((exercise: any) => ({
          position: exercise.position, exerciseId: exercise.exerciseId, sets: exercise.sets,
          reps: exercise.reps, restSeconds: exercise.restSeconds, notes: exercise.notes,
        })),
      })),
    } : null,
  };
}

async function activeExerciseIds(client: Pick<typeof db, "select" | "execute">, tenantId: string, input: ProgrammeWriteInput) {
  const ids = [...new Set((input.days ?? []).flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId)))];
  if (!ids.length) return;
  for (const id of ids) {
    await client.execute(sql`select id from exercises where tenant_id = ${tenantId} and id = ${id} for update`);
  }
  const active = await client.select({ id: exercisesTable.id }).from(exercisesTable)
    .where(and(eq(exercisesTable.tenantId, tenantId), eq(exercisesTable.status, "active"), inArray(exercisesTable.id, ids)));
  if (active.length !== ids.length) {
    throw new ProgrammeInputError("invalid_exercise_reference", "Every prescription must reference an active exercise in this tenant", 422, {
      exerciseIds: ids.filter((id) => !active.some((row) => row.id === id)),
    });
  }
}

async function insertRevisionContent(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  tenantId: string,
  revisionId: string,
  days: ProgrammeDayInput[],
) {
  for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
    const day = days[dayIndex];
    const [insertedDay] = await tx.insert(programmeDaysTable).values({
      tenantId, revisionId, dayNumber: dayIndex + 1, name: day.name, estimatedMinutes: day.estimatedMinutes,
    }).returning();
    if (!insertedDay) throw new Error("Failed to create programme day");
    if (day.exercises.length) {
      await tx.insert(programmeExercisePrescriptionsTable).values(day.exercises.map((exercise, index) => ({
        tenantId, dayId: insertedDay.id, exerciseId: exercise.exerciseId, position: index + 1,
        sets: exercise.sets, reps: exercise.reps, restSeconds: exercise.restSeconds,
        notes: exercise.notes, sourceExerciseId: exercise.sourceExerciseId,
      })));
    }
  }
}

function sendError(res: Response, error: unknown): boolean {
  if (error instanceof ProgrammeInputError) {
    res.status(error.status).json({ error: error.message, code: error.code, ...(error.details ? { details: error.details } : {}) });
    return true;
  }
  const pgError = error as { code?: string; cause?: { code?: string } };
  if (pgError.code === "23505" || pgError.cause?.code === "23505") {
    res.status(409).json({ error: "Programme conflicts with an existing tenant record", code: "programme_conflict" });
    return true;
  }
  return false;
}

async function handleList(req: Request, res: Response) {
  const templates = await db.select().from(programmeTemplatesTable).where(and(
    eq(programmeTemplatesTable.tenantId, req.user!.tenantId),
    eq(programmeTemplatesTable.status, "published"),
  )).orderBy(asc(programmeTemplatesTable.slug));
  const details = await Promise.all(templates.map((template) => loadTemplate(db, req.user!.tenantId, template.id)));
  res.json({ programmes: details.filter(Boolean).map(toClient) });
}

router.use("/programmes", attachUser, requireAuth, requireRole("client", "admin"));
router.use("/admin/programmes", attachUser, requireAuth);

// programmes:read is intentionally not granted to clients by the v1 policy;
// published template reads are available to authenticated clients only through
// this explicit route guard below, while admin mutations remain capability gated.
router.get("/programmes", async (req, res) => {
  try { await handleList(req, res); } catch (error) {
    if (!sendError(res, error)) { req.log.error({ err: error }, "Failed to list programmes"); res.status(500).json({ error: "Failed to list programmes", code: "internal_error" }); }
  }
});

router.get("/programmes/:id", async (req, res) => {
  try {
    const template = await loadTemplate(db, req.user!.tenantId, requireProgrammeId(req.params.id));
    if (!template || template.status !== "published") { res.status(404).json({ error: "Programme not found", code: "programme_not_found" }); return; }
    res.json({ programme: toClient(template) });
  } catch (error) {
    if (!sendError(res, error)) { req.log.error({ err: error }, "Failed to get programme"); res.status(500).json({ error: "Failed to get programme", code: "internal_error" }); }
  }
});

router.get("/admin/programmes", requireCapability("programmes:manage"), async (req, res) => {
  try {
    const rows = await db.select().from(programmeTemplatesTable)
      .where(eq(programmeTemplatesTable.tenantId, req.user!.tenantId))
      .orderBy(desc(programmeTemplatesTable.updatedAt));
    const programmes = await Promise.all(rows.map((row) => loadTemplate(db, req.user!.tenantId, row.id, true)));
    res.json({ programmes: programmes.filter(Boolean) });
  } catch (error) {
    if (!sendError(res, error)) { req.log.error({ err: error }, "Failed to list admin programmes"); res.status(500).json({ error: "Failed to list programmes", code: "internal_error" }); }
  }
});

router.get("/admin/programmes/:id", requireCapability("programmes:manage"), async (req, res) => {
  try {
    const programme = await loadTemplate(db, req.user!.tenantId, requireProgrammeId(req.params.id), true);
    if (!programme) { res.status(404).json({ error: "Programme not found", code: "programme_not_found" }); return; }
    res.json({ programme });
  } catch (error) {
    if (!sendError(res, error)) { req.log.error({ err: error }, "Failed to get admin programme"); res.status(500).json({ error: "Failed to get programme", code: "internal_error" }); }
  }
});

router.post("/admin/programmes", requireCapability("programmes:manage"), async (req, res) => {
  try {
    const input = parseProgrammeWriteInput(req.body, "create");
    const programme = await db.transaction(async (tx) => {
      await activeExerciseIds(tx, req.user!.tenantId, input);
      const slug = input.slug ?? (input.name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (!slug) throw new ProgrammeInputError("invalid_slug", "A programme name must produce a valid slug");
      const [template] = await tx.insert(programmeTemplatesTable).values({
        tenantId: req.user!.tenantId, slug, status: "draft", createdByUserId: req.user!.id, updatedByUserId: req.user!.id,
      }).returning();
      if (!template) throw new Error("Failed to create programme");
      const [revision] = await tx.insert(programmeRevisionsTable).values({
        tenantId: req.user!.tenantId, templateId: template.id, revisionNumber: 1, status: "draft",
        name: input.name!, description: input.description, difficulty: input.difficulty, goal: input.goal,
        createdByUserId: req.user!.id,
      }).returning();
      if (!revision) throw new Error("Failed to create programme revision");
      await insertRevisionContent(tx, req.user!.tenantId, revision.id, input.days!);
      await tx.update(programmeTemplatesTable).set({ currentDraftRevisionId: revision.id }).where(eq(programmeTemplatesTable.id, template.id));
      await writeAuditLog({ tenantId: req.user!.tenantId, actorType: "user", actorId: req.user!.id, action: "programme:create", targetType: "programme_template", targetId: template.id, metadata: { revisionNumber: 1, status: "draft" } }, tx);
      return loadTemplate(tx, req.user!.tenantId, template.id, true);
    });
    res.status(201).json({ programme });
  } catch (error) {
    if (!sendError(res, error)) { req.log.error({ err: error }, "Failed to create programme"); res.status(500).json({ error: "Failed to create programme", code: "internal_error" }); }
  }
});

async function editDraft(req: Request, res: Response) {
  const id = requireProgrammeId(req.params.id);
  const reviewed = expectedVersion(req);
  const input = parseProgrammeWriteInput(req.body, "patch");
  const programme = await db.transaction(async (tx) => {
    await lockTemplate(tx, req.user!.tenantId, id);
    const current = await loadTemplate(tx, req.user!.tenantId, id, true);
    if (!current) return null;
    if (current.status === "archived") throw new ProgrammeInputError("invalid_state_transition", "Archived programmes cannot be edited", 409);
    const draft = current.revisions.find((revision: any) => revision.id === current.currentDraftRevisionId);
    if (!draft) throw new ProgrammeInputError("draft_not_found", "Programme has no editable draft", 409);
    if (draft.version !== reviewed) throw new ProgrammeInputError("stale_programme_version", "Programme draft changed since it was reviewed; reload and try again", 409);
    const currentInput = revisionToWriteInput(draft, draft.days);
    const next = {
      name: input.name ?? currentInput.name,
      description: input.description !== undefined ? input.description : currentInput.description,
      difficulty: input.difficulty !== undefined ? input.difficulty : currentInput.difficulty,
      goal: input.goal !== undefined ? input.goal : currentInput.goal,
      days: input.days ?? currentInput.days,
    } satisfies ProgrammeWriteInput;
    await activeExerciseIds(tx, req.user!.tenantId, next);
    const changedFields = changedProgrammeFields(currentInput, next);
    if (!changedFields.length) return current;
    const [updated] = await tx.update(programmeRevisionsTable).set({
      name: next.name!, description: next.description, difficulty: next.difficulty, goal: next.goal,
      version: sql`${programmeRevisionsTable.version} + 1`, updatedAt: new Date(),
    }).where(and(eq(programmeRevisionsTable.tenantId, req.user!.tenantId), eq(programmeRevisionsTable.id, draft.id), eq(programmeRevisionsTable.version, draft.version), eq(programmeRevisionsTable.status, "draft"))).returning();
    if (!updated) throw new ProgrammeInputError("concurrent_update", "Programme changed during this request; reload and try again", 409);
    await tx.delete(programmeDaysTable).where(and(eq(programmeDaysTable.tenantId, req.user!.tenantId), eq(programmeDaysTable.revisionId, draft.id)));
    await insertRevisionContent(tx, req.user!.tenantId, draft.id, next.days!);
    await tx.update(programmeTemplatesTable).set({ version: sql`${programmeTemplatesTable.version} + 1`, updatedByUserId: req.user!.id, updatedAt: new Date() }).where(eq(programmeTemplatesTable.id, id));
    await writeAuditLog({ tenantId: req.user!.tenantId, actorType: "user", actorId: req.user!.id, action: "programme:update", targetType: "programme_template", targetId: id, metadata: { fields: changedFields, fromVersion: draft.version, toVersion: draft.version + 1, revisionId: draft.id } }, tx);
    return loadTemplate(tx, req.user!.tenantId, id, true);
  });
  if (!programme) { res.status(404).json({ error: "Programme not found", code: "programme_not_found" }); return; }
  res.json({ programme });
}

router.patch("/admin/programmes/:id/draft", requireCapability("programmes:manage"), async (req, res) => {
  try { await editDraft(req, res); } catch (error) {
    if (!sendError(res, error)) { req.log.error({ err: error }, "Failed to update programme draft"); res.status(500).json({ error: "Failed to update programme", code: "internal_error" }); }
  }
});
router.patch("/admin/programmes/:id", requireCapability("programmes:manage"), async (req, res) => {
  try { await editDraft(req, res); } catch (error) {
    if (!sendError(res, error)) { req.log.error({ err: error }, "Failed to update programme draft"); res.status(500).json({ error: "Failed to update programme", code: "internal_error" }); }
  }
});

router.post(["/admin/programmes/:id/replacement-draft", "/admin/programmes/:id/draft"], requireCapability("programmes:manage"), async (req, res) => {
  try {
    const id = requireProgrammeId(req.params.id);
    const programme = await db.transaction(async (tx) => {
      await lockTemplate(tx, req.user!.tenantId, id);
      const current = await loadTemplate(tx, req.user!.tenantId, id, true);
      if (!current) return null;
      if (current.status === "archived") throw new ProgrammeInputError("invalid_state_transition", "Archived programmes cannot receive replacement drafts", 409);
      if (current.currentDraftRevisionId) throw new ProgrammeInputError("draft_exists", "Programme already has an editable draft", 409);
      const published = current.revisions.find((revision: any) => revision.id === current.currentPublishedRevisionId);
      if (!published) throw new ProgrammeInputError("publish_required", "Only a published programme can receive a replacement draft", 409);
      const revisionNumber = Math.max(...current.revisions.map((revision: any) => revision.revisionNumber)) + 1;
      const [revision] = await tx.insert(programmeRevisionsTable).values({
        tenantId: req.user!.tenantId, templateId: id, revisionNumber, status: "draft", name: published.name,
        description: published.description, difficulty: published.difficulty, goal: published.goal,
        sourceMetadata: published.sourceMetadata, createdByUserId: req.user!.id,
      }).returning();
      if (!revision) throw new Error("Failed to create replacement draft");
      await insertRevisionContent(tx, req.user!.tenantId, revision.id, revisionToWriteInput(published, published.days).days!);
      await tx.update(programmeTemplatesTable).set({ currentDraftRevisionId: revision.id, version: sql`${programmeTemplatesTable.version} + 1`, updatedByUserId: req.user!.id, updatedAt: new Date() }).where(eq(programmeTemplatesTable.id, id));
      await writeAuditLog({ tenantId: req.user!.tenantId, actorType: "user", actorId: req.user!.id, action: "programme:create_replacement_draft", targetType: "programme_template", targetId: id, metadata: { revisionNumber, basedOnRevision: published.revisionNumber, status: "draft" } }, tx);
      return loadTemplate(tx, req.user!.tenantId, id, true);
    });
    if (!programme) { res.status(404).json({ error: "Programme not found", code: "programme_not_found" }); return; }
    res.status(201).json({ programme });
  } catch (error) {
    if (!sendError(res, error)) { req.log.error({ err: error }, "Failed to create replacement draft"); res.status(500).json({ error: "Failed to create replacement draft", code: "internal_error" }); }
  }
});

router.post("/admin/programmes/:id/publish", requireCapability("programmes:publish"), async (req, res) => {
  try {
    const id = requireProgrammeId(req.params.id);
    const reviewed = expectedVersion(req);
    const programme = await db.transaction(async (tx) => {
      await lockTemplate(tx, req.user!.tenantId, id);
      const current = await loadTemplate(tx, req.user!.tenantId, id, true);
      if (!current) return null;
      if (current.status === "archived") throw new ProgrammeInputError("invalid_state_transition", "Archived programmes cannot be published", 409);
      const draft = current.revisions.find((revision: any) => revision.id === current.currentDraftRevisionId);
      if (!draft) throw new ProgrammeInputError("draft_not_found", "Programme has no publishable draft", 409);
      if (draft.version !== reviewed) throw new ProgrammeInputError("stale_programme_version", "Programme draft changed since it was reviewed; reload and try again", 409);
      if (!draft.days.length || draft.days.some((day: any) => !day.exercises.length)) {
        throw new ProgrammeInputError("publish_requirements_missing", "A published programme must contain at least one exercise on every day", 422);
      }
      await activeExerciseIds(tx, req.user!.tenantId, revisionToWriteInput(draft, draft.days));
      const [published] = await tx.update(programmeRevisionsTable).set({ status: "published", version: sql`${programmeRevisionsTable.version} + 1`, updatedAt: new Date() }).where(and(eq(programmeRevisionsTable.id, draft.id), eq(programmeRevisionsTable.status, "draft"), eq(programmeRevisionsTable.version, draft.version))).returning();
      if (!published) throw new ProgrammeInputError("concurrent_update", "Programme changed during this request; reload and try again", 409);
      const [templateUpdated] = await tx.update(programmeTemplatesTable).set({ status: "published", currentPublishedRevisionId: draft.id, currentDraftRevisionId: null, version: sql`${programmeTemplatesTable.version} + 1`, updatedByUserId: req.user!.id, updatedAt: new Date() }).where(and(eq(programmeTemplatesTable.id, id), eq(programmeTemplatesTable.status, current.status), eq(programmeTemplatesTable.version, current.version))).returning({ id: programmeTemplatesTable.id });
      if (!templateUpdated) throw new ProgrammeInputError("concurrent_update", "Programme changed during this request; reload and try again", 409);
      await writeAuditLog({ tenantId: req.user!.tenantId, actorType: "user", actorId: req.user!.id, action: "programme:publish", targetType: "programme_template", targetId: id, metadata: { revisionId: draft.id, fromRevisionVersion: draft.version, toRevisionVersion: draft.version + 1, fromStatus: current.status, toStatus: "published" } }, tx);
      return loadTemplate(tx, req.user!.tenantId, id, true);
    });
    if (!programme) { res.status(404).json({ error: "Programme not found", code: "programme_not_found" }); return; }
    res.json({ programme });
  } catch (error) {
    if (!sendError(res, error)) { req.log.error({ err: error }, "Failed to publish programme"); res.status(500).json({ error: "Failed to publish programme", code: "internal_error" }); }
  }
});

router.post("/admin/programmes/:id/archive", requireCapability("programmes:archive"), async (req, res) => {
  try {
    const id = requireProgrammeId(req.params.id);
    const reviewed = expectedVersion(req);
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!reason) throw new ProgrammeInputError("archive_reason_required", "Archive reason is required");
    if (reason.length > 500) throw new ProgrammeInputError("invalid_archive_reason", "Archive reason must be 500 characters or fewer");
    const programme = await db.transaction(async (tx) => {
      await lockTemplate(tx, req.user!.tenantId, id);
      const current = await loadTemplate(tx, req.user!.tenantId, id, true);
      if (!current) return null;
      if (current.version !== reviewed) throw new ProgrammeInputError("stale_programme_version", "Programme changed since it was reviewed; reload and try again", 409);
      if (current.status !== "published") throw new ProgrammeInputError("invalid_state_transition", "Only published programmes can be archived", 409);
       if (current.currentDraftRevisionId) {
         throw new ProgrammeInputError("programme_has_draft", "Publish the replacement draft before archiving this programme", 409);
       }
      const [updated] = await tx.update(programmeTemplatesTable).set({ status: "archived", version: sql`${programmeTemplatesTable.version} + 1`, updatedByUserId: req.user!.id, updatedAt: new Date() }).where(and(eq(programmeTemplatesTable.id, id), eq(programmeTemplatesTable.status, "published"), eq(programmeTemplatesTable.version, current.version))).returning();
      if (!updated) throw new ProgrammeInputError("concurrent_update", "Programme changed during this request; reload and try again", 409);
      await writeAuditLog({ tenantId: req.user!.tenantId, actorType: "user", actorId: req.user!.id, action: "programme:archive", targetType: "programme_template", targetId: id, metadata: { reason, fromVersion: current.version, toVersion: current.version + 1, fromStatus: "published", toStatus: "archived" } }, tx);
      return loadTemplate(tx, req.user!.tenantId, id, true);
    });
    if (!programme) { res.status(404).json({ error: "Programme not found", code: "programme_not_found" }); return; }
    res.json({ programme });
  } catch (error) {
    if (!sendError(res, error)) { req.log.error({ err: error }, "Failed to archive programme"); res.status(500).json({ error: "Failed to archive programme", code: "internal_error" }); }
  }
});

export default router;