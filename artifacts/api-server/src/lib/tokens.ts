import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import {
  db,
  passwordResetTokensTable,
  verificationTokensTable,
  type PasswordResetToken,
  type VerificationToken,
} from "@workspace/db";

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/* ── Password reset ────────────────────────────────────────────────────── */

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = generateToken();
  await db.insert(passwordResetTokensTable).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  return token;
}

/** Find a valid (unexpired, unused) reset token row. Does NOT consume it. */
export async function findValidResetToken(
  token: string,
): Promise<PasswordResetToken | null> {
  const rows = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.tokenHash, hashToken(token)),
        gt(passwordResetTokensTable.expiresAt, new Date()),
        isNull(passwordResetTokensTable.usedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Mark a reset token used; returns false if it was already consumed (race). */
export async function consumeResetToken(id: string): Promise<boolean> {
  const updated = await db
    .update(passwordResetTokensTable)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokensTable.id, id),
        isNull(passwordResetTokensTable.usedAt),
      ),
    )
    .returning({ id: passwordResetTokensTable.id });
  return updated.length > 0;
}

/* ── Email verification / change ───────────────────────────────────────── */

export async function createVerificationToken(
  userId: string,
  purpose: "email_verify" | "email_change",
  newEmail?: string,
): Promise<string> {
  const token = generateToken();
  await db.insert(verificationTokensTable).values({
    userId,
    tokenHash: hashToken(token),
    purpose,
    newEmail: newEmail ?? null,
    expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
  });
  return token;
}

export async function findValidVerificationToken(
  token: string,
): Promise<VerificationToken | null> {
  const rows = await db
    .select()
    .from(verificationTokensTable)
    .where(
      and(
        eq(verificationTokensTable.tokenHash, hashToken(token)),
        gt(verificationTokensTable.expiresAt, new Date()),
        isNull(verificationTokensTable.usedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function consumeVerificationToken(id: string): Promise<boolean> {
  const updated = await db
    .update(verificationTokensTable)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(verificationTokensTable.id, id),
        isNull(verificationTokensTable.usedAt),
      ),
    )
    .returning({ id: verificationTokensTable.id });
  return updated.length > 0;
}
