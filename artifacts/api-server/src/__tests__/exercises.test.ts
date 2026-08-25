import { describe, expect, it } from "vitest";
import {
  ExerciseInputError,
  normalizeEquipmentKey,
  normalizeExerciseSlug,
  normalizeMuscleKey,
  parseExerciseWriteInput,
  toClientExercise,
  validateExerciseActivation,
} from "../lib/exercises.js";

describe("exercise catalogue validation", () => {
  it("normalizes stable slugs and equipment keys", () => {
    expect(normalizeExerciseSlug("  Bulgarian Split Squat  ")).toBe(
      "bulgarian-split-squat",
    );
    expect(normalizeEquipmentKey("Dumbbell / Bench")).toBe("dumbbell_bench");
  });

  it("accepts canonical muscles and rejects ambiguous legacy terms", () => {
    expect(normalizeMuscleKey("LOWER BACK")).toBe("lower_back");
    expect(() => normalizeMuscleKey("BACK")).toThrow(ExerciseInputError);
    expect(() => normalizeMuscleKey("SHOULDERS")).toThrow(ExerciseInputError);
  });

  it("rejects duplicate mappings after normalization", () => {
    expect(() =>
      parseExerciseWriteInput(
        {
          name: "Row",
          slug: "row",
          equipment: [
            { equipmentKey: "Cable", required: true },
            { equipmentKey: " cable ", required: false },
          ],
        },
        "create",
      ),
    ).toThrow(/only once/);
  });

  it("rejects request-supplied ownership and lifecycle fields", () => {
    expect(() =>
      parseExerciseWriteInput(
        { name: "Row", slug: "row", tenantId: "other", status: "active" },
        "create",
      ),
    ).toThrow(/controlled by the server/);
  });

  it("rejects unknown fields and protocol-relative media URLs", () => {
    expect(() =>
      parseExerciseWriteInput(
        { name: "Row", slug: "row", accidentalField: true },
        "create",
      ),
    ).toThrow(/unsupported exercise fields/);
    expect(() =>
      parseExerciseWriteInput(
        { name: "Row", slug: "row", mediaUrl: "//untrusted.example/row.jpg" },
        "create",
      ),
    ).toThrow(/app-relative path or HTTPS URL/);
  });

  it("allows incomplete drafts but blocks incomplete activation", () => {
    const draft = {
      id: "00000000-0000-4000-8000-000000000001",
      tenantId: "00000000-0000-4000-8000-000000000002",
      name: "Draft",
      slug: "draft",
      status: "draft" as const,
      version: 1,
      performanceType: null,
      movementPattern: null,
      laterality: null,
      description: null,
      instructions: null,
      difficulty: null,
      defaultRestSeconds: null,
      safetyNotes: null,
      internalNotes: "private",
      mediaUrl: null,
      createdByUserId: "00000000-0000-4000-8000-000000000003",
      updatedByUserId: "00000000-0000-4000-8000-000000000003",
      createdAt: new Date(),
      updatedAt: new Date(),
      muscles: [],
      equipment: [],
    };
    expect(() => validateExerciseActivation(draft)).toThrow(
      /not ready for activation/,
    );
  });

  it("removes internal notes, tenant and actor fields from client projections", () => {
    const exercise = {
      id: "00000000-0000-4000-8000-000000000001",
      tenantId: "00000000-0000-4000-8000-000000000002",
      name: "Squat",
      slug: "squat",
      status: "active" as const,
      version: 1,
      performanceType: "weight_reps" as const,
      movementPattern: "squat",
      laterality: "bilateral" as const,
      description: null,
      instructions: "Brace",
      difficulty: "beginner" as const,
      defaultRestSeconds: 120,
      safetyNotes: null,
      internalNotes: "private",
      mediaUrl: null,
      createdByUserId: "00000000-0000-4000-8000-000000000003",
      updatedByUserId: "00000000-0000-4000-8000-000000000003",
      createdAt: new Date(),
      updatedAt: new Date(),
      muscles: [{ muscleKey: "quads" as const, role: "primary" as const }],
      equipment: [],
    };
    expect(toClientExercise(exercise)).not.toHaveProperty("internalNotes");
    expect(toClientExercise(exercise)).not.toHaveProperty("tenantId");
    expect(toClientExercise(exercise)).not.toHaveProperty("createdByUserId");
  });
});