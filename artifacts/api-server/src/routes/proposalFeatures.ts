import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, proposalFeaturesTable } from "@workspace/db";
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
