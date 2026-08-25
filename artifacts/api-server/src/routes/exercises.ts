import { Router, type IRouter, type Response } from "express";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  db,
  exerciseEquipmentTable,
  exerciseMusclesTable,
  exercisesTable,
  type Exercise,
} from "@workspace/db";
import { attachUser, requireAuth, requireCapability } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import {
  EXERCISE_DIFFICULTIES,
  EXERCISE_MUSCLE_KEYS,
  EXERCISE_PERFORMANCE_TYPES,
  ExerciseInputError,
  type ExerciseDetail,
  normalizeEquipmentKey,
  parseExerciseWriteInput,
  toClientExercise,
  validateExerciseActivation,
} from "../lib/exercises";

const router: IRouter = Router();
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sendError(res: Response, error: unknown) {
  if (error instanceof ExerciseInputError) {
    res.status(error.status).json({
      error: error.message,
      code: error.code,
      ...(error.details ? { details: error.details } : {}),
    });
    return true;
  }
  const wrapped = error as {
    code?: string;
    constraint?: string;
    cause?: { code?: string; constraint?: string };
  };
  const pgError = wrapped.cause ?? wrapped;
  if (pgError?.code === "23505") {
    res.status(409).json({
      error: "Exercise conflicts with an existing catalogue record",
      code:
        pgError.constraint === "exercises_tenant_slug_unique"
          ? "slug_conflict"
          : "duplicate_mapping",
    });
    return true;
  }
  return false;
}

function requireUuid(id: unknown): string {
  if (typeof id !== "string" || !UUID_RE.test(id)) {
    throw new ExerciseInputError("invalid_exercise_id", "Invalid exercise id");
  }
  return id;
}

function parsePagination(query: Record<string, unknown>) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 25 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) {
    throw new ExerciseInputError("invalid_page", "Page must be a positive integer");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ExerciseInputError(
      "invalid_limit",
      "Limit must be an integer from 1 to 100",
    );
  }
  return { page, limit, offset: (page - 1) * limit };
}

async function loadDetails(
  client: Pick<typeof db, "select">,
  exercises: Exercise[],
): Promise<ExerciseDetail[]> {
  if (exercises.length === 0) return [];
  const ids = exercises.map((exercise) => exercise.id);
  const tenantIds = [...new Set(exercises.map((exercise) => exercise.tenantId))];
  const [muscles, equipment] = await Promise.all([
    client
      .select({
        exerciseId: exerciseMusclesTable.exerciseId,
        muscleKey: exerciseMusclesTable.muscleKey,
        role: exerciseMusclesTable.role,
      })
      .from(exerciseMusclesTable)
      .where(
        and(
          inArray(exerciseMusclesTable.tenantId, tenantIds),
          inArray(exerciseMusclesTable.exerciseId, ids),
        ),
      )
      .orderBy(asc(exerciseMusclesTable.createdAt)),
    client
      .select({
        exerciseId: exerciseEquipmentTable.exerciseId,
        equipmentKey: exerciseEquipmentTable.equipmentKey,
        required: exerciseEquipmentTable.required,
      })
      .from(exerciseEquipmentTable)
      .where(
        and(
          inArray(exerciseEquipmentTable.tenantId, tenantIds),
          inArray(exerciseEquipmentTable.exerciseId, ids),
        ),
      )
      .orderBy(asc(exerciseEquipmentTable.createdAt)),
  ]);
  return exercises.map((exercise) => ({
    ...exercise,
    muscles: muscles
      .filter((row) => row.exerciseId === exercise.id)
      .map(({ muscleKey, role }) => ({ muscleKey: muscleKey as any, role })),
    equipment: equipment
      .filter((row) => row.exerciseId === exercise.id)
      .map(({ equipmentKey, required }) => ({ equipmentKey, required })),
  }));
}

async function loadOne(
  client: Pick<typeof db, "select">,
  tenantId: string,
  id: string,
): Promise<ExerciseDetail | null> {
  const [exercise] = await client
    .select()
    .from(exercisesTable)
    .where(and(eq(exercisesTable.tenantId, tenantId), eq(exercisesTable.id, id)))
    .limit(1);
  if (!exercise) return null;
  return (await loadDetails(client, [exercise]))[0] ?? null;
}

async function replaceMappings(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  tenantId: string,
  exerciseId: string,
  input: ReturnType<typeof parseExerciseWriteInput>,
) {
  if (input.muscles) {
    await tx
      .delete(exerciseMusclesTable)
      .where(
        and(
          eq(exerciseMusclesTable.tenantId, tenantId),
          eq(exerciseMusclesTable.exerciseId, exerciseId),
        ),
      );
    if (input.muscles.length > 0) {
      await tx.insert(exerciseMusclesTable).values(
        input.muscles.map((muscle) => ({
          tenantId,
          exerciseId,
          ...muscle,
        })),
      );
    }
  }
  if (input.equipment) {
    await tx
      .delete(exerciseEquipmentTable)
      .where(
        and(
          eq(exerciseEquipmentTable.tenantId, tenantId),
          eq(exerciseEquipmentTable.exerciseId, exerciseId),
        ),
      );
    if (input.equipment.length > 0) {
      await tx.insert(exerciseEquipmentTable).values(
        input.equipment.map((item) => ({
          tenantId,
          exerciseId,
          ...item,
        })),
      );
    }
  }
}

function exerciseUpdates(
  input: ReturnType<typeof parseExerciseWriteInput>,
  updatedByUserId: string,
) {
  const { muscles: _muscles, equipment: _equipment, ...fields } = input;
  return { ...fields, updatedByUserId, updatedAt: new Date() };
}

router.use("/exercises", attachUser, requireAuth, requireCapability("exercises:read"));
router.use("/admin/exercises", attachUser, requireAuth);

router.get("/exercises", async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(
      req.query as Record<string, unknown>,
    );
    const conditions: SQL[] = [
      eq(exercisesTable.tenantId, req.user!.tenantId),
      eq(exercisesTable.status, "active"),
    ];
    if (typeof req.query.search === "string" && req.query.search.trim()) {
      conditions.push(
        ilike(exercisesTable.name, `%${req.query.search.trim().slice(0, 100)}%`),
      );
    }
    if (typeof req.query.performanceType === "string") {
      if (
        !EXERCISE_PERFORMANCE_TYPES.includes(req.query.performanceType as any)
      ) {
        throw new ExerciseInputError(
          "invalid_performance_type",
          "Invalid performance type filter",
        );
      }
      conditions.push(
        eq(exercisesTable.performanceType, req.query.performanceType as any),
      );
    }
    if (typeof req.query.difficulty === "string") {
      if (!EXERCISE_DIFFICULTIES.includes(req.query.difficulty as any)) {
        throw new ExerciseInputError(
          "invalid_difficulty",
          "Invalid difficulty filter",
        );
      }
      conditions.push(eq(exercisesTable.difficulty, req.query.difficulty as any));
    }
    if (typeof req.query.muscle === "string") {
      if (!EXERCISE_MUSCLE_KEYS.includes(req.query.muscle as any)) {
        throw new ExerciseInputError("invalid_muscle", "Invalid muscle filter");
      }
      conditions.push(
        inArray(
          exercisesTable.id,
          db
            .select({ id: exerciseMusclesTable.exerciseId })
            .from(exerciseMusclesTable)
            .where(
              and(
                eq(exerciseMusclesTable.tenantId, req.user!.tenantId),
                eq(exerciseMusclesTable.muscleKey, req.query.muscle),
              ),
            ),
        ),
      );
    }
    if (typeof req.query.equipment === "string" && req.query.equipment.trim()) {
      conditions.push(
        inArray(
          exercisesTable.id,
          db
            .select({ id: exerciseEquipmentTable.exerciseId })
            .from(exerciseEquipmentTable)
            .where(
              and(
                eq(exerciseEquipmentTable.tenantId, req.user!.tenantId),
                eq(
                  exerciseEquipmentTable.equipmentKey,
                  normalizeEquipmentKey(req.query.equipment),
                ),
              ),
            ),
        ),
      );
    }
    const where = and(...conditions);
    const [[totalRow], rows] = await Promise.all([
      db.select({ total: count() }).from(exercisesTable).where(where),
      db
        .select()
        .from(exercisesTable)
        .where(where)
        .orderBy(asc(exercisesTable.name), asc(exercisesTable.id))
        .limit(limit)
        .offset(offset),
    ]);
    const details = await loadDetails(db, rows);
    res.json({
      exercises: details.map(toClientExercise),
      pagination: { page, limit, total: totalRow?.total ?? 0 },
    });
  } catch (error) {
    if (sendError(res, error)) return;
    req.log.error({ err: error }, "Failed to list exercises");
    res.status(500).json({ error: "Failed to list exercises", code: "internal_error" });
  }
});

router.get("/exercises/:id", async (req, res) => {
  try {
    const exercise = await loadOne(
      db,
      req.user!.tenantId,
      requireUuid(req.params.id),
    );
    if (!exercise || exercise.status !== "active") {
      res.status(404).json({ error: "Exercise not found", code: "exercise_not_found" });
      return;
    }
    res.json({ exercise: toClientExercise(exercise) });
  } catch (error) {
    if (sendError(res, error)) return;
    req.log.error({ err: error }, "Failed to get exercise");
    res.status(500).json({ error: "Failed to get exercise", code: "internal_error" });
  }
});

router.get(
  "/admin/exercises",
  requireCapability("exercises:manage"),
  async (req, res) => {
    try {
      const { page, limit, offset } = parsePagination(
        req.query as Record<string, unknown>,
      );
      const conditions: SQL[] = [eq(exercisesTable.tenantId, req.user!.tenantId)];
      if (typeof req.query.status === "string") {
        if (!["draft", "active", "archived"].includes(req.query.status)) {
          throw new ExerciseInputError(
            "invalid_status",
            "Invalid exercise status filter",
          );
        }
        conditions.push(eq(exercisesTable.status, req.query.status as any));
      }
      if (typeof req.query.search === "string" && req.query.search.trim()) {
        conditions.push(
          ilike(exercisesTable.name, `%${req.query.search.trim().slice(0, 100)}%`),
        );
      }
      if (typeof req.query.performanceType === "string") {
        if (
          !EXERCISE_PERFORMANCE_TYPES.includes(req.query.performanceType as any)
        ) {
          throw new ExerciseInputError(
            "invalid_performance_type",
            "Invalid performance type filter",
          );
        }
        conditions.push(
          eq(exercisesTable.performanceType, req.query.performanceType as any),
        );
      }
      if (typeof req.query.difficulty === "string") {
        if (!EXERCISE_DIFFICULTIES.includes(req.query.difficulty as any)) {
          throw new ExerciseInputError(
            "invalid_difficulty",
            "Invalid difficulty filter",
          );
        }
        conditions.push(
          eq(exercisesTable.difficulty, req.query.difficulty as any),
        );
      }
      if (typeof req.query.muscle === "string") {
        if (!EXERCISE_MUSCLE_KEYS.includes(req.query.muscle as any)) {
          throw new ExerciseInputError("invalid_muscle", "Invalid muscle filter");
        }
        conditions.push(
          inArray(
            exercisesTable.id,
            db
              .select({ id: exerciseMusclesTable.exerciseId })
              .from(exerciseMusclesTable)
              .where(
                and(
                  eq(exerciseMusclesTable.tenantId, req.user!.tenantId),
                  eq(exerciseMusclesTable.muscleKey, req.query.muscle),
                ),
              ),
          ),
        );
      }
      if (typeof req.query.equipment === "string" && req.query.equipment.trim()) {
        conditions.push(
          inArray(
            exercisesTable.id,
            db
              .select({ id: exerciseEquipmentTable.exerciseId })
              .from(exerciseEquipmentTable)
              .where(
                and(
                  eq(exerciseEquipmentTable.tenantId, req.user!.tenantId),
                  eq(
                    exerciseEquipmentTable.equipmentKey,
                    normalizeEquipmentKey(req.query.equipment),
                  ),
                ),
              ),
          ),
        );
      }
      const where = and(...conditions);
      const [[totalRow], rows] = await Promise.all([
        db.select({ total: count() }).from(exercisesTable).where(where),
        db
          .select()
          .from(exercisesTable)
          .where(where)
          .orderBy(desc(exercisesTable.updatedAt))
          .limit(limit)
          .offset(offset),
      ]);
      res.json({
        exercises: await loadDetails(db, rows),
        pagination: { page, limit, total: totalRow?.total ?? 0 },
      });
    } catch (error) {
      if (sendError(res, error)) return;
      req.log.error({ err: error }, "Failed to list admin exercises");
      res.status(500).json({ error: "Failed to list exercises", code: "internal_error" });
    }
  },
);

router.get(
  "/admin/exercises/:id",
  requireCapability("exercises:manage"),
  async (req, res) => {
    try {
      const exercise = await loadOne(
        db,
        req.user!.tenantId,
        requireUuid(req.params.id),
      );
      if (!exercise) {
        res.status(404).json({ error: "Exercise not found", code: "exercise_not_found" });
        return;
      }
      res.json({ exercise });
    } catch (error) {
      if (sendError(res, error)) return;
      req.log.error({ err: error }, "Failed to get admin exercise");
      res.status(500).json({ error: "Failed to get exercise", code: "internal_error" });
    }
  },
);

router.post(
  "/admin/exercises",
  requireCapability("exercises:manage"),
  async (req, res) => {
    try {
      const input = parseExerciseWriteInput(req.body, "create");
      const exercise = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(exercisesTable)
          .values({
            ...exerciseUpdates(input, req.user!.id),
            name: input.name!,
            slug: input.slug!,
            tenantId: req.user!.tenantId,
            createdByUserId: req.user!.id,
            updatedByUserId: req.user!.id,
            status: "draft",
          })
          .returning();
        await replaceMappings(tx, req.user!.tenantId, created.id, input);
        await writeAuditLog(
          {
            tenantId: req.user!.tenantId,
            actorType: "user",
            actorId: req.user!.id,
            action: "exercise:create",
            targetType: "exercise",
            targetId: created.id,
            metadata: { slug: created.slug },
          },
          tx as Parameters<typeof writeAuditLog>[1],
        );
        return (await loadOne(tx, req.user!.tenantId, created.id))!;
      });
      res.status(201).json({ exercise });
    } catch (error) {
      if (sendError(res, error)) return;
      req.log.error({ err: error }, "Failed to create exercise");
      res.status(500).json({ error: "Failed to create exercise", code: "internal_error" });
    }
  },
);

router.patch(
  "/admin/exercises/:id",
  requireCapability("exercises:manage"),
  async (req, res) => {
    try {
      const id = requireUuid(req.params.id);
      const input = parseExerciseWriteInput(req.body, "patch");
      const exercise = await db.transaction(async (tx) => {
        const current = await loadOne(tx, req.user!.tenantId, id);
        if (!current) return null;
        if (current.status === "archived") {
          throw new ExerciseInputError(
            "invalid_state_transition",
            "Restore the archived exercise before editing it",
            409,
          );
        }
        if (
          current.status === "active" &&
          input.slug !== undefined &&
          input.slug !== current.slug
        ) {
          throw new ExerciseInputError(
            "active_slug_locked",
            "An active exercise slug cannot be changed",
            409,
          );
        }
        const [updated] = await tx
          .update(exercisesTable)
          .set({
            ...exerciseUpdates(input, req.user!.id),
            version: sql`${exercisesTable.version} + 1`,
          })
          .where(
            and(
              eq(exercisesTable.tenantId, req.user!.tenantId),
              eq(exercisesTable.id, id),
              eq(exercisesTable.status, current.status),
              eq(exercisesTable.version, current.version),
            ),
          )
          .returning();
        if (!updated) {
          throw new ExerciseInputError(
            "concurrent_update",
            "Exercise changed during this request; reload and try again",
            409,
          );
        }
        await replaceMappings(tx, req.user!.tenantId, id, input);
        const detail = (await loadOne(tx, req.user!.tenantId, id))!;
        if (detail.status === "active") validateExerciseActivation(detail);
        await writeAuditLog(
          {
            tenantId: req.user!.tenantId,
            actorType: "user",
            actorId: req.user!.id,
            action: "exercise:update",
            targetType: "exercise",
            targetId: id,
            metadata: { fields: Object.keys(input) },
          },
          tx as Parameters<typeof writeAuditLog>[1],
        );
        if (
          input.performanceType !== undefined &&
          input.performanceType !== current.performanceType
        ) {
          await writeAuditLog(
            {
              tenantId: req.user!.tenantId,
              actorType: "user",
              actorId: req.user!.id,
              action: "exercise:performance_type_change",
              targetType: "exercise",
              targetId: id,
              metadata: {
                from: current.performanceType,
                to: updated.performanceType,
              },
            },
            tx as Parameters<typeof writeAuditLog>[1],
          );
        }
        if (
          input.safetyNotes !== undefined &&
          input.safetyNotes !== current.safetyNotes
        ) {
          await writeAuditLog(
            {
              tenantId: req.user!.tenantId,
              actorType: "user",
              actorId: req.user!.id,
              action: "exercise:safety_change",
              targetType: "exercise",
              targetId: id,
              metadata: { changed: true },
            },
            tx as Parameters<typeof writeAuditLog>[1],
          );
        }
        return detail;
      });
      if (!exercise) {
        res.status(404).json({ error: "Exercise not found", code: "exercise_not_found" });
        return;
      }
      res.json({ exercise });
    } catch (error) {
      if (sendError(res, error)) return;
      req.log.error({ err: error }, "Failed to update exercise");
      res.status(500).json({ error: "Failed to update exercise", code: "internal_error" });
    }
  },
);

router.post(
  "/admin/exercises/:id/activate",
  requireCapability("exercises:manage"),
  async (req, res) => {
    try {
      const id = requireUuid(req.params.id);
      const exercise = await db.transaction(async (tx) => {
        const current = await loadOne(tx, req.user!.tenantId, id);
        if (!current) return null;
        if (current.status !== "draft") {
          throw new ExerciseInputError(
            "invalid_state_transition",
            "Only draft exercises can be activated",
            409,
          );
        }
        validateExerciseActivation(current);
        const [updated] = await tx
          .update(exercisesTable)
          .set({
            status: "active",
            version: sql`${exercisesTable.version} + 1`,
            updatedByUserId: req.user!.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(exercisesTable.tenantId, req.user!.tenantId),
              eq(exercisesTable.id, id),
              eq(exercisesTable.status, "draft"),
              eq(exercisesTable.version, current.version),
            ),
          )
          .returning({ id: exercisesTable.id });
        if (!updated) {
          throw new ExerciseInputError(
            "concurrent_update",
            "Exercise changed during this request; reload and try again",
            409,
          );
        }
        await writeAuditLog(
          {
            tenantId: req.user!.tenantId,
            actorType: "user",
            actorId: req.user!.id,
            action: "exercise:activate",
            targetType: "exercise",
            targetId: id,
          },
          tx as Parameters<typeof writeAuditLog>[1],
        );
        return (await loadOne(tx, req.user!.tenantId, id))!;
      });
      if (!exercise) {
        res.status(404).json({ error: "Exercise not found", code: "exercise_not_found" });
        return;
      }
      res.json({ exercise });
    } catch (error) {
      if (sendError(res, error)) return;
      req.log.error({ err: error }, "Failed to activate exercise");
      res.status(500).json({ error: "Failed to activate exercise", code: "internal_error" });
    }
  },
);

router.post(
  "/admin/exercises/:id/archive",
  requireCapability("exercises:archive"),
  async (req, res) => {
    try {
      const id = requireUuid(req.params.id);
      const reason =
        typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
      if (!reason) {
        throw new ExerciseInputError(
          "archive_reason_required",
          "Archive reason is required",
        );
      }
      if (reason.length > 500) {
        throw new ExerciseInputError(
          "invalid_archive_reason",
          "Archive reason must be 500 characters or fewer",
        );
      }
      const exercise = await db.transaction(async (tx) => {
        const current = await loadOne(tx, req.user!.tenantId, id);
        if (!current) return null;
        if (current.status !== "active") {
          throw new ExerciseInputError(
            "invalid_state_transition",
            "Only active exercises can be archived",
            409,
          );
        }
        const [updated] = await tx
          .update(exercisesTable)
          .set({
            status: "archived",
            version: sql`${exercisesTable.version} + 1`,
            updatedByUserId: req.user!.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(exercisesTable.tenantId, req.user!.tenantId),
              eq(exercisesTable.id, id),
              eq(exercisesTable.status, "active"),
              eq(exercisesTable.version, current.version),
            ),
          )
          .returning({ id: exercisesTable.id });
        if (!updated) {
          throw new ExerciseInputError(
            "concurrent_update",
            "Exercise changed during this request; reload and try again",
            409,
          );
        }
        await writeAuditLog(
          {
            tenantId: req.user!.tenantId,
            actorType: "user",
            actorId: req.user!.id,
            action: "exercise:archive",
            targetType: "exercise",
            targetId: id,
            metadata: { reason },
          },
          tx as Parameters<typeof writeAuditLog>[1],
        );
        return (await loadOne(tx, req.user!.tenantId, id))!;
      });
      if (!exercise) {
        res.status(404).json({ error: "Exercise not found", code: "exercise_not_found" });
        return;
      }
      res.json({ exercise });
    } catch (error) {
      if (sendError(res, error)) return;
      req.log.error({ err: error }, "Failed to archive exercise");
      res.status(500).json({ error: "Failed to archive exercise", code: "internal_error" });
    }
  },
);

router.post(
  "/admin/exercises/:id/restore",
  requireCapability("exercises:archive"),
  async (req, res) => {
    try {
      const id = requireUuid(req.params.id);
      const exercise = await db.transaction(async (tx) => {
        const current = await loadOne(tx, req.user!.tenantId, id);
        if (!current) return null;
        if (current.status !== "archived") {
          throw new ExerciseInputError(
            "invalid_state_transition",
            "Only archived exercises can be restored",
            409,
          );
        }
        const [updated] = await tx
          .update(exercisesTable)
          .set({
            status: "draft",
            version: sql`${exercisesTable.version} + 1`,
            updatedByUserId: req.user!.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(exercisesTable.tenantId, req.user!.tenantId),
              eq(exercisesTable.id, id),
              eq(exercisesTable.status, "archived"),
              eq(exercisesTable.version, current.version),
            ),
          )
          .returning({ id: exercisesTable.id });
        if (!updated) {
          throw new ExerciseInputError(
            "concurrent_update",
            "Exercise changed during this request; reload and try again",
            409,
          );
        }
        await writeAuditLog(
          {
            tenantId: req.user!.tenantId,
            actorType: "user",
            actorId: req.user!.id,
            action: "exercise:restore",
            targetType: "exercise",
            targetId: id,
          },
          tx as Parameters<typeof writeAuditLog>[1],
        );
        return (await loadOne(tx, req.user!.tenantId, id))!;
      });
      if (!exercise) {
        res.status(404).json({ error: "Exercise not found", code: "exercise_not_found" });
        return;
      }
      res.json({ exercise });
    } catch (error) {
      if (sendError(res, error)) return;
      req.log.error({ err: error }, "Failed to restore exercise");
      res.status(500).json({ error: "Failed to restore exercise", code: "internal_error" });
    }
  },
);

export default router;