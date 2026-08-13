/**
 * Landing-only mode: when true, the public site shows ONLY the lead-gen
 * landing page (ClientLanding) on every URL. The client app, login and
 * onboarding are completely hidden and no auth probe is made.
 *
 * Production (the published site) stays landing-only.
 * Development shows the full app so we can keep building other pages;
 * the landing page is still reachable at /ownyourjourney.
 */
export const LANDING_ONLY = import.meta.env.PROD;
