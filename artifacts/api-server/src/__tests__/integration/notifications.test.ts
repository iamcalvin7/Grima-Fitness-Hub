import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import {
  app,
  createSession,
  createTenant,
  createUser,
  sessionCookie,
  type Tenant,
  type User,
} from "./harness";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

let tenant: Tenant;
let admin: User;
let client: User;
let otherClient: User;
let adminToken: string;
let clientToken: string;
let otherClientToken: string;
let locationId: string;
let sessionTypeId: string;

function future(days: number, hour: number): string {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

async function createManagedSession(startsAt: string) {
  const start = new Date(startsAt);
  const endsAt = new Date(start.getTime() + 60 * 60 * 1000).toISOString();
  return request(app)
    .post("/api/admin/training-sessions")
    .set("Cookie", sessionCookie(adminToken))
    .send({ sessionTypeId, locationId, startsAt, endsAt, capacity: 2 })
    .expect(201);
}

async function listNotifications(token: string) {
  return request(app)
    .get("/api/notifications")
    .set("Cookie", sessionCookie(token))
    .expect(200);
}

beforeAll(async () => {
  tenant = await createTenant({ slug: "notifications", name: "Notifications" });
  admin = await createUser(tenant.id, { role: "admin", firstName: "Marcus", lastName: "Grima" });
  client = await createUser(tenant.id, { role: "client", firstName: "Alex", lastName: "Client" });
  otherClient = await createUser(tenant.id, { role: "client", firstName: "Taylor", lastName: "Other" });
  adminToken = (await createSession(admin.id)).token;
  clientToken = (await createSession(client.id)).token;
  otherClientToken = (await createSession(otherClient.id)).token;

  await request(app)
    .post("/api/admin/commercial/pricing-plans")
    .set("Cookie", sessionCookie(adminToken))
    .send({
      name: "Notification default",
      kind: "default",
      rates: [{ participantCount: 1, amountMinor: 9000 }],
    })
    .expect(201);
  for (const currentClient of [client, otherClient]) {
    await request(app)
      .post(`/api/admin/commercial/clients/${currentClient.id}/value`)
      .set("Cookie", sessionCookie(adminToken))
      .send({
        amountMinor: 100_000,
        reason: "Notification fixture value",
        idempotencyKey: `fixture-value-${currentClient.id}`,
      })
      .expect(201);
  }

  const location = await request(app)
    .post("/api/admin/training-locations")
    .set("Cookie", sessionCookie(adminToken))
    .send({ name: "Notification Studio" })
    .expect(201);
  locationId = location.body.location.id;

  const type = await request(app)
    .post("/api/admin/session-types")
    .set("Cookie", sessionCookie(adminToken))
    .send({ name: "Notification PT", durationMinutes: 60, defaultCapacity: 2 })
    .expect(201);
  sessionTypeId = type.body.sessionType.id;
});

describe("booking notifications", () => {
  it("creates client and Marcus request notifications once, then protects ownership and read state", async () => {
    await request(app).get("/api/notifications").expect(401);
    const session = await createManagedSession(future(12, 9));
    const idempotencyKey = "notification-request-replay";
    const booking = await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientToken))
      .send({ trainingSessionId: session.body.session.id, idempotencyKey })
      .expect(201);

    const clientNotifications = await listNotifications(clientToken);
    const clientRequest = clientNotifications.body.notifications.find(
      (item: { eventType: string }) => item.eventType === "booking_requested",
    );
    expect(clientRequest).toMatchObject({
      bookingId: booking.body.booking.id,
      trainingSessionId: session.body.session.id,
      isRead: false,
    });

    const adminNotifications = await listNotifications(adminToken);
    expect(adminNotifications.body.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "booking_requested",
          bookingId: booking.body.booking.id,
          isRead: false,
        }),
      ]),
    );

    await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientToken))
      .send({ trainingSessionId: session.body.session.id, idempotencyKey })
      .expect(200);
    const replayNotifications = await listNotifications(clientToken);
    expect(
      replayNotifications.body.notifications.filter(
        (item: { eventType: string; bookingId: string }) =>
          item.eventType === "booking_requested" && item.bookingId === booking.body.booking.id,
      ),
    ).toHaveLength(1);

    await request(app)
      .post(`/api/notifications/${clientRequest.id}/read`)
      .set("Cookie", sessionCookie(otherClientToken))
      .expect(404);
    await request(app)
      .post(`/api/notifications/${clientRequest.id}/read`)
      .set("Cookie", sessionCookie(clientToken))
      .expect(200);
    const unread = await request(app)
      .get("/api/notifications/unread-count")
      .set("Cookie", sessionCookie(clientToken))
      .expect(200);
    expect(unread.body.count).toBe(0);
  });

  it("notifies the client on confirmation and Marcus on cancellation", async () => {
    const confirmedSession = await createManagedSession(future(13, 9));
    const confirmedBooking = await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientToken))
      .send({ trainingSessionId: confirmedSession.body.session.id, idempotencyKey: "notification-confirm" })
      .expect(201);
    await request(app)
      .post(`/api/admin/bookings/${confirmedBooking.body.booking.id}/confirm`)
      .set("Cookie", sessionCookie(adminToken))
      .expect(200);
    const clientNotifications = await listNotifications(clientToken);
    expect(clientNotifications.body.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "booking_confirmed",
          bookingId: confirmedBooking.body.booking.id,
        }),
      ]),
    );

    const cancellationSession = await createManagedSession(future(14, 9));
    const cancellationBooking = await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientToken))
      .send({ trainingSessionId: cancellationSession.body.session.id, idempotencyKey: "notification-cancel" })
      .expect(201);
    await request(app)
      .post(`/api/bookings/${cancellationBooking.body.booking.id}/cancel`)
      .set("Cookie", sessionCookie(clientToken))
      .send({ reason: "Schedule change" })
      .expect(200);

    const adminNotifications = await listNotifications(adminToken);
    expect(adminNotifications.body.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "booking_cancelled",
          bookingId: cancellationBooking.body.booking.id,
        }),
      ]),
    );
    const afterCancellation = await listNotifications(clientToken);
    expect(afterCancellation.body.notifications).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "booking_cancelled",
          bookingId: cancellationBooking.body.booking.id,
        }),
      ]),
    );

    await request(app)
      .post("/api/notifications/read-all")
      .set("Cookie", sessionCookie(clientToken))
      .expect(200);
    const unreadAfterAll = await request(app)
      .get("/api/notifications/unread-count")
      .set("Cookie", sessionCookie(clientToken))
      .expect(200);
    expect(unreadAfterAll.body.count).toBe(0);
  });

  it("delivers rejection and reschedule events only to their intended tenant recipients", async () => {
    const rejectedSession = await createManagedSession(future(15, 9));
    const rejectedBooking = await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientToken))
      .send({ trainingSessionId: rejectedSession.body.session.id, idempotencyKey: "notification-reject" })
      .expect(201);
    await request(app)
      .post(`/api/admin/bookings/${rejectedBooking.body.booking.id}/reject`)
      .set("Cookie", sessionCookie(adminToken))
      .send({ reason: "Time no longer available" })
      .expect(200);
    const afterReject = await listNotifications(clientToken);
    expect(afterReject.body.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "booking_rejected",
          bookingId: rejectedBooking.body.booking.id,
        }),
      ]),
    );

    const source = await createManagedSession(future(16, 9));
    const replacement = await createManagedSession(future(16, 11));
    const sourceBooking = await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientToken))
      .send({ trainingSessionId: source.body.session.id, idempotencyKey: "notification-reschedule-source" })
      .expect(201);
    const rescheduled = await request(app)
      .post(`/api/bookings/${sourceBooking.body.booking.id}/reschedule`)
      .set("Cookie", sessionCookie(clientToken))
      .send({
        replacementTrainingSessionId: replacement.body.session.id,
        idempotencyKey: "notification-reschedule-target",
      })
      .expect(201);
    const clientAfterReschedule = await listNotifications(clientToken);
    const adminAfterReschedule = await listNotifications(adminToken);
    const expectedReschedule = expect.objectContaining({
      eventType: "booking_rescheduled",
      bookingId: rescheduled.body.booking.id,
    });
    expect(clientAfterReschedule.body.notifications).toEqual(expect.arrayContaining([expectedReschedule]));
    expect(adminAfterReschedule.body.notifications).toEqual(expect.arrayContaining([expectedReschedule]));

    const outsiderTenant = await createTenant({ slug: "notification-outsider" });
    const outsider = await createUser(outsiderTenant.id, { role: "client" });
    const outsiderToken = (await createSession(outsider.id)).token;
    const protectedNotification = clientAfterReschedule.body.notifications[0];
    await request(app)
      .post(`/api/notifications/${protectedNotification.id}/read`)
      .set("Cookie", sessionCookie(outsiderToken))
      .expect(404);
  });

  it("does not roll back a cancellation when no active Marcus recipient remains", async () => {
    const session = await createManagedSession(future(17, 9));
    const booking = await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientToken))
      .send({ trainingSessionId: session.body.session.id, idempotencyKey: "notification-no-admin" })
      .expect(201);
    await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, admin.id));
    await request(app)
      .post(`/api/bookings/${booking.body.booking.id}/cancel`)
      .set("Cookie", sessionCookie(clientToken))
      .send({ reason: "No longer needed" })
      .expect(200);
    await db.update(usersTable).set({ isActive: true }).where(eq(usersTable.id, admin.id));
  });
});