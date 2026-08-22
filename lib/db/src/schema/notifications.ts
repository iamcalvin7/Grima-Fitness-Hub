import {
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";
import { bookingsTable, trainingSessionsTable } from "./training";

export const notificationTypeEnum = pgEnum("notification_type", [
  "booking_requested",
  "booking_created",
  "booking_confirmed",
  "booking_rejected",
  "booking_cancelled",
  "booking_rescheduled",
  "booking_attended",
  "booking_no_show",
  "session_reminder_24h",
  "session_reminder_2h",
]);

export const notificationDeliveryStatusEnum = pgEnum(
  "notification_delivery_status",
  ["pending", "delivered", "cancelled"],
);

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
    title: text("title").notNull(),
    body: text("body").notNull(),
    bookingId: uuid("booking_id").notNull(),
    trainingSessionId: uuid("training_session_id"),
    deliveryStatus: notificationDeliveryStatusEnum("delivery_status")
      .notNull()
      .default("delivered"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true, mode: "date" }),
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
    foreignKey({
      columns: [table.tenantId, table.trainingSessionId],
      foreignColumns: [trainingSessionsTable.tenantId, trainingSessionsTable.id],
      name: "notifications_tenant_session_fk",
    }),
    unique("notifications_event_key_unique").on(table.eventKey),
    unique("notifications_tenant_id_unique").on(table.tenantId, table.id),
    index("notifications_recipient_created_idx").on(
      table.tenantId,
      table.recipientUserId,
      table.createdAt,
    ),
    index("notifications_recipient_unread_idx").on(
      table.tenantId,
      table.recipientUserId,
      table.readAt,
    ),
    index("notifications_booking_idx").on(table.bookingId),
    index("notifications_due_idx").on(table.deliveryStatus, table.scheduledFor),
  ],
);

export type Notification = typeof notificationsTable.$inferSelect;
export type NewNotification = typeof notificationsTable.$inferInsert;
export type NotificationType = Notification["type"];
export type NotificationEventType = NotificationType;