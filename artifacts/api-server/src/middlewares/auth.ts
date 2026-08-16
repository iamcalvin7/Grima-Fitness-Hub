import type { NextFunction, Request, Response } from "express";
import type { User } from "@workspace/db";
import { SESSION_COOKIE, getSessionUser } from "../lib/sessions";
import { hasCapability, type Capability } from "../lib/capabilities";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      sessionToken?: string;
    }
  }
}

/** Populate req.user from the session cookie when present; never rejects. */
export async function attachUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = (req.cookies as Record<string, string> | undefined)?.[
    SESSION_COOKIE
  ];
  if (token) {
    const user = await getSessionUser(token);
    if (user) {
      req.user = user;
      req.sessionToken = token;
    }
  }
  next();
}

/** Reject unauthenticated requests. */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

/** Reject users without one of the given roles. Use after requireAuth. */
export function requireRole(...roles: User["role"][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

/**
 * Reject users whose role does not carry the required capability.
 * Uses the central capability mapping from lib/capabilities.ts.
 * Use after attachUser + requireAuth.
 *
 * Fail-closed behaviour:
 *   - No user (unauthenticated)          → 401 Not authenticated
 *   - User present, capability absent    → 403 Forbidden
 *   - Unknown, missing or invalid role   → 403 Forbidden (no capability granted)
 */
export function requireCapability(capability: Capability) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!hasCapability(req.user.role, capability)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
