import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";

export const contentTypeEnum = pgEnum("content_type", [
  "video",
  "image",
  "article",
]);

export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "published",
]);

export const contentPostsTable = pgTable(
  "content_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    body: text("body"),
    type: contentTypeEnum("type").notNull().default("article"),
    category: text("category"),
    status: contentStatusEnum("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    publishDate: timestamp("publish_date", {
      withTimezone: true,
      mode: "date",
    }),
    mediaUrl: text("media_url"),
    thumbnailUrl: text("thumbnail_url"),
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
  },
  (table) => [
    index("content_posts_tenant_idx").on(table.tenantId),
    index("content_posts_status_idx").on(table.status),
    index("content_posts_author_idx").on(table.authorId),
    index("content_posts_featured_idx").on(table.featured),
  ],
);

export type ContentPost = typeof contentPostsTable.$inferSelect;
export type NewContentPost = typeof contentPostsTable.$inferInsert;
export type ContentType = ContentPost["type"];
export type ContentStatus = ContentPost["status"];
