# Costs & Dependencies — Marcus Grima PT

## Current Infrastructure Costs (at launch)

| Service | Cost | Notes |
|---|---|---|
| Replit Core plan | ~$20/month | Includes hosting, Postgres, deployments |
| Replit Postgres | Included | Up to 1 GB storage in Core plan; ~$0.05/GB/month beyond |
| Replit deployment | Included | Always-on, auto-scaling |

---

## External Service Costs (to enable at launch)

### Resend (email delivery)
| Tier | Price | Emails/month |
|---|---|---|
| Free | $0 | 3,000/month, 100/day |
| Pro | $20/month | 50,000/month |
| Business | $90/month | 100,000/month |

**Recommendation for launch:** Free tier is sufficient for a small client base (password resets, verification emails). Upgrade if daily sends approach 100.

### Google OAuth (sign-in)
- Free. No usage fees for standard OAuth sign-in.
- Requires a Google Cloud project (free tier) and verification for the OAuth consent screen.
- **Important:** Apps in "testing" mode (unverified) are limited to 100 users. Before launching, submit for Google verification (takes 1–4 weeks, may require privacy policy and terms of service URLs).

### Apple Sign-in
- Requires an Apple Developer Program membership: **$99/year**
- Not needed at v1 launch. The button is visible but disabled ("coming soon").

---

## Ongoing Operational Costs (estimates)

| Item | Monthly estimate | Notes |
|---|---|---|
| Replit hosting | $20 | Fixed |
| Resend (email) | $0–$20 | Free tier likely sufficient for <30 clients |
| Google OAuth | $0 | Free |
| Apple Developer | $8.25 amortised | If Apple Sign-in is added |
| Domain name | $1–3 | Via any registrar |
| **Total at launch** | **~$20–40/month** | |

---

## No External AI or Compute Costs

The v1 app has no AI features, video processing, or compute-intensive operations. All processing is done in the Express API on Replit's standard compute.

---

## Scaling Considerations

- **Replit Pro/Teams** may be needed if the app sees consistent high traffic (>100 concurrent users). Pricing is available at [replit.com/pricing](https://replit.com/pricing).
- **Postgres storage:** the current schema stores avatars as base64 data URLs in the `profiles` table. Each avatar is ~300 KB. At 100 users, that's ~30 MB — well within limits. At 1,000 users, consider migrating avatars to Replit Object Storage (~$0.026/GB/month).
- **Rate limiter:** the current in-memory rate limiter is per-process. For multiple API instances, replace with a Redis-backed store. Replit does not currently offer managed Redis — use Upstash ($0–$10/month) via environment secret.
