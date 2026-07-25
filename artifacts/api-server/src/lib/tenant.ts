import { eq } from "drizzle-orm";
import { db, tenantsTable, type Tenant } from "@workspace/db";

export const DEFAULT_TENANT_SLUG = "marcus-grima";

let cached: Tenant | null = null;

/**
 * v1 is single-tenant: every request operates on the default tenant.
 * Seeds it on first access so a fresh database works without manual setup.
 */
export async function getDefaultTenant(): Promise<Tenant> {
  if (cached) return cached;

  const existing = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, DEFAULT_TENANT_SLUG))
    .limit(1);

  if (existing[0]) {
    cached = existing[0];
    return cached;
  }

  const inserted = await db
    .insert(tenantsTable)
    .values({ name: "Marcus Grima PT", slug: DEFAULT_TENANT_SLUG })
    .onConflictDoNothing({ target: tenantsTable.slug })
    .returning();

  if (inserted[0]) {
    cached = inserted[0];
    return cached;
  }

  // Lost a race with a concurrent insert — read it back.
  const raced = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, DEFAULT_TENANT_SLUG))
    .limit(1);
  if (!raced[0]) throw new Error("Failed to seed default tenant");
  cached = raced[0];
  return cached;
}
