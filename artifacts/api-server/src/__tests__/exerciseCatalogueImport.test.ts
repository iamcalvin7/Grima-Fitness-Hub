import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildExerciseImportManifest,
  compareImportEntry,
  EXPECTED_LEGACY_EXERCISE_IDS,
  EXPECTED_LEGACY_EXERCISE_COUNT,
  extractLegacyExercises,
  planExerciseImport,
  summarizeExerciseImport,
  type ExistingImportExercise,
} from "../lib/exerciseCatalogueImport.js";

const source = readFileSync(
  path.resolve(process.cwd(), "../marcus-grima/src/data/programs.ts"),
  "utf8",
);
const manifest = buildExerciseImportManifest(extractLegacyExercises(source));

function existingFrom(index: number): ExistingImportExercise {
  const payload = manifest[index].payload;
  return {
    name: payload.name,
    slug: payload.slug,
    performanceType: payload.performanceType ?? null,
    movementPattern: payload.movementPattern ?? null,
    laterality: payload.laterality ?? null,
    description: payload.description ?? null,
    instructions: payload.instructions ?? null,
    difficulty: payload.difficulty ?? null,
    defaultRestSeconds: payload.defaultRestSeconds ?? null,
    safetyNotes: payload.safetyNotes ?? null,
    internalNotes: payload.internalNotes ?? null,
    mediaUrl: payload.mediaUrl ?? null,
    muscles: payload.muscles ?? [],
    equipment: payload.equipment ?? [],
  };
}

describe("exercise catalogue import manifest", () => {
  it("extracts every credible source exercise with stable unique ids", () => {
    const extracted = extractLegacyExercises(source);
    expect(extracted).toHaveLength(EXPECTED_LEGACY_EXERCISE_COUNT);
    expect(new Set(extracted.map((item) => item.sourceId))).toHaveProperty(
      "size",
      EXPECTED_LEGACY_EXERCISE_COUNT,
    );
    expect(extracted.map((item) => item.sourceId).sort()).toEqual(
      [...EXPECTED_LEGACY_EXERCISE_IDS].sort(),
    );
  });

  it("keeps all records as drafts and preserves programme prescription as context only", () => {
    expect(manifest).toHaveLength(47);
    expect(manifest.every((item) => item.disposition === "draft")).toBe(true);
    expect(manifest.every((item) => item.payload.difficulty === null)).toBe(true);
    expect(manifest.every((item) => item.payload.movementPattern === null)).toBe(true);
    expect(manifest.every((item) => item.payload.defaultRestSeconds === null)).toBe(
      true,
    );
    expect(manifest.every((item) => item.payload.performanceType === null)).toBe(true);
    expect(manifest.every((item) => item.payload.laterality === null)).toBe(true);
    expect(manifest.every((item) => !("sets" in item.payload))).toBe(true);
    expect(manifest.every((item) => !("reps" in item.payload))).toBe(true);
  });

  it("preserves both Face Pulls sources under distinct stable slugs", () => {
    const facePulls = manifest.filter((item) => item.payload.name === "Face Pulls");
    expect(facePulls.map((item) => item.payload.slug).sort()).toEqual([
      "face-pull-pump",
      "face-pulls",
    ]);
  });

  it("omits unresolved ambiguous primary muscles instead of guessing", () => {
    const seatedRows = manifest.find((item) => item.source.sourceId === "seated-rows")!;
    const burpees = manifest.find((item) => item.source.sourceId === "burpees")!;
    expect(seatedRows.payload.muscles).not.toContainEqual(
      expect.objectContaining({ role: "primary" }),
    );
    expect(burpees.payload.muscles).not.toContainEqual(
      expect.objectContaining({ role: "primary" }),
    );
    expect(seatedRows.reviewReasons.join(" ")).toContain("ambiguous");
  });

  it("reuses only known source media and preserves equipment alternatives as one key", () => {
    expect(manifest.filter((item) => item.payload.mediaUrl)).toHaveLength(21);
    const calfRaise = manifest.find(
      (item) => item.source.sourceId === "calf-raise-pump",
    )!;
    expect(calfRaise.payload.equipment).toEqual([]);
    expect(calfRaise.reviewReasons.join(" ")).toContain("alternative equipment");
  });

  it("plans creates, exact skips, and non-destructive conflicts", () => {
    const emptyPlan = planExerciseImport(manifest, []);
    expect(summarizeExerciseImport(emptyPlan)).toMatchObject({
      sourceRecords: 47,
      uniqueSlugs: 47,
      duplicateNames: [{ name: "face pulls", count: 2 }],
      create: 47,
      skip: 0,
      conflict: 0,
      draft: 47,
      active: 0,
      withMedia: 21,
    });

    const exact = existingFrom(0);
    expect(compareImportEntry(manifest[0], exact)).toEqual([]);
    const changed = { ...existingFrom(1), instructions: "Locally edited" };
    const changedRole = {
      ...existingFrom(2),
      muscles: existingFrom(2).muscles.map((muscle) => ({
        ...muscle,
        role: muscle.role === "primary" ? ("secondary" as const) : muscle.role,
      })),
    };
    const plan = planExerciseImport(manifest, [exact, changed, changedRole]);
    expect(plan[0].outcome).toBe("skip");
    expect(plan[1]).toMatchObject({
      outcome: "conflict",
      differences: ["instructions"],
    });
    expect(plan[2]).toMatchObject({
      outcome: "conflict",
      differences: ["muscles"],
    });
  });
});