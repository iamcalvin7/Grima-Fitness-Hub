import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/BodyMap", () => ({
  BodyMap: ({ onMuscleToggle }: { onMuscleToggle?: (id: string) => void }) => (
    <button type="button" onClick={() => onMuscleToggle?.("chest")}>Mock BodyMap</button>
  ),
}));

import { ExerciseLibrary, type ExerciseRecord } from "@/pages/ExerciseLibrary";

const draftExercise: ExerciseRecord = {
  id: "9e8b2f6f-1029-4f20-a59b-d10cfdb2df79",
  name: "Goblet squat",
  slug: "goblet-squat",
  status: "draft",
  version: 1,
  performanceType: "weight_reps",
  movementPattern: "Squat",
  laterality: "bilateral",
  description: "A controlled squat using a dumbbell.",
  instructions: "Brace, descend, and stand.",
  difficulty: "beginner",
  defaultRestSeconds: 90,
  safetyNotes: null,
  internalNotes: null,
  mediaUrl: null,
  createdAt: "2026-08-25T10:00:00.000Z",
  updatedAt: "2026-08-25T10:00:00.000Z",
  muscles: [{ muscleKey: "quads", role: "primary" }],
  equipment: [{ equipmentKey: "dumbbell", required: true }],
};

function response(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response;
}

describe("ExerciseLibrary page", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.method === "POST" && url.endsWith("/admin/exercises")) {
        return response({
          exercise: { ...draftExercise, id: "8e8b2f6f-1029-4f20-a59b-d10cfdb2df79", name: "Split squat", slug: "split-squat" },
        }, 201);
      }
      if (init?.method === "PATCH") {
        return response({ error: "Exercise changed during this request; reload and try again" }, 409);
      }
      if (url.includes(`/admin/exercises/${draftExercise.id}`)) {
        return response({ exercise: draftExercise });
      }
      return response({ exercises: [draftExercise], pagination: { page: 1, limit: 25, total: 1 } });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("lists server data and creates a draft without posting lifecycle fields", async () => {
    render(<ExerciseLibrary />);
    expect(await screen.findByText("Goblet squat")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /new exercise/i }));
    fireEvent.change(screen.getByLabelText("Exercise name"), { target: { value: "Split squat" } });
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const createCall = fetchMock.mock.calls.find(([, options]) => options?.method === "POST");
    expect(createCall).toBeDefined();
    const body = JSON.parse(String(createCall?.[1]?.body));
    expect(body).toMatchObject({ name: "Split squat", slug: "split-squat", muscles: [], equipment: [] });
    expect(body).not.toHaveProperty("status");
    expect(body).not.toHaveProperty("version");
  });

  it("keeps edited input visible when the server reports a version conflict", async () => {
    render(<ExerciseLibrary />);
    await screen.findByText("Goblet squat");
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Exercise name"), { target: { value: "Updated goblet squat" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText("This exercise changed elsewhere")).toBeInTheDocument();
    expect(screen.getByLabelText("Exercise name")).toHaveValue("Updated goblet squat");
    expect(screen.getByRole("button", { name: /reload/i })).toBeInTheDocument();
  });
});