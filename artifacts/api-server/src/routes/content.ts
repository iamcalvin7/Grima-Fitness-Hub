import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, contentPostsTable } from "@workspace/db";
import { attachUser, requireAuth, requireCapability } from "../middlewares/auth";

const router: IRouter = Router();

// All content routes require authentication
router.use("/content", attachUser, requireAuth);

/**
 * GET /content
 * Member-facing feed — published posts only, sorted by featured then date.
 */
router.get("/content", async (req, res) => {
  try {
    const { category } = req.query;

    const conditions: Parameters<typeof and>[0][] = [
      eq(contentPostsTable.status, "published"),
      eq(contentPostsTable.tenantId, req.user!.tenantId),
    ];

    if (category && typeof category === "string" && category !== "all") {
      conditions.push(eq(contentPostsTable.category, category));
    }

    const posts = await db
      .select()
      .from(contentPostsTable)
      .where(and(...conditions))
      .orderBy(
        desc(contentPostsTable.featured),
        desc(contentPostsTable.publishDate),
        desc(contentPostsTable.createdAt),
      );

    res.json({ posts });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch content feed");
    res.status(500).json({ error: "Failed to fetch content" });
  }
});

/**
 * GET /content/admin
 * All posts (drafts + published) for trainer/admin.
 */
router.get(
  "/content/admin",
  requireCapability("content:manage"),
  async (req, res) => {
    try {
      const posts = await db
        .select()
        .from(contentPostsTable)
        .where(eq(contentPostsTable.tenantId, req.user!.tenantId))
        .orderBy(
          desc(contentPostsTable.createdAt),
        );

      res.json({ posts });
    } catch (err) {
      req.log.error({ err }, "Failed to fetch admin content");
      res.status(500).json({ error: "Failed to fetch content" });
    }
  },
);

/**
 * POST /content
 * Create a new post. Admin/trainer only.
 */
router.post(
  "/content",
  requireCapability("content:manage"),
  async (req, res) => {
    const {
      title,
      description,
      body,
      type,
      category,
      status,
      featured,
      publishDate,
      mediaUrl,
      thumbnailUrl,
    } = req.body ?? {};

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    const validTypes = ["video", "image", "article"] as const;
    const validStatuses = ["draft", "published"] as const;

    if (type && !validTypes.includes(type)) {
      res.status(400).json({ error: "Invalid type" });
      return;
    }
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    try {
      const [post] = await db
        .insert(contentPostsTable)
        .values({
          tenantId: req.user!.tenantId,
          authorId: req.user!.id,
          title: title.trim(),
          description: description?.trim() || null,
          body: body?.trim() || null,
          type: type ?? "article",
          category: category?.trim() || null,
          status: status ?? "draft",
          featured: featured === true,
          publishDate: publishDate ? new Date(publishDate) : new Date(),
          mediaUrl: mediaUrl || null,
          thumbnailUrl: thumbnailUrl || null,
        })
        .returning();

      res.status(201).json({ post });
    } catch (err) {
      req.log.error({ err }, "Failed to create post");
      res.status(500).json({ error: "Failed to create post" });
    }
  },
);

/**
 * PATCH /content/:id
 * Update a post. Admin/trainer only.
 */
router.patch(
  "/content/:id",
  requireCapability("content:manage"),
  async (req, res) => {
    const rawId = req.params.id;
    if (typeof rawId !== "string" || !rawId) {
      res.status(400).json({ error: "Invalid post id" });
      return;
    }
    const id: string = rawId;

    const allowed = [
      "title",
      "description",
      "body",
      "type",
      "category",
      "status",
      "featured",
      "publishDate",
      "mediaUrl",
      "thumbnailUrl",
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in req.body) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    // Map camelCase to DB column shape for Drizzle
    const dbUpdates: Partial<typeof contentPostsTable.$inferInsert> = {};
    if ("title" in updates) dbUpdates.title = String(updates.title).trim();
    if ("description" in updates) dbUpdates.description = updates.description as string | null;
    if ("body" in updates) dbUpdates.body = updates.body as string | null;
    if ("type" in updates) dbUpdates.type = updates.type as "video" | "image" | "article";
    if ("category" in updates) dbUpdates.category = updates.category as string | null;
    if ("status" in updates) dbUpdates.status = updates.status as "draft" | "published";
    if ("featured" in updates) dbUpdates.featured = Boolean(updates.featured);
    if ("publishDate" in updates) dbUpdates.publishDate = updates.publishDate ? new Date(updates.publishDate as string) : null;
    if ("mediaUrl" in updates) dbUpdates.mediaUrl = updates.mediaUrl as string | null;
    if ("thumbnailUrl" in updates) dbUpdates.thumbnailUrl = updates.thumbnailUrl as string | null;
    dbUpdates.updatedAt = new Date();

    try {
      const [post] = await db
        .update(contentPostsTable)
        .set(dbUpdates)
        .where(
          and(
            eq(contentPostsTable.id, id),
            eq(contentPostsTable.tenantId, req.user!.tenantId),
          ),
        )
        .returning();

      if (!post) {
        res.status(404).json({ error: "Post not found" });
        return;
      }

      res.json({ post });
    } catch (err) {
      req.log.error({ err }, "Failed to update post");
      res.status(500).json({ error: "Failed to update post" });
    }
  },
);

/**
 * DELETE /content/:id
 * Delete a post. Admin/trainer only.
 */
router.delete(
  "/content/:id",
  requireCapability("content:manage"),
  async (req, res) => {
    const rawId = req.params.id;
    if (typeof rawId !== "string" || !rawId) {
      res.status(400).json({ error: "Invalid post id" });
      return;
    }
    const id: string = rawId;
    try {
      const [deleted] = await db
        .delete(contentPostsTable)
        .where(
          and(
            eq(contentPostsTable.id, id),
            eq(contentPostsTable.tenantId, req.user!.tenantId),
          ),
        )
        .returning({ id: contentPostsTable.id });

      if (!deleted) {
        res.status(404).json({ error: "Post not found" });
        return;
      }

      res.json({ success: true });
    } catch (err) {
      req.log.error({ err }, "Failed to delete post");
      res.status(500).json({ error: "Failed to delete post" });
    }
  },
);

export default router;
