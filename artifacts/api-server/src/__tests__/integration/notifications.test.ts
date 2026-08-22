import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { and, eq } from "drizzle-orm";
import {
  app,
  createSession,
  createTenant,
  createUser,
  sessionCookie,
  type Tenant,
  type User,
} from "./harness";
import { bookingsTable, db, notificationsTable, trainingSessionsTable } from "@workspace/db";
import { processDueSessionReminders } from "../../lib/sessionReminderScheduler";

let tenant: Tenant;
let otherTenant: Tenant;
let admin: User;
let client: User;
let otherClient: User;
let otherTenantAdmin: User;
let adminToken: string;
let clientToken: string;
let otherClientToken: string;
let otherTenantAdminToken: string;
let bookingId: string;
let locationId: string;
let sessionTypeId: string;

function future(days: number): string {
  const value = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  value.setUTCHours(10, 0, 0, 0);
  return value.toISOString();
}

async function createBookableSession(days: number) {
  const startsAt = future(days);
  const response = await request(app)
    .post("/api/admin/training-sessions")
    .set("Cookie", sessionCookie(adminToken))
    .send({
      locationId,
      sessionTypeId,
      startsAt,
      endsAt: new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString(),
      capacity: 1,
    })
    .expect(201);
  return response.body.session.id as string;
}

beforeAll(async () => {
  tenant = await createTenant({ slug: "notifications-a", name: "Notifications A" });
  otherTenant = await createTenant({ slug: "notifications-b", name: "Notifications B" });
  admin = await createUser(tenant.id, { role: "admin", firstName: "Marcus" });
  client = await createUser(tenant.id, { role: "client", firstName: "Calvin" });
  otherClient = await createUser(tenant.id, { role: "client", firstName: "Other" });
  otherTenantAdmin = await createUser(otherTenant.id, { role: "admin" });

  adminToken = (await createSession(admin.id)).token;
  clientToken = (await createSession(client.id)).token;
  otherClientToken = (await createSession(otherClient.id)).token;
  otherTenantAdminToken = (await createSession(otherTenantAdmin.id)).token;

  const location = await request(app)
    .post("/api/admin/training-locations")
    .set("Cookie", sessionCookie(adminToken))
    .send({ name: "Notification Studio" })
    .expect(201);
  const sessionType = await request(app)
    .post("/api/admin/session-types")
    .set("Cookie", sessionCookie(adminToken))
    .send({ name: "Notification PT", durationMinutes: 60, defaultCapacity: 1 })
    .expect(201);
  const startsAt = future(8);
  locationId = location.body.location.id;
  sessionTypeId = sessionType.body.sessionType.id;
  const session = await createBookableSession(8);
  const booking = await request(app)
    .post("/api/bookings")
    .set("Cookie", sessionCookie(clientToken))
    .send({
      trainingSessionId: session,
      idempotencyKey: "notification-booking",
    })
    .expect(201);
  bookingId = booking.body.booking.id;
});

describe("in-app booking notifications", () => {
  it("requires authentication and keeps new booking requests tenant- and recipient-scoped", async () => {
    await request(app).get("/api/notifications").expect(401);

    const adminNotifications = await request(app)
      .get("/api/notifications")
      .set("Cookie", sessionCookie(adminToken))
      .expect(200);
    expect(adminNotifications.body.unreadCount).toBe(1);
    expect(adminNotifications.body.notifications).toEqual([
      expect.objectContaining({
        type: "booking_created",
        bookingId,
        title: "New booking request",
        readAt: null,
      }),
    ]);

    const clientNotifications = await request(app)
      .get("/api/notifications")
      .set("Cookie", sessionCookie(clientToken))
      .expect(200);
    expect(clientNotifications.body.notifications).toEqual([
      expect.objectContaining({
        type: "booking_created",
        bookingId,
        title: "Booking request sent",
        readAt: null,
      }),
    ]);

    await request(app)
      .get("/api/notifications")
      .set("Cookie", sessionCookie(otherTenantAdminToken))
      .expect(200)
      .expect({ notifications: [], unreadCount: 0 });
  });

  it("notifies the client when Marcus confirms and only the recipient can mark it read", async () => {
    await request(app)
      .post(`/api/admin/bookings/${bookingId}/confirm`)
      .set("Cookie", sessionCookie(adminToken))
      .expect(200);

    const clientNotifications = await request(app)
      .get("/api/notifications")
      .set("Cookie", sessionCookie(clientToken))
      .expect(200);
    expect(clientNotifications.body.unreadCount).toBe(2);
    expect(clientNotifications.body.notifications).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "booking_confirmed",
        bookingId,
        title: "Booking confirmed",
        readAt: null,
      }),
    ]));
    const notificationId = clientNotifications.body.notifications.find(
      (notification: { type: string }) => notification.type === "booking_confirmed",
    ).id;

    await request(app)
      .post(`/api/notifications/${notificationId}/read`)
      .set("Cookie", sessionCookie(otherClientToken))
      .expect(404);

    await request(app)
      .post(`/api/notifications/${notificationId}/read`)
      .set("Cookie", sessionCookie(clientToken))
      .expect(200);

    const reread = await request(app)
      .get("/api/notifications")
      .set("Cookie", sessionCookie(clientToken))
      .expect(200);
    expect(reread.body.unreadCount).toBe(1);
    expect(reread.body.notifications.find(
      (notification: { id: string }) => notification.id === notificationId,
    ).readAt).toBeTruthy();

    await request(app)
      .post("/api/notifications/read-all")
      .set("Cookie", sessionCookie(clientToken))
      .expect(200);
    const allRead = await request(app)
      .get("/api/notifications")
      .set("Cookie", sessionCookie(clientToken))
      .expect(200);
    expect(allRead.body.unreadCount).toBe(0);
  });

  it("notifies both sides about cancellation and a reschedule request exactly once", async () => {
    const cancellableSessionId = await createBookableSession(10);
    const cancellableBooking = await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientToken))
      .send({
        trainingSessionId: cancellableSessionId,
        idempotencyKey: "notification-cancel",
      })
      .expect(201);
    const cancelledBookingId = cancellableBooking.body.booking.id;
    await request(app)
      .post(`/api/bookings/${cancelledBookingId}/cancel`)
      .set("Cookie", sessionCookie(clientToken))
      .send({ reason: "Schedule conflict" })
      .expect(200);

    const rescheduleSourceId = await createBookableSession(12);
    const rescheduleTargetId = await createBookableSession(13);
    const sourceBooking = await request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(clientToken))
      .send({
        trainingSessionId: rescheduleSourceId,
        idempotencyKey: "notification-reschedule-source",
      })
      .expect(201);
    const reschedule = await request(app)
      .post(`/api/bookings/${sourceBooking.body.booking.id}/reschedule`)
      .set("Cookie", sessionCookie(clientToken))
      .send({
        replacementTrainingSessionId: rescheduleTargetId,
        idempotencyKey: "notification-reschedule-target",
      })
      .expect(201);
    const replacementBookingId = reschedule.body.booking.id;
    await request(app)
      .post(`/api/bookings/${sourceBooking.body.booking.id}/reschedule`)
      .set("Cookie", sessionCookie(clientToken))
      .send({
        replacementTrainingSessionId: rescheduleTargetId,
        idempotencyKey: "notification-reschedule-target",
      })
      .expect(200);

    const [clientNotifications, adminNotifications] = await Promise.all([
      request(app)
        .get("/api/notifications")
        .set("Cookie", sessionCookie(clientToken))
        .expect(200),
      request(app)
        .get("/api/notifications")
        .set("Cookie", sessionCookie(adminToken))
        .expect(200),
    ]);
    for (const notifications of [
      clientNotifications.body.notifications,
      adminNotifications.body.notifications,
    ]) {
      expect(notifications.filter(
        (notification: { type: string; bookingId: string }) =>
          notification.type === "booking_rescheduled"
          && notification.bookingId === replacementBookingId,
      )).toHaveLength(1);
    }
    const clientReschedule = clientNotifications.body.notifications.find(
      (notification: { type: string; bookingId: string }) =>
        notification.type === "booking_rescheduled" && notification.bookingId === replacementBookingId,
    );
    const adminReschedule = adminNotifications.body.notifications.find(
      (notification: { type: string; bookingId: string }) =>
        notification.type === "booking_rescheduled" && notification.bookingId === replacementBookingId,
    );
    expect(clientReschedule.body).toMatch(/Notification PT on .+ at Notification Studio/);
    expect(adminReschedule.body).toMatch(/Notification PT on .+ at Notification Studio/);
    expect(clientNotifications.body.notifications).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "booking_cancelled",
        bookingId: cancelledBookingId,
        title: "Booking cancelled",
      }),
    ]));
    expect(adminNotifications.body.notifications).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "booking_cancelled",
        bookingId: cancelledBookingId,
        title: "Booking cancelled",
      }),
      expect.objectContaining({
        type: "booking_rescheduled",
        bookingId: replacementBookingId,
        title: "Reschedule request",
      }),
    ]));
  });

  it("delivers a due 24-hour reminder exactly once and keeps it hidden while pending", async () => {
    const [scheduled] = await db
      .select({ id: notificationsTable.id, scheduledFor: notificationsTable.scheduledFor, type: notificationsTable.type })
      .from(notificationsTable)
      .where(and(
        eq(notificationsTable.bookingId, bookingId),
        eq(notificationsTable.type, "session_reminder_24h"),
      ));
    expect(scheduled?.type).toBe("session_reminder_24h");
    expect(scheduled?.scheduledFor).toBeTruthy();
    const pendingInbox = await request(app)
      .get("/api/notifications")
      .set("Cookie", sessionCookie(clientToken))
      .expect(200);
    expect(pendingInbox.body.notifications.some((item: { type: string; bookingId: string }) =>
      item.type === "session_reminder_24h" && item.bookingId === bookingId)).toBe(false);

    const [booking] = await db
      .select({ trainingSessionId: bookingsTable.trainingSessionId })
      .from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId));
    const [session] = await db
      .select({ startsAt: trainingSessionsTable.startsAt })
      .from(trainingSessionsTable)
      .where(eq(trainingSessionsTable.id, booking!.trainingSessionId));
    const controlledNow = new Date(session!.startsAt.getTime() - 24 * 60 * 60 * 1000 + 1000);
    expect(await processDueSessionReminders(controlledNow)).toBe(1);
    expect(await processDueSessionReminders(new Date(controlledNow.getTime() + 1000))).toBe(0);
    const delivered = await request(app)
      .get("/api/notifications")
      .set("Cookie", sessionCookie(clientToken))
      .expect(200);
    expect(delivered.body.notifications.filter((item: { type: string; bookingId: string }) =>
      item.type === "session_reminder_24h" && item.bookingId === bookingId)).toHaveLength(1);
  });
});