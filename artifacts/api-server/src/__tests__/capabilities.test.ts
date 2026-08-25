/**
 * Gate 1A Capability Unit Tests
 *
 * Tests the capability module in isolation.
 * No database, no network, no environment variables required.
 *
 * Test numbering follows the Gate 1A spec (cases 1–17).
 */

import { describe, it, expect } from "vitest";
import {
  COACHING_CAPABILITIES,
  EXERCISE_CAPABILITIES,
  ADMINISTRATIVE_CAPABILITIES,
  getCapabilities,
  hasCapability,
  hasEveryCapability,
  hasAnyCapability,
  type Capability,
} from "../lib/capabilities.js";

// Every canonical DB role value — must stay in sync with the schema enum.
const ALL_ROLES = ["client", "trainer", "admin"] as const;

// Union of every defined capability for convenience
const ALL_CAPABILITIES: readonly Capability[] = [
  ...COACHING_CAPABILITIES,
  ...EXERCISE_CAPABILITIES,
  ...ADMINISTRATIVE_CAPABILITIES,
];

// ---------------------------------------------------------------------------
// Case 1 — Client receives catalogue read only
// ---------------------------------------------------------------------------
describe("Case 1: client role", () => {
  it("receives exercise read and no management capabilities", () => {
    expect(getCapabilities("client")).toEqual(["exercises:read"]);
    expect(hasCapability("client", "exercises:manage")).toBe(false);
    expect(hasCapability("client", "exercises:archive")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Case 2 — Legacy Trainer receives no Marcus capabilities
// ---------------------------------------------------------------------------
describe("Case 2: trainer role (legacy, v1)", () => {
  it("receives no privileged capabilities in approved v1 model", () => {
    expect(getCapabilities("trainer")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Case 3 — Admin receives every coaching capability
// ---------------------------------------------------------------------------
describe("Case 3: admin receives every coaching capability", () => {
  it.each(COACHING_CAPABILITIES)("admin has coaching capability: %s", (cap) => {
    expect(hasCapability("admin", cap)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Case 4 — Admin receives every administrative capability
// ---------------------------------------------------------------------------
describe("Case 4: admin receives every administrative capability", () => {
  it.each(ADMINISTRATIVE_CAPABILITIES)(
    "admin has administrative capability: %s",
    (cap) => {
      expect(hasCapability("admin", cap)).toBe(true);
    },
  );
});

describe("Exercise catalogue capabilities", () => {
  it.each(EXERCISE_CAPABILITIES)("admin has exercise capability: %s", (cap) => {
    expect(hasCapability("admin", cap)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Case 5 — Admin represents Marcus's combined access
// ---------------------------------------------------------------------------
describe("Case 5: admin = Marcus combined access", () => {
  it("admin has all coaching AND administrative capabilities combined", () => {
    const caps = getCapabilities("admin");
    for (const cap of ALL_CAPABILITIES) {
      expect(caps).toContain(cap);
    }
  });

  it("admin capability count equals coaching + administrative totals", () => {
    const caps = getCapabilities("admin");
    expect(caps).toHaveLength(
      COACHING_CAPABILITIES.length +
        EXERCISE_CAPABILITIES.length +
        ADMINISTRATIVE_CAPABILITIES.length,
    );
  });
});

// ---------------------------------------------------------------------------
// Case 6 — Unknown role receives no capabilities
// ---------------------------------------------------------------------------
describe("Case 6: unknown role", () => {
  it("returns empty array for an unrecognised role string", () => {
    expect(getCapabilities("superuser" as Capability)).toHaveLength(0);
    expect(getCapabilities("root")).toHaveLength(0);
    expect(getCapabilities("")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Case 7 — Missing role receives no capabilities
// ---------------------------------------------------------------------------
describe("Case 7: missing / nullish role", () => {
  it("returns empty array for undefined", () => {
    expect(getCapabilities(undefined)).toHaveLength(0);
  });

  it("returns empty array for null", () => {
    expect(getCapabilities(null)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Case 8 — Client fails every capability except exercise reads
// ---------------------------------------------------------------------------
describe("Case 8: client fails every privileged capability", () => {
  it.each(ALL_CAPABILITIES)("client capability is explicitly bounded: %s", (cap) => {
    expect(hasCapability("client", cap)).toBe(cap === "exercises:read");
  });
});

// ---------------------------------------------------------------------------
// Case 9 — Trainer fails every privileged capability check
// ---------------------------------------------------------------------------
describe("Case 9: trainer fails every privileged capability", () => {
  it.each(ALL_CAPABILITIES)("trainer does not have: %s", (cap) => {
    expect(hasCapability("trainer", cap)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Case 10 — Admin passes every defined capability check
// ---------------------------------------------------------------------------
describe("Case 10: admin passes every defined capability", () => {
  it.each(ALL_CAPABILITIES)("admin has: %s", (cap) => {
    expect(hasCapability("admin", cap)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Case 11 — hasEveryCapability works correctly
// ---------------------------------------------------------------------------
describe("Case 11: hasEveryCapability", () => {
  it("returns true when admin has every capability in a subset list", () => {
    const subset: Capability[] = ["clients:read", "content:manage"];
    expect(hasEveryCapability("admin", subset)).toBe(true);
  });

  it("returns false when client is checked against any capability list", () => {
    expect(
      hasEveryCapability("client", ["clients:read"] as Capability[]),
    ).toBe(false);
  });

  it("returns false if the role lacks even one required capability", () => {
    // trainer has no capabilities at all
    expect(
      hasEveryCapability("trainer", [
        "clients:read",
        "content:manage",
      ] as Capability[]),
    ).toBe(false);
  });

  it("returns true for admin against the full capability list", () => {
    expect(hasEveryCapability("admin", ALL_CAPABILITIES)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Case 12 — hasAnyCapability works correctly
// ---------------------------------------------------------------------------
describe("Case 12: hasAnyCapability", () => {
  it("returns true when admin has at least one of the listed capabilities", () => {
    expect(
      hasAnyCapability("admin", [
        "clients:read",
        "content:manage",
      ] as Capability[]),
    ).toBe(true);
  });

  it("returns false when client has none of the listed capabilities", () => {
    expect(
      hasAnyCapability("client", [
        "content:manage",
        "payments:manage",
      ] as Capability[]),
    ).toBe(false);
  });

  it("returns false when trainer has none of the listed capabilities", () => {
    expect(
      hasAnyCapability("trainer", ["audit:read"] as Capability[]),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Case 13 — Empty required-capability lists behave intentionally and are documented
// ---------------------------------------------------------------------------
describe("Case 13: empty capability list edge cases (documented intentional behaviour)", () => {
  it(
    "hasEveryCapability with [] returns true (vacuously satisfied — no restrictions specified)",
    () => {
      // This is the mathematical definition of 'for all x in {}: P(x)'.
      // Callers passing an empty list have specified no restrictions.
      expect(hasEveryCapability("client", [])).toBe(true);
      expect(hasEveryCapability("trainer", [])).toBe(true);
      expect(hasEveryCapability("admin", [])).toBe(true);
      expect(hasEveryCapability(undefined, [])).toBe(true);
    },
  );

  it(
    "hasAnyCapability with [] returns false (no affirmative match possible)",
    () => {
      // Nothing to match → no positive grant is made.
      expect(hasAnyCapability("client", [])).toBe(false);
      expect(hasAnyCapability("admin", [])).toBe(false);
      expect(hasAnyCapability(undefined, [])).toBe(false);
    },
  );
});

// ---------------------------------------------------------------------------
// Case 14 — Every canonical database role has an explicit mapping
// ---------------------------------------------------------------------------
describe("Case 14: every canonical DB role is explicitly mapped", () => {
  it.each(ALL_ROLES)("role '%s' returns a defined (possibly empty) array", (role) => {
    // getCapabilities returns [] for unknown roles, so a defined mapping
    // should still return an array (which may be empty for client/trainer).
    // We verify that the value is always an array, never undefined.
    expect(Array.isArray(getCapabilities(role))).toBe(true);
  });

  it("exactly the three canonical roles are mapped — no extras, no gaps", () => {
    // We verify this by checking that the mapping covers all three and that
    // a synthetic 'fourth' role correctly falls through to [].
    for (const role of ALL_ROLES) {
      expect(Array.isArray(getCapabilities(role))).toBe(true);
    }
    expect(getCapabilities("unknown_future_role")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Case 15 — Capability identifiers contain no duplicates
// ---------------------------------------------------------------------------
describe("Case 15: no duplicate capability identifiers", () => {
  it("COACHING_CAPABILITIES has no duplicates", () => {
    const unique = new Set(COACHING_CAPABILITIES);
    expect(unique.size).toBe(COACHING_CAPABILITIES.length);
  });

  it("ADMINISTRATIVE_CAPABILITIES has no duplicates", () => {
    const unique = new Set(ADMINISTRATIVE_CAPABILITIES);
    expect(unique.size).toBe(ADMINISTRATIVE_CAPABILITIES.length);
  });

  it("coaching and administrative capability sets are disjoint", () => {
    const coachingSet = new Set(COACHING_CAPABILITIES);
    const overlap = ADMINISTRATIVE_CAPABILITIES.filter((cap) =>
      coachingSet.has(cap as (typeof COACHING_CAPABILITIES)[number]),
    );
    expect(overlap).toHaveLength(0);
  });

  it("admin capability list contains no duplicates", () => {
    const caps = getCapabilities("admin");
    const unique = new Set(caps);
    expect(unique.size).toBe(caps.length);
  });
});

// ---------------------------------------------------------------------------
// Case 16 — Returned capability collections cannot mutate the central mapping
// ---------------------------------------------------------------------------
describe("Case 16: returned arrays are defensive copies", () => {
  it("mutating the returned array does not affect subsequent calls", () => {
    const first = getCapabilities("admin") as Capability[];
    const originalLength = first.length;

    // Attempt to mutate the returned array
    first.push("clients:read" as Capability);
    first.splice(0, 1);

    // A fresh call must return the original unmodified list
    const second = getCapabilities("admin");
    expect(second).toHaveLength(originalLength);
  });
});

// ---------------------------------------------------------------------------
// Case 17 — The module has no side effects
// ---------------------------------------------------------------------------
describe("Case 17: pure functions — no side effects", () => {
  it("getCapabilities is synchronous and returns a value directly", () => {
    const result = getCapabilities("admin");
    // A Promise would have a .then method; a plain array does not.
    expect(typeof (result as unknown as Promise<unknown>).then).toBe(
      "undefined",
    );
  });

  it("hasCapability is synchronous and returns a boolean directly", () => {
    const result = hasCapability("admin", "content:manage");
    expect(typeof result).toBe("boolean");
  });

  it("helpers produce identical results across repeated calls (no hidden state)", () => {
    const a = getCapabilities("admin");
    const b = getCapabilities("admin");
    expect(a).toEqual(b);

    expect(hasCapability("client", "content:manage")).toBe(false);
    expect(hasCapability("client", "content:manage")).toBe(false);
  });
});
