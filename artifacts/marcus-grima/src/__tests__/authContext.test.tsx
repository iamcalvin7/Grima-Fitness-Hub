import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/lib/api";
import * as api from "@/lib/api";

function admin(id = "admin-1") {
  return {
    id,
    email: `${id}@test.local`,
    firstName: "Marcus",
    lastName: "Admin",
    avatarUrl: null,
    role: "admin" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function client(id = "client-1") {
  return { ...admin(id), role: "client" as const };
}

function Probe() {
  const auth = useAuth();
  return (
    <>
      <output data-testid="user-id">{auth.user?.id ?? ""}</output>
      <output data-testid="dev-admin">{String(auth.isDevAdminSession)}</output>
      <button onClick={() => void auth.devAdminSignIn()}>dev admin</button>
      <button onClick={() => void auth.refreshUser()}>refresh</button>
      <button onClick={() => void auth.signOut()}>sign out</button>
    </>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

describe("AuthContext dev-admin provenance", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("does not migrate stale local profile data for a dev admin", async () => {
    localStorage.setItem("mg_profile", JSON.stringify({
      firstName: "Stale",
      lastName: "Local",
      gender: "Other",
    }));
    const request = vi.spyOn(api, "apiRequest");
    request.mockImplementation(async (path: string) => {
      if (path === "/auth/me") throw new ApiError(401, "Not authenticated");
      if (path === "/auth/dev-signin/admin") return { user: admin() };
      if (path === "/profile") return { profile: null };
      if (path === "/auth/signout") return { ok: true };
      throw new Error(`Unexpected API request: ${path}`);
    });
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("user-id")).toHaveTextContent(""));
    fireEvent.click(screen.getByRole("button", { name: "dev admin" }));
    await waitFor(() => expect(screen.getByTestId("dev-admin")).toHaveTextContent("true"));

    expect(request).not.toHaveBeenCalledWith("/profile", expect.objectContaining({
      method: "POST",
    }));
    expect(localStorage.getItem("mg_profile")).toContain("Stale");
  });

  it("binds provenance to the exact admin user and clears it on role/user loss", async () => {
    const responses = [
      null,
      admin("admin-1"),
      admin("admin-2"),
      client("admin-2"),
      null,
    ];
    vi.spyOn(api, "apiRequest").mockImplementation(async (path: string) => {
      if (path === "/auth/me") {
        const next = responses.shift();
        if (!next) throw new ApiError(401, "Not authenticated");
        return { user: next };
      }
      if (path === "/auth/dev-signin/admin") return { user: admin("admin-1") };
      if (path === "/profile") return { profile: null };
      if (path === "/auth/signout") return { ok: true };
      throw new Error(`Unexpected API request: ${path}`);
    });

    renderProvider();
    await waitFor(() => expect(screen.getByTestId("user-id")).toHaveTextContent(""));
    fireEvent.click(screen.getByRole("button", { name: "dev admin" }));
    await waitFor(() => expect(screen.getByTestId("dev-admin")).toHaveTextContent("true"));

    fireEvent.click(screen.getByRole("button", { name: "refresh" }));
    await waitFor(() => expect(screen.getByTestId("dev-admin")).toHaveTextContent("true"));
    fireEvent.click(screen.getByRole("button", { name: "refresh" }));
    await waitFor(() => expect(screen.getByTestId("dev-admin")).toHaveTextContent("false"));
    fireEvent.click(screen.getByRole("button", { name: "refresh" }));
    await waitFor(() => expect(screen.getByTestId("dev-admin")).toHaveTextContent("false"));
    fireEvent.click(screen.getByRole("button", { name: "refresh" }));
    await waitFor(() => expect(screen.getByTestId("dev-admin")).toHaveTextContent("false"));
    fireEvent.click(screen.getByRole("button", { name: "sign out" }));
    await waitFor(() => expect(screen.getByTestId("user-id")).toHaveTextContent(""));
    expect(screen.getByTestId("dev-admin")).toHaveTextContent("false");
  });

  it("keeps normal sign-in in the ordinary incomplete-profile mode", async () => {
    vi.spyOn(api, "apiRequest").mockImplementation(async (path: string) => {
      if (path === "/auth/me") throw new ApiError(401, "Not authenticated");
      if (path === "/auth/signout") return { ok: true };
      if (path === "/profile") return { profile: null };
      if (path === "/auth/signin") return { user: client("normal-user") };
      throw new Error(`Unexpected API request: ${path}`);
    });

    // This test intentionally uses the real context's normal sign-in through
    // a tiny temporary control, proving no dev provenance is inferred.
    function NormalSignIn() {
      const auth = useAuth();
      return <button onClick={() => void auth.signIn("normal@test.local", "password")}>normal sign in</button>;
    }
    render(
      <AuthProvider>
        <Probe />
        <NormalSignIn />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "normal sign in" }));
    await waitFor(() => expect(screen.getByTestId("user-id")).toHaveTextContent("normal-user"));
    expect(screen.getByTestId("dev-admin")).toHaveTextContent("false");
  });
});