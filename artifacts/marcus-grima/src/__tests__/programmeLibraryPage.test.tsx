import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProgrammeLibrary } from "../pages/ProgrammeLibrary";
import * as api from "../lib/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../lib/api", () => ({
  apiRequest: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("ProgrammeLibrary page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading and error states", async () => {
    // Initial load hangs
    let resolveLoad: any;
    const loadPromise = new Promise((res) => { resolveLoad = res; });
    (api.apiRequest as any).mockImplementation(() => loadPromise);

    renderWithProviders(<ProgrammeLibrary />);
    
    // Shows loading spinner
    expect(screen.getByTestId("programme-list-loading")).toBeInTheDocument();

    // Reject with error
    resolveLoad(Promise.reject(new api.ApiError(500, "Server error")));
    
    await waitFor(() => {
      expect(screen.getByTestId("programme-list-error")).toBeInTheDocument();
      expect(screen.getByText("Failed to load programmes")).toBeInTheDocument();
    });
  });

  it("surfaces stale conflict without retry", async () => {
    const mockProgramme = {
      id: "p1",
      slug: "prog-1",
      status: "draft",
      version: 1,
      draftRevision: {
        id: "r1",
        name: "Test Draft",
        difficulty: "Beginner",
        goal: "Test",
        version: 1,
        days: []
      }
    };
    (api.apiRequest as any).mockImplementation(async (url: string, opts?: any) => {
      if (url.includes("/admin/exercises")) return { exercises: [] };
      if (url === "/admin/programmes" && !opts?.method) return { programmes: [mockProgramme] };
      if (url.includes("/admin/programmes/p1") && !opts?.method) return { programme: mockProgramme };
      // Reject patch with 409
      if (url.includes("/admin/programmes/p1/draft")) {
        throw new api.ApiError(409, "Programme changed during this request; reload and try again");
      }
      return {};
    });

    renderWithProviders(<ProgrammeLibrary />);
    
    await waitFor(() => {
      expect(screen.getByText("Test Draft")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("card-programme-p1"));
    
    await waitFor(() => {
      expect(screen.getByTestId("button-save-draft")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("button-save-draft"));
    
    await waitFor(() => {
      expect(screen.getByText("Programme changed during this request; reload and try again")).toBeInTheDocument();
    });
  });

  it("sends edit payload with proper day ordering", async () => {
    const mockProgramme = {
      id: "p1",
      slug: "prog-1",
      status: "draft",
      version: 1,
      draftRevision: {
        id: "r1",
        name: "Test Draft",
        difficulty: "Beginner",
        goal: "Test",
        version: 1,
        days: []
      }
    };
    (api.apiRequest as any).mockImplementation(async (url: string, opts?: any) => {
      if (url.includes("/admin/exercises")) return { exercises: [{ id: "ex1", name: "Pushup" }], pagination: { total: 1 } };
      if (url === "/admin/programmes" && !opts?.method) return { programmes: [mockProgramme] };
      if (url.includes("/admin/programmes/p1") && !opts?.method) return { programme: mockProgramme };
      if (url.includes("/admin/programmes/p1/draft")) return { programme: mockProgramme };
      return {};
    });

    renderWithProviders(<ProgrammeLibrary />);
    
    await waitFor(() => {
      expect(screen.getByText("Test Draft")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("card-programme-p1"));
    
    await waitFor(() => {
      expect(screen.getByTestId("button-add-day")).toBeInTheDocument();
    });

    // Add a day
    fireEvent.click(screen.getByTestId("button-add-day"));
    
    await waitFor(() => {
      expect(screen.getByTestId("input-day-name-0")).toBeInTheDocument();
    });
    
    fireEvent.change(screen.getByTestId("input-day-name-0"), { target: { value: "Day One" } });
    
    // Add exercise to that day
    fireEvent.click(screen.getByTestId("button-add-exercise-0"));
    
    await waitFor(() => {
      expect(screen.getByTestId("select-exercise-0-0")).toBeInTheDocument();
    });
    
    fireEvent.change(screen.getByTestId("select-exercise-0-0"), { target: { value: "ex1" } });
    
    // Save draft
    fireEvent.click(screen.getByTestId("button-save-draft"));
    
    await waitFor(() => {
      expect(api.apiRequest).toHaveBeenCalledWith("/admin/programmes/p1/draft", expect.objectContaining({
        method: "PATCH",
        body: expect.objectContaining({
          days: [
            expect.objectContaining({
              name: "Day One",
              estimatedMinutes: 45,
              exercises: [
                expect.objectContaining({
                  exerciseId: "ex1",
                  sets: 3,
                  reps: "10"
                })
              ]
            })
          ]
        })
      }));
    });
  });

  it("lists server data and creates a draft", async () => {
    const mockProgramme = {
      id: "p1",
      slug: "prog-1",
      status: "draft",
      version: 1,
      draftRevision: {
        id: "r1",
        name: "Test Draft",
        difficulty: "Beginner",
        goal: "Test",
        version: 1,
        days: []
      }
    };
    (api.apiRequest as any).mockImplementation(async (url: string, opts?: any) => {
      if (url.includes("/admin/exercises")) return { exercises: [] };
      if (url === "/admin/programmes" && opts?.method !== "POST") return { programmes: [mockProgramme] };
      if (url === "/admin/programmes" && opts?.method === "POST") return { programme: mockProgramme };
      return {};
    });

    renderWithProviders(<ProgrammeLibrary />);
    
    await waitFor(() => {
      expect(screen.getByText("Test Draft")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("button-new-programme"));
    
    await waitFor(() => {
      expect(screen.getByText("General Information")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("button-save-draft"));
    
    await waitFor(() => {
      expect(api.apiRequest).toHaveBeenCalledWith("/admin/programmes", expect.objectContaining({
        method: "POST"
      }));
    });
  });

  it("sends publish with If-Match version header", async () => {
    const mockProgramme = {
      id: "p1",
      slug: "prog-1",
      status: "draft",
      version: 1,
      draftRevision: {
        id: "r1",
        name: "Test Draft",
        difficulty: "Beginner",
        goal: "Test",
        version: 2,
        days: []
      }
    };
    (api.apiRequest as any).mockImplementation(async (url: string, opts?: any) => {
      if (url.includes("/admin/exercises")) return { exercises: [] };
      if (url.includes("/admin/programmes/p1") && !opts?.method) return { programme: mockProgramme };
      if (url.includes("/admin/programmes/p1/draft")) return { programme: mockProgramme };
      if (url.includes("/admin/programmes/p1/publish")) return { programme: { ...mockProgramme, status: "published", version: 2 } };
      return { programmes: [mockProgramme] };
    });

    renderWithProviders(<ProgrammeLibrary />);
    
    await waitFor(() => {
      expect(screen.getByText("Test Draft")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("card-programme-p1"));
    
    await waitFor(() => {
      expect(screen.getByTestId("button-publish")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("button-publish"));

    await waitFor(() => {
      expect(api.apiRequest).toHaveBeenCalledWith("/admin/programmes/p1/publish", expect.objectContaining({
        method: "POST",
        headers: { "If-Match": "2" }
      }));
    });
  });

  it("disables archive when a draft exists and handles archive errors", async () => {
    const mockProgramme = {
      id: "p1",
      slug: "prog-1",
      status: "published",
      version: 3,
      publishedRevision: {
        id: "r1",
        name: "Published",
        difficulty: "Beginner",
        goal: "Test",
        version: 1,
        days: []
      },
      draftRevision: {
        id: "r2",
        name: "Draft",
        difficulty: "Beginner",
        goal: "Test",
        version: 2,
        days: []
      }
    };
    (api.apiRequest as any).mockImplementation(async (url: string, opts?: any) => {
      if (url.includes("/admin/exercises")) return { exercises: [], pagination: { total: 0 } };
      if (url.includes("/admin/programmes/p1") && !opts?.method) return { programme: mockProgramme };
      return { programmes: [mockProgramme] };
    });

    renderWithProviders(<ProgrammeLibrary />);
    
    await waitFor(() => {
      expect(screen.getByTestId("card-programme-p1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("card-programme-p1"));
    
    await waitFor(() => {
      expect(screen.getByText("Publish draft to archive")).toBeInTheDocument();
    });
    
    // Archive button is missing/disabled, so showArchive won't happen.
    expect(screen.queryByTestId("button-show-archive")).not.toBeInTheDocument();
  });

  it("handles archive with reason and version", async () => {
    const mockProgramme = {
      id: "p1",
      slug: "prog-1",
      status: "published",
      version: 3,
      publishedRevision: {
        id: "r1",
        name: "Published",
        difficulty: "Beginner",
        goal: "Test",
        version: 1,
        days: []
      }
    };
    (api.apiRequest as any).mockImplementation(async (url: string, opts?: any) => {
      if (url.includes("/admin/exercises")) return { exercises: [] };
      if (url.includes("/admin/programmes/p1") && !opts?.method) return { programme: mockProgramme };
      if (url.includes("/admin/programmes/p1/archive")) return { programme: { ...mockProgramme, status: "archived" } };
      return { programmes: [mockProgramme] };
    });

    renderWithProviders(<ProgrammeLibrary />);
    
    await waitFor(() => {
      expect(screen.getByTestId("card-programme-p1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("card-programme-p1"));
    
    await waitFor(() => {
      expect(screen.getByTestId("button-show-archive")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("button-show-archive"));
    
    await waitFor(() => {
      expect(screen.getByTestId("input-archive-reason")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("input-archive-reason"), { target: { value: "Obsolete" } });
    fireEvent.click(screen.getByTestId("button-confirm-archive"));

    await waitFor(() => {
      expect(api.apiRequest).toHaveBeenCalledWith("/admin/programmes/p1/archive", expect.objectContaining({
        method: "POST",
        body: { reason: "Obsolete" },
        headers: { "If-Match": "3" }
      }));
    });
  });
});
