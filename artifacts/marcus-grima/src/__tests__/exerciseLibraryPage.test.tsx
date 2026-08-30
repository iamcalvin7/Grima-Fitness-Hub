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

const linkedMediaExercise: ExerciseRecord = {
  ...draftExercise,
  mediaUrl: "https://cdn.example.com/goblet-squat.mp4",
};

function response(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response;
}

function listResponse(exercises: ExerciseRecord[] = [draftExercise], total = exercises.length, page = 1) {
  return response({ exercises, pagination: { page, limit: 25, total } });
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

  it("reports linked and missing media references without claiming they loaded", async () => {
    fetchMock.mockResolvedValue(listResponse([linkedMediaExercise, { ...draftExercise, id: "6f2be118-c34c-4f76-8fe2-3c88acd86912", name: "Air squat", mediaUrl: null }]));

    render(<ExerciseLibrary />);

    expect(await screen.findByText("Goblet squat")).toBeInTheDocument();
    expect(screen.getByText("Air squat")).toBeInTheDocument();
    expect(screen.getByText("Reference linked")).toBeInTheDocument();
    expect(screen.getByText("No reference")).toBeInTheDocument();
    expect(screen.queryByText(/loaded/i)).not.toBeInTheDocument();
  });

  it("shows the empty catalogue state when the server returns no exercises", async () => {
    fetchMock.mockResolvedValue(listResponse([]));

    render(<ExerciseLibrary />);

    expect(await screen.findByText("Your catalogue is empty")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create draft/i })).toBeInTheDocument();
  });

  it("shows a no-results state for a server-backed search", async () => {
    fetchMock.mockResolvedValue(listResponse([]));

    render(<ExerciseLibrary />);
    fireEvent.change(screen.getByLabelText("Search exercises"), { target: { value: "missing movement" } });

    expect(await screen.findByText("No exercises match those filters")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) => new URL(String(input), "http://localhost").searchParams.get("search") === "missing movement")).toBe(true);
    });
  });

  it("shows an API failure and retries the catalogue request", async () => {
    let shouldFail = true;
    fetchMock.mockImplementation(async () => shouldFail
      ? response({ error: "Catalogue temporarily unavailable" }, 503)
      : listResponse([draftExercise]));

    render(<ExerciseLibrary />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Catalogue temporarily unavailable");
    shouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByText("Goblet squat")).toBeInTheDocument();
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("sends search and every catalogue filter to the server and clears them", async () => {
    fetchMock.mockResolvedValue(listResponse([draftExercise]));

    render(<ExerciseLibrary />);
    await screen.findByText("Goblet squat");

    fireEvent.change(screen.getByLabelText("Search exercises"), { target: { value: "goblet" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "draft" } });
    fireEvent.change(screen.getByLabelText("Performance"), { target: { value: "weight_reps" } });
    fireEvent.change(screen.getByLabelText("Muscle"), { target: { value: "quads" } });
    fireEvent.change(screen.getByLabelText("Equipment filter"), { target: { value: "dumbbell" } });

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) => {
        const params = new URL(String(input), "http://localhost").searchParams;
        return params.get("search") === "goblet"
          && params.get("status") === "draft"
          && params.get("performanceType") === "weight_reps"
          && params.get("muscle") === "quads"
          && params.get("equipment") === "dumbbell";
      })).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) => {
        const params = new URL(String(input), "http://localhost").searchParams;
        return params.get("page") === "1"
          && !params.has("search")
          && !params.has("status")
          && !params.has("performanceType")
          && !params.has("muscle")
          && !params.has("equipment");
      })).toBe(true);
    });
  });

  it("requests the next server page through catalogue pagination", async () => {
    fetchMock.mockImplementation(async (input) => {
      const page = Number(new URL(String(input), "http://localhost").searchParams.get("page") ?? "1");
      return listResponse([draftExercise], 26, page);
    });

    render(<ExerciseLibrary />);
    await screen.findByText("Page 1 of 2");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([input]) => new URL(String(input), "http://localhost").searchParams.get("page") === "2")).toBe(true);
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

  it("prevents normalized duplicate equipment from being submitted", async () => {
    render(<ExerciseLibrary />);
    await screen.findByText("Goblet squat");
    fireEvent.click(screen.getByRole("button", { name: /new exercise/i }));
    fireEvent.change(screen.getByLabelText("Exercise name"), { target: { value: "Duplicate equipment exercise" } });
    fireEvent.click(screen.getByRole("button", { name: /add equipment/i }));
    fireEvent.click(screen.getByRole("button", { name: /add equipment/i }));
    fireEvent.change(screen.getByLabelText("Equipment 1"), { target: { value: "Pull-up bar" } });
    fireEvent.change(screen.getByLabelText("Equipment 2"), { target: { value: "pull up bar" } });
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));

    expect(await screen.findByText("Each equipment item may appear only once")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
  });

  it("keeps BodyMap, canonical muscle selectors, and primary/secondary roles synchronized", async () => {
    render(<ExerciseLibrary />);
    await screen.findByText("Goblet squat");
    fireEvent.click(screen.getByRole("button", { name: /new exercise/i }));

    fireEvent.click(screen.getByRole("button", { name: "Mock BodyMap" }));
    expect(screen.getByLabelText("Primary muscle")).toHaveValue("chest");
    expect(screen.getAllByRole("option", { name: "Upper chest" }).some((option) => (option as HTMLOptionElement).value === "upper_chest")).toBe(true);

    fireEvent.change(screen.getByLabelText("Primary muscle"), { target: { value: "quads" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Chest" }));
    fireEvent.change(screen.getByLabelText("Exercise name"), { target: { value: "Canonical mapping exercise" } });
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const createCall = fetchMock.mock.calls.find(([, options]) => options?.method === "POST");
    const body = JSON.parse(String(createCall?.[1]?.body));
    expect(body.muscles).toEqual([
      { muscleKey: "quads", role: "primary" },
      { muscleKey: "chest", role: "secondary" },
    ]);
  });

  it("protects unsaved values when the editor close control is used", async () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal("confirm", confirm);
    render(<ExerciseLibrary />);
    await screen.findByText("Goblet squat");
    fireEvent.click(screen.getByRole("button", { name: /new exercise/i }));
    fireEvent.change(screen.getByLabelText("Exercise name"), { target: { value: "Unsaved exercise" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Close editor" })[0]);

    expect(confirm).toHaveBeenCalledWith("You have unsaved changes. Close without saving?");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Exercise name")).toHaveValue("Unsaved exercise");

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getAllByRole("button", { name: "Close editor" })[0]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("moves focus into the editor and wraps Tab in both directions", async () => {
    render(<ExerciseLibrary />);
    await screen.findByText("Goblet squat");
    fireEvent.click(screen.getByRole("button", { name: /new exercise/i }));
    const dialog = await screen.findByRole("dialog");

    await waitFor(() => expect(document.activeElement).toBe(dialog));
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("closes a clean editor with Escape and restores focus to its opener", async () => {
    render(<ExerciseLibrary />);
    await screen.findByText("Goblet squat");
    const opener = screen.getByRole("button", { name: /new exercise/i });
    opener.focus();
    fireEvent.click(opener);
    const dialog = await screen.findByRole("dialog");

    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.activeElement).toBe(opener);
  });

  it("routes Escape through unsaved-change confirmation", async () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal("confirm", confirm);
    render(<ExerciseLibrary />);
    await screen.findByText("Goblet squat");
    fireEvent.click(screen.getByRole("button", { name: /new exercise/i }));
    fireEvent.change(screen.getByLabelText("Exercise name"), { target: { value: "Keep this value" } });
    const dialog = screen.getByRole("dialog");

    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(confirm).toHaveBeenCalledWith("You have unsaved changes. Close without saving?");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Exercise name")).toHaveValue("Keep this value");
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

  it("keeps archived exercises visible and clearly labelled in the archived status view", async () => {
    fetchMock.mockResolvedValue(listResponse([archivedExercise]));

    render(<ExerciseLibrary />);
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "archived" } });

    expect(await screen.findByText("Goblet squat")).toBeInTheDocument();
    expect(screen.getAllByText("Archived").length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) => new URL(String(input), "http://localhost").searchParams.get("status") === "archived")).toBe(true);
    });
    expect(screen.queryByText(/deleted/i)).not.toBeInTheDocument();
  });

  it("keeps catalogue and editor controls operable at a narrow viewport", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    window.dispatchEvent(new Event("resize"));
    fetchMock.mockImplementation(async (input) => String(input).endsWith(`/admin/exercises/${activeExercise.id}`)
      ? response({ exercise: activeExercise })
      : listResponse([activeExercise]));

    render(<ExerciseLibrary />);

    expect(await screen.findByLabelText("Exercise filters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new exercise/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveClass("overflow-y-auto");
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /archive/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /archive/i }).className).not.toMatch(/hidden/);
  });
});