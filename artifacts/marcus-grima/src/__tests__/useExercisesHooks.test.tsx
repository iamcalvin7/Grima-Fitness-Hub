import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useGetAdminExercises, useGetClientExercises } from "../hooks/use-exercises";
import * as api from "../lib/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("../lib/api", () => ({
  apiRequest: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("Exercise Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useGetAdminExercises fetches from /admin/exercises with limit=100 and paginates", async () => {
    let callCount = 0;
    (api.apiRequest as any).mockImplementation(async (url: string) => {
      callCount++;
      expect(url).toContain("/admin/exercises");
      expect(url).toContain("limit=100");
      if (callCount === 1) {
        expect(url).toContain("page=1");
        return { exercises: [{ id: "1" }], pagination: { total: 2 } };
      }
      expect(url).toContain("page=2");
      return { exercises: [{ id: "2" }], pagination: { total: 2 } };
    });

    const { result } = renderHook(() => useGetAdminExercises(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(callCount).toBe(2);
  });

  it("useGetClientExercises fetches from public /exercises with limit=100", async () => {
    (api.apiRequest as any).mockImplementation(async (url: string) => {
      expect(url).toContain("/exercises");
      expect(url).not.toContain("/admin");
      expect(url).toContain("limit=100");
      return { exercises: [{ id: "1" }], pagination: { total: 1 } };
    });

    const { result } = renderHook(() => useGetClientExercises(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
  });
});
