import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/pages/ExerciseLibrary", () => ({
  ExerciseLibrary: () => <div data-testid="exercise-library-page" />,
}));

vi.mock("@/auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) =>
      React.createElement("div", rest, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

import { ExerciseLibraryGuard } from "@/components/ExerciseLibraryGuard";
import { BurgerMenu } from "@/components/BurgerMenu";
import { Sidebar } from "@/components/Sidebar";
import type { AuthContextValue, AuthUser } from "@/auth/AuthContext";
import { useAuth } from "@/auth/AuthContext";
import type { Page } from "@/App";

function makeUser(role: "admin" | "trainer" | "client"): AuthUser {
  return {
    id: "1",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    avatarUrl: null,
    role,
    createdAt: "2026-01-01T00:00:00Z",
  };
}

function makeAuthValue(user: AuthUser | null): AuthContextValue {
  return {
    user,
    isLoading: false,
    isAuthenticated: user !== null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    refreshUser: vi.fn(),
    profile: null,
    isProfileLoading: false,
    refreshProfile: vi.fn(),
    updateProfile: vi.fn(),
    createProfile: vi.fn(),
  };
}

const mockedUseAuth = vi.mocked(useAuth);

describe("ExerciseLibraryGuard", () => {
  let setActivePage: ReturnType<typeof vi.fn<(page: Page) => void>>;

  beforeEach(() => {
    setActivePage = vi.fn();
  });

  it.each(["client", "trainer"] as const)(
    "fails closed and redirects %s users",
    (role) => {
      render(
        <ExerciseLibraryGuard
          activePage="exercise-library"
          setActivePage={setActivePage}
          user={makeUser(role)}
        />,
      );
      expect(screen.queryByTestId("exercise-library-page")).not.toBeInTheDocument();
      expect(setActivePage).toHaveBeenCalledWith("home");
    },
  );

  it("fails closed when no user is available", () => {
    render(
      <ExerciseLibraryGuard
        activePage="exercise-library"
        setActivePage={setActivePage}
        user={null}
      />,
    );
    expect(screen.queryByTestId("exercise-library-page")).not.toBeInTheDocument();
    expect(setActivePage).toHaveBeenCalledWith("home");
  });

  it("mounts the library for an admin without redirecting", () => {
    render(
      <ExerciseLibraryGuard
        activePage="exercise-library"
        setActivePage={setActivePage}
        user={makeUser("admin")}
      />,
    );
    expect(screen.getByTestId("exercise-library-page")).toBeInTheDocument();
    expect(setActivePage).not.toHaveBeenCalled();
  });
});

describe("Exercise Library navigation", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("is visible to an admin in desktop and mobile navigation", () => {
    mockedUseAuth.mockReturnValue(makeAuthValue(makeUser("admin")));
    const { unmount } = render(<Sidebar activePage="home" onNavigate={vi.fn()} />);
    expect(screen.getByText("Exercise Library")).toBeInTheDocument();
    unmount();

    render(<BurgerMenu open onClose={vi.fn()} onNavigate={vi.fn()} activePage="home" />);
    expect(screen.getByText("Exercise Library")).toBeInTheDocument();
  });

  it.each(["client", "trainer"] as const)("is absent for %s users", (role) => {
    mockedUseAuth.mockReturnValue(makeAuthValue(makeUser(role)));
    const { unmount } = render(<Sidebar activePage="home" onNavigate={vi.fn()} />);
    expect(screen.queryByText("Exercise Library")).not.toBeInTheDocument();
    unmount();

    render(<BurgerMenu open onClose={vi.fn()} onNavigate={vi.fn()} activePage="home" />);
    expect(screen.queryByText("Exercise Library")).not.toBeInTheDocument();
  });
});
