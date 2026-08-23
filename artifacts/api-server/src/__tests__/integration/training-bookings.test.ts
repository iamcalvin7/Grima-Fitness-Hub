import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { and, eq } from "drizzle-orm";
import {
  bookingsTable,
  bookingCommercialsTable,
  commercialSettlementsTable,
  db,
  trainingSessionsTable,
  trainingValueLedgerTable,
} from "@workspace/db";
import {
  app,
  countAuditLogs,
  createSession,
  createTenant,
  createUser,
  sessionCookie,
  type Tenant,
  type User,
} from "./harness";

let tenantA: Tenant;
let tenantB: Tenant;
let adminA: User;
let adminB: User;
let trainerA: User;
let clientA: User;
let clientB: User;
let clientC: User;
let adminAToken: string;
let adminBToken: string;
let trainerAToken: string;
let clientAToken: string;
let clientBToken: string;
let clientCToken: string;
let locationId: string;
let sessionTypeId: string;
let primarySessionId: string;

const future = (days: number, hours = 10) => {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  date.setUTCHours(hours, 0, 0, 0);
  return date.toISOString();
};

async function createManagedSession(
  token: string,
  capacity = 2,
  startsAt = future(8),
) {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + 60 * 60 * 1000).toISOString();
  return request(app)
    .post("/api/admin/training-sessions")
    .set("Cookie", sessionCookie(token))
    .send({
      sessionTypeId,
      locationId,
      startsAt,
      endsAt: end,
      capacity,
    });
}

beforeAll(async () => {
  tenantA = await createTenant({ slug: "booking-a", name: "Booking A" });
  tenantB = await createTenant({ slug: "booking-b", name: "Booking B" });
  adminA = await createUser(tenantA.id, { role: "admin" });
  adminB = await createUser(tenantB.id, { role: "admin" });
  trainerA = await createUser(tenantA.id, { role: "trainer" });
  clientA = await createUser(tenantA.id, { role: "client" });
  clientB = await createUser(tenantA.id, { role: "client" });
  clientC = await createUser(tenantA.id, { role: "client" });

  adminAToken = (await createSession(adminA.id)).token;
  adminBToken = (await createSession(adminB.id)).token;
  trainerAToken = (await createSession(trainerA.id)).token;
  clientAToken = (await createSession(clientA.id)).token;
  clientBToken = (await createSession(clientB.id)).token;
  clientCToken = (await createSession(clientC.id)).token;

  const pricingPlan = await request(app)
    .post("/api/admin/commercial/pricing-plans")
    .set("Cookie", sessionCookie(adminAToken))
    .send({
      name: "Integration default",
      kind: "default",
      rates: [
        { participantCount: 1, amountMinor: 9000 },
        { participantCount: 2, amountMinor: 6000 },
        { participantCount: 3, amountMinor: 4500 },
      ],
    })
    .expect(201);
  expect(pricingPlan.body.pricingPlan.kind).toBe("default");

  for (const client of [clientA, clientB, clientC]) {
    await request(app)
      .post(`/api/admin/commercial/clients/${client.id}/value`)
      .set("Cookie", sessionCookie(adminAToken))
      .send({
        amountMinor: 100_000,
        reason: "Integration fixture value",
        idempotencyKey: `fixture-value-${client.id}`,
      })
      .expect(201);
  }

  const location = await request(app)
    .post("/api/admin/training-locations")
    .set("Cookie", sessionCookie(adminAToken))
    .send({ name: "Sliema Studio" })
    .expect(201);
  locationId = location.body.location.id;

  const type = await request(app)
    .post("/api/admin/session-types")
    .set("Cookie", sessionCookie(adminAToken))
    .send({ name: "Personal Training", durationMinutes: 60, defaultCapacity: 2 })
    .expect(201);
  sessionTypeId = type.body.sessionType.id;

  const session = await createManagedSession(adminAToken, 2);
  expect(session.status).toBe(201);
  primarySessionId = session.body.session.id;
});

describe("training booking permissions and discovery", () => {
  it("requires authentication for client discovery", async () => {
    await request(app).get("/api/training-sessions").expect(401);
  });

  it("allows clients to discover their own tenant's scheduled sessions without private notes", async () => {
    const res = await request(app)
      .get("/api/training-sessions")
      .set("Cookie", sessionCookie(clientAToken))
      .expect(200);
    const session = res.body.sessions.find((item: { id: string }) => item.id === primarySessionId);
    expect(session).toMatchObject({
      id: primarySessionId,
      capacity: 2,
      remainingCapacity: 2,
      location: { id: locationId, name: "Sliema Studio", timezone: "Europe/Malta" },
    });
    expect(session).not.toHaveProperty("marcusNotes");
    expect(session).not.toHaveProperty("createdByUserId");
  });

  it("denies clients and legacy trainers every Marcus booking-management surface", async () => {
    await request(app)
      .get("/api/admin/training-locations")
      .set("Cookie", sessionCookie(clientAToken))
      .expect(403);
    await request(app)
      .get("/api/admin/training-locations")
      .set("Cookie", sessionCookie(trainerAToken))
      .expect(403);
  });

  it("tenant B's Marcus cannot read tenant A sessions", async () => {
    await request(app)
      .get(`/api/admin/training-sessions/${primarySessionId}`)
      .set("Cookie", sessionCookie(adminBToken))
      .expect(404);
  });

  it("the database rejects a booking whose client belongs to another tenant", async () => {
    await expect(
      db.insert(bookingsTable).values({
        tenantId: tenantA.id,
        trainingSessionId: primarySessionId,
        clientUserId: adminB.id,
        idempotencyKey: "cross-tenant-database-rejection",
        status: "pending",
      }),
    ).rejects.toThrow();
  });

  it("hides and refuses sessions whose session type was deactivated", async () => {
    const type = await request(app)
      .post("/api/admin/session-types")
      .set("Cookie", sessionCookie(adminAToken))
      .send({ name: "Temporary Type", durationMinutes: 45, defaultCapacity: 1 })
      .expect(201);
    const inactiveTypeId = type.body.sessionType.id;
    const startsAt = future(7, 14);
    const endsAt = new Date(
      new Date(startsAt).getTime() + 45 * 60 * 1000,
    ).toISOString();
    const session = await request(app)
      .post("/api/admin/training-sessions")
      .set("Cookie", sessionCookie(adminAToken))
      .send({
        sessionTypeId: inactiveTypeId,
        locationId,
        startsAt,
        endsAt,
        capacity: 1,
      })
      .expect(201);
    const inactiveSessionId = session.body.session.id;
    await request(app)
      .post(`/api/admin/session-types/${inactiveTypeId}/deactivate`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    await request(app)
      .get(`/api/training-sessions/${inactiveSessionId}`)
      .set("Cookie", sessionCookie(clientAToken))
      .expect(404);
    await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientAToken))
      .send({
        trainingSessionId: inactiveSessionId,
        idempotencyKey: "inactive-session-refusal",
      })
      .expect(409);
  });
});

describe("booking creation, idempotency, ownership and capacity", () => {
  let bookingAId: string;

  it("creates a pending booking, derives client and tenant server-side, and audits once", async () => {
    const before = await countAuditLogs(tenantA.id, "booking:create");
    const res = await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientAToken))
      .send({
        trainingSessionId: primarySessionId,
        idempotencyKey: "client-a-primary",
        tenantId: tenantB.id,
        clientUserId: clientB.id,
      })
      .expect(201);
    bookingAId = res.body.booking.id;
    expect(res.body.booking).toMatchObject({
      trainingSessionId: primarySessionId,
      clientUserId: clientA.id,
      tenantId: tenantA.id,
      status: "pending",
    });
    expect(await countAuditLogs(tenantA.id, "booking:create")).toBe(before + 1);
  });

  it("replays the same idempotency key without a duplicate audit record", async () => {
    const before = await countAuditLogs(tenantA.id, "booking:create");
    const res = await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientAToken))
      .send({ trainingSessionId: primarySessionId, idempotencyKey: "client-a-primary" })
      .expect(200);
    expect(res.body.replayed).toBe(true);
    expect(res.body.booking.id).toBe(bookingAId);
    expect(await countAuditLogs(tenantA.id, "booking:create")).toBe(before);
  });

  it("refuses a duplicate active booking by the same client", async () => {
    await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientAToken))
      .send({ trainingSessionId: primarySessionId, idempotencyKey: "client-a-duplicate" })
      .expect(409);
  });

  it("does not disclose another client's booking", async () => {
    await request(app)
      .get(`/api/bookings/${bookingAId}`)
      .set("Cookie", sessionCookie(clientBToken))
      .expect(404);
  });

  it("pending bookings reserve capacity and a full session refuses the final place", async () => {
    await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientBToken))
      .send({ trainingSessionId: primarySessionId, idempotencyKey: "client-b-primary" })
      .expect(201);
    await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientCToken))
      .send({ trainingSessionId: primarySessionId, idempotencyKey: "client-c-full" })
      .expect(409);
  });

  it("allows clients to cancel only their own future booking and makes cancellation replay safe", async () => {
    const before = await countAuditLogs(tenantA.id, "booking:cancel");
    await request(app)
      .post(`/api/bookings/${bookingAId}/cancel`)
      .set("Cookie", sessionCookie(clientBToken))
      .send({ reason: "not mine" })
      .expect(404);
    const cancelled = await request(app)
      .post(`/api/bookings/${bookingAId}/cancel`)
      .set("Cookie", sessionCookie(clientAToken))
      .send({ reason: "Travel" })
      .expect(200);
    expect(cancelled.body.booking.status).toBe("cancelled");
    expect(cancelled.body.replayed).toBe(false);
    expect(await countAuditLogs(tenantA.id, "booking:cancel")).toBe(before + 1);
    const replay = await request(app)
      .post(`/api/bookings/${bookingAId}/cancel`)
      .set("Cookie", sessionCookie(clientAToken))
      .expect(200);
    expect(replay.body.replayed).toBe(true);
    expect(await countAuditLogs(tenantA.id, "booking:cancel")).toBe(before + 1);
  });

  it("allows exactly one concurrent booking for the final place", async () => {
    const solo = await createManagedSession(adminAToken, 1, future(9));
    expect(solo.status).toBe(201);
    const soloId = solo.body.session.id;
    const [a, c] = await Promise.all([
      request(app)
        .post("/api/bookings")
        .set("Cookie", sessionCookie(clientAToken))
        .send({ trainingSessionId: soloId, idempotencyKey: "concurrent-a" }),
      request(app)
        .post("/api/bookings")
        .set("Cookie", sessionCookie(clientCToken))
        .send({ trainingSessionId: soloId, idempotencyKey: "concurrent-c" }),
    ]);
    expect([a.status, c.status].sort()).toEqual([201, 409]);
  });

  it("replays concurrent same-key booking requests after the session lock", async () => {
    const solo = await createManagedSession(adminAToken, 1, future(12));
    expect(solo.status).toBe(201);
    const soloId = solo.body.session.id;
    const idempotencyKey = "concurrent-same-key-booking";
    const beforeAudits = await countAuditLogs(tenantA.id, "booking:create");

    const [first, second] = await Promise.all([
      request(app)
        .post("/api/bookings")
        .set("Cookie", sessionCookie(clientAToken))
        .send({ trainingSessionId: soloId, idempotencyKey }),
      request(app)
        .post("/api/bookings")
        .set("Cookie", sessionCookie(clientAToken))
        .send({ trainingSessionId: soloId, idempotencyKey }),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 201]);
    expect(first.body.booking.id).toBe(second.body.booking.id);
    expect([first.body.replayed, second.body.replayed].sort()).toEqual([false, true]);
    const rows = await db
      .select({ id: bookingsTable.id })
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.tenantId, tenantA.id),
          eq(bookingsTable.clientUserId, clientA.id),
          eq(bookingsTable.trainingSessionId, soloId),
          eq(bookingsTable.idempotencyKey, idempotencyKey),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(await countAuditLogs(tenantA.id, "booking:create")).toBe(beforeAudits + 1);
  });
});

describe("weekly type-less slots", () => {
  const mondayUtc = (weeksAhead: number, hour = 8) => {
    const date = new Date();
    const daysUntilMonday = (8 - date.getUTCDay()) % 7 || 7;
    date.setUTCDate(date.getUTCDate() + daysUntilMonday + weeksAhead * 7);
    date.setUTCHours(hour, 0, 0, 0);
    return date;
  };

  it("creates a type-less slot with explicit capacity that Clients can discover and book", async () => {
    const startsAt = future(18, 8);
    const endsAt = new Date(new Date(startsAt).getTime() + 45 * 60 * 1000).toISOString();
    const created = await request(app)
      .post("/api/admin/training-sessions")
      .set("Cookie", sessionCookie(adminAToken))
      .send({ locationId, startsAt, endsAt, capacity: 3 })
      .expect(201);
    const slotId = created.body.session.id;
    expect(created.body.session.sessionTypeId).toBeNull();

    const discovery = await request(app)
      .get(`/api/training-sessions/${slotId}`)
      .set("Cookie", sessionCookie(clientAToken))
      .expect(200);
    expect(discovery.body.session.sessionType).toBeNull();
    expect(discovery.body.session.capacity).toBe(3);
    await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientAToken))
      .send({ trainingSessionId: slotId, idempotencyKey: "type-less-slot-booking" })
      .expect(201);
  });

  it("accepts the Weekly Schedule form's valid type-less payload and explains invalid fields", async () => {
    const invalidPastStart = new Date(Date.now() - 60 * 60 * 1000);
    const invalidPastEnd = new Date(invalidPastStart.getTime() + 60 * 60 * 1000);
    const pastResponse = await request(app)
      .post("/api/admin/training-sessions")
      .set("Cookie", sessionCookie(adminAToken))
      .send({
        locationId,
        startsAt: invalidPastStart.toISOString(),
        endsAt: invalidPastEnd.toISOString(),
        capacity: 4,
      })
      .expect(400);
    expect(pastResponse.body.fields.startsAt).toContain("future");

    const startsAt = future(28, 15);
    const endsAt = new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();
    const validResponse = await request(app)
      .post("/api/admin/training-sessions")
      .set("Cookie", sessionCookie(adminAToken))
      .send({ locationId, startsAt, endsAt, capacity: 4 })
      .expect(201);
    expect(validResponse.body.session.sessionTypeId).toBeNull();
    expect(validResponse.body.session.capacity).toBe(4);

    const invalidLocation = await request(app)
      .post("/api/admin/training-sessions")
      .set("Cookie", sessionCookie(adminAToken))
      .send({
        locationId: "00000000-0000-4000-8000-000000000099",
        startsAt: future(29, 8),
        endsAt: future(29, 9),
        capacity: 4,
      })
      .expect(400);
    expect(invalidLocation.body.fields.locationId).toContain("location");

    const missingCapacity = await request(app)
      .post("/api/admin/training-sessions")
      .set("Cookie", sessionCookie(adminAToken))
      .send({ locationId, startsAt: future(30, 8), endsAt: future(30, 9) })
      .expect(400);
    expect(missingCapacity.body.fields.capacity).toContain("Maximum Clients");

    const invalidCapacity = await request(app)
      .post("/api/admin/training-sessions")
      .set("Cookie", sessionCookie(adminAToken))
      .send({ locationId, startsAt: future(31, 8), endsAt: future(31, 9), capacity: 0 })
      .expect(400);
    expect(invalidCapacity.body.fields.capacity).toContain("whole number");

    const invalidRange = await request(app)
      .post("/api/admin/training-sessions")
      .set("Cookie", sessionCookie(adminAToken))
      .send({ locationId, startsAt: future(32, 10), endsAt: future(32, 9), capacity: 4 })
      .expect(400);
    expect(invalidRange.body.fields.endsAt).toContain("after");

    const malformedDate = await request(app)
      .post("/api/admin/training-sessions")
      .set("Cookie", sessionCookie(adminAToken))
      .send({ locationId, startsAt: "not-a-date", endsAt: "also-not-a-date", capacity: 4 })
      .expect(400);
    expect(malformedDate.body.fields.startsAt).toContain("valid");
    expect(malformedDate.body.fields.endsAt).toContain("valid");
  });

  it("locks every scheduling field and deletion once a slot has an active booking", async () => {
    const startsAt = future(19, 8);
    const endsAt = new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();
    const created = await request(app)
      .post("/api/admin/training-sessions")
      .set("Cookie", sessionCookie(adminAToken))
      .send({ locationId, startsAt, endsAt, capacity: 2 })
      .expect(201);
    const slotId = created.body.session.id;
    await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientBToken))
      .send({ trainingSessionId: slotId, idempotencyKey: "locked-slot-booking" })
      .expect(201);
    await request(app)
      .patch(`/api/admin/training-sessions/${slotId}`)
      .set("Cookie", sessionCookie(adminAToken))
      .send({ capacity: 3 })
      .expect(409);
    await request(app)
      .delete(`/api/admin/training-sessions/${slotId}`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(409);
  });

  it("copies unbooked slots from the previous week without copying bookings or overwriting overlaps", async () => {
    const sourceStart = mondayUtc(4, 8);
    const sourceEnd = new Date(sourceStart.getTime() + 60 * 60 * 1000);
    const source = await request(app)
      .post("/api/admin/training-sessions")
      .set("Cookie", sessionCookie(adminAToken))
      .send({ locationId, startsAt: sourceStart.toISOString(), endsAt: sourceEnd.toISOString(), capacity: 2 })
      .expect(201);
    const targetWeekStart = new Date(sourceStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const copied = await request(app)
      .post("/api/admin/training-sessions/copy-previous-week")
      .set("Cookie", sessionCookie(adminAToken))
      .send({ targetWeekStart: targetWeekStart.toISOString().slice(0, 10) })
      .expect(201);
    expect(copied.body.created).toEqual(
      expect.arrayContaining([expect.objectContaining({ sourceSessionId: source.body.session.id })]),
    );
    const copiedSessionId = copied.body.created.find((item: { sourceSessionId: string }) => item.sourceSessionId === source.body.session.id).sessionId;
    await request(app)
      .get(`/api/training-sessions/${copiedSessionId}`)
      .set("Cookie", sessionCookie(clientCToken))
      .expect(200);
    await request(app)
      .post("/api/admin/training-sessions/copy-previous-week")
      .set("Cookie", sessionCookie(adminAToken))
      .send({ targetWeekStart: targetWeekStart.toISOString().slice(0, 10) })
      .expect(201)
      .expect((response) => expect(response.body.skipped.length + response.body.conflicts.length).toBeGreaterThan(0));
  });
});

describe("Marcus session overlap validation", () => {
  const createTypeLessSlot = (startsAt: string, endsAt: string) =>
    request(app)
      .post("/api/admin/training-sessions")
      .set("Cookie", sessionCookie(adminAToken))
      .send({ locationId, startsAt, endsAt, capacity: 4 });

  it("compares complete datetime ranges, preserves boundaries, and excludes the session being updated", async () => {
    const base = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    base.setUTCHours(10, 0, 0, 0);
    const at = (daysFromBase: number, hour: number, minute = 0) => {
      const value = new Date(base);
      value.setUTCDate(value.getUTCDate() + daysFromBase);
      value.setUTCHours(hour, minute, 0, 0);
      return value.toISOString();
    };
    const dateKey = (daysFromBase: number) => at(daysFromBase, 12).slice(0, 10);

    const existing = await createTypeLessSlot(at(0, 10), at(0, 11)).expect(201);
    const existingId = existing.body.session.id;

    await createTypeLessSlot(at(0, 10, 30), at(0, 11, 30)).expect(409); // partial overlap
    await createTypeLessSlot(at(0, 10), at(0, 11)).expect(409); // exact same range
    await createTypeLessSlot(at(0, 10, 15), at(0, 10, 45)).expect(409); // contained range
    await createTypeLessSlot(at(0, 9, 30), at(0, 10, 30)).expect(409); // partial overlap from before

    const earlier = await createTypeLessSlot(at(0, 8), at(0, 9)).expect(201);
    await createTypeLessSlot(at(0, 12), at(0, 13)).expect(201);
    await createTypeLessSlot(at(0, 11), at(0, 12)).expect(201); // back-to-back
    await createTypeLessSlot(at(1, 10), at(1, 11)).expect(201); // same time, next day

    const offsetStart = `${dateKey(2)}T23:30:00+02:00`;
    const offsetEnd = `${dateKey(3)}T00:30:00+02:00`;
    const nextOffsetStart = `${dateKey(3)}T00:45:00+02:00`;
    const nextOffsetEnd = `${dateKey(3)}T01:45:00+02:00`;
    await createTypeLessSlot(offsetStart, offsetEnd).expect(201);
    await createTypeLessSlot(nextOffsetStart, nextOffsetEnd).expect(201);

    await request(app)
      .patch(`/api/admin/training-sessions/${existingId}`)
      .set("Cookie", sessionCookie(adminAToken))
      .send({ startsAt: at(0, 10), endsAt: at(0, 11) })
      .expect(200); // updating itself must not self-overlap

    await request(app)
      .patch(`/api/admin/training-sessions/${earlier.body.session.id}`)
      .set("Cookie", sessionCookie(adminAToken))
      .send({ startsAt: at(0, 10, 15), endsAt: at(0, 10, 45) })
      .expect(409); // updating into another session must overlap
  });
});

describe("rescheduling and Marcus workflow", () => {
  let sourceBookingId: string;
  let rescheduledBookingId: string;

  it("reschedules atomically, preserving the old record and creating a pending replacement", async () => {
    const source = await createManagedSession(adminAToken, 2, future(10));
    const target = await createManagedSession(adminAToken, 2, future(11));
    const sourceId = source.body.session.id;
    const targetId = target.body.session.id;
    const booking = await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientAToken))
      .send({ trainingSessionId: sourceId, idempotencyKey: "reschedule-source" })
      .expect(201);
    sourceBookingId = booking.body.booking.id;

    const before = await countAuditLogs(tenantA.id, "booking:reschedule");
    const rescheduled = await request(app)
      .post(`/api/bookings/${sourceBookingId}/reschedule`)
      .set("Cookie", sessionCookie(clientAToken))
      .send({
        replacementTrainingSessionId: targetId,
        idempotencyKey: "reschedule-target",
      })
      .expect(201);
    rescheduledBookingId = rescheduled.body.booking.id;
    expect(rescheduled.body.booking).toMatchObject({
      status: "pending",
      trainingSessionId: targetId,
      rescheduledFromBookingId: sourceBookingId,
    });
    expect(await countAuditLogs(tenantA.id, "booking:reschedule")).toBe(before + 1);
    const old = await request(app)
      .get(`/api/bookings/${sourceBookingId}`)
      .set("Cookie", sessionCookie(clientAToken))
      .expect(200);
    expect(old.body.booking.status).toBe("rescheduled");
  });

  it("replays a reschedule request safely", async () => {
    const replay = await request(app)
      .post(`/api/bookings/${sourceBookingId}/reschedule`)
      .set("Cookie", sessionCookie(clientAToken))
      .send({
        replacementTrainingSessionId: "00000000-0000-4000-8000-000000000000",
        idempotencyKey: "reschedule-target",
      })
      .expect(200);
    expect(replay.body.replayed).toBe(true);
    expect(replay.body.booking.id).toBe(rescheduledBookingId);
  });

  it("replays concurrent same-key reschedules after locking both sessions", async () => {
    const source = await createManagedSession(adminAToken, 1, future(13));
    const target = await createManagedSession(adminAToken, 1, future(14));
    const sourceBooking = await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientBToken))
      .send({ trainingSessionId: source.body.session.id, idempotencyKey: "concurrent-reschedule-source" })
      .expect(201);
    const sourceBookingId = sourceBooking.body.booking.id;
    const idempotencyKey = "concurrent-same-key-reschedule";
    const beforeAudits = await countAuditLogs(tenantA.id, "booking:reschedule");

    const [first, second] = await Promise.all([
      request(app)
        .post(`/api/bookings/${sourceBookingId}/reschedule`)
        .set("Cookie", sessionCookie(clientBToken))
        .send({ replacementTrainingSessionId: target.body.session.id, idempotencyKey }),
      request(app)
        .post(`/api/bookings/${sourceBookingId}/reschedule`)
        .set("Cookie", sessionCookie(clientBToken))
        .send({ replacementTrainingSessionId: target.body.session.id, idempotencyKey }),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 201]);
    expect(first.body.booking.id).toBe(second.body.booking.id);
    expect([first.body.replayed, second.body.replayed].sort()).toEqual([false, true]);
    const replacements = await db
      .select({ id: bookingsTable.id })
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.tenantId, tenantA.id),
          eq(bookingsTable.clientUserId, clientB.id),
          eq(bookingsTable.trainingSessionId, target.body.session.id),
          eq(bookingsTable.idempotencyKey, idempotencyKey),
        ),
      );
    expect(replacements).toHaveLength(1);
    expect(await countAuditLogs(tenantA.id, "booking:reschedule")).toBe(beforeAudits + 1);
    const original = await request(app)
      .get(`/api/bookings/${sourceBookingId}`)
      .set("Cookie", sessionCookie(clientBToken))
      .expect(200);
    expect(original.body.booking.status).toBe("rescheduled");
  });

  it("allows Marcus to confirm, then record attendance, and rejects invalid transitions", async () => {
    const confirmed = await request(app)
      .post(`/api/admin/bookings/${rescheduledBookingId}/confirm`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    expect(confirmed.body.booking.status).toBe("confirmed");
    await request(app)
      .post(`/api/admin/bookings/${rescheduledBookingId}/reject`)
      .set("Cookie", sessionCookie(adminAToken))
      .send({ reason: "too late" })
      .expect(409);
    await request(app)
      .post(`/api/admin/commercial/sessions/${confirmed.body.booking.trainingSessionId}/close`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(201);
    const attended = await request(app)
      .post(`/api/admin/bookings/${rescheduledBookingId}/attended`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    expect(attended.body.booking.status).toBe("attended");
    expect(attended.body.booking.attendanceAt).toBeTruthy();
    const repeated = await request(app)
      .post(`/api/admin/bookings/${rescheduledBookingId}/attended`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(409);
    expect(repeated.body.error).toMatch(/Invalid booking status transition/);
  });

  it("records independent no-show outcomes for group participants and preserves the session completion flow", async () => {
    const groupSession = await createManagedSession(adminAToken, 3, future(2));
    const groupSessionId = groupSession.body.session.id;
    const clientTokens = [clientAToken, clientBToken, clientCToken];
    const bookings = [];
    for (const [index, token] of clientTokens.entries()) {
      const created = await request(app)
        .post("/api/bookings")
        .set("Cookie", sessionCookie(token))
        .send({ trainingSessionId: groupSessionId, idempotencyKey: `group-attendance-${index}` })
        .expect(201);
      bookings.push(created.body.booking.id as string);
      await request(app)
        .post(`/api/admin/bookings/${created.body.booking.id}/confirm`)
        .set("Cookie", sessionCookie(adminAToken))
        .expect(200);
    }

    const attended = await request(app)
      .post(`/api/admin/bookings/${bookings[0]}/attended`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    const noShow = await request(app)
      .post(`/api/admin/bookings/${bookings[2]}/no-show`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    expect(attended.body.booking.status).toBe("attended");
    expect(noShow.body.booking.status).toBe("no_show");

    const managed = await request(app)
      .get(`/api/admin/bookings?trainingSessionId=${groupSessionId}`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    expect(managed.body.bookings).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: bookings[0], status: "attended" }),
      expect.objectContaining({ id: bookings[1], status: "confirmed" }),
      expect.objectContaining({ id: bookings[2], status: "no_show" }),
    ]));

    const clientHistory = await request(app)
      .get("/api/bookings")
      .set("Cookie", sessionCookie(clientCToken))
      .expect(200);
    expect(clientHistory.body.bookings).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: bookings[2], status: "no_show", attendanceAt: expect.any(String) }),
    ]));
  });

  it("automatically locks full classes from confirmed participants and preserves that price after a cancellation", async () => {
    const session = await createManagedSession(adminAToken, 2, future(50));
    expect(session.status).toBe(201);
    const sessionId = session.body.session.id as string;
    const first = await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientAToken))
      .send({ trainingSessionId: sessionId, idempotencyKey: "class-close-auto-a" })
      .expect(201);
    const second = await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientBToken))
      .send({ trainingSessionId: sessionId, idempotencyKey: "class-close-auto-b" })
      .expect(201);
    await request(app)
      .post(`/api/admin/bookings/${first.body.booking.id}/confirm`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    await request(app)
      .post(`/api/admin/bookings/${second.body.booking.id}/confirm`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);

    const summary = await request(app)
      .get(`/api/admin/commercial/sessions/${sessionId}/pricing-summary`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    expect(summary.body.classPricing).toMatchObject({
      state: "closed",
      confirmedParticipantCount: 2,
    });
    expect(summary.body.classPricing.participants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bookingId: first.body.booking.id,
          maximumHeldAmountMinor: 9000,
          heldAmountMinor: 6000,
          lockedAmountMinor: 6000,
          lockedParticipantCount: 2,
        }),
      ]),
    );
    await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientCToken))
      .send({ trainingSessionId: sessionId, idempotencyKey: "class-close-auto-blocked" })
      .expect(409);

    await request(app)
      .post(`/api/bookings/${second.body.booking.id}/cancel`)
      .set("Cookie", sessionCookie(clientBToken))
      .expect(200);
    const firstBooking = await request(app)
      .get(`/api/bookings/${first.body.booking.id}`)
      .set("Cookie", sessionCookie(clientAToken))
      .expect(200);
    expect(firstBooking.body.booking.commercial).toMatchObject({
      lockedChargeAmountMinor: 6000,
      lockedParticipantCount: 2,
      reservedAmountMinor: 6000,
    });
  });

  it("manually locks an open class and limits no-show charges to the locked amount", async () => {
    const session = await createManagedSession(adminAToken, 3, future(51));
    expect(session.status).toBe(201);
    const sessionId = session.body.session.id as string;
    const first = await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientAToken))
      .send({ trainingSessionId: sessionId, idempotencyKey: "class-close-manual-a" })
      .expect(201);
    const second = await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientBToken))
      .send({ trainingSessionId: sessionId, idempotencyKey: "class-close-manual-b" })
      .expect(201);
    for (const bookingId of [first.body.booking.id, second.body.booking.id]) {
      await request(app)
        .post(`/api/admin/bookings/${bookingId}/confirm`)
        .set("Cookie", sessionCookie(adminAToken))
        .expect(200);
    }
    await request(app)
      .post(`/api/admin/commercial/sessions/${sessionId}/close`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(201);
    await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientCToken))
      .send({ trainingSessionId: sessionId, idempotencyKey: "class-close-manual-blocked" })
      .expect(409);

    await request(app)
      .post(`/api/admin/bookings/${first.body.booking.id}/no-show`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    await request(app)
      .post(`/api/admin/commercial/bookings/${first.body.booking.id}/no-show-decision`)
      .set("Cookie", sessionCookie(adminAToken))
      .send({ waived: false, selectedChargeAmountMinor: 6001 })
      .expect(400);
    const decision = await request(app)
      .post(`/api/admin/commercial/bookings/${first.body.booking.id}/no-show-decision`)
      .set("Cookie", sessionCookie(adminAToken))
      .send({ waived: false, selectedChargeAmountMinor: 6000 })
      .expect(201);
    expect(decision.body.decision).toMatchObject({
      heldAmountMinor: 6000,
      selectedChargeAmountMinor: 6000,
    });
  });

  it("derives wallet activity and revenue only from settled locked session value", async () => {
    const session = await createManagedSession(adminAToken, 3, future(56));
    const sessionId = session.body.session.id as string;
    const clients = [
      [clientAToken, "wallet-revenue-a"],
      [clientBToken, "wallet-revenue-b"],
      [clientCToken, "wallet-revenue-c"],
    ] as const;
    const bookingIds: string[] = [];
    for (const [token, idempotencyKey] of clients) {
      const booking = await request(app)
        .post("/api/bookings")
        .set("Cookie", sessionCookie(token))
        .send({ trainingSessionId: sessionId, idempotencyKey })
        .expect(201);
      bookingIds.push(booking.body.booking.id);
      await request(app)
        .post(`/api/admin/bookings/${booking.body.booking.id}/confirm`)
        .set("Cookie", sessionCookie(adminAToken))
        .expect(200);
    }
    await request(app)
      .post(`/api/admin/commercial/sessions/${sessionId}/close`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);

    const [revenueBefore, walletBefore] = await Promise.all([
      request(app)
        .get("/api/admin/commercial/revenue/summary")
        .set("Cookie", sessionCookie(adminAToken))
        .expect(200),
      request(app)
        .get("/api/commercial/balance")
        .set("Cookie", sessionCookie(clientAToken))
        .expect(200),
    ]);
    expect(walletBefore.body.balance.heldValueMinor).toBeGreaterThanOrEqual(4500);
    const walletBeforeSettlement = walletBefore.body.balance;
    const beforeRevenue = revenueBefore.body.revenue.month.amountMinor;

    await request(app)
      .post(`/api/admin/bookings/${bookingIds[0]}/attended`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    await request(app)
      .post(`/api/admin/bookings/${bookingIds[1]}/attended`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    await request(app)
      .post(`/api/admin/bookings/${bookingIds[2]}/no-show`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    await request(app)
      .post(`/api/admin/commercial/bookings/${bookingIds[2]}/no-show-decision`)
      .set("Cookie", sessionCookie(adminAToken))
      .send({ waived: false, selectedChargeAmountMinor: 4500 })
      .expect(201);
    const completedEndsAt = new Date(Date.now() - 60 * 60 * 1000);
    await db
      .update(trainingSessionsTable)
      .set({
        startsAt: new Date(completedEndsAt.getTime() - 60 * 60 * 1000),
        endsAt: completedEndsAt,
      })
      .where(
        and(
          eq(trainingSessionsTable.tenantId, tenantA.id),
          eq(trainingSessionsTable.id, sessionId),
        ),
      );
    await request(app)
      .post(`/api/admin/training-sessions/${sessionId}/complete`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    await request(app)
      .post(`/api/admin/commercial/sessions/${sessionId}/settle`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);

    const [revenueAfter, sessionRevenue, walletAfter] = await Promise.all([
      request(app)
        .get("/api/admin/commercial/revenue/summary")
        .set("Cookie", sessionCookie(adminAToken))
        .expect(200),
      request(app)
        .get(`/api/admin/commercial/sessions/${sessionId}/revenue`)
        .set("Cookie", sessionCookie(adminAToken))
        .expect(200),
      request(app)
        .get("/api/commercial/balance")
        .set("Cookie", sessionCookie(clientAToken))
        .expect(200),
    ]);
    expect(revenueAfter.body.revenue.month.amountMinor).toBe(beforeRevenue + 13500);
    expect(sessionRevenue.body.revenue).toMatchObject({
      settledRevenueMinor: 13500,
      settledCount: 3,
      pendingSettlementCount: 0,
    });
    expect(walletAfter.body.balance).toMatchObject({
      totalValueMinor: walletBeforeSettlement.totalValueMinor - 4500,
      heldValueMinor: walletBeforeSettlement.heldValueMinor - 4500,
      availableValueMinor: walletBeforeSettlement.availableValueMinor,
    });
    expect(walletAfter.body.activity).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "booking_hold", amountMinor: -9000 }),
      expect.objectContaining({ kind: "hold_released", amountMinor: 4500 }),
      expect.objectContaining({ kind: "session_value_used", amountMinor: -4500 }),
    ]));

    const [settledCommercial] = await db
      .select()
      .from(bookingCommercialsTable)
      .where(eq(bookingCommercialsTable.bookingId, bookingIds[0]))
      .limit(1);
    const [settlement] = await db
      .select()
      .from(commercialSettlementsTable)
      .where(eq(commercialSettlementsTable.bookingId, bookingIds[0]))
      .limit(1);
    const [ledgerEntry] = await db
      .select()
      .from(trainingValueLedgerTable)
      .where(
        and(
          eq(trainingValueLedgerTable.bookingId, bookingIds[0]),
          eq(trainingValueLedgerTable.movementType, "attendance_charge"),
        ),
      )
      .limit(1);
    expect(settledCommercial?.holdStatus).toBe("settled");
    expect(settlement).toBeDefined();
    expect(ledgerEntry).toBeDefined();

    await expect(
      db
        .update(bookingCommercialsTable)
        .set({ reservedAmountMinor: 1 })
        .where(eq(bookingCommercialsTable.id, settledCommercial!.id)),
    ).rejects.toThrow(/immutable/i);
    await expect(
      db
        .delete(bookingCommercialsTable)
        .where(eq(bookingCommercialsTable.id, settledCommercial!.id)),
    ).rejects.toThrow(/immutable/i);
    await expect(
      db
        .update(commercialSettlementsTable)
        .set({ finalChargeAmountMinor: 1 })
        .where(eq(commercialSettlementsTable.id, settlement!.id)),
    ).rejects.toThrow(/immutable/i);
    await expect(
      db
        .delete(commercialSettlementsTable)
        .where(eq(commercialSettlementsTable.id, settlement!.id)),
    ).rejects.toThrow(/immutable/i);
    await expect(
      db
        .update(trainingValueLedgerTable)
        .set({ amountMinor: -1 })
        .where(eq(trainingValueLedgerTable.id, ledgerEntry!.id)),
    ).rejects.toThrow(/immutable/i);
    await expect(
      db
        .delete(trainingValueLedgerTable)
        .where(eq(trainingValueLedgerTable.id, ledgerEntry!.id)),
    ).rejects.toThrow(/immutable/i);

    const revenueAfterMutationAttempts = await request(app)
      .get("/api/admin/commercial/revenue/summary")
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    expect(revenueAfterMutationAttempts.body.revenue.month.amountMinor).toBe(
      revenueAfter.body.revenue.month.amountMinor,
    );

    const waivedSession = await createManagedSession(adminAToken, 1, future(57));
    const waivedSessionId = waivedSession.body.session.id as string;
    const waivedBooking = await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientAToken))
      .send({
        trainingSessionId: waivedSessionId,
        idempotencyKey: "wallet-revenue-waived-no-show",
      })
      .expect(201);
    await request(app)
      .post(`/api/admin/bookings/${waivedBooking.body.booking.id}/confirm`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    await request(app)
      .post(`/api/admin/bookings/${waivedBooking.body.booking.id}/no-show`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    await request(app)
      .post(`/api/admin/commercial/bookings/${waivedBooking.body.booking.id}/no-show-decision`)
      .set("Cookie", sessionCookie(adminAToken))
      .send({ waived: true })
      .expect(201);
    await db
      .update(trainingSessionsTable)
      .set({
        startsAt: new Date(completedEndsAt.getTime() - 60 * 60 * 1000),
        endsAt: completedEndsAt,
      })
      .where(
        and(
          eq(trainingSessionsTable.tenantId, tenantA.id),
          eq(trainingSessionsTable.id, waivedSessionId),
        ),
      );
    await request(app)
      .post(`/api/admin/training-sessions/${waivedSessionId}/complete`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    await request(app)
      .post(`/api/admin/commercial/sessions/${waivedSessionId}/settle`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    const [revenueAfterWaiver, waivedRevenue] = await Promise.all([
      request(app)
        .get("/api/admin/commercial/revenue/summary")
        .set("Cookie", sessionCookie(adminAToken))
        .expect(200),
      request(app)
        .get(`/api/admin/commercial/sessions/${waivedSessionId}/revenue`)
        .set("Cookie", sessionCookie(adminAToken))
        .expect(200),
    ]);
    expect(revenueAfterWaiver.body.revenue.month.amountMinor).toBe(beforeRevenue + 13500);
    expect(waivedRevenue.body.revenue).toMatchObject({
      settledRevenueMinor: 0,
      settledCount: 0,
      pendingSettlementCount: 0,
    });

    await request(app)
      .post(`/api/admin/commercial/sessions/${sessionId}/settle`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    const revenueAfterReplay = await request(app)
      .get("/api/admin/commercial/revenue/summary")
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    expect(revenueAfterReplay.body.revenue.month.amountMinor).toBe(beforeRevenue + 13500);
  });
});
