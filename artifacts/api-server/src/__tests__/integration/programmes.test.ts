import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { and, eq } from "drizzle-orm";
import {
  db,
  auditLogsTable,
  exercisesTable,
  programmeDaysTable,
  programmeExercisePrescriptionsTable,
  programmeRevisionsTable,
  programmeTemplatesTable,
} from "@workspace/db";
import {
  app,
  countAuditLogs,
  createSession,
  createTenant,
  createUser,
  sessionCookie,
  type Tenant,
  type User,
} from "./harness";

describe("programme template publishing API", () => {
  let tenantA: Tenant;
  let tenantB: Tenant;
  let adminA: User;
  let adminB: User;
  let clientA: User;
  let clientB: User;
  let trainerA: User;
  let adminCookie: string;
  let adminBCookie: string;
  let clientCookie: string;
  let clientBCookie: string;
  let trainerCookie: string;
  let exerciseA: typeof exercisesTable.$inferSelect;
  let exerciseB: typeof exercisesTable.$inferSelect;
  let programmeId: string;
  let publishedRevisionId: string;
  let publishedTemplateVersion: number;

  const bodyFor = (exerciseId: string, name = "Day One") => ({
    slug: `strength-${crypto.randomUUID().slice(0, 8)}`,
    name: "Strength Template",
    description: "A tested template",
    difficulty: "intermediate",
    goal: "strength",
    days: [{
      name,
      estimatedMinutes: 45,
      exercises: [{ exerciseId, sets: 3, reps: "8-12", restSeconds: 90, notes: "Controlled tempo" }],
    }],
  });

  beforeAll(async () => {
    tenantA = await createTenant({ slug: `programme-a-${crypto.randomUUID().slice(0, 8)}` });
    tenantB = await createTenant({ slug: `programme-b-${crypto.randomUUID().slice(0, 8)}` });
    adminA = await createUser(tenantA.id, { role: "admin" });
    adminB = await createUser(tenantB.id, { role: "admin" });
    clientA = await createUser(tenantA.id, { role: "client" });
    clientB = await createUser(tenantB.id, { role: "client" });
    trainerA = await createUser(tenantA.id, { role: "trainer" });
    adminCookie = sessionCookie((await createSession(adminA.id)).token);
    adminBCookie = sessionCookie((await createSession(adminB.id)).token);
    clientCookie = sessionCookie((await createSession(clientA.id)).token);
    clientBCookie = sessionCookie((await createSession(clientB.id)).token);
    trainerCookie = sessionCookie((await createSession(trainerA.id)).token);
    [exerciseA] = await db.insert(exercisesTable).values({
      tenantId: tenantA.id,
      name: "Programme Squat",
      slug: `programme-squat-${crypto.randomUUID().slice(0, 8)}`,
      status: "active",
      performanceType: "weight_reps",
      difficulty: "intermediate",
      createdByUserId: adminA.id,
      updatedByUserId: adminA.id,
    }).returning();
    [exerciseB] = await db.insert(exercisesTable).values({
      tenantId: tenantB.id,
      name: "Other Tenant Exercise",
      slug: `other-exercise-${crypto.randomUUID().slice(0, 8)}`,
      status: "active",
      performanceType: "weight_reps",
      difficulty: "intermediate",
      createdByUserId: adminB.id,
      updatedByUserId: adminB.id,
    }).returning();
  });

  it("enforces client/admin permissions and tenant isolation", async () => {
    await request(app).get("/api/programmes").expect(401);
    await request(app).get("/api/programmes").set("Cookie", trainerCookie).expect(403);
    await request(app).get("/api/admin/programmes").set("Cookie", trainerCookie).expect(403);
    await request(app).get("/api/programmes").set("Cookie", clientBCookie).expect(200)
      .then((response) => expect(response.body).toEqual({ programmes: [] }));
  });

  it("creates and edits a draft with If-Match, including stale malformed and no-op contracts", async () => {
    const created = await request(app).post("/api/admin/programmes").set("Cookie", adminCookie)
      .send(bodyFor(exerciseA.id)).expect(201);
    const crossTenantCreate = await request(app).post("/api/admin/programmes").set("Cookie", adminCookie)
      .send(bodyFor(exerciseB.id)).expect(422);
    expect(crossTenantCreate.body.code).toBe("invalid_exercise_reference");
    const programme = created.body.programme;
    programmeId = programme.id;
    expect(programme).toMatchObject({ status: "draft", version: 1, slug: expect.any(String) });
    expect(programme.draftRevision).toMatchObject({ revisionNumber: 1, version: 1, name: "Strength Template" });
    const endpoint = `/api/admin/programmes/${programmeId}/draft`;
    expect((await request(app).patch(endpoint).set("Cookie", adminCookie).send({ description: "missing" })).body.code)
      .toBe("version_precondition_required");
    expect((await request(app).patch(endpoint).set("Cookie", adminCookie).set("If-Match", "wat").send({ description: "bad" })).body.code)
      .toBe("invalid_version_precondition");
    const edited = await request(app).patch(endpoint).set("Cookie", adminCookie).set("If-Match", "1")
      .send({ description: "Reviewed edit" }).expect(200);
    expect(edited.body.programme.draftRevision.version).toBe(2);
    const updatesBeforeNoop = await countAuditLogs(tenantA.id, "programme:update");
    const noOp = await request(app).patch(endpoint).set("Cookie", adminCookie).set("If-Match", "2")
      .send({ description: "Reviewed edit" }).expect(200);
    expect(noOp.body.programme.draftRevision.version).toBe(2);
    expect(await countAuditLogs(tenantA.id, "programme:update")).toBe(updatesBeforeNoop);
    expect((await request(app).patch(endpoint).set("Cookie", adminCookie).set("If-Match", "1")
      .send({ description: "Reviewed edit" })).body.code).toBe("stale_programme_version");
    const crossTenant = await request(app).patch(endpoint).set("Cookie", adminCookie).set("If-Match", "2")
      .send({ days: [{ name: "Cross tenant", exercises: [{ exerciseId: exerciseB.id, sets: 3, reps: "8" }] }] }).expect(422);
    expect(crossTenant.body.code).toBe("invalid_exercise_reference");
  });

  it("publishes and exposes only the current published revision to clients", async () => {
    const detail = await request(app).get(`/api/admin/programmes/${programmeId}`).set("Cookie", adminCookie).expect(200);
    const revisionVersion = detail.body.programme.draftRevision.version;
    const published = await request(app).post(`/api/admin/programmes/${programmeId}/publish`)
      .set("Cookie", adminCookie).set("If-Match", String(revisionVersion)).expect(200);
    publishedRevisionId = published.body.programme.currentPublishedRevisionId;
    expect(published.body.programme.status).toBe("published");
    const list = await request(app).get("/api/programmes").set("Cookie", clientCookie).expect(200);
    expect(list.body).toMatchObject({ programmes: [{ id: programmeId, status: "published" }] });
    const clientDetail = await request(app).get(`/api/programmes/${programmeId}`).set("Cookie", clientCookie).expect(200);
    expect(clientDetail.body.programme.revision.name).toBe("Strength Template");
    await request(app).get(`/api/admin/programmes/${programmeId}`).set("Cookie", adminBCookie).expect(404);
  });

  it("creates a replacement draft without changing client content, then switches atomically on publish", async () => {
    const replacement = await request(app).post(`/api/admin/programmes/${programmeId}/replacement-draft`)
      .set("Cookie", adminCookie).expect(201);
    expect(replacement.body.programme.draftRevision).toMatchObject({ revisionNumber: 2, status: "draft" });
    const beforePublish = await request(app).get(`/api/programmes/${programmeId}`).set("Cookie", clientCookie).expect(200);
    expect(beforePublish.body.programme.revision.id).toBe(publishedRevisionId);
    const draftVersion = replacement.body.programme.draftRevision.version;
    await request(app).patch(`/api/admin/programmes/${programmeId}/draft`).set("Cookie", adminCookie)
      .set("If-Match", String(draftVersion)).send({
        name: "Replacement Template",
        days: [{ name: "Replacement Day", exercises: [{ exerciseId: exerciseA.id, sets: 4, reps: "6", restSeconds: 120 }] }],
      }).expect(200);
    const updated = await request(app).get(`/api/admin/programmes/${programmeId}`).set("Cookie", adminCookie).expect(200);
    const switched = await request(app).post(`/api/admin/programmes/${programmeId}/publish`).set("Cookie", adminCookie)
      .set("If-Match", String(updated.body.programme.draftRevision.version)).expect(200);
    expect(switched.body.programme.currentPublishedRevisionId).not.toBe(publishedRevisionId);
    const afterPublish = await request(app).get(`/api/programmes/${programmeId}`).set("Cookie", clientCookie).expect(200);
    expect(afterPublish.body.programme.revision.name).toBe("Replacement Template");
    publishedTemplateVersion = switched.body.programme.version;
  });

  it("rejects publishing a draft after its exercise becomes inactive", async () => {
    const draft = await request(app).post("/api/admin/programmes").set("Cookie", adminCookie).send(bodyFor(exerciseA.id)).expect(201);
    await db.update(exercisesTable).set({ status: "archived" }).where(and(eq(exercisesTable.tenantId, tenantA.id), eq(exercisesTable.id, exerciseA.id)));
    const publishAuditsBefore = await countAuditLogs(tenantA.id, "programme:publish");
    const result = await request(app).post(`/api/admin/programmes/${draft.body.programme.id}/publish`)
      .set("Cookie", adminCookie).set("If-Match", "1").expect(422);
    expect(result.body.code).toBe("invalid_exercise_reference");
    expect(await countAuditLogs(tenantA.id, "programme:publish")).toBe(publishAuditsBefore);
    await db.update(exercisesTable).set({ status: "active" }).where(eq(exercisesTable.id, exerciseA.id));
  });

  it("does not archive a published programme with a replacement draft", async () => {
    const created = await request(app).post("/api/admin/programmes").set("Cookie", adminCookie)
      .send(bodyFor(exerciseA.id, "Archive Guard Day")).expect(201);
    await request(app).post(`/api/admin/programmes/${created.body.programme.id}/publish`)
      .set("Cookie", adminCookie).set("If-Match", "1").expect(200);
    const replacement = await request(app).post(`/api/admin/programmes/${created.body.programme.id}/replacement-draft`)
      .set("Cookie", adminCookie).expect(201);
    const templateId = created.body.programme.id;
    const templateBefore = await db.select().from(programmeTemplatesTable).where(eq(programmeTemplatesTable.id, templateId));
    const revisionsBefore = await db.select().from(programmeRevisionsTable).where(eq(programmeRevisionsTable.templateId, templateId));
    const archiveAuditsBefore = await countAuditLogs(tenantA.id, "programme:archive");

    const rejected = await request(app).post(`/api/admin/programmes/${templateId}/archive`)
      .set("Cookie", adminCookie).set("If-Match", String(replacement.body.programme.version))
      .send({ reason: "Retire this programme" }).expect(409);
    expect(rejected.body).toMatchObject({
      code: "programme_has_draft",
      error: "Publish the replacement draft before archiving this programme",
    });
    expect(await db.select().from(programmeTemplatesTable).where(eq(programmeTemplatesTable.id, templateId))).toEqual(templateBefore);
    expect(await db.select().from(programmeRevisionsTable).where(eq(programmeRevisionsTable.templateId, templateId))).toEqual(revisionsBefore);
    expect(await countAuditLogs(tenantA.id, "programme:archive")).toBe(archiveAuditsBefore);

    const publishedReplacement = await request(app).post(`/api/admin/programmes/${templateId}/publish`)
      .set("Cookie", adminCookie).set("If-Match", String(replacement.body.programme.draftRevision.version)).expect(200);
    await request(app).post(`/api/admin/programmes/${templateId}/archive`)
      .set("Cookie", adminCookie).set("If-Match", String(publishedReplacement.body.programme.version))
      .send({ reason: "Retire this programme" }).expect(200);
    expect(await countAuditLogs(tenantA.id, "programme:archive")).toBe(archiveAuditsBefore + 1);
  });

  it("preserves immutable published children and archives client visibility", async () => {
    const revisions = await db.select().from(programmeRevisionsTable).where(eq(programmeRevisionsTable.templateId, programmeId));
    const revision = revisions.find((row) => row.status === "published");
    if (!revision) throw new Error("published revision fixture missing");
    const [day] = await db.select().from(programmeDaysTable).where(eq(programmeDaysTable.revisionId, revision.id)).limit(1);
    const [prescription] = await db.select().from(programmeExercisePrescriptionsTable).where(eq(programmeExercisePrescriptionsTable.dayId, day.id)).limit(1);
    await expect(db.update(programmeRevisionsTable).set({ name: "tampered" }).where(eq(programmeRevisionsTable.id, revision.id))).rejects.toThrow();
    await expect(db.delete(programmeDaysTable).where(eq(programmeDaysTable.id, day.id))).rejects.toThrow();
    await expect(db.update(programmeExercisePrescriptionsTable).set({ reps: "tampered" }).where(eq(programmeExercisePrescriptionsTable.id, prescription.id))).rejects.toThrow();
    const beforeArchive = await countAuditLogs(tenantA.id, "programme:archive");
    const archived = await request(app).post(`/api/admin/programmes/${programmeId}/archive`).set("Cookie", adminCookie)
      .set("If-Match", String(publishedTemplateVersion)).send({ reason: "No longer offered" }).expect(200);
    expect(archived.body.programme.status).toBe("archived");
    expect(await countAuditLogs(tenantA.id, "programme:archive")).toBe(beforeArchive + 1);
    await request(app).get("/api/programmes").set("Cookie", clientCookie).expect(200)
      .then((response) => expect(response.body.programmes.some((item: { id: string }) => item.id === programmeId)).toBe(false));
    await request(app).get(`/api/programmes/${programmeId}`).set("Cookie", clientCookie).expect(404);
  });

  it("rejects pointer violations and reparenting across published ancestry", async () => {
    const draft = await request(app).post("/api/admin/programmes").set("Cookie", adminCookie)
      .send(bodyFor(exerciseA.id, "Pointer Draft Day")).expect(201);
    const sameTenantDraft = await request(app).post("/api/admin/programmes").set("Cookie", adminCookie)
      .send(bodyFor(exerciseA.id, "Same Tenant Day")).expect(201);
    const foreignDraft = await request(app).post("/api/admin/programmes").set("Cookie", adminBCookie)
      .send(bodyFor(exerciseB.id, "Foreign Day")).expect(201);
    const foreignPublished = await request(app).post(`/api/admin/programmes/${foreignDraft.body.programme.id}/publish`)
      .set("Cookie", adminBCookie).set("If-Match", "1").expect(200);
    const ownDraftRevisionId = draft.body.programme.draftRevision.id;
    const sameTenantDraftRevisionId = sameTenantDraft.body.programme.draftRevision.id;
    const foreignPublishedRevisionId = foreignPublished.body.programme.currentPublishedRevisionId;
    const ownDraftId = draft.body.programme.id;

    await expect(db.update(programmeTemplatesTable).set({ currentPublishedRevisionId: ownDraftRevisionId })
      .where(eq(programmeTemplatesTable.id, ownDraftId))).rejects.toThrow();
    await expect(db.update(programmeTemplatesTable).set({ currentDraftRevisionId: sameTenantDraftRevisionId })
      .where(eq(programmeTemplatesTable.id, ownDraftId))).rejects.toThrow();
    await expect(db.update(programmeTemplatesTable).set({ currentDraftRevisionId: foreignPublishedRevisionId })
      .where(eq(programmeTemplatesTable.id, ownDraftId))).rejects.toThrow();

    const ownPublished = await request(app).post(`/api/admin/programmes/${ownDraftId}/publish`)
      .set("Cookie", adminCookie).set("If-Match", "1").expect(200);
    const ownPublishedRevisionId = ownPublished.body.programme.currentPublishedRevisionId;
    const ownPublishedRevision = await db.select().from(programmeRevisionsTable)
      .where(eq(programmeRevisionsTable.id, ownPublishedRevisionId)).limit(1);
    const ownDraftRevision = await db.select().from(programmeRevisionsTable)
      .where(eq(programmeRevisionsTable.id, ownDraftRevisionId)).limit(1);
    const [publishedDay] = await db.select().from(programmeDaysTable)
      .where(eq(programmeDaysTable.revisionId, ownPublishedRevisionId)).limit(1);
    const [publishedPrescription] = await db.select().from(programmeExercisePrescriptionsTable)
      .where(eq(programmeExercisePrescriptionsTable.dayId, publishedDay.id)).limit(1);
    expect(ownPublishedRevision[0]?.status).toBe("published");
    expect(ownDraftRevision[0]?.status).toBe("published");

    // Create a new draft revision so the old published revision remains a
    // stable parent for the reparenting checks.
    const replacement = await request(app).post(`/api/admin/programmes/${ownDraftId}/replacement-draft`)
      .set("Cookie", adminCookie).expect(201);
    const replacementRevisionId = replacement.body.programme.draftRevision.id;
    const [draftDay] = await db.select().from(programmeDaysTable)
      .where(eq(programmeDaysTable.revisionId, replacementRevisionId)).limit(1);
    const [draftPrescription] = await db.select().from(programmeExercisePrescriptionsTable)
      .where(eq(programmeExercisePrescriptionsTable.dayId, draftDay.id)).limit(1);
    await expect(db.update(programmeDaysTable).set({ revisionId: ownPublishedRevisionId })
      .where(eq(programmeDaysTable.id, draftDay.id))).rejects.toThrow();
    await expect(db.update(programmeExercisePrescriptionsTable)
      .set({ dayId: publishedDay.id, position: publishedPrescription.position + 100 })
      .where(eq(programmeExercisePrescriptionsTable.id, draftPrescription.id))).rejects.toThrow();
  });

  it("keeps audit writes atomic with a failed mutation", async () => {
    const before = await countAuditLogs(tenantA.id, "programme:publish");
    const invalid = await request(app).post("/api/admin/programmes/00000000-0000-4000-8000-000000000000/publish")
      .set("Cookie", adminCookie).set("If-Match", "1").expect(404);
    expect(invalid.body.code).toBe("programme_not_found");
    expect(await countAuditLogs(tenantA.id, "programme:publish")).toBe(before);
  });
});