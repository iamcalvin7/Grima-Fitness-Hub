import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { startDevelopmentAvailabilityScheduler } from "./lib/availabilityScheduler";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// The web app is served from the same origin (path-routed), so cross-origin
// requests are only allowed from this project's own domains.
const allowedOrigins = new Set<string>(
  [
    ...(process.env.REPLIT_DEV_DOMAIN ? [process.env.REPLIT_DEV_DOMAIN] : []),
    ...(process.env.REPLIT_DOMAINS?.split(",") ?? []),
  ]
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => `https://${d}`),
);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      // Same-origin / non-browser requests have no Origin header.
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, origin ?? false);
      } else {
        callback(null, false);
      }
    },
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "400kb" })); // headroom for avatar data URLs
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
startDevelopmentAvailabilityScheduler();

export default app;
