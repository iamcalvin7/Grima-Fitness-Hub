/**
 * GET /audit
 * Paginated, tenant-scoped audit-log reader.
 *
 * Protected by requireCapability("audit:read") — only admin (Marcus) has this
 * capability in the current role mapping.
 *
 * Pagination: ?page=<n>&limit=<n>  (default 1 / 50; hard max limit 100)
 *
 * There is deliberately no POST / PATCH / DELETE endpoint for audit records —
 * the log is append-only.
 */

import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, auditLogsTable } from "@workspace/db";
import { attachUser, requireAuth, requireCapability } from "../middlewares/auth";

const router: IRouter = Router();

router.get(
  "/audit",
  attachUser,
  requireAuth,
  requireCapability("audit:read"),
  async (req, res) => {
    try {
      const rawPage = parseInt(String(req.query.page ?? "1"), 10);
      const rawLimit = parseInt(String(req.query.limit ?? "50"), 10);

      const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
      // Safe limit: min 1, max 100. Default 50.
      const limit = Number.isFinite(rawLimit)
        ? Math.min(100, Math.max(1, rawLimit))
        : 50;
      const offset = (page - 1) * limit;

      const records = await db
        .select()
        .from(auditLogsTable)
        .where(eq(auditLogsTable.tenantId, req.user!.tenantId))
        .orderBy(desc(auditLogsTable.createdAt))
        .limit(limit)
        .offset(offset);

      res.json({ records, page, limit });
    } catch (err) {
      req.log.error({ err }, "Failed to fetch audit log");
      res.status(500).json({ error: "Failed to fetch audit log" });
    }
  },
);

export default router;
