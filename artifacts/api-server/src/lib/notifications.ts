import { and, eq } from "drizzle-orm";
import {
  db,
  notificationsTable,
  usersTable,
  type NotificationEventType,
} from "@workspace/db";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Transaction;

export interface BookingNotificationInput {
  tenantId: string;
  bookingId: string;
  trainingSessionId: string;
  clientUserId: string;
  clientName: string;
  sessionLabel: string;
  startsAt: Date;
  eventType: NotificationEventType;
  resultingStatus?: "pending" | "confirmed";
  rejectionReason?: string | null;
  includeClient?: boolean;
}

function formatSessionDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Malta",
  }).format(value);
}

function messageFor(
  input: BookingNotificationInput,
  recipient: "client" | "admin",
): { title: string; body: string } {
  const date = formatSessionDate(input.startsAt);
  const subject = `${input.sessionLabel} on ${date}`;

  switch (input.eventType) {
    case "booking_requested":
      return recipient === "admin"
        ? {
            title: "New booking request",
            body: `${input.clientName} requested ${subject}. Review it in Sessions HQ.`,
          }
        : {
            title: "Booking request sent",
            body: `Your request for ${subject} is waiting for Marcus's confirmation.`,
          };
    case "booking_confirmed":
      return {
        title: "Booking confirmed",
        body: `Your ${subject} has been confirmed.`,
      };
    case "booking_rejected":
      return {
        title: "Booking request declined",
        body: input.rejectionReason
          ? `Your request for ${subject} was declined: ${input.rejectionReason}`
          : `Your request for ${subject} was declined.`,
      };
    case "booking_cancelled":
      return {
        title: "Booking cancelled",
        body: `${input.clientName} cancelled ${subject}.`,
      };
    case "booking_rescheduled":
      return recipient === "admin"
        ? {
            title: "Booking rescheduled",
            body: `${input.clientName} moved their booking to ${subject}. The new booking is ${input.resultingStatus ?? "pending"} confirmation.`,
          }
        : {
            title: "Session rescheduled",
            body: `Your new ${subject} is ${input.resultingStatus === "confirmed" ? "confirmed" : "waiting for Marcus's confirmation"}.`,
          };
    default:
      return {
        title: "Booking update",
        body: `There is an update to your ${subject}.`,
      };
  }
}

/**
 * Add the lifecycle event for the client and/or the tenant's active admins.
 * The caller must invoke this with the same transaction used for the booking
 * transition. The unique event key makes retries safe.
 */
export async function createBookingNotifications(
  executor: Executor,
  input: BookingNotificationInput,
): Promise<void> {
  const admins =
    input.eventType === "booking_confirmed" || input.eventType === "booking_rejected"
      ? []
      : await executor
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(
            and(
              eq(usersTable.tenantId, input.tenantId),
              eq(usersTable.role, "admin"),
              eq(usersTable.isActive, true),
            ),
          );

  const recipients = [
    ...(input.includeClient === false
      ? []
      : [{ id: input.clientUserId, kind: "client" as const }]),
    ...admins
      .filter((admin) => admin.id !== input.clientUserId)
      .map((admin) => ({ id: admin.id, kind: "admin" as const })),
  ];
  if (recipients.length === 0) return;

  const eventId = `${input.eventType}:${input.bookingId}`;
  await executor
    .insert(notificationsTable)
    .values(
      recipients.map((recipient) => {
        const message = messageFor(input, recipient.kind);
        return {
          tenantId: input.tenantId,
          recipientUserId: recipient.id,
          type: input.eventType,
          eventKey: `${eventId}:${recipient.id}`,
          title: message.title,
          body: message.body,
          bookingId: input.bookingId,
          trainingSessionId: input.trainingSessionId,
        };
      }),
    )
    .onConflictDoNothing();
}

export async function scheduleBookingReminders(
  executor: Executor,
  input: Pick<
    BookingNotificationInput,
    | "tenantId"
    | "bookingId"
    | "trainingSessionId"
    | "clientUserId"
    | "sessionLabel"
    | "startsAt"
  >,
): Promise<void> {
  const now = new Date();
  const windows = [
    { eventType: "session_reminder_24h" as const, offsetMs: 24 * 60 * 60 * 1000, title: "Session tomorrow" },
    { eventType: "session_reminder_2h" as const, offsetMs: 2 * 60 * 60 * 1000, title: "Session in 2 hours" },
  ];
  const values = windows.flatMap(({ eventType, offsetMs, title }) => {
    const scheduledFor = new Date(input.startsAt.getTime() - offsetMs);
    if (scheduledFor <= now) return [];
    return [{
      tenantId: input.tenantId,
      recipientUserId: input.clientUserId,
      type: eventType,
      eventKey: `${eventType}:${input.bookingId}:${input.clientUserId}:${input.startsAt.toISOString()}`,
      title,
      body: `Your ${input.sessionLabel} starts ${eventType === "session_reminder_24h" ? "tomorrow" : "in 2 hours"}.`,
      bookingId: input.bookingId,
      trainingSessionId: input.trainingSessionId,
      deliveryStatus: "pending" as const,
      scheduledFor,
    }];
  });
  if (values.length) await executor.insert(notificationsTable).values(values).onConflictDoNothing();
}

export async function cancelPendingBookingReminders(
  executor: Executor,
  tenantId: string,
  bookingId: string,
): Promise<void> {
  await executor
    .update(notificationsTable)
    .set({ deliveryStatus: "cancelled" })
    .where(
      and(
        eq(notificationsTable.tenantId, tenantId),
        eq(notificationsTable.bookingId, bookingId),
        eq(notificationsTable.deliveryStatus, "pending"),
      ),
    );
}