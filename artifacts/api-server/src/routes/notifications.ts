import { Router, type IRouter } from "express";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { attachUser, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
const MAX_NOTIFICATIONS = 50;

router.use("/notifications", attachUser, requireAuth);

function output(row: typeof notificationsTable.$inferSelect) {
  return {
    id: row.id,
    type: row.type,
    bookingId: row.bookingId,
    title: row.title,
    body: row.body,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

router.get("/notifications", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const recipientUserId = req.user!.id;
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.tenantId, tenantId),
          eq(notificationsTable.recipientUserId, recipientUserId),
            eq(notificationsTable.deliveryStatus, "delivered"),
        ),
      )
      .orderBy(desc(notificationsTable.createdAt))
      .limit(MAX_NOTIFICATIONS);
    const [unread] = await db
      .select({ count: count() })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.tenantId, tenantId),
          eq(notificationsTable.recipientUserId, recipientUserId),
          isNull(notificationsTable.readAt),
        ),
      );
    res.json({
      notifications: rows.map(output),
      unreadCount: Number(unread?.count ?? 0),
    });
  } catch (error) {
    req.log.error({ err: error }, "Failed to fetch notifications");
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.post("/notifications/read-all", async (req, res) => {
  try {
    await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notificationsTable.tenantId, req.user!.tenantId),
          eq(notificationsTable.recipientUserId, req.user!.id),
          isNull(notificationsTable.readAt),
        ),
      );
    res.json({ ok: true });
  } catch (error) {
    req.log.error({ err: error }, "Failed to mark notifications as read");
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

router.post("/notifications/:id/read", async (req, res) => {
  try {
    const [updated] = await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notificationsTable.id, req.params.id),
          eq(notificationsTable.tenantId, req.user!.tenantId),
          eq(notificationsTable.recipientUserId, req.user!.id),
        ),
      )
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.json({ notification: output(updated) });
  } catch (error) {
    req.log.error({ err: error }, "Failed to mark notification as read");
    res.status(500).json({ error: "Failed to update notification" });
  }
});

export default router;