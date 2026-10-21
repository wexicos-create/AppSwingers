# AppSwinger launch hardening — implementation status

Owner/brand: CA Enterprise. Product credit: Josué Cervantes Alvarado.

## Changes in this branch

- Replaced the card-payment demo in `PaymentModal` with an explicit SPEI order flow that creates a **pending** order and never labels a transfer as paid. It does not invent a CLABE, beneficiary, bank integration, or payment confirmation.
- Removed hardcoded administrator credentials and localStorage password/PIN storage from `AdminModal`. Sign-in now uses Firebase Authentication and requires a server-issued custom claim (`admin: true`, `role: admin`, or `role: superadmin`).
- Tightened Firestore rules so users cannot grant themselves admin roles, membership levels, identity verification status, or payment status. Orders are created pending; memberships and payment decisions are admin-controlled. Reports, support tickets, identity submissions, and agency applications have explicit rules.

## Required before public launch

1. **Deploy and test Firestore rules in a staging Firebase project first.** Rules intentionally deny unlisted collections and may require adapting app queries before production. Do not publish rules blindly.
2. Create admin custom claims using Firebase Admin SDK in a trusted server environment. Never grant claims from the browser. Enable MFA for administrative accounts.
3. Build a trusted backend/Cloud Functions workflow for order creation, reference uniqueness, verified payment reconciliation, immutable audit logs, membership activation and expiry. The current UI order reference is generated client-side and is not a bank-issued payment reference; it must not be treated as proof of payment.
4. Configure verified SPEI receiving instructions from the actual account holder. Do not expose or use placeholder bank details.
5. Connect identity verification to the existing provider/workflow. Store identity images in private storage with strict authorization and short retention. No client-side claim should be treated as a verified identity.
6. Add server-side moderation queues for reports, complaints, match/proposal blocks, content moderation, and agency partnerships; enforce staff roles and audit every decision.
7. Remove seed/demo profiles and fake analytics only after identifying them. Preserve legitimate payment, consent, moderation and legal audit records. Cookie clearing does not delete server-side profiles.
8. Run TypeScript/build checks, Firebase Emulator Suite rule tests, payment state-machine tests, membership expiry tests, and security review. Test successful, rejected, duplicate, expired, refunded, and concurrent payment paths.
9. Publish to Vercel only after the repository is connected to the correct project and a deployment is confirmed healthy.

## Launch claims

This branch is **not a certification** and does not establish Segpay approval, bank integration, legal compliance, biometric verification, or a fully operational admin case-management backend. Those claims require real provider configuration and end-to-end verification.