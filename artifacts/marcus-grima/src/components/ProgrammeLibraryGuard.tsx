import React, { useEffect } from "react";
import type { Page } from "@/App";
import type { AuthUser } from "@/auth/AuthContext";
import { ProgrammeLibrary } from "@/pages/ProgrammeLibrary";

export function ProgrammeLibraryGuard({
  activePage,
  setActivePage,
  user,
}: {
  activePage: Page;
  setActivePage: (page: Page) => void;
  user: AuthUser | null;
}) {
  useEffect(() => {
    if (activePage === "programme-library" && user?.role !== "admin") {
      setActivePage("home");
    }
  }, [activePage, setActivePage, user?.role]);

  if (activePage !== "programme-library" || user?.role !== "admin") return null;
  return <ProgrammeLibrary />;
}
