import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import request from "supertest";
import {
  db,
  exerciseMusclesTable,
  exercisesTable,
  type Exercise,
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

const completeExercise = {
  name: "Barbell Back Squat",
  slug: "barbell-back-squat",
  performanceType: "weight_reps",
  movementPattern: "squat",
  laterality: "bilateral",
  description: "A loaded bilateral squat.",
  instructions: "Brace, descend under control, then stand tall.",
  difficulty: "intermediate",
  defaultRestSeconds: 180,
  safetyNotes: "Use safety pins and an appropriate load.",
  internalNotes: "Marcus-only coaching note.",
  mediaUrl: "/exercise-media/barbell-back-squat.jpg",
  muscles: [
    { muscleKey: "quads", role: "primary" },
    { muscleKey: "glutes", role: "secondary" },
  ],
  equipment: [
    { equipmentKey: "barbell", required: true },
    { equipmentKey: "squat_rack", required: true },
  ],
};

describe("exercise catalogue API", () => {
  let tenantA: Tenant;
  let tenantB: Tenant;
  let adminA: User;
  let clientA: User;
  let trainerA: User;
  let adminB: User;
  let adminCookie: string;
  let clientCookie: string;
  let trainerCookie: string;
  let adminBCookie: string;
  let activeExercise: Exercise;

  beforeAll(async () => {
    tenantA = await createTenant({
      slug: `exercises-a-${crypto.randomUUID().slice(0, 8)}`,
      name: "Exercise tenant A",
    });
    tenantB = await createTenant({
      slug: `exercises-b-${crypto.randomUUID().slice(0, 8)}`,
      name: "Exercise tenant B",
    });
    adminA = await createUser(tenantA.id, { role: "admin" });
    clientA = await createUser(tenantA.id, { role: "client" });
    trainerA = await createUser(tenantA.id, { role: "trainer" });
    adminB = await createUser(tenantB.id, { role: "admin" });
    adminCookie = sessionCookie((await createSession(adminA.id)).token);
    clientCookie = sessionCookie((await createSession(clientA.id)).token);
    trainerCookie = sessionCookie((await createSession(trainerA.id)).token);
    adminBCookie = sessionCookie((await createSession(adminB.id)).token);
  });

  it("requires authentication and grants clients read-only catalogue access", async () => {
    await request(app).get("/api/exercises").expect(401);
    await request(app)
      .get("/api/exercises")
      .set("Cookie", trainerCookie)
      .expect(403);
    const clientList = await request(app)
      .get("/api/exercises")
      .set("Cookie", clientCookie)
      .expect(200);
    expect(clientList.body.exercises).toEqual([]);
    await request(app)
      .post("/api/admin/exercises")
      .set("Cookie", clientCookie)
      .send({ name: "Not allowed", slug: "not-allowed" })
      .expect(403);
  });

  it("creates an incomplete draft while rejecting request-owned tenant and status", async () => {
    const rejected = await request(app)
      .post("/api/admin/exercises")
      .set("Cookie", adminCookie)
      .send({
        name: "Unsafe",
        slug: "unsafe",
        tenantId: tenantB.id,
        status: "active",
      })
      .expect(400);
    expect(rejected.body.code).toBe("ownership_fields_forbidden");

    const created = await request(app)
      .post("/api/admin/exercises")
      .set("Cookie", adminCookie)
      .send({ name: "Draft Squat", slug: "draft-squat" })
      .expect(201);
    expect(created.body.exercise).toMatchObject({
      tenantId: tenantA.id,
      status: "draft",
      createdByUserId: adminA.id,
      updatedByUserId: adminA.id,
    });
    const activation = await request(app)
      .post(`/api/admin/exercises/${created.body.exercise.id}/activate`)
      .set("Cookie", adminCookie)
      .expect(422);
    expect(activation.body).toMatchObject({
      code: "activation_requirements_missing",
    });
    expect(activation.body.details.fields).toContain("primaryMuscle");
  });

  it("creates, deduplicates and activates a complete exercise atomically", async () => {
    const created = await request(app)
      .post("/api/admin/exercises")
      .set("Cookie", adminCookie)
      .send(completeExercise)
      .expect(201);
    expect(created.body.exercise).toMatchObject({
      status: "draft",
      slug: completeExercise.slug,
      internalNotes: completeExercise.internalNotes,
    });
    expect(created.body.exercise.muscles).toHaveLength(2);
    expect(created.body.exercise.equipment).toHaveLength(2);

    const duplicate = await request(app)
      .post("/api/admin/exercises")
      .set("Cookie", adminCookie)
      .send({ name: "Duplicate", slug: completeExercise.slug })
      .expect(409);
    expect(duplicate.body.code).toBe("slug_conflict");

    const activated = await request(app)
      .post(`/api/admin/exercises/${created.body.exercise.id}/activate`)
      .set("Cookie", adminCookie)
      .expect(200);
    expect(activated.body.exercise.status).toBe("active");
    activeExercise = activated.body.exercise;
    expect(await countAuditLogs(tenantA.id, "exercise:create")).toBeGreaterThanOrEqual(2);
    expect(await countAuditLogs(tenantA.id, "exercise:activate")).toBe(1);
  });

  it("returns only active same-tenant records and strips private fields", async () => {
    const list = await request(app)
      .get(
        "/api/exercises?muscle=quads&equipment=barbell&performanceType=weight_reps&difficulty=intermediate",
      )
      .set("Cookie", clientCookie)
      .expect(200);
    expect(list.body.pagination).toMatchObject({ page: 1, limit: 25, total: 1 });
    expect(list.body.exercises).toHaveLength(1);
    expect(list.body.exercises[0]).toMatchObject({
      id: activeExercise.id,
      name: completeExercise.name,
    });
    expect(list.body.exercises[0]).not.toHaveProperty("internalNotes");
    expect(list.body.exercises[0]).not.toHaveProperty("tenantId");
    expect(list.body.exercises[0]).not.toHaveProperty("createdByUserId");

    const detail = await request(app)
      .get(`/api/exercises/${activeExercise.id}`)
      .set("Cookie", clientCookie)
      .expect(200);
    expect(detail.body.exercise.id).toBe(activeExercise.id);
    expect(detail.body.exercise).not.toHaveProperty("internalNotes");

    const otherTenant = await request(app)
      .get(`/api/admin/exercises/${activeExercise.id}`)
      .set("Cookie", adminBCookie)
      .expect(404);
    expect(otherTenant.body.code).toBe("exercise_not_found");

    const adminFiltered = await request(app)
      .get(
        "/api/admin/exercises?search=barbell&status=active&muscle=quads&equipment=barbell&performanceType=weight_reps&difficulty=intermediate",
      )
      .set("Cookie", adminCookie)
      .expect(200);
    expect(adminFiltered.body.pagination.total).toBe(1);
    expect(adminFiltered.body.exercises[0].internalNotes).toBe(
      completeExercise.internalNotes,
    );
  });

  it("enforces composite tenant ownership for child mappings", async () => {
    try {
      await db.insert(exerciseMusclesTable).values({
        tenantId: tenantB.id,
        exerciseId: activeExercise.id,
        muscleKey: "calves",
        role: "secondary",
      });
      throw new Error("Expected tenant-safe foreign key to reject the mapping");
    } catch (error) {
      expect(
        (error as { cause?: { code?: string } }).cause?.code,
      ).toBe("23503");
    }
  });

  it("audits safety and performance changes and keeps active exercises valid", async () => {
    const invalidated = await request(app)
      .patch(`/api/admin/exercises/${activeExercise.id}`)
      .set("Cookie", adminCookie)
      .send({ muscles: [] })
      .expect(422);
    expect(invalidated.body.code).toBe("activation_requirements_missing");
    const unchanged = await request(app)
      .get(`/api/admin/exercises/${activeExercise.id}`)
      .set("Cookie", adminCookie)
      .expect(200);
    expect(unchanged.body.exercise.muscles).toHaveLength(2);

    const updated = await request(app)
      .patch(`/api/admin/exercises/${activeExercise.id}`)
      .set("Cookie", adminCookie)
      .send({
        performanceType: "bodyweight_reps",
        safetyNotes: "Stop if pain occurs.",
      })
      .expect(200);
    expect(updated.body.exercise.performanceType).toBe("bodyweight_reps");
    expect(await countAuditLogs(tenantA.id, "exercise:update")).toBe(1);
    expect(
      await countAuditLogs(tenantA.id, "exercise:performance_type_change"),
    ).toBe(1);
    expect(await countAuditLogs(tenantA.id, "exercise:safety_change")).toBe(1);

    const slugChange = await request(app)
      .patch(`/api/admin/exercises/${activeExercise.id}`)
      .set("Cookie", adminCookie)
      .send({ slug: "changed-active-slug" })
      .expect(409);
    expect(slugChange.body.code).toBe("active_slug_locked");
  });

  it("requires an archive reason, hides archived records, and restores to draft", async () => {
    const missingReason = await request(app)
      .post(`/api/admin/exercises/${activeExercise.id}/archive`)
      .set("Cookie", adminCookie)
      .send({})
      .expect(400);
    expect(missingReason.body.code).toBe("archive_reason_required");

    const archived = await request(app)
      .post(`/api/admin/exercises/${activeExercise.id}/archive`)
      .set("Cookie", adminCookie)
      .send({ reason: "Temporarily removed from programming." })
      .expect(200);
    expect(archived.body.exercise.status).toBe("archived");
    await request(app)
      .get(`/api/exercises/${activeExercise.id}`)
      .set("Cookie", clientCookie)
      .expect(404);
    expect(await countAuditLogs(tenantA.id, "exercise:archive")).toBe(1);

    const restored = await request(app)
      .post(`/api/admin/exercises/${activeExercise.id}/restore`)
      .set("Cookie", adminCookie)
      .expect(200);
    expect(restored.body.exercise.status).toBe("draft");
    await request(app)
      .get(`/api/exercises/${activeExercise.id}`)
      .set("Cookie", clientCookie)
      .expect(404);
    expect(await countAuditLogs(tenantA.id, "exercise:restore")).toBe(1);
  });

  it("rolls back exercise creation when its audit write fails", async () => {
    await db.$client.query(`
      CREATE OR REPLACE FUNCTION reject_exercise_audit() RETURNS trigger AS $$
      BEGIN
        IF NEW.action = 'exercise:create' THEN
          RAISE EXCEPTION 'exercise audit rejected by test';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER reject_exercise_audit_trigger
        BEFORE INSERT ON audit_logs
        FOR EACH ROW EXECUTE FUNCTION reject_exercise_audit();
    `);
    try {
      await request(app)
        .post("/api/admin/exercises")
        .set("Cookie", adminCookie)
        .send({ name: "Must Roll Back", slug: "must-roll-back" })
        .expect(500);
      const rows = await db
        .select()
        .from(exercisesTable)
        .where(
          and(
            eq(exercisesTable.tenantId, tenantA.id),
            eq(exercisesTable.slug, "must-roll-back"),
          ),
        );
      expect(rows).toHaveLength(0);
    } finally {
      await db.$client.query(`
        DROP TRIGGER IF EXISTS reject_exercise_audit_trigger ON audit_logs;
        DROP FUNCTION IF EXISTS reject_exercise_audit();
      `);
    }
  });

  it("allows only one concurrent activation transition to commit", async () => {
    const auditsBefore = await countAuditLogs(tenantA.id, "exercise:activate");
    const created = await request(app)
      .post("/api/admin/exercises")
      .set("Cookie", adminCookie)
      .send({ ...completeExercise, name: "Concurrent Squat", slug: "concurrent-squat" })
      .expect(201);
    const responses = await Promise.all([
      request(app)
        .post(`/api/admin/exercises/${created.body.exercise.id}/activate`)
        .set("Cookie", adminCookie),
      request(app)
        .post(`/api/admin/exercises/${created.body.exercise.id}/activate`)
        .set("Cookie", adminCookie),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(
      await countAuditLogs(tenantA.id, "exercise:activate"),
    ).toBe(auditsBefore + 1);
  });

  it("rejects stale concurrent scalar and mapping patches", async () => {
    const scalarCreated = await request(app)
      .post("/api/admin/exercises")
      .set("Cookie", adminCookie)
      .send({ ...completeExercise, name: "Scalar Race", slug: "scalar-race" })
      .expect(201);
    await request(app)
      .post(`/api/admin/exercises/${scalarCreated.body.exercise.id}/activate`)
      .set("Cookie", adminCookie)
      .expect(200);

    const mappingCreated = await request(app)
      .post("/api/admin/exercises")
      .set("Cookie", adminCookie)
      .send({ ...completeExercise, name: "Mapping Race", slug: "mapping-race" })
      .expect(201);
    await request(app)
      .post(`/api/admin/exercises/${mappingCreated.body.exercise.id}/activate`)
      .set("Cookie", adminCookie)
      .expect(200);

    await db.$client.query(`
      CREATE OR REPLACE FUNCTION delay_exercise_update() RETURNS trigger AS $$
      BEGIN
        PERFORM pg_sleep(0.15);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER delay_exercise_update_trigger
        BEFORE UPDATE ON exercises
        FOR EACH ROW EXECUTE FUNCTION delay_exercise_update();
    `);
    try {
      const auditsBefore = await countAuditLogs(tenantA.id, "exercise:update");
      const scalarResponses = await Promise.all([
        request(app)
          .patch(`/api/admin/exercises/${scalarCreated.body.exercise.id}`)
          .set("Cookie", adminCookie)
          .send({ description: "First concurrent description" }),
        request(app)
          .patch(`/api/admin/exercises/${scalarCreated.body.exercise.id}`)
          .set("Cookie", adminCookie)
          .send({ description: "Second concurrent description" }),
      ]);
      expect(scalarResponses.map((response) => response.status).sort()).toEqual([
        200, 409,
      ]);
      expect(await countAuditLogs(tenantA.id, "exercise:update")).toBe(
        auditsBefore + 1,
      );

      const mappingAuditsBefore = await countAuditLogs(
        tenantA.id,
        "exercise:update",
      );
      const mappingResponses = await Promise.all([
        request(app)
          .patch(`/api/admin/exercises/${mappingCreated.body.exercise.id}`)
          .set("Cookie", adminCookie)
          .send({ muscles: [{ muscleKey: "quads", role: "primary" }] }),
        request(app)
          .patch(`/api/admin/exercises/${mappingCreated.body.exercise.id}`)
          .set("Cookie", adminCookie)
          .send({ muscles: [{ muscleKey: "glutes", role: "primary" }] }),
      ]);
      expect(mappingResponses.map((response) => response.status).sort()).toEqual([
        200, 409,
      ]);
      expect(await countAuditLogs(tenantA.id, "exercise:update")).toBe(
        mappingAuditsBefore + 1,
      );
      const saved = await request(app)
        .get(`/api/admin/exercises/${mappingCreated.body.exercise.id}`)
        .set("Cookie", adminCookie)
        .expect(200);
      expect(saved.body.exercise.muscles).toHaveLength(1);
    } finally {
      await db.$client.query(`
        DROP TRIGGER IF EXISTS delay_exercise_update_trigger ON exercises;
        DROP FUNCTION IF EXISTS delay_exercise_update();
      `);
    }
  });

  it("cannot activate a stale draft after a concurrent invalidating patch", async () => {
    const created = await request(app)
      .post("/api/admin/exercises")
      .set("Cookie", adminCookie)
      .send({ ...completeExercise, name: "Activation Race", slug: "activation-race" })
      .expect(201);
    const updateAuditsBefore = await countAuditLogs(tenantA.id, "exercise:update");
    const activationAuditsBefore = await countAuditLogs(
      tenantA.id,
      "exercise:activate",
    );

    await db.$client.query(`
      CREATE OR REPLACE FUNCTION delay_activation_race_update() RETURNS trigger AS $$
      BEGIN
        PERFORM pg_sleep(0.15);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER delay_activation_race_update_trigger
        BEFORE UPDATE ON exercises
        FOR EACH ROW EXECUTE FUNCTION delay_activation_race_update();
    `);
    try {
      const responses = await Promise.all([
        request(app)
          .patch(`/api/admin/exercises/${created.body.exercise.id}`)
          .set("Cookie", adminCookie)
          .send({ muscles: [] }),
        request(app)
          .post(`/api/admin/exercises/${created.body.exercise.id}/activate`)
          .set("Cookie", adminCookie),
      ]);
      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);

      const saved = await request(app)
        .get(`/api/admin/exercises/${created.body.exercise.id}`)
        .set("Cookie", adminCookie)
        .expect(200);
      if (saved.body.exercise.status === "active") {
        expect(
          saved.body.exercise.muscles.some(
            (muscle: { role: string }) => muscle.role === "primary",
          ),
        ).toBe(true);
      } else {
        expect(saved.body.exercise.status).toBe("draft");
        expect(saved.body.exercise.muscles).toHaveLength(0);
      }

      const committedMutations =
        (await countAuditLogs(tenantA.id, "exercise:update")) -
          updateAuditsBefore +
        ((await countAuditLogs(tenantA.id, "exercise:activate")) -
          activationAuditsBefore);
      expect(committedMutations).toBe(1);
    } finally {
      await db.$client.query(`
        DROP TRIGGER IF EXISTS delay_activation_race_update_trigger ON exercises;
        DROP FUNCTION IF EXISTS delay_activation_race_update();
      `);
    }
  });
});