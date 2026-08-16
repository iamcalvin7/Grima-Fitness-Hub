/**
 * ContentAdminGuard
 *
 * Extracted from FullApp so the two-part guard can be unit-tested without
 * mounting the entire application:
 *
 *   1. useEffect: redirects any non-admin user whose activePage is
 *      'content-admin' back to 'home' (UX safeguard; the server is the
 *      security authority).
 *   2. Conditional render: only mounts <ContentAdmin /> when both the page
 *      is 'content-admin' AND the user holds the 'admin' role.
 */
import React, { useEffect } from 'react';
import type { Page } from '@/App';
import type { AuthUser } from '@/auth/AuthContext';
import { ContentAdmin } from '@/pages/ContentAdmin';

interface ContentAdminGuardProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  user: AuthUser | null;
}

export function ContentAdminGuard({
  activePage,
  setActivePage,
  user,
}: ContentAdminGuardProps) {
  // Guard 1 — redirect: runs synchronously after every render where
  // activePage is 'content-admin' and the user is not admin.
  useEffect(() => {
    if (activePage === 'content-admin' && user?.role !== 'admin') {
      setActivePage('home');
    }
  }, [activePage, user?.role, setActivePage]);

  // Guard 2 — render: double-check before mounting the page component so
  // ContentAdmin never mounts even for one frame during the redirect.
  if (activePage !== 'content-admin' || user?.role !== 'admin') {
    return null;
  }

  return <ContentAdmin />;
}
