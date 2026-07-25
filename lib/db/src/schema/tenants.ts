import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export interface TenantBranding {
  appName: string;
  shortName: string;
  primaryColour: string;
  accentColour: string;
  backgroundColour: string;
  logoUrl: string | null;
}

export const tenantsTable = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  branding: jsonb("branding")
    .$type<TenantBranding>()
    .notNull()
    .default({
      appName: "Marcus Grima",
      shortName: "MG",
      primaryColour: "#E6E6E6",
      accentColour: "#65D46E",
      backgroundColour: "#080808",
      logoUrl: null,
    }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
});

export type Tenant = typeof tenantsTable.$inferSelect;
export type NewTenant = typeof tenantsTable.$inferInsert;
