import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

/** Client profile shape returned by the API (never includes userId). */
export interface ClientProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: string | null;
  activityLevel: string | null;
  experienceLevel: string | null;
  avatarUrl: string | null;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProfileInput = Partial<
  Pick<
    ClientProfile,
    | 'firstName' | 'lastName' | 'gender' | 'dateOfBirth' | 'heightCm' | 'weightKg'
    | 'goal' | 'activityLevel' | 'experienceLevel' | 'avatarUrl' | 'onboardingCompleted'
  >
>;

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (input: { email: string; password: string; firstName: string; lastName: string }) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  profile: ClientProfile | null;
  isProfileLoading: boolean;
  refreshProfile: () => Promise<ClientProfile | null>;
  updateProfile: (input: ProfileInput) => Promise<ClientProfile>;
  createProfile: (input: ProfileInput) => Promise<ClientProfile>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ── Legacy localStorage migration (one-time) ──────────────────────────── */

interface LegacyProfile {
  firstName?: string; lastName?: string; gender?: string; age?: number;
  weightKg?: number; heightCm?: number; goal?: string; activityLevel?: string;
}

function readLegacyProfile(): LegacyProfile | null {
  try {
    const raw = localStorage.getItem('mg_profile');
    return raw ? JSON.parse(raw) as LegacyProfile : null;
  } catch { return null; }
}

/** Approximate DOB from a stored age (Jan 1 of the birth year). */
function ageToDateOfBirth(age: number): string | null {
  if (!Number.isFinite(age) || age < 13 || age > 110) return null;
  return `${new Date().getFullYear() - Math.round(age)}-01-01`;
}

const LEGACY_GOALS = ['Build Muscle', 'Lose Weight', 'Get Fit', 'Increase Strength', 'Improve Endurance'];
const LEGACY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const LEGACY_GENDERS = ['Male', 'Female', 'Other'];

function legacyToProfileInput(p: LegacyProfile, avatar: string | null): ProfileInput {
  const input: ProfileInput = { onboardingCompleted: true };
  if (p.firstName?.trim()) input.firstName = p.firstName.trim();
  if (p.lastName?.trim()) input.lastName = p.lastName.trim();
  if (p.gender && LEGACY_GENDERS.includes(p.gender)) input.gender = p.gender;
  if (typeof p.age === 'number') {
    const dob = ageToDateOfBirth(p.age);
    if (dob) input.dateOfBirth = dob;
  }
  if (typeof p.heightCm === 'number' && p.heightCm >= 100 && p.heightCm <= 250) input.heightCm = Math.round(p.heightCm);
  if (typeof p.weightKg === 'number' && p.weightKg >= 30 && p.weightKg <= 300) input.weightKg = Math.round(p.weightKg);
  if (p.goal && LEGACY_GOALS.includes(p.goal)) input.goal = p.goal;
  // The old "activity level" step captured training experience.
  if (p.activityLevel && LEGACY_LEVELS.includes(p.activityLevel)) input.experienceLevel = p.activityLevel;
  if (avatar && avatar.startsWith('data:image/')) input.avatarUrl = avatar;
  return input;
}

function clearLegacyKeys() {
  localStorage.removeItem('mg_profile');
  localStorage.removeItem('mg_avatar');
}

/* ── Provider ──────────────────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  // User id whose profile load has settled — drives isProfileLoading with no
  // one-render gap between user resolution and the load effect firing.
  const [profileSettledFor, setProfileSettledFor] = useState<string | null>(null);
  // Who the app currently considers signed in; late responses for anyone else are dropped.
  const currentUserIdRef = useRef<string | null>(null);
  // Migration attempted at most once per user per app load.
  const migrationAttemptedFor = useRef<Set<string>>(new Set());

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

  /** Apply a profile response only if it still belongs to the signed-in user. */
  const applyProfileIfCurrent = useCallback((forUserId: string, p: ClientProfile | null) => {
    if (currentUserIdRef.current === forUserId) setProfile(p);
  }, []);

  const refreshProfile = useCallback(async (): Promise<ClientProfile | null> => {
    const forUserId = currentUserIdRef.current;
    const { profile: p } = await apiRequest<{ profile: ClientProfile | null }>('/profile');
    if (forUserId) applyProfileIfCurrent(forUserId, p);
    return p;
  }, [applyProfileIfCurrent]);

  const createProfile = useCallback(async (input: ProfileInput): Promise<ClientProfile> => {
    const forUserId = currentUserIdRef.current;
    const { profile: p } = await apiRequest<{ profile: ClientProfile }>('/profile', {
      method: 'POST',
      body: input,
    });
    if (forUserId) applyProfileIfCurrent(forUserId, p);
    return p;
  }, [applyProfileIfCurrent]);

  const updateProfile = useCallback(async (input: ProfileInput): Promise<ClientProfile> => {
    const forUserId = currentUserIdRef.current;
    const { profile: p } = await apiRequest<{ profile: ClientProfile }>('/profile', {
      method: 'PATCH',
      body: input,
    });
    if (forUserId) applyProfileIfCurrent(forUserId, p);
    return p;
  }, [applyProfileIfCurrent]);

  /**
   * Load (and if needed migrate) the profile whenever a user session exists.
   * Legacy migration runs at most once per app load, only when the server
   * has no profile yet — a newer server profile is never overwritten.
   */
  const loadProfileFor = useCallback(async (userId: string) => {
    try {
      const serverProfile = await refreshProfile();
      if (currentUserIdRef.current !== userId) return; // user changed mid-flight
      const legacy = readLegacyProfile();
      if (serverProfile) {
        // Server wins; any lingering local copy is obsolete.
        if (legacy) clearLegacyKeys();
        return;
      }
      if (legacy && !migrationAttemptedFor.current.has(userId)) {
        migrationAttemptedFor.current.add(userId);
        const input = legacyToProfileInput(legacy, localStorage.getItem('mg_avatar'));
        try {
          await createProfile(input);
          clearLegacyKeys();
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            // Raced with another tab/device — server copy wins.
            await refreshProfile();
            clearLegacyKeys();
          } else {
            // Other failures: keep local data and allow a retry on next load.
            migrationAttemptedFor.current.delete(userId);
          }
        }
      }
    } catch {
      // Profile fetch failed (network/server) — leave profile as-is.
    } finally {
      if (currentUserIdRef.current === userId) setProfileSettledFor(userId);
    }
  }, [refreshProfile, createProfile]);

  useEffect(() => {
    // One-time cleanup of obsolete fake-auth keys from the pre-API prototype.
    localStorage.removeItem('mg_auth');
    localStorage.removeItem('mg_users');

    // Public lead-gen landing (/join or ?join): skip the auth probe entirely —
    // visitors never need a session there and the 401 pollutes the console.
    const isPublicLanding =
      window.location.pathname === '/ownyourjourney' ||
      new URLSearchParams(window.location.search).has('join');
    if (isPublicLanding) {
      setUser(null);
      setIsLoading(false);
      return;
    }

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

  // Load the profile whenever the signed-in user changes.
  useEffect(() => {
    currentUserIdRef.current = user?.id ?? null;
    if (user) {
      void loadProfileFor(user.id);
    } else {
      setProfile(null);
      setProfileSettledFor(null);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isProfileLoading = user !== null && profileSettledFor !== user.id;

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
      setProfile(null);
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
      profile,
      isProfileLoading,
      refreshProfile,
      updateProfile,
      createProfile,
    }),
    [user, isLoading, signIn, signUp, signOut, refreshUser, profile, isProfileLoading, refreshProfile, updateProfile, createProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
