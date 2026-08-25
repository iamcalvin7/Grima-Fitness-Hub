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

const activeExercise: ExerciseRecord = {
  ...draftExercise,
  status: "active",
  version: 2,
};

const archivedExercise: ExerciseRecord = {
  ...draftExercise,
  status: "archived",
  version: 3,
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

  it("activates a complete draft through an explicit lifecycle action", async () => {
    const activated = { ...activeExercise, version: 2 };
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.method === "POST" && url.endsWith(`/admin/exercises/${draftExercise.id}/activate`)) {
        return response({ exercise: activated });
      }
      if (url.endsWith(`/admin/exercises/${draftExercise.id}`)) return response({ exercise: draftExercise });
      return response({ exercises: [draftExercise], pagination: { page: 1, limit: 25, total: 1 } });
    });
    vi.stubGlobal("confirm", vi.fn(() => true));

    render(<ExerciseLibrary />);
    await screen.findByText("Goblet squat");
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    await screen.findByRole("button", { name: /activate/i });
    fireEvent.click(screen.getByRole("button", { name: /activate/i }));

    expect(await screen.findByText("Exercise activated. It is now client-visible.")).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some(([input, options]) => String(input).endsWith(`/admin/exercises/${draftExercise.id}/activate`) && options?.method === "POST")).toBe(true);
  });

  it("shows activation validation failures without closing the editor", async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.method === "POST" && url.endsWith(`/admin/exercises/${draftExercise.id}/activate`)) {
        return response({ error: "Exercise is missing required activation fields", details: { fields: ["instructions", "primaryMuscle"] } }, 422);
      }
      if (url.endsWith(`/admin/exercises/${draftExercise.id}`)) return response({ exercise: draftExercise });
      return response({ exercises: [draftExercise], pagination: { page: 1, limit: 25, total: 1 } });
    });
    vi.stubGlobal("confirm", vi.fn(() => true));

    render(<ExerciseLibrary />);
    await screen.findByText("Goblet squat");
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    await screen.findByRole("button", { name: /activate/i });
    fireEvent.click(screen.getByRole("button", { name: /activate/i }));

    expect(await screen.findByText("Exercise is missing required activation fields")).toBeInTheDocument();
    expect(screen.getByText(/Complete: Instructions, Primary muscle/)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("requires an archive reason before sending the archive action", async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.method === "POST") return response({ exercise: { ...archivedExercise } });
      if (url.endsWith(`/admin/exercises/${activeExercise.id}`)) return response({ exercise: activeExercise });
      return response({ exercises: [activeExercise], pagination: { page: 1, limit: 25, total: 1 } });
    });
    vi.stubGlobal("confirm", vi.fn(() => true));

    render(<ExerciseLibrary />);
    await screen.findByText("Goblet squat");
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    await screen.findByRole("button", { name: /archive/i });
    fireEvent.click(screen.getByRole("button", { name: /archive/i }));

    expect(await screen.findByText("Archive reason is required")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
  });

  it("archives with the confirmed reason and updates the lifecycle badge", async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.method === "POST" && url.endsWith(`/admin/exercises/${activeExercise.id}/archive`)) {
        return response({ exercise: archivedExercise });
      }
      if (url.endsWith(`/admin/exercises/${activeExercise.id}`)) return response({ exercise: activeExercise });
      return response({ exercises: [activeExercise], pagination: { page: 1, limit: 25, total: 1 } });
    });
    vi.stubGlobal("confirm", vi.fn(() => true));

    render(<ExerciseLibrary />);
    await screen.findByText("Goblet squat");
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    await screen.findByRole("button", { name: /archive/i });
    fireEvent.change(screen.getByLabelText("Archive reason"), { target: { value: "Superseded by a reviewed variation" } });
    fireEvent.click(screen.getByRole("button", { name: /archive/i }));

    expect(await screen.findByText("Exercise archived. It is no longer client-visible.")).toBeInTheDocument();
    const archiveCall = fetchMock.mock.calls.find(([input, options]) => String(input).endsWith(`/admin/exercises/${activeExercise.id}/archive`) && options?.method === "POST");
    expect(JSON.parse(String(archiveCall?.[1]?.body))).toEqual({ reason: "Superseded by a reviewed variation" });
    expect(screen.getAllByText("Archived").length).toBeGreaterThan(0);
  });

  it("restores an archived record to draft after confirmation", async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.method === "POST" && url.endsWith(`/admin/exercises/${archivedExercise.id}/restore`)) {
        return response({ exercise: draftExercise });
      }
      if (url.endsWith(`/admin/exercises/${archivedExercise.id}`)) return response({ exercise: archivedExercise });
      return response({ exercises: [archivedExercise], pagination: { page: 1, limit: 25, total: 1 } });
    });
    vi.stubGlobal("confirm", vi.fn(() => true));

    render(<ExerciseLibrary />);
    await screen.findByText("Goblet squat");
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    await screen.findByRole("button", { name: /restore to draft/i });
    fireEvent.click(screen.getByRole("button", { name: /restore to draft/i }));

    expect(await screen.findByText("Exercise restored to draft for review.")).toBeInTheDocument();
    expect(screen.getAllByText("Draft").length).toBeGreaterThan(0);
  });

  it("shows a stale-version conflict when a lifecycle action races another writer", async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.method === "POST" && url.endsWith(`/admin/exercises/${draftExercise.id}/activate`)) {
        return response({ error: "Exercise changed during this request; reload and try again" }, 409);
      }
      if (url.endsWith(`/admin/exercises/${draftExercise.id}`)) return response({ exercise: draftExercise });
      return response({ exercises: [draftExercise], pagination: { page: 1, limit: 25, total: 1 } });
    });
    vi.stubGlobal("confirm", vi.fn(() => true));

    render(<ExerciseLibrary />);
    await screen.findByText("Goblet squat");
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    await screen.findByRole("button", { name: /activate/i });
    fireEvent.click(screen.getByRole("button", { name: /activate/i }));

    expect(await screen.findByText("This exercise changed elsewhere")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reload/i })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});