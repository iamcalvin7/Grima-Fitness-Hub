import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest, ApiError } from '@/lib/api';

/** Public user shape returned by the API. */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: 'admin' | 'trainer' | 'client';
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (input: { email: string; password: string; firstName: string; lastName: string }) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const { user: me } = await apiRequest<{ user: AuthUser }>('/auth/me');
      setUser(me);
      return me;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
        return null;
      }
      // Network / server errors: keep whatever state we had.
      throw err;
    }
  }, []);

  useEffect(() => {
    // One-time cleanup of obsolete fake-auth keys from the pre-API prototype.
    localStorage.removeItem('mg_auth');
    localStorage.removeItem('mg_users');

    let cancelled = false;
    (async () => {
      try {
        await refreshUser();
      } catch {
        // Startup probe failed (e.g. API unreachable) — treat as signed out.
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshUser]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const { user: me } = await apiRequest<{ user: AuthUser }>('/auth/signin', {
      method: 'POST',
      body: { email, password },
    });
    setUser(me);
    return me;
  }, []);

  const signUp = useCallback(
    async (input: { email: string; password: string; firstName: string; lastName: string }): Promise<AuthUser> => {
      const { user: me } = await apiRequest<{ user: AuthUser }>('/auth/signup', {
        method: 'POST',
        body: input,
      });
      setUser(me);
      return me;
    },
    [],
  );

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await apiRequest<{ ok: boolean }>('/auth/signout', { method: 'POST' });
    } finally {
      // Even if the request fails, drop client-side auth state.
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      signIn,
      signUp,
      signOut,
      refreshUser,
    }),
    [user, isLoading, signIn, signUp, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
