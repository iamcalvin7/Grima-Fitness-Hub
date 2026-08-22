import { db, tenantsTable } from "@workspace/db";
import { generateAvailability } from "./availability";
import { logger } from "./logger";

const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;
let started = false;

async function refreshAllTenants(): Promise<void> {
  const tenants = await db.select({ id: tenantsTable.id }).from(tenantsTable);
  for (const tenant of tenants) {
    try {
      const summary = await generateAvailability(tenant.id);
      logger.info({ tenantId: tenant.id, ...summary }, "Development availability refresh completed");
    } catch (error) {
      logger.error({ err: error, tenantId: tenant.id }, "Development availability refresh failed");
    }
  }
}

/**
 * Development-only convenience refresh. Production scheduling remains out of
 * scope: this process-local timer is never enabled outside development.
 */
export function startDevelopmentAvailabilityScheduler(): void {
  if (started || process.env.NODE_ENV !== "development") return;
  started = true;
  void refreshAllTenants();
  const timer = setInterval(() => void refreshAllTenants(), DAILY_INTERVAL_MS);
  timer.unref();
}