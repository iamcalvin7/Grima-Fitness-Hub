import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { and, eq } from "drizzle-orm";
import {
  bookingCommercialsTable,
  bookingsTable,
  db,
  trainingSessionsTable,
  trainingValueLedgerTable,
} from "@workspace/db";
import {
  app,
  createSession,
  createTenant,
  createUser,
  sessionCookie,
  type Tenant,
  type User,
} from "./harness";

const future = (days: number) => {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  date.setUTCHours(10, 0, 0, 0);
  return date.toISOString();
};

describe("commercial pricing, holds, and settlement", () => {
  let tenant: Tenant;
  let admin: User;
  let standardA: User;
  let standardB: User;
  let standardNoShow: User;
  let legacyClient: User;
  let lowBalanceClient: User;
  let customClient: User;
  let adminToken: string;
  let locationId: string;
  let sessionTypeId: string;
  let defaultPlanId: string;
  let legacyPlanId: string;

  function grant(client: User, amountMinor = 10_000) {
    return request(app)
      .post(`/api/admin/commercial/clients/${client.id}/value`)
      .set("Cookie", sessionCookie(adminToken))
      .send({
        amountMinor,
        reason: "Commercial acceptance fixture",
        idempotencyKey: `commercial-grant-${client.id}`,
      });
  }

  function createManagedSession(capacity: number, daysFromNow: number) {
    const startsAt = future(daysFromNow);
    const endsAt = new Date(
      new Date(startsAt).getTime() + 60 * 60 * 1000,
    ).toISOString();
    return request(app)
      .post("/api/admin/training-sessions")
      .set("Cookie", sessionCookie(adminToken))
      .send({ sessionTypeId, locationId, startsAt, endsAt, capacity });
  }

  async function book(client: User, sessionId: string, key: string) {
    const token = (await createSession(client.id)).token;
    return request(app)
      .post("/api/bookings")
      .set("Cookie", sessionCookie(token))
      .send({ trainingSessionId: sessionId, idempotencyKey: key });
  }

  beforeAll(async () => {
    tenant = await createTenant({ slug: "commercial", name: "Commercial" });
    admin = await createUser(tenant.id, { role: "admin" });
    standardA = await createUser(tenant.id, { role: "client" });
    standardB = await createUser(tenant.id, { role: "client" });
    standardNoShow = await createUser(tenant.id, { role: "client" });
    legacyClient = await createUser(tenant.id, { role: "client" });
    lowBalanceClient = await createUser(tenant.id, { role: "client" });
    customClient = await createUser(tenant.id, { role: "client" });
    adminToken = (await createSession(admin.id)).token;

    const defaultPlan = await request(app)
      .post("/api/admin/commercial/pricing-plans")
      .set("Cookie", sessionCookie(adminToken))
      .send({
        name: "Standard",
        kind: "default",
        rates: [
          { participantCount: 1, amountMinor: 4000 },
          { participantCount: 2, amountMinor: 3500 },
          { participantCount: 3, amountMinor: 3000 },
          { participantCount: 4, amountMinor: 2800 },
        ],
      })
      .expect(201);
    defaultPlanId = defaultPlan.body.pricingPlan.id;

    const legacyPlan = await request(app)
      .post("/api/admin/commercial/pricing-plans")
      .set("Cookie", sessionCookie(adminToken))
      .send({
        name: "Legacy",
        kind: "tier",
        rates: [
          { participantCount: 1, amountMinor: 2500 },
          { participantCount: 2, amountMinor: 2200 },
          { participantCount: 3, amountMinor: 2000 },
          { participantCount: 4, amountMinor: 1900 },
        ],
      })
      .expect(201);
    legacyPlanId = legacyPlan.body.pricingPlan.id;

    await request(app)
      .put(`/api/admin/commercial/clients/${legacyClient.id}/pricing`)
      .set("Cookie", sessionCookie(adminToken))
      .send({ pricingPlanId: legacyPlanId })
      .expect(200);

    for (const client of [
      standardA,
      standardB,
      standardNoShow,
      legacyClient,
      customClient,
    ]) {
      await grant(client).expect(201);
    }
    await grant(lowBalanceClient, 3000).expect(201);

    const location = await request(app)
      .post("/api/admin/training-locations")
      .set("Cookie", sessionCookie(adminToken))
      .send({ name: "Commercial studio" })
      .expect(201);
    locationId = location.body.location.id;

    const sessionType = await request(app)
      .post("/api/admin/session-types")
      .set("Cookie", sessionCookie(adminToken))
      .send({
        name: "Commercial coaching",
        durationMinutes: 60,
        defaultCapacity: 4,
      })
      .expect(201);
    sessionTypeId = sessionType.body.sessionType.id;
  });

  it("uses the default, tier, and client-specific rate-card hierarchy", async () => {
    const customPlan = await request(app)
      .post("/api/admin/commercial/pricing-plans")
      .set("Cookie", sessionCookie(adminToken))
      .send({
        name: "Custom client rate",
        kind: "custom",
        rates: [
          { participantCount: 1, amountMinor: 1800 },
          { participantCount: 2, amountMinor: 1600 },
        ],
      })
      .expect(201);

    await request(app)
      .put(`/api/admin/commercial/clients/${customClient.id}/pricing`)
      .set("Cookie", sessionCookie(adminToken))
      .send({ pricingPlanId: customPlan.body.pricingPlan.id })
      .expect(200);

    const session = await createManagedSession(2, 5).expect(201);
    const customBooking = await book(
      customClient,
      session.body.session.id,
      "custom-override-booking",
    );
    expect(customBooking.status).toBe(201);
    expect(customBooking.body.booking.commercial).toMatchObject({
      planName: "Custom client rate",
      maximumHeldAmountMinor: 1800,
      holdStatus: "active",
    });
    await request(app)
      .post(`/api/admin/commercial/clients/${customClient.id}/value`)
      .set("Cookie", sessionCookie(adminToken))
      .send({
        amountMinor: -9000,
        reason: "Must not consume held value",
        idempotencyKey: "reject-held-value-debit",
      })
      .expect(409);

    await request(app)
      .post(`/api/admin/bookings/${customBooking.body.booking.id}/reject`)
      .set("Cookie", sessionCookie(adminToken))
      .send({ reason: "Acceptance cleanup" })
      .expect(200);
    const balance = await request(app)
      .get("/api/commercial/balance")
      .set("Cookie", sessionCookie((await createSession(customClient.id)).token))
      .expect(200);
    expect(balance.body.balance).toMatchObject({
      totalValueMinor: 10_000,
      heldValueMinor: 0,
      availableValueMinor: 10_000,
    });
  });

  it("onboards an eligible future legacy booking only when Marcus explicitly requests it", async () => {
    const session = await createManagedSession(2, 8).expect(201);
    const [legacyBooking] = await db
      .insert(bookingsTable)
      .values({
        tenantId: tenant.id,
        trainingSessionId: session.body.session.id,
        clientUserId: customClient.id,
        idempotencyKey: "legacy-booking-without-commercial-record",
        status: "pending",
      })
      .returning({ id: bookingsTable.id });
    if (!legacyBooking) throw new Error("Legacy fixture booking was not created");

    await request(app)
      .post(`/api/admin/commercial/bookings/${legacyBooking.id}/onboard-legacy`)
      .set("Cookie", sessionCookie(adminToken))
      .expect(201);
    const replay = await request(app)
      .post(`/api/admin/commercial/bookings/${legacyBooking.id}/onboard-legacy`)
      .set("Cookie", sessionCookie(adminToken))
      .expect(200);
    expect(replay.body.replayed).toBe(true);
  });

  it("blocks insufficient value before it creates a booking or a hold", async () => {
    const session = await createManagedSession(2, 6).expect(201);
    const response = await book(
      lowBalanceClient,
      session.body.session.id,
      "insufficient-training-value",
    );
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      error: expect.stringMatching(/Insufficient training balance/i),
      details: { availableValueMinor: 3000, requiredHoldAmountMinor: 4000 },
    });

    const balance = await request(app)
      .get("/api/commercial/balance")
      .set("Cookie", sessionCookie((await createSession(lowBalanceClient.id)).token))
      .expect(200);
    expect(balance.body.balance).toMatchObject({
      totalValueMinor: 3000,
      heldValueMinor: 0,
      availableValueMinor: 3000,
    });
  });

  it("locks class-close rates, releases excess holds, and settles attendance retry-safely", async () => {
    const session = await createManagedSession(4, 7).expect(201);
    const sessionId = session.body.session.id as string;
    const bookings = await Promise.all([
      book(standardA, sessionId, "mixed-standard-a"),
      book(standardB, sessionId, "mixed-standard-b"),
      book(legacyClient, sessionId, "mixed-legacy"),
      book(standardNoShow, sessionId, "mixed-no-show"),
    ]);
    bookings.forEach((result) => expect(result.status).toBe(201));
    expect(bookings.map((result) => result.body.booking.commercial.maximumHeldAmountMinor))
      .toEqual([4000, 4000, 2500, 4000]);

    for (const result of bookings) {
      await request(app)
        .post(`/api/admin/bookings/${result.body.booking.id}/confirm`)
        .set("Cookie", sessionCookie(adminToken))
        .expect(200);
    }
    const close = await request(app)
      .post(`/api/admin/commercial/sessions/${sessionId}/close`)
      .set("Cookie", sessionCookie(adminToken))
      .expect(200);
    expect(close.body.classClose).toMatchObject({ participantCount: 4, replayed: true });
    const lockedHolds = await db
      .select({
        bookingId: bookingCommercialsTable.bookingId,
        reservedAmountMinor: bookingCommercialsTable.reservedAmountMinor,
        lockedParticipantCount: bookingCommercialsTable.lockedParticipantCount,
      })
      .from(bookingCommercialsTable)
      .where(eq(bookingCommercialsTable.tenantId, tenant.id));
    expect(
      lockedHolds
        .filter((row) => bookings.some((booking) => booking.body.booking.id === row.bookingId))
        .map((row) => row.reservedAmountMinor)
        .sort((left, right) => left - right),
    ).toEqual([1900, 2800, 2800, 2800]);
    expect(
      lockedHolds
        .filter((row) => bookings.some((booking) => booking.body.booking.id === row.bookingId))
        .every((row) => row.lockedParticipantCount === 4),
    ).toBe(true);
    await request(app)
      .post(`/api/bookings`)
      .set("Cookie", sessionCookie((await createSession(customClient.id)).token))
      .send({ trainingSessionId: sessionId, idempotencyKey: "booking-after-class-close" })
      .expect(409);
    for (const result of bookings.slice(0, 3)) {
      await request(app)
        .post(`/api/admin/bookings/${result.body.booking.id}/attended`)
        .set("Cookie", sessionCookie(adminToken))
        .expect(200);
    }
    const noShowBookingId = bookings[3].body.booking.id as string;
    await request(app)
      .post(`/api/admin/bookings/${noShowBookingId}/no-show`)
      .set("Cookie", sessionCookie(adminToken))
      .expect(200);

    const noShowDecision = {
      waived: false,
      selectedChargeAmountMinor: 1500,
      note: "Recorded after review",
    };
    await request(app)
      .post(`/api/admin/commercial/bookings/${noShowBookingId}/no-show-decision`)
      .set("Cookie", sessionCookie(adminToken))
      .send(noShowDecision)
      .expect(201);
    const decisionReplay = await request(app)
      .post(`/api/admin/commercial/bookings/${noShowBookingId}/no-show-decision`)
      .set("Cookie", sessionCookie(adminToken))
      .send(noShowDecision)
      .expect(200);
    expect(decisionReplay.body.replayed).toBe(true);

    // Changing a live plan cannot alter the complete booking snapshots.
    await request(app)
      .patch(`/api/admin/commercial/pricing-plans/${defaultPlanId}`)
      .set("Cookie", sessionCookie(adminToken))
      .send({
        rates: [
          { participantCount: 1, amountMinor: 5000 },
          { participantCount: 2, amountMinor: 4500 },
          { participantCount: 3, amountMinor: 4000 },
        ],
      })
      .expect(200);

    await db
      .update(trainingSessionsTable)
      .set({
        startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 60 * 60 * 1000),
      })
      .where(
        and(
          eq(trainingSessionsTable.tenantId, tenant.id),
          eq(trainingSessionsTable.id, sessionId),
        ),
      );
    await request(app)
      .post(`/api/admin/training-sessions/${sessionId}/complete`)
      .set("Cookie", sessionCookie(adminToken))
      .expect(200);

    const preview = await request(app)
      .get(`/api/admin/commercial/sessions/${sessionId}/settlement-preview`)
      .set("Cookie", sessionCookie(adminToken))
      .expect(200);
    expect(preview.body).toMatchObject({ attendanceCount: 3, unresolvedCount: 0, canSettle: true });
    expect(
      preview.body.rows
        .map((row: { finalChargeAmountMinor: number }) => row.finalChargeAmountMinor)
        .sort((left: number, right: number) => left - right),
    ).toEqual([1500, 1900, 2800, 2800]);

    const [firstSettlement, secondSettlement] = await Promise.all([
      request(app)
        .post(`/api/admin/commercial/sessions/${sessionId}/settle`)
        .set("Cookie", sessionCookie(adminToken)),
      request(app)
        .post(`/api/admin/commercial/sessions/${sessionId}/settle`)
        .set("Cookie", sessionCookie(adminToken)),
    ]);
    expect([firstSettlement.status, secondSettlement.status]).toEqual([200, 200]);
    expect([firstSettlement.body.settlement.replayed, secondSettlement.body.settlement.replayed].sort())
      .toEqual([false, true]);

    // A retry remains a replay even after settlement has changed the hold state.
    await request(app)
      .post(`/api/admin/commercial/bookings/${noShowBookingId}/no-show-decision`)
      .set("Cookie", sessionCookie(adminToken))
      .send(noShowDecision)
      .expect(200);

    const commercialRows = await db
      .select({
        bookingId: bookingCommercialsTable.bookingId,
        holdStatus: bookingCommercialsTable.holdStatus,
      })
      .from(bookingCommercialsTable)
      .where(eq(bookingCommercialsTable.tenantId, tenant.id));
    expect(commercialRows.filter((row) => bookings.some((booking) => booking.body.booking.id === row.bookingId)))
      .toHaveLength(4);
    expect(commercialRows.filter((row) => bookings.some((booking) => booking.body.booking.id === row.bookingId))
      .every((row) => row.holdStatus === "settled")).toBe(true);

    const ledgerRows = await db
      .select({ bookingId: trainingValueLedgerTable.bookingId, amountMinor: trainingValueLedgerTable.amountMinor })
      .from(trainingValueLedgerTable)
      .where(eq(trainingValueLedgerTable.tenantId, tenant.id));
    expect(ledgerRows.filter((row) => bookings.some((booking) => booking.body.booking.id === row.bookingId)))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ bookingId: bookings[0].body.booking.id, amountMinor: -2800 }),
        expect.objectContaining({ bookingId: bookings[1].body.booking.id, amountMinor: -2800 }),
        expect.objectContaining({ bookingId: bookings[2].body.booking.id, amountMinor: -1900 }),
        expect.objectContaining({ bookingId: noShowBookingId, amountMinor: -1500 }),
      ]));
  });

  it("manually closes a pre-start class, blocks pre-close outcomes, and bounds no-show decisions to the lock", async () => {
    const session = await createManagedSession(4, 9).expect(201);
    const sessionId = session.body.session.id as string;
    const bookings = await Promise.all([
      book(standardA, sessionId, "manual-close-standard-a"),
      book(standardB, sessionId, "manual-close-standard-b"),
      book(legacyClient, sessionId, "manual-close-legacy"),
    ]);
    for (const result of bookings) {
      await request(app)
        .post(`/api/admin/bookings/${result.body.booking.id}/confirm`)
        .set("Cookie", sessionCookie(adminToken))
        .expect(200);
    }
    await request(app)
      .post(`/api/admin/bookings/${bookings[0].body.booking.id}/attended`)
      .set("Cookie", sessionCookie(adminToken))
      .expect(409);
    const close = await request(app)
      .post(`/api/admin/commercial/sessions/${sessionId}/close`)
      .set("Cookie", sessionCookie(adminToken))
      .expect(201);
    expect(close.body.classClose).toMatchObject({ participantCount: 3, replayed: false });
    expect(close.body.classClose.releases.map((row: { releasedAmountMinor: number }) => row.releasedAmountMinor)
      .sort((left: number, right: number) => left - right)).toEqual([500, 1000, 1000]);

    const noShowBookingId = bookings[2].body.booking.id as string;
    await request(app)
      .post(`/api/admin/bookings/${noShowBookingId}/no-show`)
      .set("Cookie", sessionCookie(adminToken))
      .expect(200);
    await request(app)
      .post(`/api/admin/commercial/bookings/${noShowBookingId}/no-show-decision`)
      .set("Cookie", sessionCookie(adminToken))
      .send({ waived: false, selectedChargeAmountMinor: 2001 })
      .expect(400);
    await request(app)
      .post(`/api/admin/commercial/bookings/${noShowBookingId}/no-show-decision`)
      .set("Cookie", sessionCookie(adminToken))
      .send({ waived: true })
      .expect(201);
  });

  it("refuses a manual class close after the session start time", async () => {
    const session = await createManagedSession(2, 10).expect(201);
    const sessionId = session.body.session.id as string;
    const booking = await book(customClient, sessionId, "late-class-close");
    expect(booking.status).toBe(201);
    await request(app)
      .post(`/api/admin/bookings/${booking.body.booking.id}/confirm`)
      .set("Cookie", sessionCookie(adminToken))
      .expect(200);
    await db
      .update(trainingSessionsTable)
      .set({ startsAt: new Date(Date.now() - 60_000) })
      .where(
        and(
          eq(trainingSessionsTable.tenantId, tenant.id),
          eq(trainingSessionsTable.id, sessionId),
        ),
      );
    await request(app)
      .post(`/api/admin/commercial/sessions/${sessionId}/close`)
      .set("Cookie", sessionCookie(adminToken))
      .expect(409);
  });

  it("onboards a legacy booking exactly once when the admin retries in parallel", async () => {
    const parallelClient = await createUser(tenant.id, { role: "client" });
    await grant(parallelClient).expect(201);
    const session = await createManagedSession(2, 12).expect(201);
    const [legacyBooking] = await db
      .insert(bookingsTable)
      .values({
        tenantId: tenant.id,
        trainingSessionId: session.body.session.id,
        clientUserId: parallelClient.id,
        idempotencyKey: "parallel-legacy-onboard",
        status: "pending",
      })
      .returning({ id: bookingsTable.id });
    if (!legacyBooking) throw new Error("Legacy fixture booking was not created");

    const [first, second] = await Promise.all([
      request(app)
        .post(`/api/admin/commercial/bookings/${legacyBooking.id}/onboard-legacy`)
        .set("Cookie", sessionCookie(adminToken)),
      request(app)
        .post(`/api/admin/commercial/bookings/${legacyBooking.id}/onboard-legacy`)
        .set("Cookie", sessionCookie(adminToken)),
    ]);
    const holds = await db
      .select()
      .from(bookingCommercialsTable)
      .where(eq(bookingCommercialsTable.bookingId, legacyBooking.id));

    expect([first.status, second.status].sort()).toEqual([200, 201]);
    expect(holds).toHaveLength(1);
  });

  it("never leaves an active hold when legacy onboarding races booking cancellation", async () => {
    const cancellingClient = await createUser(tenant.id, { role: "client" });
    await grant(cancellingClient).expect(201);
    const clientToken = (await createSession(cancellingClient.id)).token;
    const session = await createManagedSession(2, 14).expect(201);
    const [legacyBooking] = await db
      .insert(bookingsTable)
      .values({
        tenantId: tenant.id,
        trainingSessionId: session.body.session.id,
        clientUserId: cancellingClient.id,
        idempotencyKey: "cancelled-legacy-onboard",
        status: "pending",
      })
      .returning({ id: bookingsTable.id });
    if (!legacyBooking) throw new Error("Legacy fixture booking was not created");

    const [onboarding, cancellation] = await Promise.all([
      request(app)
        .post(`/api/admin/commercial/bookings/${legacyBooking.id}/onboard-legacy`)
        .set("Cookie", sessionCookie(adminToken)),
      request(app)
        .post(`/api/bookings/${legacyBooking.id}/cancel`)
        .set("Cookie", sessionCookie(clientToken)),
    ]);
    const [savedBooking] = await db
      .select({ status: bookingsTable.status })
      .from(bookingsTable)
      .where(eq(bookingsTable.id, legacyBooking.id));
    const holds = await db
      .select({ holdStatus: bookingCommercialsTable.holdStatus })
      .from(bookingCommercialsTable)
      .where(eq(bookingCommercialsTable.bookingId, legacyBooking.id));

    expect(cancellation.status).toBe(200);
    expect([201, 409]).toContain(onboarding.status);
    expect(savedBooking?.status).toBe("cancelled");
    expect(holds.some((hold) => hold.holdStatus === "active")).toBe(false);
  });
});