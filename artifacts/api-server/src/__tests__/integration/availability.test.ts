import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
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
let clientA: User;
let trainerA: User;
let adminAToken: string;
let adminBToken: string;
let clientAToken: string;
let trainerAToken: string;
let locationId: string;
let sessionTypeId: string;
let ruleId: string;

const effectiveFrom = new Date(Date.now() + 48 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);
const weekday = ((new Date(`${effectiveFrom}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;

beforeAll(async () => {
  tenantA = await createTenant({ slug: "availability-a" });
  tenantB = await createTenant({ slug: "availability-b" });
  adminA = await createUser(tenantA.id, { role: "admin" });
  adminB = await createUser(tenantB.id, { role: "admin" });
  clientA = await createUser(tenantA.id, { role: "client" });
  trainerA = await createUser(tenantA.id, { role: "trainer" });
  adminAToken = (await createSession(adminA.id)).token;
  adminBToken = (await createSession(adminB.id)).token;
  clientAToken = (await createSession(clientA.id)).token;
  trainerAToken = (await createSession(trainerA.id)).token;

  const location = await request(app)
    .post("/api/admin/training-locations")
    .set("Cookie", sessionCookie(adminAToken))
    .send({ name: "Availability Studio", timezone: "Europe/Malta" })
    .expect(201);
  locationId = location.body.location.id;
  const type = await request(app)
    .post("/api/admin/session-types")
    .set("Cookie", sessionCookie(adminAToken))
    .send({ name: "Availability PT", durationMinutes: 60, defaultCapacity: 2 })
    .expect(201);
  sessionTypeId = type.body.sessionType.id;
});

describe("recurring availability", () => {
  it("exposes admin-only recurrence routes", async () => {
    await request(app)
      .get("/api/admin/availability/rules")
      .set("Cookie", sessionCookie(clientAToken))
      .expect(403);
    await request(app)
      .get("/api/admin/availability/rules")
      .set("Cookie", sessionCookie(trainerAToken))
      .expect(403);
    await request(app)
      .get("/api/admin/availability/rules")
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
  });

  it("validates IANA timezones on location creation", async () => {
    await request(app)
      .post("/api/admin/training-locations")
      .set("Cookie", sessionCookie(adminAToken))
      .send({ name: "Bad timezone", timezone: "Not/AZone" })
      .expect(400);
  });

  it("materializes a tenant-owned weekly rule only once", async () => {
    const beforeAudit = await countAuditLogs(tenantA.id, "availability_rule:create");
    const created = await request(app)
      .post("/api/admin/availability/rules")
      .set("Cookie", sessionCookie(adminAToken))
      .send({
        locationId,
        sessionTypeId,
        weekday,
        startsLocalTime: "09:00",
        endsLocalTime: "11:00",
        slotIntervalMinutes: 60,
        effectiveFrom,
      })
      .expect(201);
    ruleId = created.body.rule.id;
    expect(await countAuditLogs(tenantA.id, "availability_rule:create")).toBe(beforeAudit + 1);

    const preview = await request(app)
      .get(`/api/admin/availability/preview?from=${effectiveFrom}&to=${effectiveFrom}`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    expect(preview.body.occurrences).toHaveLength(2);
    expect(preview.body.occurrences.every((item: { resolution: string }) => item.resolution === "generated")).toBe(true);

    await request(app)
      .post("/api/admin/availability/refresh")
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    const afterRefresh = await request(app)
      .get(`/api/admin/availability/preview?from=${effectiveFrom}&to=${effectiveFrom}`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    expect(afterRefresh.body.occurrences).toHaveLength(2);

    const otherTenantRules = await request(app)
      .get("/api/admin/availability/rules")
      .set("Cookie", sessionCookie(adminBToken))
      .expect(200);
    expect(otherTenantRules.body.rules).toEqual([]);
  });

  it("suppresses affected unbooked slots for an all-day unavailable exception", async () => {
    await request(app)
      .post("/api/admin/availability/exceptions")
      .set("Cookie", sessionCookie(adminAToken))
      .send({
        availabilityRuleId: ruleId,
        locationId,
        sessionTypeId,
        exceptionDate: effectiveFrom,
        kind: "unavailable",
        startsLocalTime: null,
        endsLocalTime: null,
        reason: "Studio closed",
        confirmImpact: true,
      })
      .expect(201);

    const preview = await request(app)
      .get(`/api/admin/availability/preview?from=${effectiveFrom}&to=${effectiveFrom}`)
      .set("Cookie", sessionCookie(adminAToken))
      .expect(200);
    expect(preview.body.occurrences).toHaveLength(2);
    expect(preview.body.occurrences.every((item: { resolution: string }) => item.resolution === "suppressed")).toBe(true);
  });
});