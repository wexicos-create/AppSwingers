# AppSwinger — creator commerce, memberships and benefit lifecycle

Status: implementation contract. This document does not claim the payment, payout, identity, content delivery, moderation or notification backend is already deployed.

## 1. Product principles
- Mexico-first, 18+ only. Identity/age assurance and consent checks must be performed by a trusted server/provider before high-risk features are enabled.
- Free discovery and safety controls remain available. Never charge for reporting, blocking, revoking consent, or requesting account deletion.
- Creator commerce (subscriptions, pay-per-view and tips) is a planned module, not a live money-transfer feature. Do not advertise it as available until payment-provider approval, seller contracts, payout rails, tax review and abuse handling are implemented.
- No creator payout may be promised or triggered by a client-side event. Never store bank credentials in client state.
- Content must be consensual and lawful; prohibit minors, non-consensual intimate media, coercion, exploitation, trafficking, impersonation and hidden-camera material. Every identifiable adult must have documented permission for the specific content and its distribution.

## 2. Mexico catalog — tax-inclusive totals
Assumption for display only: 16% IVA applies to the listed taxable service and the price entered is before IVA. Finance/accounting must validate the tax treatment and seller-of-record for each transaction before launch.

| Product | Base MXN | IVA 16% | Consumer total MXN | Entitlement |
|---|---:|---:|---:|---|
| Commercial event listing, one use | $1,500 | $240 | $1,740 | One approved event listing, max 40 guests |
| Featured campaign, one use | $2,500 | $400 | $2,900 | One approved featured campaign; sponsored label |
| Profile boost | $300 | $48 | $348 | Boost for 15 days |
| Host tools | $1,500 | $240 | $1,740 | Two event listings; each max 40 guests |
| VIP Plus | $350 | $56 | $406 | 10 days from approved activation |
| Ultra VIP | $650 | $104 | $754 | 20 days from approved activation |
| Event admission, organizer-set | $500–$1,200 | $80–$192 | $580–$1,392 | Per person or per couple, selected explicitly; optional women’s discount shown before checkout |

Event publication must specify event date/time, capacity, price basis (individual/couple), women’s discount rules, cancellation/refund terms, eligibility, consent expectations and host identity/status. Capacity must be enforced server-side; do not permit more than 40 confirmed attendees. “Host tools” grants two listings, not unlimited event publishing.

## 3. Membership feature gates
The UI must derive access from a server-owned active entitlement, not from a local toggle or a payment screenshot.

### Free
- Profile and preferences, basic discovery/matching, privacy controls, block/report, safety center, browse events and creator pages.
- No paid-only access is implied.

### VIP Plus — 10 days
- Advanced discovery filters and saved preferences.
- Up to 15 event applications per rolling week.
- Basic personal activity statistics and standard discovery prioritization where the ranking policy allows it.
- No access to private creator media without a separate creator subscription or PPV purchase.

### Ultra VIP — 20 days
- VIP Plus benefits while active.
- Unlimited event applications during the term, subject to event capacity, eligibility and anti-abuse limits.
- Additional saved filters and discreet profile visibility controls.
- Does not override a creator paywall, event host approval, safety controls, blocks or consent.

### Paid one-use/term products
- Event listing and host tools grant the stated listing quota only after payment approval.
- Featured campaign grants one reviewed, clearly labeled sponsored placement; no guarantee of attendance or matches.
- Profile boost changes eligible discovery exposure for 15 days only; it cannot imply verification, safety or consent.
- Quotas must be consumed atomically by the server and be protected against duplicate requests.

### Creator commerce — future gated capability
- Creator channel subscriptions, PPV media and tips can only launch after provider approval for adult content, verified adult creator onboarding, documented consent/rights, compliant checkout, refunds/disputes, tax review and legally supported payout rails.
- Proposed split: 20% platform commission / 80% creator share, calculated on a clearly defined base (before/after tax, payment fees, refunds and chargebacks) agreed in seller terms. Do not label 80% as a guaranteed net payout until this basis and all fees are defined.
- Keep creator earnings as a ledger, not a client-editable balance. Payout eligibility requires identity/tax onboarding, settlement, fraud checks and any legally required withholding.
- Watermarks, EXIF removal, access controls and download friction reduce misuse but cannot guarantee that screen capture or redistribution is impossible. Tell creators this clearly.

## 4. SPEI payment approval and activation
Required state machine:
`draft -> awaiting_payment -> payment_reported -> under_review -> paid -> fulfilled`
Terminal/exception states: `rejected`, `expired`, `cancelled`, `refunded`, `disputed`.

1. Trusted server creates the order, product price, IVA calculation, currency, unique reference, expiry and entitlement scope.
2. The user reports the transfer; a receipt is only a claim, never proof of settlement.
3. An admin verifies the actual deposit against the bank record (or an authorized provider's authenticated webhook/feed does it). Record reviewer, timestamps, reference and audit event.
4. Reject duplicate references, wrong amounts, mismatched currency, self-approval and replayed transactions. Require second review above configured risk thresholds.
5. Only after approved settlement, a server transaction marks the order paid, grants the exact entitlement once and records `activatedAt`, `expiresAt`, product, order ID and audit trail.
6. Never activate a membership when a user merely uploads a screenshot, clicks a button, or changes a client-side field.
7. Failed/rejected/expired payments grant no benefit. Refunds/disputes follow disclosed terms and are logged; revoke future access where appropriate without deleting the ledger.

## 5. Automatic expiry and three-day notification
Every entitlement must include `status`, `activatedAt`, `expiresAt`, `orderId`, `productCode`, `ownerUid`, and `notification3dSentAt` (or an idempotency key). Use server timestamps.

- At approval: calculate the expiry from the approved activation timestamp (VIP Plus +10 days, Ultra VIP +20 days, boost +15 days; listing products use their quota rather than an invented duration).
- At or after `expiresAt`, server-side authorization must stop granting the paid benefits automatically. UI timers alone are not enforcement.
- A trusted scheduled job should find active entitlements whose expiry falls within the next 72 hours and send one notification per entitlement, then write `notification3dSentAt`. Make this idempotent so retries do not send duplicates.
- Provide a notification-bell/button in the app header with unread count, read state, expiry reminder, and a link to the relevant plan. The reminder should say the exact local expiry date/time and that renewal requires a new approved payment; do not auto-charge.
- If scheduled server jobs/push credentials are not configured, display in-app reminders when the user opens the app as a fallback, but do not claim a guaranteed three-day push notification.
- Users can mute promotional notifications, but security/payment/expiry notices must follow the clearly disclosed notification policy and applicable law.

## 6. Admin operations
Admin panel must provide a protected queue for payment claims, identity cases, creator applications, event listings and reports. Actions: approve, reject with reason, request resubmission, suspend, ban, and mark a case resolved. Every action must be checked by trusted authorization and logged. A visible admin button or hidden UI route is not authorization. Admin privileges must come from trusted server-side claims, never a client-editable field or shared PIN.

## 7. Safety, privacy and consent
- User controls: block/report from profiles, messages, creator posts and events; rapid incident escalation; clear appeals; warning history and proportionate enforcement.
- Three-warning permanent-ban policy may be configured only with trusted server-side strike records, evidence references, reviewer/automation provenance and appeal handling. Never base permanent bans solely on an unreviewable client-side text classifier.
- Location: show approximate distance/area, never exact live coordinates by default; sharing with trusted contacts must be explicit, time-limited and revocable. Emergency shortcut must not imply that emergency services have been contacted unless the integration confirms it.
- Identity: do not claim INE, selfie/liveness, age or face matching is verified unless a real contracted provider confirms the result. Keep identity documents out of public profile storage; use provider-hosted collection where possible and minimize retention.
- Remove EXIF/geolocation metadata from media before publication; use private storage and signed, short-lived URLs for paid content. Watermark per purchaser where legally appropriate. No technical measure can guarantee prevention of screen capture.
- Use TLS in transit and appropriate encryption/key management at rest. “End-to-end encryption” must only be claimed for message paths that actually implement it.
- Accessibility target: WCAG 2.2 AA where feasible, keyboard/screen-reader support, readable bilingual Spanish/English content and reduced-motion support.

## 8. Production blockers that must be closed before public launch
- Implement and test trusted server endpoints for payment orders, admin approval, entitlement grants, expiry enforcement, notifications, creator ledger/payout and moderation strikes.
- Configure SPEI/bank reconciliation or document secure manual review; protect admin endpoints and audit every decision.
- Select an adult-content-permitted processor and obtain written acceptance before offering subscriptions, PPV or tips.
- Integrate age/identity provider and documented consent workflow; complete privacy impact, retention, incident response and Mexican legal/accounting review.
- Replace demo/mock profile, creator, event and payment records with production data sources; run automated tests and a successful deployment build.
- Verify notification delivery on supported devices and test expiry/renewal across time zones, retries, duplicate events, refunds and account suspension.
