import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, proposalFeaturesTable, proposalSprintsTable } from "@workspace/db";
import { attachUser, requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

// All proposal-feature routes are staff-only (the proposal page itself is staff-only).
router.use(
  "/proposal-features",
  attachUser,
  requireAuth,
  requireRole("admin", "trainer"),
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

/** GET /proposal-features/sprints — sprint assignment overrides (featureId → sprint). */
router.get("/proposal-features/sprints", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(proposalSprintsTable)
      .where(eq(proposalSprintsTable.tenantId, req.user!.tenantId));
    const sprints: Record<string, number> = {};
    for (const r of rows) sprints[r.featureId] = r.sprint;
    res.json({ sprints });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch proposal sprints");
    res.status(500).json({ error: "Failed to fetch sprints" });
  }
});

/** PUT /proposal-features/sprints — upsert one sprint assignment. */
router.put("/proposal-features/sprints", async (req, res) => {
  const { featureId, sprint } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof featureId !== "string" || !featureId.trim() || featureId.length > 100) {
    res.status(400).json({ error: "featureId is required" });
    return;
  }
  const s = Number(sprint);
  if (!Number.isInteger(s) || s < 1 || s > 6) {
    res.status(400).json({ error: "sprint must be an integer between 1 and 6" });
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
    if (isUuid) {
      const rows = await db
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
        res.status(404).json({ error: "Feature not found" });
        return;
      }
    }
    await db
      .insert(proposalSprintsTable)
      .values({ tenantId: req.user!.tenantId, featureId: fid, sprint: s })
      .onConflictDoUpdate({
        target: [proposalSprintsTable.tenantId, proposalSprintsTable.featureId],
        set: { sprint: s, updatedAt: new Date() },
      });
    res.json({ ok: true });
  } catch (err) {
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
    const [feature] = await db
      .insert(proposalFeaturesTable)
      .values({
        tenantId: req.user!.tenantId,
        authorId: req.user!.id,
        title: title.trim(),
        category: category.trim(),
        priority: (priority as string) ?? "Medium",
        phase: phase !== undefined ? Number(phase) : 2,
        status: (status as string) ?? "Planned",
        tagline: typeof tagline === "string" ? tagline.trim() : "",
        what: typeof what === "string" ? what.trim() : "",
        memberBenefit: typeof memberBenefit === "string" ? memberBenefit.trim() : "",
        businessBenefit: typeof businessBenefit === "string" ? businessBenefit.trim() : "",
      })
      .returning();
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
    const [feature] = await db
      .update(proposalFeaturesTable)
      .set(updates)
      .where(
        and(
          eq(proposalFeaturesTable.id, req.params.id),
          eq(proposalFeaturesTable.tenantId, req.user!.tenantId),
        ),
      )
      .returning();

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
    const [deleted] = await db
      .delete(proposalFeaturesTable)
      .where(
        and(
          eq(proposalFeaturesTable.id, req.params.id),
          eq(proposalFeaturesTable.tenantId, req.user!.tenantId),
        ),
      )
      .returning({ id: proposalFeaturesTable.id });

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

export default router;
