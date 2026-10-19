# AppSwinger — commercial product and launch specification

Status: proposal and implementation contract; not a declaration that the features are already implemented.
Target: Mexico first; adults 18+; responsive web/PWA first, Android APK only after a separate signed build and device test.

## Product concept: AppSwinger Afterdark

An elegant, privacy-first adult social platform built around consent, trusted connections, creator commerce and curated events. The differentiator is not just matching: it is a **Consent Passport** that records versioned agreements and event rules, a creator/event marketplace with transparent SPEI order tracking, and a reputation system for safety and reliability—not sexual popularity.

Visual direction: premium charcoal/obsidian surfaces, warm ivory typography, restrained violet/coral highlights, large readable controls, discreet app icon/notifications, quick privacy controls, reduced-motion support and proper Android edge-to-edge insets. Avoid cluttered neon gradients as the default. The user must always understand whether a profile, story, event, order or verification is real, pending, paid, reviewed or only a draft.

## Core user offer without artificial lockout

### Free core
- Profile, preferences, matching discovery, consent-based messaging after mutual interest, blocking/reporting and account privacy controls.
- Public text stories and moderated community posts, with audience selector (public / followers / matches / private draft), edit/delete, report and mute.
- Browse events and creator pages; save events; create a consent checklist; request tickets and pay by SPEI.
- Access to safety centre, account data export/deletion request and basic event/creator discovery.
- A limited, clearly disclosed number of promotional placements; no deceptive ad interstitials or forced payment to withdraw consent or block someone.

### Optional paid value
- **Plus membership:** advanced filters, extra saved searches, profile themes, travel radius, read-only analytics and higher discovery limits.
- **Creator subscriptions:** creator-set tiers, previews, scheduled posts, bundles, subscriber-only stories/lives where lawful and contractually supported, sales dashboard, refund/dispute workflow and tax-document status.
- **Event tools:** organizer page, ticket tiers, guest list, waitlist, capacity, check-in QR, refund/cancellation policy, age/consent rules, co-host permissions and post-event feedback.
- **Promoted listings:** paid placement for adult venues, agencies, photographers, educators and event organizers; labeled as sponsored, targeting only eligible adults, with frequency caps and category exclusions.
- **Paid event admission:** organizer creates a listing; platform charges disclosed service fee; organizer receives payout only after event/order reconciliation. SPEI settlement is manually confirmed unless an authorized bank/payment partner offers verified transaction data.
- **Agency tools:** verified business profile, leads inbox, appointment/event calendar, campaign reports and invoice/receipt records.
- **Safety add-ons:** optional provider-hosted age/identity checks, verified-organizer badge, emergency contact shortcut and event check-in—not a claim that consent to an event equals consent to sexual activity.

Do not sell boosts or badges that imply a user has consented to sexual activity or is “safe”. Never charge to report abuse, withdraw consent or delete an account.

## Consent Passport and signed PDF

Each consent record is an explicit, purpose-specific agreement, not a blanket waiver. It must distinguish:
1. Privacy notice and personal-data processing consent (with version, purposes, controller identity, recipients, retention and rights).
2. Platform rules and adult-content declaration.
3. Event participation rules and separate optional photography/recording permission.
4. Optional creator-content license/terms for the particular work or transaction.
5. Any event-specific participant agreement, which must be revocable for future activity and must never override the right to stop.

UI flow:
- Show a plain-language summary and full versioned text.
- User draws a signature in a touch-enabled box; provide clear/retry and accessible typed-name alternative only if legal counsel approves.
- Capture affirmative checkbox(es), authenticated UID, verified email/phone where available, UTC timestamp, document version, locale, transaction/event ID, and cryptographic hash of the exact PDF payload.
- Render signature stroke into the PDF at signing time and save a sealed immutable copy; do not mutate the signed PDF later. Changes create a new version and require a new signature.
- Provide download and revocation/withdrawal request; log delivery and later changes.
- For high-risk agreements, use a qualified e-signature provider with identity and evidence trail. A drawn signature alone is not automatically equivalent to every legally required advanced/qualified electronic signature.
- No user can sign for a partner. Each adult signs independently. Couple profiles must not imply one person's signature binds the other.
- Consent to personal-data processing must be separate from marketing, public posting, explicit-content sale and photography/recording. Do not make unnecessary consent a condition of basic account use.

## SPEI order lifecycle (single source of truth)

States: `draft -> awaiting_payment -> payment_reported -> under_review -> paid -> fulfilled`; terminal alternatives: `rejected`, `expired`, `cancelled`, `refunded`, `disputed`.

1. Server creates an opaque order ID and unique payment reference; price, currency, product, seller, fee, tax handling and expiry are server-derived.
2. User sees recipient/account details configured by finance, exact amount, reference, expiry, and anti-fraud notice. No bank credentials or full account data in analytics.
3. User marks transfer sent and can optionally provide a receipt as a *claim*, never proof. Receipt uploads are private and short-lived; redact account balances and unrelated transactions where possible.
4. Automatic reconciliation is enabled only with a contracted bank/payment provider and authenticated transaction feed/webhook. Verify destination, settled amount, currency, reference, transaction ID, status and replay protection.
5. If no trusted bank feed exists, route to the admin queue. Admin verifies the deposit in the actual bank account. Two-person approval is required above a configurable risk/amount threshold.
6. A server transaction changes only a pending order once, writes an immutable audit event, and grants the exact entitlement idempotently. Reused references, mismatched amounts, stale orders and self-approval are rejected.
7. Seller/event access, creator content and platform fee are reconciled separately. Refunds, cancellations, disputes and chargeback-equivalent cases revoke or adjust entitlement according to published terms; never delete the audit history.

Never tell the customer “automatic payment confirmed” based only on a screenshot, browser redirect, client-side status, or a transfer request. SPEI is a transfer rail, not proof that the application has direct bank access.

## Creator marketplace, RFC and fiscal trail

- Separate platform-as-agent vs platform-as-seller/merchant-of-record per product and contract; do not assume all proceeds belong to the platform.
- Seller onboarding collects only necessary identity/tax details through a restricted workflow. RFC and CFDI data are private and never visible on public profiles.
- Store fiscal profile, invoice request, invoice UUID/status, amount, tax base, applicable tax breakdown, seller/platform role and payment/payout references in a restricted fiscal subsystem.
- Integrate an authorized CFDI/PAC provider only after accountant/legal review of the applicable SAT rules, tax regime, VAT/withholding, platform-intermediation duties, seller invoices, cancellations and foreign sellers.
- Never generate a pretend CFDI or call a generic PDF a tax invoice. Provide the legally required invoice flow and downloadable XML/PDF only when the provider confirms issuance.
- Reconcile gross sale, platform commission, provider costs, refunds, taxes/withholdings and seller net payout.

## Moderation, privacy and abuse controls

- Strict 18+ onboarding and age assurance proportionate to risk; if age cannot be established for a high-risk feature, pause that feature and route to review.
- Explicit written consent for every participant; no non-consensual imagery, coercion, exploitation, trafficking, minors, hidden-camera content or impersonation.
- Report/block/mute from every profile, story, message, event and creator post; urgent escalation and preservation process; repeat-offender enforcement and appeal.
- Public stories are opt-in, have audience controls, pre-publication rules checks, post-publication report tools and deletion workflow. Default to private draft until the user explicitly publishes.
- Private-by-default sensitive data, least-privilege staff roles, access logging, retention/deletion schedules, export and ARCO request process, incident response and breach escalation.
- Do not run facial recognition on uploaded user photos without a lawful, provider-supported and separately disclosed flow. Keep INE/selfie media out of Firestore and ordinary support/admin views.

## Admin operations

Role separation: Support (tickets only), Moderator (content/action queue), Finance reviewer (SPEI/order records), Identity reviewer (minimal provider outcome), Fiscal operator (tax documents), Admin (configuration/role management). High-risk changes require reason and audit trail. Role grants use trusted server tooling, not client UI.

Admin dashboards: pending SPEI, failed reconciliation, identity pending/rejected/appeal, reports and urgent safety, content moderation, event approvals, seller tax-document state, refunds/disputes, ad review, revenue/commission reconciliation, funnel/retention and system health. Every action shows before/after status and the actor; sensitive data is masked.

## Revenue design and unit economics

Revenue streams: memberships; creator subscriptions/transaction fees; ticketing/service fees; sponsored adult venues/agencies; verified business SaaS tools; promoted events; optional privacy-preserving premium filters. Diversify so user access does not depend solely on explicit-content sales.

For each stream measure conversion, gross merchandise value, platform take rate, payment reconciliation rate, refund/dispute rate, creator retention, event attendance, safety-report rate, moderation cost, customer support cost, and contribution margin. Launch with a small city/organizer cohort, prove repeat transactions and safety operations, then expand. Never promise profitability without actual cohort data.

Before launch, obtain written approval from hosting, app distribution, advertising, payment and identity vendors for the intended adult-content category. Many mainstream providers prohibit or severely restrict explicit sexual content; use only vendors that explicitly permit the model. Do not bypass provider policies or mislabel content.

## Android and release definition

The repository inspected is React/Vite, not a native Android Gradle project. First ship and test the responsive web product. If APK is required, package through an intentionally selected Android wrapper/native implementation, set correct edge-to-edge/window insets for Android 10–15, review permissions, sign a release artifact, install-test on real devices, and publish checksums plus a public distribution link. A successful Vite build is not an APK build.

## Launch gates — all must pass

- Automated unit/integration/e2e tests for auth, age gates, story visibility, consent/PDF integrity, SPEI idempotency, role boundaries, tax-document states, reports/blocks, deletion and refunds.
- Security rules and server endpoints reviewed; no secrets in client bundle; dependency and secret scanning; backups/restore test.
- Legal review for Mexican privacy notice, sensitive personal data, electronic consent evidence, adult-content rules, consumer terms, event liability, SAT/CFDI and tax responsibilities.
- Vendor approval for adult content, creator payouts, hosting, ads and verification.
- Staging-to-production release checklist, observability, incident runbook, moderation staffing and support response targets.
- Android release is blocked until signed APK is actually built and installed/tested. No “production-ready” claim based on screenshots or a successful web build alone.
