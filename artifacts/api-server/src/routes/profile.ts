import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, profilesTable, type Profile } from "@workspace/db";
import { attachUser, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

/* ────────────────────────────────────────────────────────────────────────
   Validation
   Ownership NEVER comes from the payload: userId/tenantId/role and any
   other unknown fields are ignored — only the whitelist below is read.
──────────────────────────────────────────────────────────────────────── */

const GOALS = [
  "Build Muscle",
  "Lose Weight",
  "Get Fit",
  "Increase Strength",
  "Improve Endurance",
] as const;
const ACTIVITY_LEVELS = ["Sedentary", "Lightly Active", "Active", "Very Active"] as const;
const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
const GENDERS = ["Male", "Female", "Other"] as const;

type FieldErrors = Record<string, string>;

interface ProfileInput {
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  goal?: string | null;
  activityLevel?: string | null;
  experienceLevel?: string | null;
  avatarUrl?: string | null;
  onboardingCompleted?: boolean;
}

const MAX_AVATAR_LENGTH = 300_000; // ~220KB binary as data URL

function validateProfilePayload(body: unknown): {
  data: ProfileInput;
  errors: FieldErrors;
} {
  const raw = (body ?? {}) as Record<string, unknown>;
  const data: ProfileInput = {};
  const errors: FieldErrors = {};

  const str = (key: keyof ProfileInput, maxLen: number) => {
    if (!(key in raw)) return;
    const v = raw[key];
    if (v === null) { data[key] = null as never; return; }
    if (typeof v !== "string" || v.trim().length === 0 || v.length > maxLen) {
      errors[key] = "Invalid value";
      return;
    }
    data[key] = v.trim() as never;
  };

  const oneOf = (key: keyof ProfileInput, allowed: readonly string[]) => {
    if (!(key in raw)) return;
    const v = raw[key];
    if (v === null) { data[key] = null as never; return; }
    if (typeof v !== "string" || !allowed.includes(v)) {
      errors[key] = `Must be one of: ${allowed.join(", ")}`;
      return;
    }
    data[key] = v as never;
  };

  const int = (key: "heightCm" | "weightKg", min: number, max: number) => {
    if (!(key in raw)) return;
    const v = raw[key];
    if (v === null) { data[key] = null; return; }
    if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
      errors[key] = `Must be a whole number between ${min} and ${max}`;
      return;
    }
    data[key] = v;
  };

  str("firstName", 100);
  str("lastName", 100);
  oneOf("gender", GENDERS);
  oneOf("goal", GOALS);
  oneOf("activityLevel", ACTIVITY_LEVELS);
  oneOf("experienceLevel", EXPERIENCE_LEVELS);
  int("heightCm", 100, 250);
  int("weightKg", 30, 300);

  if ("dateOfBirth" in raw) {
    const v = raw.dateOfBirth;
    if (v === null) {
      data.dateOfBirth = null;
    } else if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      errors.dateOfBirth = "Must be a date in YYYY-MM-DD format";
    } else {
      const dob = new Date(`${v}T00:00:00Z`);
      const now = new Date();
      const age = (now.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (Number.isNaN(dob.getTime()) || age < 13 || age > 110) {
        errors.dateOfBirth = "Enter a valid date of birth";
      } else {
        data.dateOfBirth = v;
      }
    }
  }

  if ("avatarUrl" in raw) {
    const v = raw.avatarUrl;
    if (v === null) {
      data.avatarUrl = null;
    } else if (
      typeof v !== "string" ||
      v.length > MAX_AVATAR_LENGTH ||
      // Only raster data URLs (no SVG — script risk) or app-relative paths.
      !(/^data:image\/(jpeg|png|webp|gif);base64,/.test(v) || (v.startsWith("/") && !v.startsWith("//")))
    ) {
      errors.avatarUrl = "Invalid avatar image";
    } else {
      data.avatarUrl = v;
    }
  }

  if ("onboardingCompleted" in raw) {
    const v = raw.onboardingCompleted;
    if (typeof v !== "boolean") errors.onboardingCompleted = "Must be true or false";
    else data.onboardingCompleted = v;
  }

  return { data, errors };
}

function publicProfile(p: Profile) {
  const { userId: _userId, ...rest } = p;
  return rest;
}

/* ──────────────────────────────────────────────────────────────────────── */

router.use("/profile", attachUser, requireAuth);

router.get("/profile", async (req, res) => {
  const rows = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, req.user!.id))
    .limit(1);
  res.json({ profile: rows[0] ? publicProfile(rows[0]) : null });
});

router.post("/profile", async (req, res) => {
  const { data, errors } = validateProfilePayload(req.body);
  if (Object.keys(errors).length > 0) {
    res.status(400).json({ error: "Please check the highlighted fields", fields: errors });
    return;
  }

  const existing = await db
    .select({ id: profilesTable.id })
    .from(profilesTable)
    .where(eq(profilesTable.userId, req.user!.id))
    .limit(1);
  if (existing[0]) {
    res.status(409).json({ error: "Profile already exists" });
    return;
  }

  const inserted = await db
    .insert(profilesTable)
    .values({ ...data, userId: req.user!.id })
    .onConflictDoNothing({ target: profilesTable.userId })
    .returning();

  if (!inserted[0]) {
    res.status(409).json({ error: "Profile already exists" });
    return;
  }
  res.status(201).json({ profile: publicProfile(inserted[0]) });
});

router.patch("/profile", async (req, res) => {
  const { data, errors } = validateProfilePayload(req.body);
  if (Object.keys(errors).length > 0) {
    res.status(400).json({ error: "Please check the highlighted fields", fields: errors });
    return;
  }
  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const updated = await db
    .update(profilesTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(profilesTable.userId, req.user!.id))
    .returning();

  if (!updated[0]) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json({ profile: publicProfile(updated[0]) });
});

export default router;
