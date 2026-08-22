import {
  index,
  foreignKey,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";
import { bookingsTable } from "./training";

export const notificationTypeEnum = pgEnum("notification_type", [
  "booking_created",
  "booking_confirmed",
  "booking_rejected",
  "booking_cancelled",
  "booking_rescheduled",
  "booking_attended",
  "booking_no_show",
]);

export const notificationsTable = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    recipientUserId: uuid("recipient_user_id").notNull(),
    type: notificationTypeEnum("type").notNull(),
    eventKey: text("event_key").notNull(),
    bookingId: uuid("booking_id"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.recipientUserId],
      foreignColumns: [usersTable.tenantId, usersTable.id],
      name: "notifications_tenant_recipient_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.bookingId],
      foreignColumns: [bookingsTable.tenantId, bookingsTable.id],
      name: "notifications_tenant_booking_fk",
    }),
    unique("notifications_event_key_unique").on(table.eventKey),
    unique("notifications_tenant_id_unique").on(table.tenantId, table.id),
    index("notifications_recipient_created_idx").on(
      table.recipientUserId,
      table.createdAt,
    ),
    index("notifications_recipient_unread_idx").on(
      table.recipientUserId,
      table.readAt,
    ),
    index("notifications_booking_idx").on(table.bookingId),
  ],
);

export type Notification = typeof notificationsTable.$inferSelect;
export type NewNotification = typeof notificationsTable.$inferInsert;
export type NotificationType = Notification["type"];