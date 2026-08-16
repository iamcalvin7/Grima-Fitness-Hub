import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import {
  db,
  proposalDecisionsTable,
  proposalFeaturesTable,
  proposalSprintsTable,
} from "@workspace/db";
import { attachUser, requireAuth, requireCapability } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";

const router: IRouter = Router();

// All proposal-feature routes are staff-only (the proposal page itself is staff-only).
router.use(
  "/proposal-features",
  attachUser,
  requireAuth,
  requireCapability("proposal:manage"),
);

const VALID_CATEGORIES = [
  "Account & Onboarding",
  "Coaching & Training",
  "Progress & Accountability",
  "Nutrition & Daily Habits",
  "Bookings & Service Delivery",
  "Communication & Community",
  "Payments & Revenue",
  "Business Operations",
  "Growth & Acquisition",
  "Content & Education",
  "Data & Intelligence",
  "Safety & Compliance",
];
const VALID_PRIORITIES = ["Critical", "High", "Medium", "Low"];
const VALID_STATUSES = ["Delivered", "In Progress", "Planned", "Future"];
const VALID_PHASES = [1, 2, 3];

/** GET /proposal-features — list custom catalogue features. */
router.get("/proposal-features", async (req, res) => {
  try {
    const features = await db
      .select()
      .from(proposalFeaturesTable)
      .where(eq(proposalFeaturesTable.tenantId, req.user!.tenantId))
      .orderBy(asc(proposalFeaturesTable.createdAt));
    res.json({ features });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch proposal features");
    res.status(500).json({ error: "Failed to fetch features" });
  }
});

interface FeatureOverride {
  sprint?: number;
  status?: string;
  placement?: string;
}

/** GET /proposal-features/sprints — per-feature overrides (sprint, status, placement). */
router.get("/proposal-features/sprints", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(proposalSprintsTable)
      .where(eq(proposalSprintsTable.tenantId, req.user!.tenantId));
    const overrides: Record<string, FeatureOverride> = {};
    for (const r of rows) {
      const o: FeatureOverride = {};
      if (r.sprint != null) o.sprint = r.sprint;
      if (r.status != null) o.status = r.status;
      if (r.placement != null) o.placement = r.placement;
      overrides[r.featureId] = o;
    }
    res.json({ overrides });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch proposal overrides");
    res.status(500).json({ error: "Failed to fetch overrides" });
  }
});

const VALID_PLACEMENTS = ["launch", "future"];

/** PUT /proposal-features/sprints — upsert one feature override (sprint / status / placement). */
router.put("/proposal-features/sprints", async (req, res) => {
  const { featureId, sprint, status, placement } = (req.body ?? {}) as Record<
    string,
    unknown
  >;
  if (typeof featureId !== "string" || !featureId.trim() || featureId.length > 100) {
    res.status(400).json({ error: "featureId is required" });
    return;
  }
  const patch: { sprint?: number; status?: string; placement?: string } = {};
  if (sprint !== undefined) {
    const s = Number(sprint);
    if (!Number.isInteger(s) || s < 1 || s > 6) {
      res.status(400).json({ error: "sprint must be an integer between 1 and 6" });
      return;
    }
    patch.sprint = s;
  }
  if (status !== undefined) {
    if (typeof status !== "string" || !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    patch.status = status;
  }
  if (placement !== undefined) {
    if (typeof placement !== "string" || !VALID_PLACEMENTS.includes(placement)) {
      res.status(400).json({ error: "Invalid placement" });
      return;
    }
    patch.placement = placement;
  }
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }
  const fid = featureId.trim();
  // Built-in catalogue ids are slugs; UUIDs must belong to a custom feature in this tenant.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fid);
  if (!isUuid && !/^[a-z0-9-]+$/.test(fid)) {
    res.status(400).json({ error: "Invalid featureId" });
    return;
  }
  try {
    await db.transaction(async (tx) => {
      if (isUuid) {
        const rows = await tx
          .select({ id: proposalFeaturesTable.id })
          .from(proposalFeaturesTable)
          .where(
            and(
              eq(proposalFeaturesTable.id, fid),
              eq(proposalFeaturesTable.tenantId, req.user!.tenantId),
            ),
          )
          .limit(1);
        if (!rows[0]) {
          // Signal to the outer handler that the feature was not found.
          // Throwing rolls back the (empty) transaction safely.
          throw Object.assign(new Error("Feature not found"), { code: "NOT_FOUND" });
        }
      }
      await tx
        .insert(proposalSprintsTable)
        .values({ tenantId: req.user!.tenantId, featureId: fid, ...patch })
        .onConflictDoUpdate({
          target: [proposalSprintsTable.tenantId, proposalSprintsTable.featureId],
          set: { ...patch, updatedAt: new Date() },
        });

      await writeAuditLog(
        {
          tenantId: req.user!.tenantId,
          actorType: "user",
          actorId: req.user!.id,
          action: "proposal_sprint:upsert",
          targetType: "proposal_sprint",
          targetId: fid,
          metadata: { patch },
        },
        tx as Parameters<typeof writeAuditLog>[1],
      );
    });

    res.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === "NOT_FOUND") {
      res.status(404).json({ error: "Feature not found" });
      return;
    }
    req.log.error({ err }, "Failed to save proposal sprint");
    res.status(500).json({ error: "Failed to save sprint" });
  }
});

/** POST /proposal-features — add a custom catalogue feature. */
router.post("/proposal-features", async (req, res) => {
  const {
    title,
    category,
    priority,
    phase,
    status,
    tagline,
    what,
    memberBenefit,
    businessBenefit,
  } = (req.body ?? {}) as Record<string, unknown>;

  if (typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  if (typeof category !== "string" || !VALID_CATEGORIES.includes(category.trim())) {
    res.status(400).json({ error: "Invalid category" });
    return;
  }
  if (priority !== undefined && !VALID_PRIORITIES.includes(priority as string)) {
    res.status(400).json({ error: "Invalid priority" });
    return;
  }
  if (status !== undefined && !VALID_STATUSES.includes(status as string)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  if (phase !== undefined && !VALID_PHASES.includes(Number(phase))) {
    res.status(400).json({ error: "Invalid phase" });
    return;
  }

  try {
    const feature = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(proposalFeaturesTable)
        .values({
          tenantId: req.user!.tenantId,
          authorId: req.user!.id,
          title: (title as string).trim(),
          category: (category as string).trim(),
          priority: (priority as string) ?? "Medium",
          phase: phase !== undefined ? Number(phase) : 2,
          status: (status as string) ?? "Planned",
          tagline: typeof tagline === "string" ? tagline.trim() : "",
          what: typeof what === "string" ? what.trim() : "",
          memberBenefit: typeof memberBenefit === "string" ? memberBenefit.trim() : "",
          businessBenefit: typeof businessBenefit === "string" ? businessBenefit.trim() : "",
        })
        .returning();

      await writeAuditLog(
        {
          tenantId: req.user!.tenantId,
          actorType: "user",
          actorId: req.user!.id,
          action: "proposal_feature:create",
          targetType: "proposal_feature",
          targetId: created.id,
          metadata: { title: created.title, category: created.category },
        },
        tx as Parameters<typeof writeAuditLog>[1],
      );

      return created;
    });

    res.status(201).json({ feature });
  } catch (err) {
    req.log.error({ err }, "Failed to create proposal feature");
    res.status(500).json({ error: "Failed to create feature" });
  }
});

/** PATCH /proposal-features/:id — edit a custom catalogue feature. */
router.patch("/proposal-features/:id", async (req, res) => {
  const {
    title,
    category,
    priority,
    phase,
    status,
    tagline,
    what,
    memberBenefit,
    businessBenefit,
  } = (req.body ?? {}) as Record<string, unknown>;

  if (title !== undefined && (typeof title !== "string" || !title.trim())) {
    res.status(400).json({ error: "Title cannot be empty" });
    return;
  }
  if (category !== undefined && (typeof category !== "string" || !VALID_CATEGORIES.includes(category.trim()))) {
    res.status(400).json({ error: "Invalid category" });
    return;
  }
  if (priority !== undefined && !VALID_PRIORITIES.includes(priority as string)) {
    res.status(400).json({ error: "Invalid priority" });
    return;
  }
  if (status !== undefined && !VALID_STATUSES.includes(status as string)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  if (phase !== undefined && !VALID_PHASES.includes(Number(phase))) {
    res.status(400).json({ error: "Invalid phase" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = (title as string).trim();
  if (category !== undefined) updates.category = (category as string).trim();
  if (priority !== undefined) updates.priority = priority;
  if (phase !== undefined) updates.phase = Number(phase);
  if (status !== undefined) updates.status = status;
  if (typeof tagline === "string") updates.tagline = tagline.trim();
  if (typeof what === "string") updates.what = what.trim();
  if (typeof memberBenefit === "string") updates.memberBenefit = memberBenefit.trim();
  if (typeof businessBenefit === "string") updates.businessBenefit = businessBenefit.trim();

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  try {
    const feature = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(proposalFeaturesTable)
        .set(updates)
        .where(
          and(
            eq(proposalFeaturesTable.id, req.params.id),
            eq(proposalFeaturesTable.tenantId, req.user!.tenantId),
          ),
        )
        .returning();

      if (!updated) return null;

      await writeAuditLog(
        {
          tenantId: req.user!.tenantId,
          actorType: "user",
          actorId: req.user!.id,
          action: "proposal_feature:update",
          targetType: "proposal_feature",
          targetId: updated.id,
          metadata: { fields: Object.keys(updates) },
        },
        tx as Parameters<typeof writeAuditLog>[1],
      );

      return updated;
    });

    if (!feature) {
      res.status(404).json({ error: "Feature not found" });
      return;
    }
    res.json({ feature });
  } catch (err) {
    req.log.error({ err }, "Failed to update proposal feature");
    res.status(500).json({ error: "Failed to update feature" });
  }
});

/** DELETE /proposal-features/:id — remove a custom catalogue feature. */
router.delete("/proposal-features/:id", async (req, res) => {
  try {
    const deleted = await db.transaction(async (tx) => {
      const [d] = await tx
        .delete(proposalFeaturesTable)
        .where(
          and(
            eq(proposalFeaturesTable.id, req.params.id),
            eq(proposalFeaturesTable.tenantId, req.user!.tenantId),
          ),
        )
        .returning({ id: proposalFeaturesTable.id });

      if (!d) return null;

      await writeAuditLog(
        {
          tenantId: req.user!.tenantId,
          actorType: "user",
          actorId: req.user!.id,
          action: "proposal_feature:delete",
          targetType: "proposal_feature",
          targetId: d.id,
        },
        tx as Parameters<typeof writeAuditLog>[1],
      );

      return d;
    });

    if (!deleted) {
      res.status(404).json({ error: "Feature not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete proposal feature");
    res.status(500).json({ error: "Failed to delete feature" });
  }
});

// Custom decision questions (Decisions tab) — same staff-only guard.
router.use(
  "/proposal-decisions",
  attachUser,
  requireAuth,
  requireCapability("proposal:manage"),
);

/** GET /proposal-decisions — list custom decision questions. */
router.get("/proposal-decisions", async (req, res) => {
  try {
    const decisions = await db
      .select()
      .from(proposalDecisionsTable)
      .where(eq(proposalDecisionsTable.tenantId, req.user!.tenantId))
      .orderBy(asc(proposalDecisionsTable.createdAt));
    res.json({ decisions });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch proposal decisions");
    res.status(500).json({ error: "Failed to fetch decisions" });
  }
});

/** POST /proposal-decisions — add a custom decision question. */
router.post("/proposal-decisions", async (req, res) => {
  const { question, detail } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof question !== "string" || !question.trim() || question.length > 300) {
    res.status(400).json({ error: "Question is required (max 300 characters)" });
    return;
  }
  if (detail !== undefined && (typeof detail !== "string" || detail.length > 1000)) {
    res.status(400).json({ error: "Detail must be a string (max 1000 characters)" });
    return;
  }
  try {
    const decision = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(proposalDecisionsTable)
        .values({
          tenantId: req.user!.tenantId,
          authorId: req.user!.id,
          question: question.trim(),
          detail: typeof detail === "string" ? detail.trim() : "",
        })
        .returning();

      await writeAuditLog(
        {
          tenantId: req.user!.tenantId,
          actorType: "user",
          actorId: req.user!.id,
          action: "proposal_decision:create",
          targetType: "proposal_decision",
          targetId: created.id,
        },
        tx as Parameters<typeof writeAuditLog>[1],
      );

      return created;
    });

    res.status(201).json({ decision });
  } catch (err) {
    req.log.error({ err }, "Failed to create proposal decision");
    res.status(500).json({ error: "Failed to create decision" });
  }
});

/** DELETE /proposal-decisions/:id — remove a custom decision question. */
router.delete("/proposal-decisions/:id", async (req, res) => {
  try {
    const deleted = await db.transaction(async (tx) => {
      const [d] = await tx
        .delete(proposalDecisionsTable)
        .where(
          and(
            eq(proposalDecisionsTable.id, req.params.id),
            eq(proposalDecisionsTable.tenantId, req.user!.tenantId),
          ),
        )
        .returning({ id: proposalDecisionsTable.id });

      if (!d) return null;

      await writeAuditLog(
        {
          tenantId: req.user!.tenantId,
          actorType: "user",
          actorId: req.user!.id,
          action: "proposal_decision:delete",
          targetType: "proposal_decision",
          targetId: d.id,
        },
        tx as Parameters<typeof writeAuditLog>[1],
      );

      return d;
    });

    if (!deleted) {
      res.status(404).json({ error: "Decision not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete proposal decision");
    res.status(500).json({ error: "Failed to delete decision" });
  }
});

export default router;
