import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AppProviders } from "@/components/AppProviders";
import { ProgrammeLibrary } from "@/pages/ProgrammeLibrary";

vi.mock("@/lib/api", () => ({
  apiRequest: vi.fn(async (path: string) =>
    path === "/admin/programmes"
      ? { programmes: [] }
      : { exercises: [], pagination: { total: 0, page: 1, limit: 100 } },
  ),
}));

describe("application React Query provider", () => {
  it("keeps the programme library route under the shared query provider", async () => {
    expect(() =>
      render(
        <AppProviders>
          <ProgrammeLibrary />
        </AppProviders>,
      ),
    ).not.toThrow();

    await waitFor(() => {
      expect(screen.getByText("No programmes yet")).toBeInTheDocument();
    });
  });
});