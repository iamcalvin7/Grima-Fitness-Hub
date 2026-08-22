import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { bookingsTable, db } from "@workspace/db";
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
    const attended = await request(app)
      .post(`/api/admin/bookings/${rescheduledBookingId}/attended`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    expect(attended.body.booking.status).toBe("attended");
  });
});