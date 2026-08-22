import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  notificationsTable,
  usersTable,
  type NotificationType,
} from "@workspace/db";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Transaction;

export type BookingNotificationEvent = Extract<
  NotificationType,
  | "booking_created"
  | "booking_confirmed"
  | "booking_rejected"
  | "booking_cancelled"
  | "booking_rescheduled"
  | "booking_attended"
  | "booking_no_show"
>;

export type BookingNotificationDetails = {
  tenantId: string;
  bookingId: string;
  event: BookingNotificationEvent;
  recipientUserIds: string[];
  audience: "client" | "staff";
  clientName?: string;
  sessionStartsAt?: Date;
  sessionTypeName?: string | null;
  locationName?: string | null;
  reason?: string | null;
};

function sessionLabel(details: BookingNotificationDetails): string {
  const type = details.sessionTypeName ?? "training session";
  const location = details.locationName ? ` at ${details.locationName}` : "";
  const when = details.sessionStartsAt
    ? ` on ${details.sessionStartsAt.toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Malta",
      })}`
    : "";
  return `${type}${when}${location}`;
}

function copyFor(
  details: BookingNotificationDetails,
): { title: string; body: string } {
  const session = sessionLabel(details);
  const client = details.clientName ? ` from ${details.clientName}` : "";
  switch (details.event) {
    case "booking_created":
      return {
        title: details.audience === "staff" ? "New booking request" : "Booking request sent",
        body: details.audience === "staff"
          ? `A new booking request${client} is waiting for ${session}.`
          : `Your request for ${session} has been sent to Marcus.`,
      };
    case "booking_confirmed":
      return {
        title: "Booking confirmed",
        body: `Your booking for ${session} has been confirmed.`,
      };
    case "booking_rejected":
      return {
        title: "Booking request declined",
        body: details.reason
          ? `Your request for ${session} was declined: ${details.reason}`
          : `Your request for ${session} was declined.`,
      };
    case "booking_cancelled":
      return {
        title: "Booking cancelled",
        body: details.audience === "staff"
          ? `The booking for ${session}${client} has been cancelled.`
          : `Your booking for ${session} has been cancelled.`,
      };
    case "booking_rescheduled":
      return {
        title: details.audience === "staff" ? "Reschedule request" : "Reschedule request sent",
        body: details.audience === "staff"
          ? `A reschedule request${client} is waiting for ${session}.`
          : `Your request to move your booking to ${session} has been sent to Marcus.`,
      };
    case "booking_attended":
      return {
        title: "Session marked attended",
        body: `Your ${session} has been marked as attended.`,
      };
    case "booking_no_show":
      return {
        title: "Session marked as no-show",
        body: `Your ${session} has been marked as a no-show.`,
      };
  }
}

export async function notifyBookingEvent(
  executor: Executor,
  details: BookingNotificationDetails,
): Promise<void> {
  const recipients = [...new Set(details.recipientUserIds)].filter(Boolean);
  if (recipients.length === 0) return;
  const copy = copyFor(details);

  await executor
    .insert(notificationsTable)
    .values(
      recipients.map((recipientUserId) => ({
        tenantId: details.tenantId,
        recipientUserId,
        type: details.event,
        eventKey: `${details.event}:${details.bookingId}:${recipientUserId}`,
        bookingId: details.bookingId,
        title: copy.title,
        body: copy.body,
      })),
    )
    .onConflictDoNothing();
}

export async function notifyActiveAdmins(
  executor: Executor,
  details: Omit<BookingNotificationDetails, "recipientUserIds" | "audience">,
): Promise<void> {
  const admins = await executor
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.tenantId, details.tenantId),
        eq(usersTable.role, "admin"),
        eq(usersTable.isActive, true),
      ),
    );
  await notifyBookingEvent(executor, {
    ...details,
    recipientUserIds: admins.map((admin) => admin.id),
    audience: "staff",
  });
}