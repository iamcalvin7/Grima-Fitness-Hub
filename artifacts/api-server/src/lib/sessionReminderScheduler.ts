import { and, eq, isNull, lte, sql } from "drizzle-orm";
import {
  bookingsTable,
  db,
  notificationsTable,
  trainingSessionsTable,
} from "@workspace/db";
import { logger } from "./logger";

const INTERVAL_MS = 30_000;
const BATCH_SIZE = 100;
let started = false;

export async function processDueSessionReminders(now = new Date()): Promise<number> {
  const due = await db
    .select({ id: notificationsTable.id, bookingId: notificationsTable.bookingId, type: notificationsTable.type, scheduledFor: notificationsTable.scheduledFor })
    .from(notificationsTable)
    .where(and(
      eq(notificationsTable.deliveryStatus, "pending"),
      lte(notificationsTable.scheduledFor, now),
    ))
    .limit(BATCH_SIZE);
  let delivered = 0;

  for (const reminder of due) {
    if (!reminder.bookingId || !reminder.scheduledFor) continue;
    const bookingId = reminder.bookingId;
    const scheduledFor = reminder.scheduledFor;
    const result = await db.transaction(async (tx) => {
      // Serialize with booking cancellation, rescheduling, and attendance changes.
      await tx.execute(sql`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`);
      const [booking] = await tx
        .select({
          status: bookingsTable.status,
          sessionStatus: trainingSessionsTable.status,
          startsAt: trainingSessionsTable.startsAt,
        })
        .from(bookingsTable)
        .innerJoin(trainingSessionsTable, and(
          eq(trainingSessionsTable.id, bookingsTable.trainingSessionId),
          eq(trainingSessionsTable.tenantId, bookingsTable.tenantId),
        ))
        .where(eq(bookingsTable.id, bookingId))
        .limit(1);

      const offset = reminder.type === "session_reminder_24h" ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
      const valid = booking
        && booking.status === "confirmed"
        && booking.sessionStatus === "scheduled"
        && booking.startsAt > now
        && booking.startsAt.getTime() - offset === scheduledFor.getTime();
      const [updated] = await tx
        .update(notificationsTable)
        .set({ deliveryStatus: valid ? "delivered" : "cancelled", createdAt: valid ? now : undefined })
        .where(and(
          eq(notificationsTable.id, reminder.id),
          eq(notificationsTable.deliveryStatus, "pending"),
        ))
        .returning({ id: notificationsTable.id });
      return valid && Boolean(updated);
    });
    if (result) delivered += 1;
  }
  return delivered;
}

export function startDevelopmentSessionReminderScheduler(): void {
  if (started || process.env.NODE_ENV !== "development") return;
  started = true;
  const run = async () => {
    try {
      const delivered = await processDueSessionReminders();
      if (delivered) logger.info({ delivered }, "Session reminders delivered");
    } catch (error) {
      logger.error({ err: error }, "Session reminder processing failed");
    }
  };
  void run();
  const timer = setInterval(() => void run(), INTERVAL_MS);
  timer.unref();
}