import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildProgrammeImportBlockerReport,
  EXPECTED_PROGRAMME_SOURCE_SHA256,
  findProgrammeExerciseMappingBlockers,
  mapProgrammeExercises,
  parseProgrammeImportSource,
  programmeSourceSha256,
} from "../lib/programmeTemplateImport.js";

const source = `
export const PROGRAMS = [{
  id: "demo",
  name: "Demo",
  description: "A demo",
  difficulty: "Beginner",
  goal: "Strength",
  workouts: [{
    id: "day-one",
    name: "Day One",
    estimatedMinutes: 30,
    exercises: [{
      id: "squat",
      name: "Squat",
      sets: 3,
      reps: "8",
      restSeconds: 60,
      cues: ["Brace"],
    }]
  }]
}];
`;

describe("programme template importer planning", () => {
  it("parses deterministic ordered source records", () => {
    const first = parseProgrammeImportSource(source);
    const second = parseProgrammeImportSource(source);
    expect(first).toEqual(second);
    expect(first[0]).toMatchObject({
      sourceId: "demo",
      days: [{ sourceId: "day-one", exercises: [{ sourceExerciseId: "squat", sets: 3 }] }],
    });
    expect(programmeSourceSha256(source)).toBe(programmeSourceSha256(source));
  });

  it("maps only active catalogue exercises and fails closed", () => {
    expect(mapProgrammeExercises(parseProgrammeImportSource(source), [
      { id: "exercise-1", slug: "squat", status: "active" },
    ]).get("squat")).toBe("exercise-1");
    expect(() => mapProgrammeExercises(parseProgrammeImportSource(source), [
      { id: "exercise-1", slug: "squat", status: "draft" },
    ])).toThrow(/Missing active exercise mapping/);
  });

  it("reports draft-only mappings as blockers without a write plan", () => {
    const records = parseProgrammeImportSource(source.replace('id: "squat"', 'id: "push-up-variations"'));
    const blockers = findProgrammeExerciseMappingBlockers(records, [
      { id: "draft-push-up-variations", slug: "push-up-variations", status: "draft" },
    ]);
    expect(blockers).toEqual([{
      code: "missing_active_mapping",
      sourceExerciseId: "push-up-variations",
      normalizedSlug: "push-up-variations",
      candidateIds: ["draft-push-up-variations"],
    }]);

    const report = buildProgrammeImportBlockerReport({
      sourceSha256: "source-hash",
      importVersion: "programme-templates-v1",
      records,
      write: false,
      blockers,
    });
    expect(report).toMatchObject({
      applied: false,
      created: 0,
      skipped: 0,
      mappings: 0,
      missingActiveMappings: ["push-up-variations"],
      write: false,
    });
  });

  it("pins the hash of the bundled source file", () => {
    const bundledSource = readFileSync(new URL(
      "../../../marcus-grima/src/data/programs.ts",
      import.meta.url,
    ), "utf8");
    expect(programmeSourceSha256(bundledSource)).toBe(EXPECTED_PROGRAMME_SOURCE_SHA256);
  });

  it("rejects malformed or ambiguous source content", () => {
    expect(() => parseProgrammeImportSource("export const PROGRAMS = [];")).toThrow();
    expect(() => parseProgrammeImportSource(`
      export const PROGRAMS = [
        { id: "same", workouts: [{ exercises: [] }] },
        { id: "same", workouts: [{ exercises: [] }] }
      ];
    `)).toThrow(/Duplicate programme source id/);
  });
});