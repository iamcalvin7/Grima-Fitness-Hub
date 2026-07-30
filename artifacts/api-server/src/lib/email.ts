import { logger } from "./logger";

/**
 * Provider-independent email service.
 *
 * Selection is configuration-driven:
 * - RESEND_API_KEY set          → Resend (production-grade delivery).
 * - otherwise                    → console transport: full message logged to
 *                                  the server log so every flow can be built
 *                                  and tested without a provider.
 *
 * Production readiness: a real provider (e.g. Resend) AND a verified sending
 * domain (EMAIL_FROM on that domain) are REQUIRED before launch. The
 * `emailDeliveryMode()` value is surfaced via GET /api/auth/providers so the
 * app and docs can report this clearly.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}

const FROM_FALLBACK = "Marcus Grima PT <onboarding@resend.dev>";

class ConsoleEmailService implements EmailService {
  async send(message: EmailMessage): Promise<void> {
    logger.info(
      {
        email: {
          to: message.to,
          subject: message.subject,
          text: message.text,
        },
      },
      "EMAIL (console transport — no provider configured)",
    );
  }
}

class ResendEmailService implements EmailService {
  constructor(private readonly apiKey: string) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || FROM_FALLBACK,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Resend API error ${res.status}: ${body.slice(0, 300)}`);
    }
  }
}

export function emailDeliveryMode(): "resend" | "console" {
  return process.env.RESEND_API_KEY ? "resend" : "console";
}

export function getEmailService(): EmailService {
  const key = process.env.RESEND_API_KEY;
  return key ? new ResendEmailService(key) : new ConsoleEmailService();
}

/**
 * Fire-and-forget send with error logging. Account flows must not leak
 * delivery failures to the caller (anti-enumeration), so callers use this
 * and always return their generic response.
 */
export function sendEmailSafely(message: EmailMessage): void {
  getEmailService()
    .send(message)
    .catch((err) => logger.error({ err, to: message.to }, "email send failed"));
}
