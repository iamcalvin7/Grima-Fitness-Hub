import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, ArrowRight, X, Star, Sparkle, Lightning,
  UserCircle, Barbell, TrendUp, ForkKnife, CalendarBlank,
  ChatCircle, Money, Briefcase, BookOpen, Brain, Lock,
  Rocket, Play, ShieldCheck, Checks, CaretDown, Funnel, Plus, PencilSimple, Trash,
} from '@phosphor-icons/react';
import { apiRequest, ApiError } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type Phase = 1 | 2 | 3;
export type FeatureStatus = 'Delivered' | 'In Progress' | 'Planned' | 'Future';
export type Category =
  | 'Account & Onboarding'
  | 'Coaching & Training'
  | 'Progress & Accountability'
  | 'Nutrition & Daily Habits'
  | 'Bookings & Service Delivery'
  | 'Communication & Community'
  | 'Payments & Revenue'
  | 'Business Operations'
  | 'Growth & Acquisition'
  | 'Content & Education'
  | 'Data & Intelligence'
  | 'Safety & Compliance';

export interface Feature {
  id: string;
  title: string;
  category: Category;
  priority: Priority;
  phase: Phase;
  status: FeatureStatus;
  tagline: string;
  what: string;
  memberBenefit: string;
  businessBenefit: string;
  scope?: string;
  dependencies?: string[];
  costNotes?: string;
  future?: string;
  /** True for database-backed features added via the Add Feature form (editable). */
  custom?: boolean;
}

// ─── Feature Dataset ──────────────────────────────────────────────────────────
export const FEATURES: Feature[] = [
  // ── Account & Onboarding ──
  {
    id: 'auth-email', title: 'Email Registration & Verification', category: 'Account & Onboarding',
    priority: 'Critical', phase: 1, status: 'Delivered',
    tagline: 'Secure, verified accounts from day one.',
    what: 'Full email-based sign-up flow with account verification, duplicate detection, and secure credential storage using scrypt hashing.',
    memberBenefit: 'A trustworthy, familiar sign-up experience that protects their credentials from the start.',
    businessBenefit: 'Every account is verified and uniquely identified — clean member database, no fake signups.',
    scope: 'Registration form, email verification flow, duplicate detection, secure password hashing.',
    costNotes: 'Delivered within Phase 1 auth sprint.',
  },
  {
    id: 'auth-signin', title: 'Secure Sign-In & Session Management', category: 'Account & Onboarding',
    priority: 'Critical', phase: 1, status: 'Delivered',
    tagline: 'Members stay signed in safely across devices.',
    what: 'Cookie-based server sessions with configurable expiry, CSRF protection, and secure cookie flags. Sessions persist across browser restarts.',
    memberBenefit: 'They sign in once and stay in — no constant re-authentication hassle.',
    businessBenefit: 'Industry-standard session security; audit trail for all authenticated actions.',
    scope: 'Sign-in form, session creation, secure cookie handling, session expiry and renewal.',
  },
  {
    id: 'auth-reset', title: 'Forgot Password & Reset Flow', category: 'Account & Onboarding',
    priority: 'High', phase: 1, status: 'Delivered',
    tagline: 'No member gets locked out permanently.',
    what: 'Time-limited, single-use reset tokens sent by email. Token invalidated immediately on use. Clear UI for requesting and completing reset.',
    memberBenefit: 'Quick, self-serve recovery without needing to contact anyone.',
    businessBenefit: 'Reduces support burden; no manual password resets required from Marcus.',
    costNotes: 'Included in Phase 1.',
  },
  {
    id: 'auth-oauth', title: 'Google & Apple Sign-In (OAuth)', category: 'Account & Onboarding',
    priority: 'High', phase: 1, status: 'Delivered',
    tagline: 'One tap to join — no password required.',
    what: 'OAuth 2.0 PKCE flow for Google. Accounts are linked intelligently — if an email already exists, the OAuth identity is attached rather than duplicating the account.',
    memberBenefit: 'Fastest possible sign-up and sign-in experience, especially on mobile.',
    businessBenefit: 'Higher conversion rate at sign-up; fewer password-related support requests.',
    future: 'Apple Sign-In to be added when App Store submission is pursued.',
  },
  {
    id: 'profile-builder', title: 'Member Profile Builder', category: 'Account & Onboarding',
    priority: 'Critical', phase: 1, status: 'Delivered',
    tagline: 'Every member has a complete coaching identity.',
    what: 'Structured profile capturing name, age/DOB, height, weight, fitness goals, experience level, and activity level. Data feeds into programme personalisation.',
    memberBenefit: 'Their profile shapes everything Marcus prepares for them — relevant, personalised coaching from day one.',
    businessBenefit: 'Rich member data without manual intake forms. Every client profile is standardised and searchable.',
    scope: 'Profile form, DOB/age logic, goal selection, experience level mapping, avatar upload.',
  },
  {
    id: 'onboarding', title: 'Guided Onboarding Experience', category: 'Account & Onboarding',
    priority: 'High', phase: 1, status: 'Delivered',
    tagline: 'New members arrive, not get abandoned.',
    what: 'Multi-step wizard that guides new members through profile completion, goal setting, and getting their bearings in the app. Steps are tracked; incomplete onboarding is resumed automatically.',
    memberBenefit: 'Confidence and clarity on what to do next — critical in the first 48 hours after joining.',
    businessBenefit: 'Higher profile completion rates mean Marcus has the data he needs to start coaching immediately.',
    future: 'Personalised welcome video from Marcus played at the end of onboarding.',
  },
  {
    id: 'role-access', title: 'Role-Based Access Control', category: 'Account & Onboarding',
    priority: 'Critical', phase: 1, status: 'Delivered',
    tagline: 'Marcus sees everything; members see theirs.',
    what: 'Three-tier role system: member, trainer, and admin. Every page, API endpoint, and action is gated by role. Marcus and admins have separate views, tools, and permissions.',
    memberBenefit: 'Members only see what\'s relevant to them — clean, uncluttered experience.',
    businessBenefit: 'Secure by design: business data, client information, and admin tools are never exposed to regular members.',
    scope: 'Role middleware on all API routes, role-gated UI components, role-aware navigation.',
  },
  {
    id: 'account-lifecycle', title: 'Full Account Lifecycle Management', category: 'Account & Onboarding',
    priority: 'Medium', phase: 1, status: 'Delivered',
    tagline: 'Accounts can be paused, reactivated, or removed cleanly.',
    what: 'Members can deactivate their account (data preserved, access suspended) or request full deletion (GDPR-compliant data erasure). Marcus can reactivate accounts manually.',
    memberBenefit: 'Control over their own data and account — builds trust.',
    businessBenefit: 'GDPR compliance built in from day one. Deactivated members can be reactivated if they return.',
    costNotes: 'Delivered within Phase 1.',
  },

  {
    id: 'home-dashboard', title: 'Member Home Dashboard', category: 'Account & Onboarding',
    priority: 'High', phase: 1, status: 'In Progress',
    tagline: 'One screen that answers "what do I do today?"',
    what: 'The member landing screen: today\'s session, active challenges, streaks and quick links into training, nutrition and progress. Live now as an interactive preview in the app with sample data — it becomes fully dynamic as each underlying feature connects to the backend.',
    memberBenefit: 'A clear daily starting point — no hunting through menus to know what\'s next.',
    businessBenefit: 'The dashboard drives daily engagement, which drives retention.',
    scope: 'Today view, challenge and streak widgets, quick navigation cards.',
  },

  // ── Coaching & Training ──
  {
    id: 'exercise-library', title: 'Exercise Library', category: 'Coaching & Training',
    priority: 'Critical', phase: 2, status: 'Planned',
    tagline: 'Every movement, documented and searchable.',
    what: 'A curated library of exercises with descriptions, muscle groups, equipment requirements, difficulty ratings, and linked demonstration videos (via Mux).',
    memberBenefit: 'Clear understanding of every movement in their programme — never confused about how to perform an exercise.',
    businessBenefit: 'Marcus builds programmes by selecting from a shared library — faster programme creation, consistent quality.',
    scope: 'Exercise CRUD (admin), search and filter, Mux video links, muscle group taxonomy.',
    dependencies: ['Video hosting via Mux', 'Content & Education — CMS'],
    future: 'AI-assisted exercise substitution suggestions based on equipment and injury flags.',
  },
  {
    id: 'programme-builder', title: 'Programme Builder (Marcus)', category: 'Coaching & Training',
    priority: 'Critical', phase: 2, status: 'Planned',
    tagline: 'Marcus designs programmes in minutes, not hours.',
    what: 'A drag-and-drop programme builder for Marcus: add weeks, days, and exercises; set sets/reps/rest; add coaching notes per exercise. Programmes can be templates or bespoke per client.',
    memberBenefit: 'A professionally structured programme delivered directly to their phone.',
    businessBenefit: 'Huge time saving versus building programmes in spreadsheets or PDFs. Templates mean scaling to more clients without proportionally more work.',
    scope: 'Programme structure (weeks/days/exercises), exercise picker from library, sets/reps/rest/tempo fields, coach notes, template system.',
    dependencies: ['Exercise Library'],
  },
  {
    id: 'programme-delivery', title: 'Programme Delivery (Member)', category: 'Coaching & Training',
    priority: 'Critical', phase: 2, status: 'In Progress',
    tagline: 'Members follow their programme in real time, in the app.',
    what: 'Members see their assigned programme, tap into today\'s session, and follow along set-by-set. Exercise videos play inline. Rest timers built in. Live now as an interactive preview in the app with sample data — backend persistence is the remaining step.',
    memberBenefit: 'No more downloading PDFs or WhatsApp screenshots — a guided, interactive workout experience.',
    businessBenefit: 'Removes the friction of programme delivery entirely. Members are more likely to stick to structured programmes.',
    scope: 'Programme viewer, today\'s session card, exercise detail with video, set/rep tracker, rest timer.',
    dependencies: ['Programme Builder', 'Exercise Library'],
    future: 'Audio coaching cues, adaptive difficulty based on performance data.',
  },
  {
    id: 'workout-tracking', title: 'Workout Logging & Tracking', category: 'Coaching & Training',
    priority: 'High', phase: 2, status: 'In Progress',
    tagline: 'Every session is recorded, every rep counted.',
    what: 'Members log actual weights and reps as they complete each set. Data is stored per session and surfaced in progress charts over time. Marcus can view all client logs. Live now as an interactive preview in the app with sample data — backend persistence is the remaining step.',
    memberBenefit: 'They see their progress concretely — heavier weights, more reps, shorter rest times.',
    businessBenefit: 'Marcus has objective performance data for every client — no more relying on self-reported updates.',
    scope: 'Set logging UI, weight/reps input, session completion state, historical log view.',
    dependencies: ['Programme Delivery'],
    future: 'Personal bests auto-detected and celebrated. Volume load charts per muscle group.',
  },
  {
    id: 'checkin', title: 'Coach Check-In & Review System', category: 'Coaching & Training',
    priority: 'High', phase: 2, status: 'Planned',
    tagline: 'Weekly accountability, delivered to Marcus automatically.',
    what: 'Members complete a weekly check-in: how they felt, adherence score, sleep, energy, notes. Marcus receives them in a review queue and responds with adjustments or encouragement.',
    memberBenefit: 'Regular structured communication with their coach — not just when something goes wrong.',
    businessBenefit: 'Scalable check-in workflow. Marcus reviews check-ins on his schedule, not reactively via WhatsApp.',
    scope: 'Check-in form (weekly trigger), submission queue for Marcus, response tools, notification on response.',
    future: 'AI pre-analysis of check-ins to flag members who may need urgent attention.',
  },

  // ── Progress & Accountability ──
  {
    id: 'measurements', title: 'Body Measurements Logging', category: 'Progress & Accountability',
    priority: 'High', phase: 2, status: 'Planned',
    tagline: 'The numbers tell the real story.',
    what: 'Members log body measurements (weight, body fat %, waist, chest, arms, etc.) at regular intervals. Charts show trends over time.',
    memberBenefit: 'Objective evidence of progress — motivation during plateaus, satisfaction at milestones.',
    businessBenefit: 'Marcus can verify programme effectiveness with data, not just client feedback.',
    scope: 'Measurement logging form, historical data store, trend charts, milestone detection.',
    future: 'Smart body composition estimates using multi-point measurement formulas.',
  },
  {
    id: 'progress-photos', title: 'Progress Photo Library', category: 'Progress & Accountability',
    priority: 'Medium', phase: 2, status: 'Planned',
    tagline: 'Side-by-side transformation, always motivating.',
    what: 'Members upload progress photos at regular intervals. Photos are stored privately and can be compared side-by-side at any time.',
    memberBenefit: 'Visual evidence of their transformation — one of the most powerful motivators in fitness.',
    businessBenefit: 'Before/after documentation for coaching portfolio (with consent). Retention tool.',
    scope: 'Photo upload (GCS-backed), private storage, comparison view, date-stamped entries.',
    dependencies: ['Object storage (GCS)'],
    costNotes: 'Storage cost: ~$0.02/GB/month on GCS. Negligible for member photo volumes.',
  },
  {
    id: 'photo-guide', title: 'Progress Photo Guide', category: 'Progress & Accountability',
    priority: 'Critical', phase: 2, status: 'Planned',
    tagline: 'Consistent photos, honest comparisons.',
    what: 'A short in-app guide showing members how to take proper progress photos — lighting, distance, angles, poses and clothing — with visual examples and an overlay/framing aid when shooting.',
    memberBenefit: 'Photos taken the same way every time, so side-by-side comparisons genuinely show progress instead of differences in lighting or angle.',
    businessBenefit: 'Higher-quality, consistent transformation photos for coaching reviews and (with consent) marketing material.',
    dependencies: ['Progress Photo Library'],
  },
  {
    id: 'stats-history', title: 'Weight & Stats History Charts', category: 'Progress & Accountability',
    priority: 'High', phase: 2, status: 'Planned',
    tagline: 'Progress visualised over weeks, months, and years.',
    what: 'Interactive charts showing weight, measurements, and performance trends over time. Filter by date range. Key milestones highlighted.',
    memberBenefit: 'Seeing the trend line go in the right direction is the most powerful motivational tool in the app.',
    businessBenefit: 'Data-backed coaching conversations. Easy to demonstrate ROI to a member considering cancelling.',
    dependencies: ['Measurements Logging', 'Workout Tracking'],
    future: 'Predictive trend lines. Goal completion date estimation.',
  },
  {
    id: 'streaks', title: 'Streak & Habit Tracking', category: 'Progress & Accountability',
    priority: 'Medium', phase: 3, status: 'In Progress',
    tagline: 'Small daily wins that build lasting habits.',
    what: 'Daily habit completion tracking (workout done, water target hit, check-in submitted). Streak counters with visual celebration on milestones. Live now as an interactive preview in the app with sample data — backend persistence is the remaining step.',
    memberBenefit: 'Gamification that makes daily consistency feel rewarding, not clinical.',
    businessBenefit: 'Higher daily active usage. Streaks reduce churn — members don\'t want to break their streak.',
    future: 'Social streak sharing. Group habit challenges between members.',
  },

  // ── Nutrition & Daily Habits ──
  {
    id: 'meal-plans', title: 'Personalised Meal Plans', category: 'Nutrition & Daily Habits',
    priority: 'High', phase: 2, status: 'In Progress',
    tagline: 'Marcus\'s nutrition expertise, delivered digitally.',
    what: 'Marcus creates structured meal plans per client (based on goals, dietary preferences, and calorie targets). Members view their plan day-by-day in the app. Live now as an interactive preview in the app with sample data — backend persistence is the remaining step.',
    memberBenefit: 'No guesswork at mealtimes — a clear, coach-approved nutrition plan tailored to their goals.',
    businessBenefit: 'Extends Marcus\'s services beyond training into nutrition coaching — additional value and potential upsell.',
    scope: 'Meal plan builder (admin), day/meal/food structure, member plan view, macro display.',
  },
  {
    id: 'recipe-library', title: 'Recipe Library', category: 'Nutrition & Daily Habits',
    priority: 'Medium', phase: 2, status: 'In Progress',
    tagline: 'Healthy eating made practical and accessible.',
    what: 'A curated library of recipes with ingredients, macros, prep time, and photos. Marcus populates and maintains it. Recipes can be tagged to meal plans. Live now as an interactive preview in the app with sample data — backend persistence is the remaining step.',
    memberBenefit: 'Real meal ideas that fit their nutritional targets — not generic internet recipes.',
    businessBenefit: 'Positions Marcus as a complete nutrition coach, not just a trainer. High perceived value.',
    future: 'Member-saved favourites. Shopping list generation from weekly meal plan.',
  },
  {
    id: 'nutrition-tracking', title: 'Macro & Nutrition Tracking', category: 'Nutrition & Daily Habits',
    priority: 'Medium', phase: 3, status: 'Planned',
    tagline: 'Log meals and hit targets every day.',
    what: 'Daily macro logging against personalised targets (protein, carbs, fats, calories). Food search with a database. Running daily totals.',
    memberBenefit: 'Clarity on whether their nutrition is aligned with their goals — no guessing.',
    businessBenefit: 'Adds a daily touchpoint with the app. Nutrition data feeds check-in insights.',
    scope: 'Food database integration, daily log, macro targets from profile/plan, running totals UI.',
    future: 'Barcode scanning for packaged foods. AI meal suggestions within targets.',
  },
  {
    id: 'habits', title: 'Daily Habit Reinforcement', category: 'Nutrition & Daily Habits',
    priority: 'Medium', phase: 3, status: 'Planned',
    tagline: 'The small things that make the big difference.',
    what: 'Configurable daily habits (sleep hours, water intake, steps, protein hit). Morning prompt card. Evening completion check.',
    memberBenefit: 'A gentle daily structure that reinforces the behaviours that drive results.',
    businessBenefit: 'Daily active usage. Differentiates the platform from generic fitness apps.',
    future: 'Marcus can assign custom habits per client based on their specific focus area.',
  },

  // ── Bookings & Service Delivery ──
  {
    id: 'calendar', title: 'Session Calendar & Availability', category: 'Bookings & Service Delivery',
    priority: 'Critical', phase: 2, status: 'In Progress',
    tagline: 'Marcus\'s availability, always up to date and bookable.',
    what: 'Marcus sets his availability in a calendar interface. Members see open slots and request bookings. All session types configurable (1-on-1, group, online). Live now as an interactive preview in the app with sample data — backend persistence is the remaining step.',
    memberBenefit: 'Self-serve booking without needing to message Marcus and wait for a reply.',
    businessBenefit: 'Eliminates back-and-forth scheduling. Marcus controls his calendar — no double bookings.',
    scope: 'Availability editor (trainer), booking request (member), confirmation flow, Google Calendar sync option.',
    future: 'Automated buffer time between sessions. Block booking for recurring weekly sessions.',
  },
  {
    id: 'booking-reminders', title: 'Booking Confirmations & Reminders', category: 'Bookings & Service Delivery',
    priority: 'Critical', phase: 2, status: 'Planned',
    tagline: 'No member shows up uninformed, no session is missed.',
    what: 'Automated email and in-app confirmations at booking. Reminders at 24h and 2h before each session. Trainer also notified of new bookings.',
    memberBenefit: 'Never forget a session. All session details delivered proactively.',
    businessBenefit: 'Dramatically reduces no-shows. Marcus doesn\'t need to chase clients before sessions.',
    dependencies: ['Session Calendar', 'Email service'],
  },
  {
    id: 'cancellation', title: 'Cancellation & Rescheduling Rules', category: 'Bookings & Service Delivery',
    priority: 'High', phase: 2, status: 'Planned',
    tagline: 'Clear rules that protect Marcus\'s time and income.',
    what: 'Configurable cancellation window (e.g., 24h notice required). Late cancellations flagged. Rescheduling allowed within policy. Marcus can override any case manually.',
    memberBenefit: 'Clear expectations upfront — no awkward conversations about missed sessions.',
    businessBenefit: 'Protects income from late cancellations. Policy enforced automatically, not personally.',
    dependencies: ['Session Calendar'],
  },
  {
    id: 'session-notes', title: 'Session Notes & History', category: 'Bookings & Service Delivery',
    priority: 'Medium', phase: 2, status: 'Planned',
    tagline: 'Every session documented, every client remembered.',
    what: 'Marcus can add notes to any completed session: what was covered, injuries flagged, next session plan. Visible to the client after the session.',
    memberBenefit: 'Transparency and accountability — they know Marcus is tracking their progress session by session.',
    businessBenefit: 'Institutional memory: never forget a client\'s history between sessions.',
  },

  // ── Communication & Community ──
  {
    id: 'direct-messaging', title: 'Direct Messaging (Marcus ↔ Members)', category: 'Communication & Community',
    priority: 'High', phase: 2, status: 'In Progress',
    tagline: 'Coaching conversations in the app, not WhatsApp.',
    what: 'Real-time direct messaging between Marcus and individual members. Message threads per client. Media sharing (images, files). Read receipts. Live now as an interactive preview in the app with sample data — backend persistence is the remaining step.',
    memberBenefit: 'Direct access to Marcus in a structured, professional environment — not buried in WhatsApp groups.',
    businessBenefit: 'All client communication is centralised and recorded. No more managing WhatsApp at all hours.',
    scope: 'Message threads, real-time updates (websocket or polling), media sharing, read receipts, notification on new message.',
    future: 'Group messaging for cohort-based programmes. Quick-reply templates for Marcus.',
  },
  {
    id: 'announcements', title: 'Coach Announcements & Broadcasts', category: 'Communication & Community',
    priority: 'Medium', phase: 2, status: 'Planned',
    tagline: 'One message to every member, instantly.',
    what: 'Marcus can send an announcement to all members or a filtered group (e.g., all active subscribers). Delivered in-app and optionally by email.',
    memberBenefit: 'Stay informed about programme updates, Marcus\'s news, and upcoming events.',
    businessBenefit: 'One message reaches everyone — no broadcasting via WhatsApp or Instagram stories.',
    dependencies: ['Content Feed', 'Email service'],
  },
  {
    id: 'leaderboard', title: 'Group Challenges & Leaderboard', category: 'Communication & Community',
    priority: 'Medium', phase: 3, status: 'In Progress',
    tagline: 'Friendly competition drives consistency.',
    what: 'Opt-in weekly challenges (most workouts, most steps, most check-ins). Public leaderboard among participating members. Badges for winners. Live now as an interactive preview in the app with sample data — backend persistence is the remaining step.',
    memberBenefit: 'Motivation through community — knowing others are working hard keeps them going.',
    businessBenefit: 'Community features increase retention and social proof. Members talk about the leaderboard.',
    future: 'Team-based challenges. Challenge creation by members.',
  },

  // ── Payments & Revenue ──
  {
    id: 'memberships', title: 'Membership Packages & Pricing', category: 'Payments & Revenue',
    priority: 'Critical', phase: 2, status: 'In Progress',
    tagline: 'Marcus\'s service packages, purchased in the app.',
    what: 'Configurable membership tiers (e.g., Online Coaching, In-Person Monthly, Premium). Each tier unlocks specific features and session quotas. Marcus manages pricing in the admin panel. Live now as an interactive preview in the app with sample data — backend persistence is the remaining step.',
    memberBenefit: 'Clear, professional packages — they know exactly what they\'re getting.',
    businessBenefit: 'Recurring revenue that flows through the platform. No manual invoicing.',
    scope: 'Membership tier configuration, subscription creation, feature gating by tier.',
    costNotes: 'Stripe or similar payment processor: 1.4%–2.9% + fixed fee per transaction.',
    future: 'Annual billing with discount. Pause subscriptions during injury or holiday.',
  },
  {
    id: 'payments', title: 'Session Purchases & Payment Flow', category: 'Payments & Revenue',
    priority: 'Critical', phase: 2, status: 'Planned',
    tagline: 'Professional checkout, first-class experience.',
    what: 'One-off session and package purchases via Stripe. Secure card handling, receipt emails, and payment history. Apple Pay and Google Pay supported.',
    memberBenefit: 'Pay securely in seconds — familiar, trusted checkout experience.',
    businessBenefit: 'Revenue flows directly. Stripe handles compliance, fraud detection, and payouts.',
    scope: 'Stripe integration, checkout flow, webhook handling for payment events, receipt emails.',
    costNotes: 'Stripe fee: ~1.5% + €0.25 per transaction (EU cards). Negligible at typical PT session prices.',
    dependencies: ['Membership Packages'],
  },
  {
    id: 'payment-history', title: 'Payment History & Receipts', category: 'Payments & Revenue',
    priority: 'High', phase: 2, status: 'Planned',
    tagline: 'Every transaction on record, for everyone.',
    what: 'Members can view their full payment history and download receipts. Marcus has a financial summary view with revenue by period, membership type, and client.',
    memberBenefit: 'Full visibility over what they\'ve paid — professional, trustworthy.',
    businessBenefit: 'Financial clarity without needing separate accounting software for the basics.',
    dependencies: ['Payments'],
  },
  {
    id: 'digital-products', title: 'Digital Products & Upsells', category: 'Payments & Revenue',
    priority: 'Medium', phase: 3, status: 'Planned',
    tagline: 'Revenue beyond sessions — programmes, guides, and more.',
    what: 'Marcus can sell standalone digital products: downloadable training plans, nutrition guides, video courses. One-time purchase, delivered in-app.',
    memberBenefit: 'Access to Marcus\'s knowledge without committing to a full coaching package.',
    businessBenefit: 'Passive revenue stream. Entry-level product for acquiring members before they upgrade.',
    future: 'Bundle deals. Affiliate products from partner brands.',
  },

  // ── Business Operations ──
  {
    id: 'client-management', title: 'Client Management Dashboard', category: 'Business Operations',
    priority: 'Critical', phase: 2, status: 'Planned',
    tagline: 'Marcus\'s full client list, at a glance.',
    what: 'Marcus sees all active clients with their membership status, last check-in, assigned programme, upcoming bookings, and any flags. Filter, search, and sort by any field.',
    memberBenefit: 'The quality of personalised coaching Marcus can deliver improves when he has instant access to context.',
    businessBenefit: 'Operational clarity. Marcus knows who needs attention, who is thriving, and who is at churn risk.',
    scope: 'Client list view, per-client record, status flags, quick actions (message, reschedule, adjust programme).',
    future: 'Automated churn prediction. "Members you haven\'t heard from" alerts.',
  },
  {
    id: 'reporting', title: 'Business Summary & Revenue Reporting', category: 'Business Operations',
    priority: 'High', phase: 2, status: 'Planned',
    tagline: 'Marcus sees his business health instantly.',
    what: 'Dashboard showing: active member count, new signups, revenue this month vs last, upcoming session load, and member engagement trends.',
    memberBenefit: 'Indirectly — a well-run business delivers better coaching.',
    businessBenefit: 'Marcus can make informed decisions about pricing, capacity, and marketing without external tools.',
    future: 'Exportable reports. Integration with accounting software (e.g., Xero).',
  },
  {
    id: 'ops-alerts', title: 'Operational Alerts & Flags', category: 'Business Operations',
    priority: 'Medium', phase: 3, status: 'Planned',
    tagline: 'The platform flags what needs attention before it becomes a problem.',
    what: 'Automated alerts for: member missed two check-ins, payment failed, session not booked before scheduled week, programme expiring. Marcus sees these in a notifications centre.',
    memberBenefit: 'Proactive coaching — Marcus reaches out before they have to.',
    businessBenefit: 'Prevents churn and missed revenue through early intervention.',
  },

  // ── Content & Education ──
  {
    id: 'feed', title: 'Member Content Feed', category: 'Content & Education',
    priority: 'High', phase: 1, status: 'Delivered',
    tagline: 'Marcus\'s voice in every member\'s pocket, every day.',
    what: 'A card-based feed of posts from Marcus — videos, articles, and images. Featured posts pinned at top. Category filters. Click to read, watch, or view full post.',
    memberBenefit: 'Ongoing inspiration, education, and connection with Marcus between coaching sessions.',
    businessBenefit: 'Daily engagement with the platform. Marcus builds authority and deepens member relationships beyond just sessions.',
    scope: 'Feed view, featured hero card, category filters, post detail (video modal, article sheet, image lightbox).',
  },
  {
    id: 'content-admin', title: 'Content Admin CMS', category: 'Content & Education',
    priority: 'High', phase: 1, status: 'Delivered',
    tagline: 'Marcus publishes content in minutes with no technical knowledge required.',
    what: 'A full CMS for Marcus: create, edit, and delete posts. Set type (video, article, image), category, featured status, and draft/published state. Drag-and-drop media upload.',
    memberBenefit: 'More and better content from Marcus, because producing it is effortless for him.',
    businessBenefit: 'Marcus controls his content calendar entirely from within the platform.',
    scope: 'Post CRUD, type selector, category chips, featured toggle, draft/publish toggle, file upload.',
  },
  {
    id: 'mux-video', title: 'Video Hosting & Streaming (Mux)', category: 'Content & Education',
    priority: 'High', phase: 2, status: 'Planned',
    tagline: 'Professional video delivery at any scale — no technical overhead.',
    what: 'Videos upload directly to Mux, which handles compression, thumbnail generation, and global CDN delivery. The app stores only a playback ID — no video files on the server.',
    memberBenefit: 'Fast, smooth video playback on any device and any connection speed.',
    businessBenefit: 'Marcus gets broadcast-quality video infrastructure without managing servers. Cost scales with actual usage.',
    costNotes: 'Free tier: up to 10 videos. Paid: ~$0.015/min encoded, ~$0.007/GB/month stored, ~$0.00025/viewer-minute streamed.',
    dependencies: ['Content Admin CMS'],
    future: 'Live streaming directly into the app. Member-submitted form videos for technique review.',
  },
  {
    id: 'educational-series', title: 'Educational Content Series', category: 'Content & Education',
    priority: 'Medium', phase: 2, status: 'Planned',
    tagline: 'Structured knowledge, delivered progressively.',
    what: 'Multi-part educational series: e.g., "Foundations of Strength", "Nutrition 101". Members progress through episodes in order. Progress tracked.',
    memberBenefit: 'Structured learning that builds their knowledge alongside their fitness.',
    businessBenefit: 'Premium positioning — this is coaching, not just workouts. High perceived value.',
    dependencies: ['Content Admin CMS', 'Mux Video'],
  },
  {
    id: 'team-profiles', title: 'Team & Coach Profiles', category: 'Content & Education',
    priority: 'Medium', phase: 1, status: 'Delivered',
    tagline: 'Put faces to the coaching.',
    what: 'A dedicated team page introducing Marcus and the people behind the brand — photos, roles and bios, presented in the app\'s visual style.',
    memberBenefit: 'Members know exactly who is coaching them — personal connection before the first session.',
    businessBenefit: 'Builds trust and brand personality; doubles as a marketing surface for the wider team.',
    scope: 'Team page with profile cards, live in the app today.',
  },
  {
    id: 'daily-challenges', title: 'Daily Challenges', category: 'Content & Education',
    priority: 'Medium', phase: 2, status: 'In Progress',
    tagline: 'A daily reason to open the app.',
    what: 'Marcus sets a short daily challenge: a movement, mindset prompt, or nutrition task. Members log completion and see who else completed it. Live now as an interactive preview in the app with sample data — backend persistence is the remaining step.',
    memberBenefit: 'Daily engagement and variety — the app feels alive, not static.',
    businessBenefit: 'Daily active usage metric. Low-effort community building for Marcus.',
    future: 'AI-generated challenge suggestions based on member programmes and recent activity.',
  },

  // ── Growth & Acquisition ──
  {
    id: 'referrals', title: 'Member Referral Programme', category: 'Growth & Acquisition',
    priority: 'Medium', phase: 3, status: 'Planned',
    tagline: 'Members bring members — the best possible marketing.',
    what: 'Members get a unique referral link. When a referred person signs up and joins, both get a reward (free session, discount, or credit). Tracked automatically.',
    memberBenefit: 'A tangible reward for bringing friends — and the social experience of training in the same community.',
    businessBenefit: 'Word-of-mouth acquisition with a measurable cost per referral. Highest trust channel.',
    future: 'Tiered referral rewards. Leaderboard for top referrers.',
  },
  {
    id: 'partner-offers', title: 'Member Offers & Partner Discounts', category: 'Growth & Acquisition',
    priority: 'Low', phase: 3, status: 'In Progress',
    tagline: 'Membership perks beyond coaching.',
    what: 'Exclusive discounts from partner brands (supplements, sportswear, equipment) available only to active members. Marcus curates the offers. Live now as an interactive preview in the app with sample data — backend persistence is the remaining step.',
    memberBenefit: 'Real financial value from their membership, beyond the coaching itself.',
    businessBenefit: 'Potential affiliate revenue. Increases perceived value of membership. Retention tool.',
  },

  // ── Data & Intelligence ──
  {
    id: 'ai-nudges', title: 'Progress Insights & Automated Nudges', category: 'Data & Intelligence',
    priority: 'Medium', phase: 3, status: 'Future',
    tagline: 'The platform coaches in the background so Marcus doesn\'t have to.',
    what: 'AI-driven insights based on member data: "Your strength has improved 14% this month", "You\'re on track for your December target". Automated nudges for members who are falling behind.',
    memberBenefit: 'Personalised feedback that feels like having a coach with them 24/7.',
    businessBenefit: 'Scale Marcus\'s coaching impact without scaling his time proportionally.',
    future: 'Full AI coaching assistant. Natural language check-in analysis.',
  },
  {
    id: 'analytics', title: 'Business Analytics Dashboard', category: 'Data & Intelligence',
    priority: 'Medium', phase: 3, status: 'Future',
    tagline: 'Data to make smarter business decisions.',
    what: 'Advanced analytics: member lifetime value, churn prediction, programme completion rates, content engagement heatmaps, revenue forecasting.',
    memberBenefit: 'Better coaching decisions made using data, not gut feel.',
    businessBenefit: 'Marcus can identify what\'s working and double down — pricing, content, programme design.',
    future: 'Benchmarking against industry standards. Integration with external analytics tools.',
  },

  // ── Safety & Compliance ──
  {
    id: 'gdpr', title: 'GDPR-Compliant Data Management', category: 'Safety & Compliance',
    priority: 'Critical', phase: 2, status: 'Planned',
    tagline: 'Member data handled lawfully — no exceptions.',
    what: 'Cookie consent banner, data processing agreement framework, member data export (right of access), right to erasure (account deletion). All data handling documented.',
    memberBenefit: 'Confidence that their personal and health data is handled responsibly and legally.',
    businessBenefit: 'Legal compliance. Operating in Malta and the EU requires GDPR compliance for any digital service handling personal data.',
    scope: 'Cookie consent, privacy policy, data export endpoint, account deletion flow.',
    costNotes: 'Legal review of privacy policy and terms recommended: €500–€2,000 one-time.',
  },
  {
    id: 'health-data', title: 'Health Data Protections & Terms', category: 'Safety & Compliance',
    priority: 'High', phase: 2, status: 'Planned',
    tagline: 'Fitness and health data treated with the appropriate care.',
    what: 'Health and fitness data (measurements, progress photos, check-ins) is stored with encryption at rest, access-controlled by role, and never shared with third parties without explicit consent.',
    memberBenefit: 'Trust that their most personal data — body measurements, photos — is genuinely private.',
    businessBenefit: 'Reduced liability. Health data mishandling is a significant legal risk. Correct handling is a competitive differentiator.',
    dependencies: ['GDPR Compliance'],
    future: 'Health data export in standardised format (Apple Health, Google Fit integration).',
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────
const CATEGORIES: Category[] = [
  'Account & Onboarding', 'Coaching & Training', 'Progress & Accountability',
  'Nutrition & Daily Habits', 'Bookings & Service Delivery', 'Communication & Community',
  'Payments & Revenue', 'Business Operations', 'Growth & Acquisition',
  'Content & Education', 'Data & Intelligence', 'Safety & Compliance',
];
const PRIORITIES: Priority[] = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES: FeatureStatus[] = ['Delivered', 'In Progress', 'Planned', 'Future'];
const PHASES: Phase[] = [1, 2, 3];

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  'Account & Onboarding':       <UserCircle size={14} weight="fill" />,
  'Coaching & Training':        <Barbell size={14} weight="fill" />,
  'Progress & Accountability':  <TrendUp size={14} weight="fill" />,
  'Nutrition & Daily Habits':   <ForkKnife size={14} weight="fill" />,
  'Bookings & Service Delivery':<CalendarBlank size={14} weight="fill" />,
  'Communication & Community':  <ChatCircle size={14} weight="fill" />,
  'Payments & Revenue':         <Money size={14} weight="fill" />,
  'Business Operations':        <Briefcase size={14} weight="fill" />,
  'Growth & Acquisition':       <Rocket size={14} weight="fill" />,
  'Content & Education':        <BookOpen size={14} weight="fill" />,
  'Data & Intelligence':        <Brain size={14} weight="fill" />,
  'Safety & Compliance':        <Lock size={14} weight="fill" />,
};

const STATUS_CONFIG: Record<FeatureStatus, { label: string; color: string; bg: string; border: string; dot: string; icon: React.ReactNode }> = {
  'Delivered':   { label: 'Delivered',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400', icon: <CheckCircle size={11} weight="fill" /> },
  'In Progress': { label: 'In Progress', color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/25',  dot: 'bg-orange-400',  icon: <Lightning size={11} weight="fill" /> },
  'Planned':     { label: 'Planned',     color: 'text-white/50',    bg: 'bg-white/5',         border: 'border-white/10',       dot: 'bg-white/30',    icon: <Star size={11} weight="regular" /> },
  'Future':      { label: 'Future',      color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/25',  dot: 'bg-violet-400',  icon: <Sparkle size={11} weight="fill" /> },
};

/* Left border follows STATUS so the card's colour matches its status chip. */
const STATUS_BORDER: Record<FeatureStatus, string> = {
  'Delivered':   'border-l-emerald-400/70',
  'In Progress': 'border-l-orange-400/70',
  'Planned':     'border-l-white/15',
  'Future':      'border-l-violet-400/60',
};

/* Friendly display labels for priorities */
const PRIORITY_LABEL: Record<Priority, string> = {
  Critical: 'Critical',
  High:     'Important',
  Medium:   'Medium',
  Low:      'Nice to have',
};
const PRIORITY_PILL: Record<Priority, string> = {
  Critical: 'text-red-400 bg-red-500/10 border-red-500/25',
  High:     'text-orange-400 bg-orange-500/10 border-orange-500/25',
  Medium:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  Low:      'text-white/45 bg-white/5 border-white/10',
};
function PriorityPill({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-bold tracking-wider uppercase ${PRIORITY_PILL[priority]}`}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

const PRIORITY_DOT: Record<Priority, string> = {
  Critical: 'bg-red-500',
  High:     'bg-orange-400',
  Medium:   'bg-yellow-500',
  Low:      'bg-white/20',
};

// ─── Status Chip ──────────────────────────────────────────────────────────────
function StatusChip({ status, size = 'sm' }: { status: FeatureStatus; size?: 'xs' | 'sm' }) {
  const c = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-bold tracking-wider uppercase ${c.color} ${c.bg} ${c.border} ${size === 'xs' ? 'text-[9px]' : 'text-[9px]'}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

// ─── Feature Detail Panel ─────────────────────────────────────────────────────
function DetailPanel({ feature, onClose, onEdit, onDelete, isLaunch, onOverride }: {
  feature: Feature;
  onClose: () => void;
  onEdit?: (f: Feature) => void;
  onDelete?: (f: Feature) => void;
  isLaunch?: boolean;
  onOverride?: (featureId: string, patch: { status?: string; placement?: string }) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const sc = STATUS_CONFIG[feature.status];
  return (
    <motion.div
      className="fixed inset-0 z-50 flex"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/60 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />
      {/* Panel */}
      <motion.div
        className="w-full max-w-lg bg-[#0C0C0C] border-l border-white/8 flex flex-col h-full overflow-y-auto"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0C0C0C] border-b border-white/6 px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-2">
              <span className="flex items-center gap-1 text-primary text-[9px] font-black tracking-[0.25em] uppercase">
                {CATEGORY_ICONS[feature.category]}
                {feature.category}
              </span>
              <span className="text-white/20 text-[9px]">·</span>
              <span className="text-[9px] font-bold tracking-widest text-white/30 uppercase">Phase {feature.phase}</span>
            </div>
            <h3 className="text-xl font-black text-primary tracking-tight leading-tight">{feature.title}</h3>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusChip status={feature.status} />
              <PriorityPill priority={feature.priority} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/6 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/12 transition-colors shrink-0 mt-1"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6 space-y-6">
          {/* Status & placement controls */}
          {onOverride && (
            <div className="border border-white/6 bg-white/[0.02] p-4 space-y-3">
              <div>
                <p className="text-[9px] font-black tracking-[0.25em] text-white/30 uppercase mb-1.5">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => {
                    const active = feature.status === s;
                    const c = STATUS_CONFIG[s];
                    return (
                      <button
                        key={s}
                        onClick={() => { if (!active) onOverride(feature.id, { status: s }); }}
                        className={`px-2.5 py-1.5 border text-[9px] font-black tracking-widest uppercase transition-colors ${
                          active ? `${c.color} ${c.bg} ${c.border}` : 'border-white/8 text-white/30 hover:text-white/60 hover:border-white/20'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-[9px] font-black tracking-[0.25em] text-white/30 uppercase mb-1.5">Delivery</p>
                <button
                  onClick={() => onOverride(feature.id, { placement: isLaunch ? 'future' : 'launch' })}
                  className="flex items-center gap-1.5 px-3 py-2 border border-primary/40 bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase hover:bg-primary/20 transition-colors"
                >
                  <Rocket size={12} weight="fill" />
                  {isLaunch ? 'Move to sprints' : 'Move to At Launch'}
                </button>
              </div>
            </div>
          )}
          {/* Edit / delete for custom (database-backed) features */}
          {feature.custom && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit?.(feature)}
                className="flex items-center gap-1.5 px-3 py-2 border border-primary/40 bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase hover:bg-primary/20 transition-colors"
              >
                <PencilSimple size={12} weight="bold" /> Edit
              </button>
              <button
                disabled={deleting}
                onClick={async () => {
                  if (!window.confirm(`Remove "${feature.title}" from the catalogue?`)) return;
                  setDeleting(true);
                  try {
                    await apiRequest(`/proposal-features/${feature.id}`, { method: 'DELETE' });
                    onDelete?.(feature);
                    onClose();
                  } catch {
                    setDeleting(false);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-500/30 bg-red-500/10 text-red-400 text-[10px] font-bold tracking-widest uppercase hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                <Trash size={12} weight="bold" /> {deleting ? 'Removing…' : 'Remove'}
              </button>
            </div>
          )}

          {/* Tagline */}
          <p className="text-base font-semibold text-white leading-relaxed italic border-l-2 border-primary/50 pl-4">
            {feature.tagline}
          </p>

          {/* What it does */}
          <div>
            <p className="text-[9px] font-black tracking-[0.3em] text-white/30 uppercase mb-2">What It Does</p>
            <p className="text-sm text-white leading-relaxed">{feature.what}</p>
          </div>

          {/* Dual benefit */}
          <div className="grid grid-cols-1 gap-4">
            <div className="border border-white/6 bg-white/[0.02] p-4">
              <p className="text-[9px] font-black tracking-[0.25em] text-white/30 uppercase mb-2 flex items-center gap-1.5">
                <UserCircle size={11} weight="fill" /> For Members
              </p>
              <p className="text-sm text-white leading-relaxed">{feature.memberBenefit}</p>
            </div>
            <div className="border border-primary/12 bg-primary/[0.025] p-4">
              <p className="text-[9px] font-black tracking-[0.25em] text-primary/60 uppercase mb-2 flex items-center gap-1.5">
                <Briefcase size={11} weight="fill" /> For Marcus / Business
              </p>
              <p className="text-sm text-white leading-relaxed">{feature.businessBenefit}</p>
            </div>
          </div>

          {/* Scope */}
          {feature.scope && (
            <div>
              <p className="text-[9px] font-black tracking-[0.3em] text-white/30 uppercase mb-2">Scope</p>
              <p className="text-sm text-white leading-relaxed">{feature.scope}</p>
            </div>
          )}

          {/* Dependencies */}
          {feature.dependencies && feature.dependencies.length > 0 && (
            <div>
              <p className="text-[9px] font-black tracking-[0.3em] text-white/30 uppercase mb-2">Dependencies</p>
              <div className="flex flex-wrap gap-2">
                {feature.dependencies.map((d) => (
                  <span key={d} className="text-[10px] font-semibold text-white/40 border border-white/8 bg-white/[0.02] px-2 py-1 rounded">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cost notes */}
          {feature.costNotes && (
            <div className="border border-white/6 bg-white/[0.015] p-4">
              <p className="text-[9px] font-black tracking-[0.3em] text-white/30 uppercase mb-2">Cost / Effort Notes</p>
              <p className="text-sm text-white leading-relaxed">{feature.costNotes}</p>
            </div>
          )}

          {/* Future */}
          {feature.future && (
            <div className="border border-violet-500/15 bg-violet-500/[0.03] p-4">
              <p className="text-[9px] font-black tracking-[0.3em] text-violet-400/70 uppercase mb-2 flex items-center gap-1.5">
                <Sparkle size={11} weight="fill" /> Future Enhancements
              </p>
              <p className="text-sm text-white leading-relaxed">{feature.future}</p>
            </div>
          )}
        </div>

        {/* Footer status */}
        <div className={`mx-6 mb-6 p-3 rounded flex items-center gap-3 ${sc.bg} border ${sc.border}`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${sc.dot} ${feature.status === 'In Progress' ? 'animate-pulse' : ''}`} />
          <p className={`text-xs font-semibold ${sc.color}`}>
            {feature.status === 'Delivered' && 'This feature is live on the platform.'}
            {feature.status === 'In Progress' && 'This feature is currently being built.'}
            {feature.status === 'Planned' && 'Scheduled for a future sprint in the roadmap.'}
            {feature.status === 'Future' && 'Identified as a future enhancement beyond the initial launch.'}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ feature, onClick }: { feature: Feature; onClick: () => void }) {
  const isDelivered = feature.status === 'Delivered';
  return (
    <motion.button
      layout
      onClick={onClick}
      className={`
        relative w-full text-left border border-l-4 ${STATUS_BORDER[feature.status]}
        bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/12
        transition-all duration-200 group flex flex-col
        ${isDelivered ? 'border-emerald-500/20' : 'border-white/6'}
      `}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Delivered overlay check */}
      {isDelivered && (
        <div className="absolute top-3 right-3">
          <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Checks size={10} weight="bold" className="text-emerald-400" />
          </div>
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        {/* Pillar, then title stacked underneath */}
        <div className="pr-5">
          <span className="flex items-center gap-1 text-primary/70 text-[9px] font-bold tracking-widest uppercase mb-1.5">
            {CATEGORY_ICONS[feature.category]}
            <span className="truncate">{feature.category}</span>
          </span>
          <p className="text-sm font-black text-primary tracking-tight leading-snug group-hover:text-white transition-colors">
            {feature.title}
          </p>
        </div>

        {/* Separator */}
        <div className="border-t border-white/8 my-3" />

        {/* Description */}
        <p className="text-xs text-white leading-relaxed line-clamp-2 flex-1">
          {feature.tagline}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 gap-2">
          <span className="flex items-center gap-1.5 flex-wrap">
            <StatusChip status={feature.status} size="xs" />
            <PriorityPill priority={feature.priority} />
          </span>
          <ArrowRight
            size={12}
            weight="bold"
            className="text-white/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200"
          />
        </div>
      </div>
    </motion.button>
  );
}

// ─── Catalogue Stats ──────────────────────────────────────────────────────────
function CatalogueStats({ features }: { features: Feature[] }) {
  const counts = {
    total: features.length,
    delivered: features.filter(f => f.status === 'Delivered').length,
    inProgress: features.filter(f => f.status === 'In Progress').length,
    planned: features.filter(f => f.status === 'Planned').length,
    future: features.filter(f => f.status === 'Future').length,
  };

  const stats = [
    { label: 'Total Features', value: counts.total, color: 'text-white', sub: 'in catalogue' },
    { label: 'Delivered', value: counts.delivered, color: 'text-emerald-400', sub: 'live on platform' },
    { label: 'In Progress', value: counts.inProgress, color: 'text-orange-400', sub: 'being built now' },
    { label: 'Planned', value: counts.planned + counts.future, color: 'text-white/50', sub: 'in roadmap' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      {stats.map((s) => (
        <div key={s.label} className="border border-white/6 bg-white/[0.02] p-4">
          <p className={`text-3xl font-black tracking-tight ${s.color}`}>{s.value}</p>
          <p className="text-[9px] font-bold tracking-[0.25em] text-white/30 uppercase mt-1">{s.label}</p>
          <p className="text-[10px] text-white/20 mt-0.5">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────
function Dropdown({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 border text-xs font-semibold transition-colors ${
          value !== 'All'
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-white/8 bg-white/[0.02] text-white/50 hover:text-white/70 hover:border-white/15'
        }`}
      >
        <span>{value === 'All' ? label : value}</span>
        <CaretDown size={10} weight="bold" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-full left-0 mt-1 z-30 bg-[#111] border border-white/10 min-w-[180px] shadow-2xl"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {['All', ...options].map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${
                  value === opt
                    ? 'text-primary bg-primary/8'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Add Feature Modal ────────────────────────────────────────────────────────
interface ApiFeature {
  id: string;
  title: string;
  category: string;
  priority: string;
  phase: number;
  status: string;
  tagline: string;
  what: string;
  memberBenefit: string;
  businessBenefit: string;
}

function apiToFeature(f: ApiFeature): Feature {
  return {
    id: f.id,
    title: f.title,
    category: (CATEGORIES as readonly string[]).includes(f.category)
      ? (f.category as Category) : 'Business Operations',
    priority: (PRIORITIES as readonly string[]).includes(f.priority)
      ? (f.priority as Priority) : 'Medium',
    phase: (f.phase >= 1 && f.phase <= 3 ? f.phase : 2) as Phase,
    status: (STATUSES as readonly string[]).includes(f.status)
      ? (f.status as FeatureStatus) : 'Planned',
    tagline: f.tagline,
    what: f.what,
    memberBenefit: f.memberBenefit,
    businessBenefit: f.businessBenefit,
    custom: true,
  };
}

const inputCls =
  'w-full bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50';
const labelCls = 'block text-[9px] font-bold tracking-[0.25em] text-white/40 uppercase mb-1.5';

function AddFeatureModal({ onClose, onAdded, initial }: {
  onClose: () => void; onAdded: (f: Feature) => void; initial?: Feature;
}) {
  const [title, setTitle]       = useState(initial?.title ?? '');
  const [category, setCategory] = useState<string>(initial?.category ?? CATEGORIES[0]);
  const [priority, setPriority] = useState<string>(initial?.priority ?? 'Medium');
  const [phase, setPhase]       = useState<string>(initial ? String(initial.phase) : '2');
  const [status, setStatus]     = useState<string>(initial?.status ?? 'Planned');
  const [tagline, setTagline]   = useState(initial?.tagline ?? '');
  const [what, setWhat]         = useState(initial?.what ?? '');
  const [memberBenefit, setMemberBenefit]     = useState(initial?.memberBenefit ?? '');
  const [businessBenefit, setBusinessBenefit] = useState(initial?.businessBenefit ?? '');
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        title, category, priority, phase: Number(phase), status,
        tagline, what, memberBenefit, businessBenefit,
      };
      const res = initial
        ? await apiRequest<{ feature: ApiFeature }>(`/proposal-features/${initial.id}`, { method: 'PATCH', body })
        : await apiRequest<{ feature: ApiFeature }>('/proposal-features', { method: 'POST', body });
      onAdded(apiToFeature(res.feature));
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : initial ? 'Failed to save changes' : 'Failed to add feature');
      setSaving(false);
    }
  };

  const selectCls = inputCls + ' appearance-none';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-lg max-h-[90vh] overflow-y-auto bg-[#111] border border-white/10 p-6 md:p-8"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm font-black text-primary tracking-tight uppercase">{initial ? 'Edit Feature' : 'Add Feature'}</p>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Title *</label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Feature name" />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Priority</label>
              <select className={selectCls} value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Phase</label>
              <select className={selectCls} value={phase} onChange={(e) => setPhase(e.target.value)}>
                {PHASES.map((p) => <option key={p} value={String(p)}>Phase {p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Tagline</label>
            <input className={inputCls} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One-line summary" />
          </div>
          <div>
            <label className={labelCls}>What is it?</label>
            <textarea className={inputCls} rows={3} value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Describe the feature" />
          </div>
          <div>
            <label className={labelCls}>Member benefit</label>
            <textarea className={inputCls} rows={2} value={memberBenefit} onChange={(e) => setMemberBenefit(e.target.value)} placeholder="What members gain" />
          </div>
          <div>
            <label className={labelCls}>Business benefit</label>
            <textarea className={inputCls} rows={2} value={businessBenefit} onChange={(e) => setBusinessBenefit(e.target.value)} placeholder="What the business gains" />
          </div>
        </div>

        {error && <p className="text-xs text-red-400 font-semibold mt-4">{error}</p>}

        <button type="submit" disabled={saving}
          className="mt-6 w-full py-3 bg-primary text-primary-foreground font-black tracking-[0.15em] uppercase text-xs disabled:opacity-50">
          {saving ? (initial ? 'Saving…' : 'Adding…') : (initial ? 'Save Changes' : 'Add Feature')}
        </button>
      </motion.form>
    </motion.div>
  );
}

/* ─── Delivery: Launch vs Future sprints ──────────────────────────────────────
   Two pills only:
   - Launch: everything in phase 1 (the foundation being built now)
   - Future: everything else, organised into two-week sprints after soft launch.
     Sprint assignments are drag-and-drop and persisted server-side.
*/
type Pill = 'Built' | 'Launch' | 'Future';

export interface FeatureOverride {
  sprint?: number;
  status?: string;
  placement?: string; // 'launch' | 'future'
}

const SPRINT_COUNT = 6;
const SOFT_LAUNCH = new Date(2026, 9, 15); // 15 Oct 2026

function sprintEndDate(sprint: number): string {
  const d = new Date(SOFT_LAUNCH.getTime() + sprint * 14 * 24 * 3600 * 1000);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: undefined });
}

export function isLaunchFeature(f: Feature, override?: FeatureOverride): boolean {
  if (override?.placement === 'launch') return true;
  if (override?.placement === 'future') return false;
  return f.phase === 1;
}

/** Default sprint for non-launch features, before any manual drag-and-drop. */
export function defaultSprint(f: Feature): number {
  if (f.status === 'Future' || f.phase === 3) return 4;
  if (f.priority === 'Critical') return 1;
  if (f.priority === 'High') return 2;
  return 3;
}

/* ─── Audience: who the feature serves ────────────────────────────────────────
   Every feature is either client-facing (members use it) or a tool for Marcus. */
type Audience = 'client' | 'marcus';

const MARCUS_FEATURE_IDS = new Set([
  'role-access', 'programme-builder', 'checkin', 'session-notes', 'announcements',
  'client-management', 'reporting', 'ops-alerts', 'content-admin', 'mux-video',
  'analytics', 'gdpr',
]);
const MARCUS_CATEGORIES = new Set<Category>(['Business Operations', 'Data & Intelligence']);

function featureAudience(f: Feature): Audience {
  if (MARCUS_FEATURE_IDS.has(f.id)) return 'marcus';
  if (MARCUS_CATEGORIES.has(f.category)) return 'marcus';
  return 'client';
}

const PRIORITY_ORDER: Record<Priority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const STATUS_ORDER: Record<FeatureStatus, number> = { 'Delivered': 0, 'In Progress': 1, Planned: 2, Future: 3 };

function sortFeatures(list: Feature[]): Feature[] {
  return [...list].sort((a, b) => {
    const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (s !== 0) return s;
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });
}

// ─── Compact sprint card (draggable) ─────────────────────────────────────────
function SprintCard({ feature, onClick, onDragStart, onDragEnd, dragging }: {
  feature: Feature;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  dragging: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`
        cursor-grab active:cursor-grabbing select-none border border-l-4 ${STATUS_BORDER[feature.status]}
        bg-white/[0.03] hover:bg-white/[0.06] border-white/6 hover:border-white/15
        p-3 transition-all duration-150
        ${dragging ? 'opacity-30' : ''}
      `}
    >
      <span className="flex items-center gap-1 text-primary/70 text-[8px] font-bold tracking-widest uppercase mb-1">
        {CATEGORY_ICONS[feature.category]}
        <span className="truncate">{feature.category}</span>
      </span>
      <p className="text-xs font-black text-white tracking-tight leading-snug">{feature.title}</p>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <PriorityPill priority={feature.priority} />
        <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[feature.priority]}`} />
      </div>
    </div>
  );
}

// ─── Unified catalogue board with drag & drop ─────────────────────────────────
type BoardColumn = 'built' | 'launch' | number;

function CatalogueBoard({ features, columnOf, onMove, onSelect }: {
  features: Feature[];
  columnOf: (f: Feature) => BoardColumn;
  onMove: (featureId: string, target: BoardColumn) => void;
  onSelect: (f: Feature) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<BoardColumn | null>(null);

  const columns: { key: BoardColumn; title: string; sub: string; accent: boolean }[] = [
    { key: 'built', title: 'Live Now', sub: 'Already working in the app', accent: true },
    { key: 'launch', title: 'At Launch', sub: 'Ready on day one — 15 Oct', accent: true },
    ...Array.from({ length: SPRINT_COUNT }, (_, i) => ({
      key: (i + 1) as BoardColumn,
      title: `Sprint ${i + 1}`,
      sub: `New features by ${sprintEndDate(i + 1)}`,
      accent: false,
    })),
  ];

  return (
    <div>
      <p className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase mb-4">
        Drag features between columns — into Live Now when shipped, into At Launch for day one, or into a two-week sprint after soft launch. Changes are saved for everyone.
      </p>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
        {columns.map((col) => {
          const inCol = sortFeatures(features.filter((f) => columnOf(f) === col.key));
          const isOver = overCol === col.key;
          return (
            <div
              key={String(col.key)}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col.key); }}
              onDragLeave={() => setOverCol((s) => (s === col.key ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/feature-id');
                if (id) onMove(id, col.key);
                setOverCol(null);
                setDraggingId(null);
              }}
              className={`shrink-0 w-[250px] border transition-colors ${
                isOver
                  ? 'border-primary/60 bg-primary/[0.06]'
                  : col.accent
                    ? 'border-primary/25 bg-primary/[0.02]'
                    : 'border-white/8 bg-white/[0.015]'
              }`}
            >
              <div className={`px-3 py-3 border-b flex items-baseline justify-between ${col.accent ? 'border-primary/15' : 'border-white/6'}`}>
                <div>
                  <p className={`text-[10px] font-black tracking-[0.2em] uppercase flex items-center gap-1.5 ${col.accent ? 'text-primary' : 'text-primary/80'}`}>
                    {col.key === 'built' && <CheckCircle size={12} weight="fill" />}
                    {col.key === 'launch' && <Rocket size={12} weight="fill" />}
                    {col.title}
                  </p>
                  <p className="text-[9px] font-bold text-white/30 mt-0.5">{col.sub}</p>
                </div>
                <p className="text-[10px] font-black text-white/25">{inCol.length}</p>
              </div>
              <div className="p-2.5 space-y-2 min-h-[120px] max-h-[520px] overflow-y-auto">
                {inCol.map((f) => (
                  <SprintCard
                    key={f.id}
                    feature={f}
                    dragging={draggingId === f.id}
                    onClick={() => onSelect(f)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/feature-id', f.id);
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggingId(f.id);
                    }}
                    onDragEnd={() => { setDraggingId(null); setOverCol(null); }}
                  />
                ))}
                {inCol.length === 0 && (
                  <p className="text-[10px] text-white/15 font-semibold text-center py-8">Drop features here</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Catalogue Component ─────────────────────────────────────────────────
export function FeatureCatalogue() {
  const [audience, setAudience] = useState<Audience>('client');
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [customFeatures, setCustomFeatures] = useState<Feature[]>([]);
  const [overrides, setOverrides] = useState<Record<string, FeatureOverride>>({});
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    apiRequest<{ features: ApiFeature[] }>('/proposal-features')
      .then((res) => setCustomFeatures(res.features.map(apiToFeature)))
      .catch(() => { /* staff-only endpoint; ignore load errors */ });
    apiRequest<{ overrides: Record<string, FeatureOverride> }>('/proposal-features/sprints')
      .then((res) => setOverrides(res.overrides))
      .catch(() => { /* ignore */ });
  }, []);

  // Apply status overrides so every view reflects the saved status.
  const allFeatures = useMemo(() => {
    return [...FEATURES, ...customFeatures].map((f) => {
      const o = overrides[f.id];
      return o?.status && STATUSES.includes(o.status as FeatureStatus)
        ? { ...f, status: o.status as FeatureStatus }
        : f;
    });
  }, [customFeatures, overrides]);

  const audienceFeatures = useMemo(
    () => allFeatures.filter((x) => featureAudience(x) === audience),
    [allFeatures, audience],
  );

  // Column membership: Built (shipped) → Launch (day-one scope) → sprint columns.
  const columnOf = useCallback(
    (f: Feature): BoardColumn => {
      if (f.status === 'Delivered') return 'built';
      if (isLaunchFeature(f, overrides[f.id])) return 'launch';
      return overrides[f.id]?.sprint ?? defaultSprint(f);
    },
    [overrides],
  );

  const [sprintError, setSprintError] = useState(false);

  const saveOverride = useCallback((featureId: string, patch: FeatureOverride) => {
    setOverrides((prev) => ({ ...prev, [featureId]: { ...prev[featureId], ...patch } }));
    apiRequest('/proposal-features/sprints', {
      method: 'PUT',
      body: { featureId, ...patch },
    }).then(() => setSprintError(false))
      .catch(() => {
        setSprintError(true);
        // Roll back to the server's saved state so the board never lies.
        apiRequest<{ overrides: Record<string, FeatureOverride> }>('/proposal-features/sprints')
          .then((res) => setOverrides(res.overrides))
          .catch(() => { /* keep local state if even the reload fails */ });
      });
  }, []);

  const moveToColumn = useCallback((featureId: string, target: BoardColumn) => {
    if (target === 'built') {
      saveOverride(featureId, { status: 'Delivered' });
    } else if (target === 'launch') {
      const patch: FeatureOverride = { placement: 'launch' };
      const current = allFeatures.find((f) => f.id === featureId);
      if (current?.status === 'Delivered') patch.status = 'Planned';
      saveOverride(featureId, patch);
    } else {
      const patch: FeatureOverride = { sprint: target, placement: 'future' };
      const current = allFeatures.find((f) => f.id === featureId);
      if (current?.status === 'Delivered') patch.status = 'Planned';
      saveOverride(featureId, patch);
    }
  }, [saveOverride, allFeatures]);

  return (
    <>
      {/* Stats */}
      <CatalogueStats features={allFeatures} />

      {/* Filter bar */}
      <div className="mb-6 space-y-3">
        {/* Audience toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            {([
              { id: 'client' as Audience, label: 'Client' },
              { id: 'marcus' as Audience, label: 'Marcus' },
            ]).map((a) => (
              <button
                key={a.id}
                onClick={() => setAudience(a.id)}
                className={`px-4 py-2 text-[10px] font-black tracking-widest uppercase transition-all duration-150 border
                  ${audience === a.id
                    ? 'bg-primary text-black border-primary'
                    : 'bg-transparent border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'}`}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className="ml-auto">
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-primary/40 bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase hover:bg-primary/20 transition-colors"
            >
              <Plus size={12} weight="bold" /> Add Feature
            </button>
          </div>
        </div>
      </div>

      {/* Unified board */}
      {sprintError && (
        <p className="mb-3 text-[11px] font-bold text-red-400">
          Couldn't save the last move — the board has been restored. Please try again.
        </p>
      )}
      <CatalogueBoard
        features={audienceFeatures}
        columnOf={columnOf}
        onMove={moveToColumn}
        onSelect={setSelectedFeature}
      />

      {/* Detail panel */}
      <AnimatePresence>
        {selectedFeature && (
          <DetailPanel
            feature={selectedFeature}
            onClose={() => setSelectedFeature(null)}
            onEdit={(f) => { setSelectedFeature(null); setEditingFeature(f); }}
            onDelete={(f) => setCustomFeatures((prev) => prev.filter((x) => x.id !== f.id))}
            isLaunch={isLaunchFeature(selectedFeature, overrides[selectedFeature.id])}
            onOverride={(featureId, patch) => {
              saveOverride(featureId, patch);
              setSelectedFeature((cur) =>
                cur && cur.id === featureId && patch.status
                  ? { ...cur, status: patch.status as FeatureStatus }
                  : cur,
              );
            }}
          />
        )}
      </AnimatePresence>

      {/* Add feature modal */}
      <AnimatePresence>
        {showAdd && (
          <AddFeatureModal
            onClose={() => setShowAdd(false)}
            onAdded={(f) => {
              setCustomFeatures((prev) => [...prev, f]);
              // Jump to where the new feature lives so it's immediately visible.
              setAudience(featureAudience(f));
              setSelectedFeature(f);
            }}
          />
        )}
      </AnimatePresence>

      {/* Edit feature modal */}
      <AnimatePresence>
        {editingFeature && (
          <AddFeatureModal
            initial={editingFeature}
            onClose={() => setEditingFeature(null)}
            onAdded={(f) => setCustomFeatures((prev) => prev.map((x) => (x.id === f.id ? f : x)))}
          />
        )}
      </AnimatePresence>
    </>
  );
}
