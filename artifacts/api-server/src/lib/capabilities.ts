/**
 * Server-side capability foundation — Gate 1A.
 *
 * This module is the single source of truth for what each role may do.
 * It is server-only: authorisation policy must never live in frontend code.
 *
 * Gate 1A scope:
 *   - Defines the capability vocabulary.
 *   - Maps every canonical database role to its capability set.
 *   - Provides pure, side-effect-free helper functions.
 *
 * No Express middleware is created here.
 * No existing route guard is replaced or imported here.
 * Application behaviour is unchanged until Gate 1B wires this in.
 */

import type { UserRole } from "@workspace/db";

// ---------------------------------------------------------------------------
// Capability vocabulary
// ---------------------------------------------------------------------------

/**
 * Coaching capabilities — managing clients' experience and coaching records.
 */
export const COACHING_CAPABILITIES = [
  "clients:read",
  "clients:manage",
  "programmes:manage",
  "programmes:publish",
  "programmes:archive",
  "bookings:manage",
  "progress:review",
  "messages:manage",
] as const;

export const EXERCISE_CAPABILITIES = [
  "exercises:read",
  "exercises:manage",
  "exercises:archive",
] as const;

/**
 * Administrative capabilities — operating the platform as its sole operator.
 */
export const ADMINISTRATIVE_CAPABILITIES = [
  "content:manage",
  "proposal:manage",
  "memberships:manage",
  "payments:manage",
  "offers:manage",
  "configuration:manage",
  "audit:read",
] as const;

/** Union of every defined capability identifier. */
export type Capability =
  | (typeof COACHING_CAPABILITIES)[number]
  | (typeof EXERCISE_CAPABILITIES)[number]
  | (typeof ADMINISTRATIVE_CAPABILITIES)[number];

// ---------------------------------------------------------------------------
// Role-to-capability mapping
//
// Record<UserRole, ...> is intentionally exhaustive: TypeScript will produce
// a compile-time error if a new role value is added to the schema without
// updating this mapping. Unknown or unrecognised roles must not silently
// receive capabilities — any new value must be explicitly granted zero or
// more capabilities here first.
//
// v1 product model:
//   client  → tenant-scoped active exercise catalogue reads only
//   trainer → no privileged capabilities (legacy technical value, not yet
//              mapped to the approved v1 capability model)
//   admin   → all coaching + administrative capabilities (Marcus, the sole
//              operator; provisioning is a later gate)
// ---------------------------------------------------------------------------

const ROLE_CAPABILITIES: Record<UserRole, readonly Capability[]> = {
  client: ["exercises:read"],
  trainer: [],
  admin: [
    ...COACHING_CAPABILITIES,
    ...EXERCISE_CAPABILITIES,
    ...ADMINISTRATIVE_CAPABILITIES,
  ],
};

// ---------------------------------------------------------------------------
// Pure helper functions
//
// All helpers:
//   - Accept any string (or undefined/null) so callers need not validate first.
//   - Return false or [] for unknown, missing or malformed role values.
//   - Never throw.
//   - Never access the database, sessions, environment variables or the network.
//   - Never mutate the central mapping.
// ---------------------------------------------------------------------------

/**
 * Return the readonly capability list for a role.
 * Returns a defensive copy so the caller cannot mutate the central mapping.
 * Returns [] for any role value not present in ROLE_CAPABILITIES.
 */
export function getCapabilities(
  role: UserRole | string | undefined | null,
): readonly Capability[] {
  if (!role || !(role in ROLE_CAPABILITIES)) {
    return [];
  }
  // Spread creates a new array — mutations by the caller do not affect the
  // central ROLE_CAPABILITIES mapping.
  return [...ROLE_CAPABILITIES[role as UserRole]];
}

/**
 * Return true if the role has the given capability.
 * Returns false for any unknown, missing or malformed role.
 */
export function hasCapability(
  role: UserRole | string | undefined | null,
  capability: Capability,
): boolean {
  return (getCapabilities(role) as Capability[]).includes(capability);
}

/**
 * Return true if the role has every capability in the required list.
 *
 * Edge case — empty list:
 *   `hasEveryCapability(role, [])` returns `true` (vacuously satisfied).
 *   An empty requirement is logically "no restrictions". Callers should pass
 *   at least one capability; a zero-length check is a caller logic error and
 *   is documented here rather than throwing, so the helper remains safe.
 */
export function hasEveryCapability(
  role: UserRole | string | undefined | null,
  capabilities: readonly Capability[],
): boolean {
  if (capabilities.length === 0) {
    // Vacuously true — no restrictions specified. Documented intentional edge case.
    return true;
  }
  const resolved = getCapabilities(role) as Capability[];
  return capabilities.every((cap) => resolved.includes(cap));
}

/**
 * Return true if the role has at least one capability in the required list.
 *
 * Edge case — empty list:
 *   `hasAnyCapability(role, [])` returns `false` (no affirmative match).
 *   There is nothing to match, so no positive grant is made. Documented
 *   intentional edge case.
 */
export function hasAnyCapability(
  role: UserRole | string | undefined | null,
  capabilities: readonly Capability[],
): boolean {
  if (capabilities.length === 0) {
    // No capabilities requested → no affirmative grant. Documented intentional edge case.
    return false;
  }
  const resolved = getCapabilities(role) as Capability[];
  return capabilities.some((cap) => resolved.includes(cap));
}
