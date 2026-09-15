import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Workouts } from "../pages/Workouts";
import * as api from "../lib/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../lib/api", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("../data/programs", () => ({
  PROGRAMS: []
}));

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("Workouts page (Client)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists published programmes from the server", async () => {
    const mockProgramme = {
      id: "p1",
      slug: "prog-1",
      status: "published",
      version: 1,
      revision: {
        id: "r1",
        name: "Client Program",
        difficulty: "Beginner",
        goal: "Test",
        version: 1,
        days: []
      }
    };
    (api.apiRequest as any).mockImplementation(async (url: string) => {
      if (url === "/programmes") return { programmes: [mockProgramme] };
      return {};
    });

    renderWithProviders(<Workouts />);

    await waitFor(() => {
      expect(screen.getByText("Client Program")).toBeInTheDocument();
    });
  });

  it("navigates to programme detail and day overview", async () => {
    const mockProgramme = {
      id: "p1",
      slug: "prog-1",
      status: "published",
      version: 1,
      revision: {
        id: "r1",
        name: "Client Program",
        difficulty: "Beginner",
        goal: "Test",
        version: 1,
        days: [
          {
            dayNumber: 1,
            name: "Push Day",
            estimatedMinutes: 45,
            exercises: [
              { position: 1, exerciseId: "ex1", sets: 3, reps: "10" }
            ]
          }
        ]
      }
    };
    (api.apiRequest as any).mockImplementation(async (url: string) => {
      if (url === "/programmes") return { programmes: [mockProgramme] };
      if (url === "/programmes/p1") return { programme: mockProgramme };
      if (url.includes("/exercises")) return { exercises: [{ id: "ex1", name: "Pushup" }], pagination: { total: 1 } };
      return {};
    });

    renderWithProviders(<Workouts />);

    await waitFor(() => {
      expect(screen.getByTestId("card-programme-p1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("card-programme-p1"));

    await waitFor(() => {
      expect(screen.getByTestId("card-day-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("card-day-1"));

    await waitFor(() => {
      expect(screen.getByText("Pushup")).toBeInTheDocument();
    });

    // Back navigation
    fireEvent.click(screen.getByTestId("button-back-programme"));

    await waitFor(() => {
      expect(screen.getByTestId("card-day-1")).toBeInTheDocument();
    });
  });
});
