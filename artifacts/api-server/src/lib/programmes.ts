import type { ProgrammeDay, ProgrammeExercisePrescription, ProgrammeRevision } from "@workspace/db";

export interface ProgrammePrescriptionInput {
  exerciseId: string;
  sets: number;
  reps: string;
  restSeconds?: number | null;
  notes?: string | null;
  sourceExerciseId?: string | null;
}

export interface ProgrammeDayInput {
  name: string;
  estimatedMinutes?: number | null;
  exercises: ProgrammePrescriptionInput[];
}

export interface ProgrammeWriteInput {
  slug?: string;
  name?: string;
  description?: string | null;
  difficulty?: string | null;
  goal?: string | null;
  days?: ProgrammeDayInput[];
}

export class ProgrammeInputError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OWNERSHIP_FIELDS = new Set([
  "id", "tenantId", "tenant_id", "status", "version", "revisionId", "revisionNumber",
  "createdByUserId", "updatedByUserId", "createdAt", "updatedAt",
  "currentDraftRevisionId", "currentPublishedRevisionId",
]);
const FIELDS = new Set(["slug", "name", "description", "difficulty", "goal", "days"]);

function text(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ProgrammeInputError("invalid_field", `${field} is required`);
  }
  const result = value.trim();
  if (result.length > max) {
    throw new ProgrammeInputError("invalid_field", `${field} must be ${max} characters or fewer`);
  }
  return result;
}

function optionalText(value: unknown, field: string, max: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new ProgrammeInputError("invalid_field", `${field} must be a string`);
  const result = value.trim();
  if (result.length > max) throw new ProgrammeInputError("invalid_field", `${field} must be ${max} characters or fewer`);
  return result || null;
}

function positiveInt(value: unknown, field: string, max: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > max) {
    throw new ProgrammeInputError("invalid_field", `${field} must be a positive integer`);
  }
  return value as number;
}
function nonNegativeInt(value: unknown, field: string, max: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > max) {
    throw new ProgrammeInputError("invalid_field", `${field} must be a non-negative integer`);
  }
  return value as number;
}

export function requireProgrammeId(value: unknown): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new ProgrammeInputError("invalid_programme_id", "Invalid programme id");
  }
  return value;
}

export function parseProgrammeWriteInput(body: unknown, mode: "create" | "patch"): ProgrammeWriteInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ProgrammeInputError("invalid_body", "Request body must be an object");
  }
  const input = body as Record<string, unknown>;
  const forbidden = Object.keys(input).filter((key) => OWNERSHIP_FIELDS.has(key));
  if (forbidden.length) {
    throw new ProgrammeInputError("ownership_fields_forbidden", "Ownership and lifecycle fields are controlled by the server", 400, { fields: forbidden });
  }
  const unknown = Object.keys(input).filter((key) => !FIELDS.has(key));
  if (unknown.length) {
    throw new ProgrammeInputError("unknown_fields", "Request contains unsupported programme fields", 400, { fields: unknown });
  }
  const result: ProgrammeWriteInput = {};
  if ("slug" in input) {
    if (mode === "patch") throw new ProgrammeInputError("slug_immutable", "A programme slug cannot be changed");
    result.slug = text(input.slug, "slug", 120).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!result.slug) throw new ProgrammeInputError("invalid_slug", "A programme slug is required");
  }
  if (mode === "create" || "name" in input) result.name = text(input.name, "name", 160);
  if (mode === "create" || "description" in input) result.description = optionalText(input.description, "description", 4000);
  if (mode === "create" || "difficulty" in input) result.difficulty = optionalText(input.difficulty, "difficulty", 40);
  if (mode === "create" || "goal" in input) result.goal = optionalText(input.goal, "goal", 160);
  if (mode === "create" || "days" in input) {
    if (!Array.isArray(input.days) || input.days.length > 100) {
      throw new ProgrammeInputError("invalid_days", "days must be an array of at most 100 items");
    }
    result.days = input.days.map((rawDay, dayIndex) => {
      if (!rawDay || typeof rawDay !== "object" || Array.isArray(rawDay)) {
        throw new ProgrammeInputError("invalid_day", `Day ${dayIndex + 1} must be an object`);
      }
      const day = rawDay as Record<string, unknown>;
      const dayKeys = Object.keys(day);
      const unsupported = dayKeys.filter((key) => !["name", "estimatedMinutes", "exercises"].includes(key));
      if (unsupported.length) throw new ProgrammeInputError("unknown_fields", "Unsupported day fields", 400, { fields: unsupported });
      if (!Array.isArray(day.exercises) || day.exercises.length > 500) {
        throw new ProgrammeInputError("invalid_exercises", `Day ${dayIndex + 1} exercises must be an array`);
      }
      const estimatedMinutes = day.estimatedMinutes === undefined || day.estimatedMinutes === null
        ? null : positiveInt(day.estimatedMinutes, "estimatedMinutes", 1440);
      return {
        name: text(day.name, "day name", 160),
        estimatedMinutes,
        exercises: day.exercises.map((rawExercise, exerciseIndex) => {
          if (!rawExercise || typeof rawExercise !== "object" || Array.isArray(rawExercise)) {
            throw new ProgrammeInputError("invalid_prescription", `Exercise ${exerciseIndex + 1} must be an object`);
          }
          const exercise = rawExercise as Record<string, unknown>;
          const unsupportedExercise = Object.keys(exercise).filter((key) =>
            !["exerciseId", "sets", "reps", "restSeconds", "notes", "sourceExerciseId"].includes(key));
          if (unsupportedExercise.length) throw new ProgrammeInputError("unknown_fields", "Unsupported prescription fields", 400, { fields: unsupportedExercise });
          if (typeof exercise.exerciseId !== "string" || !UUID_RE.test(exercise.exerciseId)) {
            throw new ProgrammeInputError("invalid_exercise_id", "A prescription requires a valid exercise id");
          }
          return {
            exerciseId: exercise.exerciseId,
            sets: positiveInt(exercise.sets, "sets", 1000),
            reps: text(exercise.reps, "reps", 80),
            restSeconds: exercise.restSeconds === undefined || exercise.restSeconds === null
              ? null : nonNegativeInt(exercise.restSeconds, "restSeconds", 3600),
            notes: optionalText(exercise.notes, "notes", 2000),
            sourceExerciseId: optionalText(exercise.sourceExerciseId, "sourceExerciseId", 160),
          };
        }),
      };
    });
  }
  return result;
}

export function revisionToWriteInput(
  revision: ProgrammeRevision,
  days: (ProgrammeDay & { exercises: ProgrammeExercisePrescription[] })[],
): ProgrammeWriteInput {
  return {
    name: revision.name,
    description: revision.description,
    difficulty: revision.difficulty,
    goal: revision.goal,
    days: days.map((day) => ({
      name: day.name,
      estimatedMinutes: day.estimatedMinutes,
      exercises: day.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        sets: exercise.sets,
        reps: exercise.reps,
        restSeconds: exercise.restSeconds,
        notes: exercise.notes,
        sourceExerciseId: exercise.sourceExerciseId,
      })),
    })),
  };
}

export function changedProgrammeFields(
  current: ProgrammeWriteInput,
  next: ProgrammeWriteInput,
): string[] {
  return (["name", "description", "difficulty", "goal", "days"] as const).filter((field) =>
    JSON.stringify(current[field] ?? null) !== JSON.stringify(next[field] ?? null));
}