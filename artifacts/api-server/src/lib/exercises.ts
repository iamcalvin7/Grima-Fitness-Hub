import type {
  Exercise,
  ExerciseDifficulty,
  ExerciseLaterality,
  ExerciseMuscleRole,
  ExercisePerformanceType,
} from "@workspace/db";

export const EXERCISE_PERFORMANCE_TYPES = [
  "weight_reps",
  "bodyweight_reps",
  "added_weight_reps",
  "assisted_reps",
  "duration",
  "distance_time",
] as const satisfies readonly ExercisePerformanceType[];

export const EXERCISE_DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
] as const satisfies readonly ExerciseDifficulty[];

export const EXERCISE_LATERALITIES = [
  "bilateral",
  "unilateral",
] as const satisfies readonly ExerciseLaterality[];

export const EXERCISE_MUSCLE_ROLES = [
  "primary",
  "secondary",
] as const satisfies readonly ExerciseMuscleRole[];

/**
 * Canonical v1 vocabulary follows BodyMap's stable MuscleId values.
 * Ambiguous legacy terms such as BACK and SHOULDERS are deliberately excluded;
 * they require Marcus review rather than a silent mapping.
 */
export const EXERCISE_MUSCLE_KEYS = [
  "chest",
  "upper_chest",
  "front_delts",
  "side_delts",
  "biceps",
  "forearms",
  "abs",
  "obliques",
  "quads",
  "adductors",
  "traps",
  "rear_delts",
  "lats",
  "triceps",
  "lower_back",
  "glutes",
  "hamstrings",
  "calves",
] as const;

export type ExerciseMuscleKey = (typeof EXERCISE_MUSCLE_KEYS)[number];

export interface ExerciseMuscleInput {
  muscleKey: ExerciseMuscleKey;
  role: ExerciseMuscleRole;
}

export interface ExerciseEquipmentInput {
  equipmentKey: string;
  required: boolean;
}

export interface ExerciseWriteInput {
  name?: string;
  slug?: string;
  performanceType?: ExercisePerformanceType | null;
  movementPattern?: string | null;
  laterality?: ExerciseLaterality | null;
  description?: string | null;
  instructions?: string | null;
  difficulty?: ExerciseDifficulty | null;
  defaultRestSeconds?: number | null;
  safetyNotes?: string | null;
  internalNotes?: string | null;
  mediaUrl?: string | null;
  muscles?: ExerciseMuscleInput[];
  equipment?: ExerciseEquipmentInput[];
}

export interface ExerciseDetail extends Exercise {
  muscles: ExerciseMuscleInput[];
  equipment: ExerciseEquipmentInput[];
}

export class ExerciseInputError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

const OWNERSHIP_FIELDS = [
  "id",
  "tenantId",
  "tenant_id",
  "createdByUserId",
  "created_by_user_id",
  "updatedByUserId",
  "updated_by_user_id",
  "status",
  "version",
] as const;

const WRITE_FIELDS = [
  "name",
  "slug",
  "performanceType",
  "movementPattern",
  "laterality",
  "description",
  "instructions",
  "difficulty",
  "defaultRestSeconds",
  "safetyNotes",
  "internalNotes",
  "mediaUrl",
  "muscles",
  "equipment",
] as const;

function optionalText(
  value: unknown,
  field: string,
  maxLength: number,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new ExerciseInputError("invalid_field", `${field} must be a string`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new ExerciseInputError(
      "invalid_field",
      `${field} must be ${maxLength} characters or fewer`,
    );
  }
  return normalized || null;
}

export function normalizeExerciseSlug(value: unknown): string {
  if (typeof value !== "string") {
    throw new ExerciseInputError("invalid_slug", "Slug is required");
  }
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized || normalized.length > 120) {
    throw new ExerciseInputError(
      "invalid_slug",
      "Slug must contain letters or numbers and be 120 characters or fewer",
    );
  }
  return normalized;
}

export function normalizeEquipmentKey(value: unknown): string {
  if (typeof value !== "string") {
    throw new ExerciseInputError(
      "invalid_equipment",
      "Equipment key must be a string",
    );
  }
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!normalized || normalized.length > 80) {
    throw new ExerciseInputError(
      "invalid_equipment",
      "Equipment key must be non-empty and 80 characters or fewer",
    );
  }
  return normalized;
}

export function normalizeMuscleKey(value: unknown): ExerciseMuscleKey {
  if (typeof value !== "string") {
    throw new ExerciseInputError("invalid_muscle", "Muscle key must be a string");
  }
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!EXERCISE_MUSCLE_KEYS.includes(normalized as ExerciseMuscleKey)) {
    throw new ExerciseInputError(
      "invalid_muscle",
      `Unknown or ambiguous muscle key: ${value}`,
    );
  }
  return normalized as ExerciseMuscleKey;
}

function normalizeMuscles(value: unknown): ExerciseMuscleInput[] {
  if (!Array.isArray(value)) {
    throw new ExerciseInputError("invalid_muscles", "Muscles must be an array");
  }
  const seen = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== "object") {
      throw new ExerciseInputError(
        "invalid_muscles",
        "Each muscle mapping must be an object",
      );
    }
    const row = item as Record<string, unknown>;
    const muscleKey = normalizeMuscleKey(row.muscleKey);
    if (!EXERCISE_MUSCLE_ROLES.includes(row.role as ExerciseMuscleRole)) {
      throw new ExerciseInputError(
        "invalid_muscle_role",
        "Muscle role must be primary or secondary",
      );
    }
    if (seen.has(muscleKey)) {
      throw new ExerciseInputError(
        "duplicate_muscle",
        `Muscle ${muscleKey} may appear only once`,
      );
    }
    seen.add(muscleKey);
    return { muscleKey, role: row.role as ExerciseMuscleRole };
  });
}

function normalizeEquipment(value: unknown): ExerciseEquipmentInput[] {
  if (!Array.isArray(value)) {
    throw new ExerciseInputError("invalid_equipment", "Equipment must be an array");
  }
  const seen = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== "object") {
      throw new ExerciseInputError(
        "invalid_equipment",
        "Each equipment mapping must be an object",
      );
    }
    const row = item as Record<string, unknown>;
    const equipmentKey = normalizeEquipmentKey(row.equipmentKey);
    if (seen.has(equipmentKey)) {
      throw new ExerciseInputError(
        "duplicate_equipment",
        `Equipment ${equipmentKey} may appear only once`,
      );
    }
    seen.add(equipmentKey);
    if (row.required !== undefined && typeof row.required !== "boolean") {
      throw new ExerciseInputError(
        "invalid_equipment",
        "Equipment required must be a boolean",
      );
    }
    return { equipmentKey, required: row.required !== false };
  });
}

function validateMediaUrl(value: unknown): string | null | undefined {
  const normalized = optionalText(value, "mediaUrl", 2048);
  if (!normalized) return normalized;
  if (
    (!normalized.startsWith("/") || normalized.startsWith("//")) &&
    !normalized.startsWith("https://")
  ) {
    throw new ExerciseInputError(
      "invalid_media_url",
      "Media URL must be an app-relative path or HTTPS URL",
    );
  }
  return normalized;
}

export function parseExerciseWriteInput(
  body: unknown,
  mode: "create" | "patch",
): ExerciseWriteInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ExerciseInputError("invalid_body", "Request body must be an object");
  }
  const input = body as Record<string, unknown>;
  const forbidden = OWNERSHIP_FIELDS.filter((key) => key in input);
  if (forbidden.length > 0) {
    throw new ExerciseInputError(
      "ownership_fields_forbidden",
      "Ownership and lifecycle fields are controlled by the server",
      400,
      { fields: forbidden },
    );
  }
  const known = new Set<string>([...OWNERSHIP_FIELDS, ...WRITE_FIELDS]);
  const unknown = Object.keys(input).filter((key) => !known.has(key));
  if (unknown.length > 0) {
    throw new ExerciseInputError(
      "unknown_fields",
      "Request contains unsupported exercise fields",
      400,
      { fields: unknown },
    );
  }

  const result: ExerciseWriteInput = {};
  if (mode === "create" || "name" in input) {
    const name = optionalText(input.name, "name", 160);
    if (!name) {
      throw new ExerciseInputError("invalid_name", "Exercise name is required");
    }
    result.name = name;
  }
  if (mode === "create" || "slug" in input) {
    result.slug = normalizeExerciseSlug(input.slug ?? input.name);
  }

  if ("performanceType" in input) {
    if (
      input.performanceType !== null &&
      !EXERCISE_PERFORMANCE_TYPES.includes(
        input.performanceType as ExercisePerformanceType,
      )
    ) {
      throw new ExerciseInputError(
        "invalid_performance_type",
        "Invalid exercise performance type",
      );
    }
    result.performanceType =
      (input.performanceType as ExercisePerformanceType | null) ?? null;
  }
  if ("difficulty" in input) {
    if (
      input.difficulty !== null &&
      !EXERCISE_DIFFICULTIES.includes(input.difficulty as ExerciseDifficulty)
    ) {
      throw new ExerciseInputError("invalid_difficulty", "Invalid difficulty");
    }
    result.difficulty =
      (input.difficulty as ExerciseDifficulty | null) ?? null;
  }
  if ("laterality" in input) {
    if (
      input.laterality !== null &&
      !EXERCISE_LATERALITIES.includes(input.laterality as ExerciseLaterality)
    ) {
      throw new ExerciseInputError("invalid_laterality", "Invalid laterality");
    }
    result.laterality =
      (input.laterality as ExerciseLaterality | null) ?? null;
  }

  const textFields = [
    ["movementPattern", 120],
    ["description", 4000],
    ["instructions", 8000],
    ["safetyNotes", 4000],
    ["internalNotes", 4000],
  ] as const;
  for (const [field, max] of textFields) {
    if (field in input) {
      result[field] = optionalText(input[field], field, max);
    }
  }

  if ("defaultRestSeconds" in input) {
    const value = input.defaultRestSeconds;
    if (
      value !== null &&
      (!Number.isInteger(value) || (value as number) <= 0 || (value as number) > 3600)
    ) {
      throw new ExerciseInputError(
        "invalid_default_rest",
        "Default rest must be an integer from 1 to 3600 seconds",
      );
    }
    result.defaultRestSeconds = (value as number | null) ?? null;
  }
  if ("mediaUrl" in input) result.mediaUrl = validateMediaUrl(input.mediaUrl);
  if ("muscles" in input) result.muscles = normalizeMuscles(input.muscles);
  if ("equipment" in input) {
    result.equipment = normalizeEquipment(input.equipment);
  }

  if (mode === "patch" && Object.keys(result).length === 0) {
    throw new ExerciseInputError(
      "no_valid_fields",
      "No valid exercise fields were provided",
    );
  }
  return result;
}

export function validateExerciseActivation(exercise: ExerciseDetail): void {
  const missing: string[] = [];
  if (!exercise.name.trim()) missing.push("name");
  if (!exercise.slug.trim()) missing.push("slug");
  if (!exercise.performanceType) missing.push("performanceType");
  if (!exercise.movementPattern?.trim()) missing.push("movementPattern");
  if (!exercise.laterality) missing.push("laterality");
  if (!exercise.instructions?.trim()) missing.push("instructions");
  if (!exercise.difficulty) missing.push("difficulty");
  if (!exercise.muscles.some((muscle) => muscle.role === "primary")) {
    missing.push("primaryMuscle");
  }
  if (missing.length > 0) {
    throw new ExerciseInputError(
      "activation_requirements_missing",
      "Exercise is not ready for activation",
      422,
      { fields: missing },
    );
  }
}

export function toClientExercise(exercise: ExerciseDetail) {
  const {
    internalNotes: _internalNotes,
    createdByUserId: _createdByUserId,
    updatedByUserId: _updatedByUserId,
    tenantId: _tenantId,
    ...safe
  } = exercise;
  return safe;
}