import type { EmailMessage } from "./email";

/** Base URL of the web app, used in email links. */
export function appBaseUrl(): string {
  const prod = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  const dev = process.env.REPLIT_DEV_DOMAIN?.trim();
  const host = process.env.NODE_ENV === "production" ? (prod ?? dev) : (dev ?? prod);
  return host ? `https://${host}` : "http://localhost";
}

const BRAND = "Marcus Grima PT";

function shell(title: string, bodyHtml: string, ctaUrl: string, ctaLabel: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0A0A0A;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid #262626;padding:32px;">
        <tr><td style="padding-bottom:24px;">
          <span style="color:#ffffff;font-size:14px;font-weight:bold;letter-spacing:4px;text-transform:uppercase;">${BRAND}</span>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <span style="color:#ffffff;font-size:20px;font-weight:bold;">${title}</span>
        </td></tr>
        <tr><td style="color:#a3a3a3;font-size:14px;line-height:22px;padding-bottom:28px;">${bodyHtml}</td></tr>
        <tr><td>
          <a href="${ctaUrl}" style="display:inline-block;background:#22c55e;color:#0A0A0A;font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:999px;">${ctaLabel}</a>
        </td></tr>
        <tr><td style="color:#525252;font-size:12px;line-height:18px;padding-top:28px;">
          If the button doesn't work, copy this link into your browser:<br>
          <span style="color:#737373;word-break:break-all;">${ctaUrl}</span>
        </td></tr>
      </table>
      <table role="presentation" width="480"><tr><td style="color:#525252;font-size:11px;padding-top:16px;">
        You received this because of activity on your ${BRAND} account. If this wasn't you, you can ignore this email.
      </td></tr></table>
    </td></tr>
  </table>
</body></html>`;
}

export function passwordResetEmail(to: string, token: string): EmailMessage {
  const url = `${appBaseUrl()}/?reset=${encodeURIComponent(token)}`;
  return {
    to,
    subject: `Reset your ${BRAND} password`,
    html: shell(
      "Reset your password",
      "We received a request to reset the password for your account. This link is valid for <strong>30 minutes</strong> and can be used once.",
      url,
      "Reset password",
    ),
    text: `Reset your ${BRAND} password (valid 30 minutes, single use): ${url}\n\nIf this wasn't you, ignore this email.`,
  };
}

export function emailVerificationEmail(to: string, token: string): EmailMessage {
  const url = `${appBaseUrl()}/?verify=${encodeURIComponent(token)}`;
  return {
    to,
    subject: `Verify your email for ${BRAND}`,
    html: shell(
      "Verify your email",
      "Confirm this email address to secure your account. This link is valid for <strong>24 hours</strong>.",
      url,
      "Verify email",
    ),
    text: `Verify your email for ${BRAND} (valid 24 hours): ${url}`,
  };
}

export function emailChangeEmail(to: string, token: string): EmailMessage {
  const url = `${appBaseUrl()}/?verify=${encodeURIComponent(token)}`;
  return {
    to,
    subject: `Confirm your new email for ${BRAND}`,
    html: shell(
      "Confirm your new email",
      "You asked to change your account email to this address. Your account email will only change after you confirm. This link is valid for <strong>24 hours</strong>.",
      url,
      "Confirm new email",
    ),
    text: `Confirm your new email for ${BRAND} (valid 24 hours): ${url}\n\nYour account email only changes after confirmation.`,
  };
}
