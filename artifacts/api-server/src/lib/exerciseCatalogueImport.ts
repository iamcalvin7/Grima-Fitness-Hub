import { createHash } from "node:crypto";
import ts from "typescript";
import type {
  ExerciseDifficulty,
  ExerciseLaterality,
  ExercisePerformanceType,
} from "@workspace/db";
import {
  normalizeEquipmentKey,
  normalizeExerciseSlug,
  type ExerciseMuscleInput,
  type ExerciseWriteInput,
} from "./exercises.js";

export const EXERCISE_IMPORT_VERSION = "gate-2c-v1";
export const EXPECTED_LEGACY_SOURCE_SHA256 =
  "c87a5f71890eb3d72f702aa05ad3fa973cdcdb0b9cc6756e3254cf9f188f4a98";
export const EXPECTED_LEGACY_SOURCE_RECORDS_SHA256 =
  "c85ad4cf17961eeef11d3d4d586497f607a59244526defdd0734027b9501e724";
export const EXPECTED_LEGACY_EXERCISE_COUNT = 47;
export const EXPECTED_LEGACY_EXERCISE_IDS = [
  "pull-ups",
  "seated-rows",
  "lat-pull-downs",
  "narrow-grip-pull-down",
  "hyper-extension",
  "seated-hammer-curl",
  "concentration-curl",
  "twentyone-curl",
  "flat-bench-press",
  "incline-dumbbell-press",
  "cable-flies-mid",
  "weighted-push-ups",
  "tricep-rope-extensions",
  "skull-crushers",
  "weighted-dips",
  "seated-shoulder-press",
  "lateral-raises",
  "forward-raises",
  "face-pulls",
  "rear-delt-fly",
  "shrugs",
  "burpees",
  "push-up-variations",
  "jump-squats",
  "mountain-climbers",
  "plank-hold",
  "pike-push-ups",
  "tricep-chair-dips",
  "wide-push-ups",
  "leg-raises",
  "bulgarian-split-squats",
  "glute-bridge-hold",
  "reverse-lunges",
  "wall-sit",
  "inchworms",
  "spiderman-push-ups",
  "squat-pulses",
  "cable-chest-fly-low",
  "db-lateral-raise-pump",
  "incline-curl",
  "rope-pushdown-pump",
  "face-pull-pump",
  "hammer-curl-beach",
  "leg-press-pump",
  "hip-thrust-pump",
  "leg-curl-pump",
  "calf-raise-pump",
] as const;

export function assertExerciseImportEnvironment(
  environment: Partial<
    Record<
      "NODE_ENV" | "REPLIT_DEPLOYMENT" | "REPLIT_DEPLOYMENT_ID" | "REPLIT_ENV",
      string | undefined
    >
  >,
): void {
  if (
    environment.NODE_ENV !== "development" ||
    environment.REPLIT_DEPLOYMENT ||
    environment.REPLIT_DEPLOYMENT_ID ||
    environment.REPLIT_ENV
  ) {
    throw new Error(
      "Exercise catalogue import is restricted to an explicit development process outside a Replit deployment",
    );
  }
}

export interface LegacyExerciseSource {
  sourceId: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  primaryMuscle: string;
  musclesWorked: string[];
  equipment: string;
  cues: string[];
}

export function assertApprovedLegacyExerciseSource(
  sources: LegacyExerciseSource[],
  sourceSha256: string,
): void {
  const normalizedSourceSha256 = createHash("sha256")
    .update(JSON.stringify(sources))
    .digest("hex");
  if (
    sourceSha256 !== EXPECTED_LEGACY_SOURCE_SHA256 ||
    normalizedSourceSha256 !== EXPECTED_LEGACY_SOURCE_RECORDS_SHA256
  ) {
    throw new Error(
      "Legacy exercise source differs from the approved Gate 2C inventory",
    );
  }
}

export interface ExerciseImportManifestEntry {
  source: LegacyExerciseSource;
  payload: Required<Pick<ExerciseWriteInput, "name" | "slug">> &
    Omit<ExerciseWriteInput, "name" | "slug">;
  disposition: "draft";
  reviewReasons: string[];
}

export interface ExistingImportExercise {
  slug: string;
  name: string;
  performanceType: ExercisePerformanceType | null;
  movementPattern: string | null;
  laterality: ExerciseLaterality | null;
  description: string | null;
  instructions: string | null;
  difficulty: ExerciseDifficulty | null;
  defaultRestSeconds: number | null;
  safetyNotes: string | null;
  internalNotes: string | null;
  mediaUrl: string | null;
  muscles: ExerciseMuscleInput[];
  equipment: { equipmentKey: string; required: boolean }[];
}

export interface PlannedExerciseImport {
  entry: ExerciseImportManifestEntry;
  outcome: "create" | "skip" | "conflict";
  differences: string[];
}

const DIRECT_MUSCLES = {
  CHEST: "chest",
  "UPPER CHEST": "upper_chest",
  "FRONT DELTS": "front_delts",
  "LATERAL DELTS": "side_delts",
  BICEPS: "biceps",
  FOREARMS: "forearms",
  ABS: "abs",
  OBLIQUES: "obliques",
  QUADS: "quads",
  ADDUCTORS: "adductors",
  TRAPS: "traps",
  "REAR DELTS": "rear_delts",
  LATS: "lats",
  TRICEPS: "triceps",
  "LOWER BACK": "lower_back",
  GLUTES: "glutes",
  HAMSTRINGS: "hamstrings",
  CALVES: "calves",
} as const;

const AMBIGUOUS_MUSCLES = new Set([
  "BACK",
  "SHOULDERS",
  "FULL BODY",
  "CORE",
  "UPPER BACK",
]);

/**
 * These paths are copied from the existing EXERCISE_IMAGES/EXERCISE_VIDEOS
 * source map in Workouts.tsx and verified against public/exercises by the CLI.
 */
const MEDIA_BY_SOURCE_ID: Record<string, string> = {
  "pull-ups": "/exercises/pull-ups.mp4",
  "seated-rows": "/exercises/seated-rows.jpg",
  "lat-pull-downs": "/exercises/lat-pull-downs.jpg",
  "narrow-grip-pull-down": "/exercises/narrow-grip-pull-down.jpg",
  "hyper-extension": "/exercises/hyper-extension.jpg",
  "seated-hammer-curl": "/exercises/seated-hammer-curl.webp",
  "concentration-curl": "/exercises/concentration-curl.jpg",
  "twentyone-curl": "/exercises/twentyone-curl.webp",
  "flat-bench-press": "/exercises/flat-bench-press.jpg",
  "incline-dumbbell-press": "/exercises/incline-dumbbell-press.jpg",
  "cable-flies-mid": "/exercises/cable-flies-mid.jpg",
  "weighted-push-ups": "/exercises/weighted-push-ups.jpg",
  "tricep-rope-extensions": "/exercises/tricep-rope-extensions.jpg",
  "skull-crushers": "/exercises/skull-crushers.png",
  "weighted-dips": "/exercises/weighted-dips.jpg",
  "seated-shoulder-press": "/exercises/seated-shoulder-press.jpg",
  "lateral-raises": "/exercises/lateral-raises.jpg",
  "forward-raises": "/exercises/forward-raises.jpg",
  "face-pulls": "/exercises/face-pulls.jpg",
  "rear-delt-fly": "/exercises/rear-delt-fly.jpg",
  shrugs: "/exercises/shrugs.png",
};

function propertyName(node: ts.PropertyName): string | undefined {
  if (
    ts.isIdentifier(node) ||
    ts.isStringLiteral(node) ||
    ts.isNumericLiteral(node)
  ) {
    return node.text;
  }
  return undefined;
}

function property(
  object: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | undefined {
  const match = object.properties.find(
    (item): item is ts.PropertyAssignment =>
      ts.isPropertyAssignment(item) && propertyName(item.name) === name,
  );
  return match?.initializer;
}

function stringValue(node: ts.Expression | undefined): string | undefined {
  if (
    node &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
  ) {
    return node.text;
  }
  return undefined;
}

function numberValue(node: ts.Expression | undefined): number | undefined {
  if (node && ts.isNumericLiteral(node)) return Number(node.text);
  return undefined;
}

function stringArray(node: ts.Expression | undefined): string[] | undefined {
  if (!node || !ts.isArrayLiteralExpression(node)) return undefined;
  const values = node.elements.map((item) => stringValue(item));
  return values.every((item): item is string => item !== undefined)
    ? values
    : undefined;
}

export function extractLegacyExercises(sourceText: string): LegacyExerciseSource[] {
  const sourceFile = ts.createSourceFile(
    "programs.ts",
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const exercises: LegacyExerciseSource[] = [];

  function parseExercise(node: ts.ObjectLiteralExpression): LegacyExerciseSource {
    const sourceId = stringValue(property(node, "id"));
    const name = stringValue(property(node, "name"));
    const sets = numberValue(property(node, "sets"));
    const reps = stringValue(property(node, "reps"));
    const restSeconds = numberValue(property(node, "restSeconds"));
    const primaryMuscle = stringValue(property(node, "primaryMuscle"));
    const musclesWorked = stringArray(property(node, "musclesWorked"));
    const equipment = stringValue(property(node, "equipment"));
    const cues = stringArray(property(node, "cues"));
    if (
      !sourceId ||
      !name ||
      sets === undefined ||
      !reps ||
      restSeconds === undefined ||
      !primaryMuscle ||
      !musclesWorked ||
      equipment === undefined ||
      !cues
    ) {
      throw new Error("Every exercises[] entry must use the complete literal legacy shape");
    }
    return {
      sourceId,
      name,
      sets,
      reps,
      restSeconds,
      primaryMuscle,
      musclesWorked,
      equipment,
      cues,
    };
  }

  function visit(node: ts.Node): void {
    if (
      ts.isPropertyAssignment(node) &&
      propertyName(node.name) === "exercises"
    ) {
      if (!ts.isArrayLiteralExpression(node.initializer)) {
        throw new Error("Legacy exercises must be declared as array literals");
      }
      for (const element of node.initializer.elements) {
        if (!ts.isObjectLiteralExpression(element)) {
          throw new Error("Every exercises[] entry must be an object literal");
        }
        exercises.push(parseExercise(element));
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return exercises;
}

function canonicalMuscle(value: string): ExerciseMuscleInput["muscleKey"] | null {
  return (
    DIRECT_MUSCLES[value.trim().toUpperCase() as keyof typeof DIRECT_MUSCLES] ??
    null
  );
}

function primaryMuscle(
  source: LegacyExerciseSource,
): ExerciseMuscleInput["muscleKey"] | null {
  return canonicalMuscle(source.primaryMuscle);
}

function reviewReasons(
  source: LegacyExerciseSource,
  primary: ExerciseMuscleInput["muscleKey"] | null,
): string[] {
  const reasons = [
    "exercise-level difficulty is not present in the legacy source",
    "movement pattern is not present in the legacy source",
    "programme sets, reps, and rest were retained only as source context",
    "performance type is not explicitly present in the legacy source",
    "laterality is not explicitly present in the legacy source",
  ];
  if (!primary) {
    reasons.push(`primary muscle '${source.primaryMuscle}' is ambiguous`);
  }
  const ambiguousSecondaries = source.musclesWorked.filter((value) =>
    AMBIGUOUS_MUSCLES.has(value.trim().toUpperCase()),
  );
  if (ambiguousSecondaries.length > 0) {
    reasons.push(
      `ambiguous muscle terms omitted: ${[...new Set(ambiguousSecondaries)].join(", ")}`,
    );
  }
  if (/\bor\b|[/+&]/i.test(source.equipment)) {
    reasons.push("compound or alternative equipment requires coach review");
  }
  return reasons;
}

export function buildExerciseImportManifest(
  sources: LegacyExerciseSource[],
): ExerciseImportManifestEntry[] {
  if (sources.length !== EXPECTED_LEGACY_EXERCISE_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_LEGACY_EXERCISE_COUNT} legacy exercises, found ${sources.length}`,
    );
  }
  const ids = new Set<string>();
  for (const source of sources) {
    if (ids.has(source.sourceId)) {
      throw new Error(`Duplicate legacy exercise id: ${source.sourceId}`);
    }
    ids.add(source.sourceId);
  }
  const actualIds = [...ids].sort();
  const expectedIds = [...EXPECTED_LEGACY_EXERCISE_IDS].sort();
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    throw new Error("Legacy exercise ids differ from the reviewed Gate 2C inventory");
  }

  return sources.map((source) => {
    const primary = primaryMuscle(source);
    const muscles: ExerciseMuscleInput[] = [];
    if (primary) muscles.push({ muscleKey: primary, role: "primary" });
    for (const value of source.musclesWorked) {
      const mapped = canonicalMuscle(value);
      if (mapped && mapped !== primary && !muscles.some((item) => item.muscleKey === mapped)) {
        muscles.push({ muscleKey: mapped, role: "secondary" });
      }
    }
    const reasons = reviewReasons(source, primary);
    const hasCompoundEquipment = /\bor\b|[/+&]/i.test(source.equipment);
    const equipment =
      source.equipment === "None" || hasCompoundEquipment
        ? []
        : [{ equipmentKey: normalizeEquipmentKey(source.equipment), required: true }];
    const payload = {
      name: source.name,
      slug: normalizeExerciseSlug(source.sourceId),
      performanceType: null,
      movementPattern: null,
      laterality: null,
      description: null,
      instructions: source.cues.join("\n"),
      difficulty: null,
      defaultRestSeconds: null,
      safetyNotes: null,
      internalNotes: [
        `Imported from bundled programmes (${EXERCISE_IMPORT_VERSION}).`,
        `Legacy prescription: ${source.sets} sets, ${source.reps}, ${source.restSeconds}s rest.`,
        `Review required: ${reasons.join("; ")}.`,
      ].join("\n"),
      mediaUrl: MEDIA_BY_SOURCE_ID[source.sourceId] ?? null,
      muscles,
      equipment,
    } satisfies ExerciseImportManifestEntry["payload"];
    return { source, payload, disposition: "draft", reviewReasons: reasons };
  });
}

function sorted<T>(items: T[], key: (item: T) => string): T[] {
  return [...items].sort((left, right) => key(left).localeCompare(key(right)));
}

function stable(value: unknown): string {
  return JSON.stringify(value);
}

export function compareImportEntry(
  entry: ExerciseImportManifestEntry,
  existing: ExistingImportExercise,
): string[] {
  const differences: string[] = [];
  const scalarFields = [
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
  ] as const;
  for (const field of scalarFields) {
    if (existing[field] !== entry.payload[field]) differences.push(field);
  }
  const expectedMuscles = sorted(entry.payload.muscles ?? [], (item) => item.muscleKey);
  const existingMuscles = sorted(existing.muscles, (item) => item.muscleKey);
  if (stable(existingMuscles) !== stable(expectedMuscles)) differences.push("muscles");
  const expectedEquipment = sorted(
    entry.payload.equipment ?? [],
    (item) => item.equipmentKey,
  );
  const existingEquipment = sorted(existing.equipment, (item) => item.equipmentKey);
  if (stable(existingEquipment) !== stable(expectedEquipment)) {
    differences.push("equipment");
  }
  return differences;
}

export function planExerciseImport(
  manifest: ExerciseImportManifestEntry[],
  existing: ExistingImportExercise[],
): PlannedExerciseImport[] {
  const bySlug = new Map(existing.map((exercise) => [exercise.slug, exercise]));
  return manifest.map((entry) => {
    const current = bySlug.get(entry.payload.slug);
    if (!current) return { entry, outcome: "create", differences: [] };
    const differences = compareImportEntry(entry, current);
    return {
      entry,
      outcome: differences.length === 0 ? "skip" : "conflict",
      differences,
    };
  });
}

export function summarizeExerciseImport(plan: PlannedExerciseImport[]) {
  const names = new Map<string, number>();
  for (const item of plan) {
    const key = item.entry.payload.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    names.set(key, (names.get(key) ?? 0) + 1);
  }
  return {
    sourceRecords: plan.length,
    uniqueSlugs: new Set(plan.map((item) => item.entry.payload.slug)).size,
    duplicateNames: [...names.entries()]
      .filter(([, count]) => count > 1)
      .map(([name, count]) => ({ name, count })),
    create: plan.filter((item) => item.outcome === "create").length,
    skip: plan.filter((item) => item.outcome === "skip").length,
    conflict: plan.filter((item) => item.outcome === "conflict").length,
    draft: plan.length,
    active: 0,
    withMedia: plan.filter((item) => item.entry.payload.mediaUrl).length,
    withoutPrimaryMuscle: plan.filter(
      (item) => !item.entry.payload.muscles?.some((muscle) => muscle.role === "primary"),
    ).length,
  };
}