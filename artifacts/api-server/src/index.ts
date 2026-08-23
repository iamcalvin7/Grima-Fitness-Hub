import app from "./app";
import { logger } from "./lib/logger";
import { startDevelopmentAvailabilityScheduler } from "./lib/availabilityScheduler";
import { startDevelopmentSessionReminderScheduler } from "./lib/sessionReminderScheduler";
import { initializeStripeSync } from "./lib/stripeClient";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function startServer(): Promise<void> {
  try {
    await initializeStripeSync();
    logger.info("Stripe Test Mode payment sync is ready");
  } catch (err) {
    logger.warn(
      { err },
      "Stripe Test Mode is not configured; wallet top-ups will remain unavailable until its native connector is attached",
    );
  }
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
    startDevelopmentAvailabilityScheduler();
    startDevelopmentSessionReminderScheduler();
  });
}

void startServer().catch((err) => {
  logger.error({ err }, "Unable to initialize Stripe Test Mode payments");
  process.exit(1);
});
