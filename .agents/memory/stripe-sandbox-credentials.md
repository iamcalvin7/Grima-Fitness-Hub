---
name: Stripe sandbox credentials
description: Explains the credential source required for Stripe Test Mode wallet checkout in this workspace.
---

Use the Replit Secrets-based Test Mode credential path for Stripe wallet Checkout rather than assuming the attached native Stripe connector exposes a raw SDK secret.

**Why:** The native connector can be attached and healthy while withholding the raw API credential needed by the Stripe SDK and `stripe-replit-sync`. Hosted Checkout and signed webhook processing still require a Test Mode secret key and webhook signing secret at runtime.

**How to apply:** Keep values in Replit Secrets only; never request or display them in chat or source code. Accept only a Stripe Test Mode secret key beginning with `sk_test_`, and use the Test Mode webhook signing secret for StripeSync signature verification. Do not add a live-mode path unless the product scope explicitly changes.