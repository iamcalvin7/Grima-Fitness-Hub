/**
 * Keeps the Marcus Exercise Library behind the same server-backed role boundary
 * as the existing admin surfaces. The API remains the final authority.
 */
import React, { useEffect } from "react";
import type { Page } from "@/App";
import type { AuthUser } from "@/auth/AuthContext";
import { ExerciseLibrary } from "@/pages/ExerciseLibrary";

export function ExerciseLibraryGuard({
  activePage,
  setActivePage,
  user,
}: {
  activePage: Page;
  setActivePage: (page: Page) => void;
  user: AuthUser | null;
}) {
  useEffect(() => {
    if (activePage === "exercise-library" && user?.role !== "admin") {
      setActivePage("home");
    }
  }, [activePage, setActivePage, user?.role]);

  if (activePage !== "exercise-library" || user?.role !== "admin") return null;
  return <ExerciseLibrary />;
}
