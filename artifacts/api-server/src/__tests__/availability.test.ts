import { describe, expect, it } from "vitest";
import {
  generateLocalSlots,
  resolveLocalDateTime,
  validateRuleTimes,
  validateTimezone,
} from "../lib/availability";

describe("recurring availability local-time engine", () => {
  const rule = {
    weekday: 1,
    startsLocalTime: "09:00",
    endsLocalTime: "12:00",
    slotIntervalMinutes: null,
    effectiveFrom: "2026-08-24",
    effectiveUntil: "2026-08-24",
  };

  it("uses session duration as the default slot spacing", () => {
    expect(generateLocalSlots(rule, 60, "2026-08-24", "2026-08-24")).toEqual([
      { date: "2026-08-24", time: "09:00" },
      { date: "2026-08-24", time: "10:00" },
      { date: "2026-08-24", time: "11:00" },
    ]);
  });

  it("rejects invalid rule windows and supports validated IANA locations", () => {
    expect(
      validateRuleTimes({
        ...rule,
        startsLocalTime: "12:00",
        endsLocalTime: "09:00",
      }),
    ).toContain("after");
    expect(validateTimezone("Europe/Malta")).toBe(true);
    expect(validateTimezone("Not/AZone")).toBe(false);
  });

  it("skips a nonexistent Europe/Malta spring-forward wall time", () => {
    expect(resolveLocalDateTime("2026-03-29", "02:30", "Europe/Malta")).toBeNull();
  });

  it("chooses the earlier instant for an ambiguous Europe/Malta autumn wall time", () => {
    const resolved = resolveLocalDateTime("2026-10-25", "02:30", "Europe/Malta");
    expect(resolved?.toISOString()).toBe("2026-10-25T00:30:00.000Z");
  });
});