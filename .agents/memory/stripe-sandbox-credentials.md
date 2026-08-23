---
name: Stripe sandbox credentials
description: Explains the credential source required for Stripe Test Mode wallet checkout in this workspace.
---

Use the Replit Secrets-based Test Mode credential path for Stripe wallet Checkout rather than assuming the attached native Stripe connector exposes a raw SDK secret. Always register the managed Stripe Test Mode webhook at startup; do not treat the presence of a webhook-secret setting as evidence that an endpoint exists.

**Why:** The native connector can be attached and healthy while withholding the raw API credential needed by the Stripe SDK. Also, a configured legacy webhook secret can exist without any active endpoint, allowing Checkout to succeed while leaving wallet top-ups permanently pending.

**How to apply:** Keep values in Replit Secrets only; never request or display them in chat or source code. Accept only a Stripe Test Mode secret key beginning with `sk_test_`. Let the managed webhook integration retain and use its endpoint-specific signing secret for signature verification, then verify that the endpoint is enabled before accepting a payment. Do not add a live-mode path unless the product scope explicitly changes.