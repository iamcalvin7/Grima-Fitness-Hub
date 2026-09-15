import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { ProgrammeLibraryGuard } from "../components/ProgrammeLibraryGuard";
import { useAuth } from "../auth/AuthContext";

vi.mock("../auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));
vi.mock("../pages/ProgrammeLibrary", () => ({
  ProgrammeLibrary: () => <div data-testid="programme-library-page">Library</div>,
}));

describe("ProgrammeLibraryGuard", () => {
  it("redirects client users to home", () => {
    (useAuth as any).mockReturnValue({ user: { role: "client" } });
    const setActivePage = vi.fn();
    render(
      <ProgrammeLibraryGuard
        activePage="programme-library"
        setActivePage={setActivePage}
        user={{ id: "1", email: "x", role: "client", tenantId: "t1" }}
      />
    );
    expect(setActivePage).toHaveBeenCalledWith("home");
  });

  it("mounts the library for an admin without redirecting", () => {
    (useAuth as any).mockReturnValue({ user: { role: "admin" } });
    const setActivePage = vi.fn();
    render(
      <ProgrammeLibraryGuard
        activePage="programme-library"
        setActivePage={setActivePage}
        user={{ id: "1", email: "x", role: "admin", tenantId: "t1" }}
      />
    );
    expect(setActivePage).not.toHaveBeenCalled();
    expect(screen.getByTestId("programme-library-page")).toBeInTheDocument();
  });
});
