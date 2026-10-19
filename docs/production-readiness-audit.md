# AppSwingers — production-readiness audit

Date: 2026-10-18
Scope: repository source review on `repair/commercial-integrity-security`. This is a source audit, not a claim of successful production or device testing.

## Confirmed blockers

1. **Admin review API is missing.** `src/components/AdminModal.tsx` calls `GET /api/admin/review-queue` and `POST /api/admin/review/:caseId`, but `docs/admin-manual-review.md` explicitly says these endpoints are not implemented. SPEI approval, identity review, and support actions therefore are not operational. Do not show a paid entitlement as granted until a trusted server confirms it.
2. **Identity verification is not operational.** The UI expects `POST /api/identity-verification/session`, `GET /api/identity-verification/status`, and a signed provider webhook. `docs/identity-verification.md` confirms there is no contracted provider, credentials, server endpoint, or webhook. The interface correctly fails closed; no face-match/liveness claim should be made yet.
3. **No backend entry point was found at repository root.** Fetching `server.js` on the repair branch returned 404. Server-side authorization, order lifecycle, idempotency, audit trail, webhook verification, and support workflow must be implemented and tested before commercial launch.
4. **Dependency installation is not reproducible yet.** `package.json` exists, but `package-lock.json` was not found on the inspected branch. A lockfile and CI build/lint checks are needed before trusting a release.
5. **Not an Android/Gradle project at present.** The root manifest describes a React/Vite web application and contains no evidence of `settings.gradle`, `build.gradle`, or an Android app module. A web build is not an installable APK; packaging must be a separate verified step.
6. **Demo data is still in the application path.** `src/App.tsx` initializes profiles, events, proposals, creators, lives, and reports from `src/data/mockProfiles`. Production discovery must use validated backend data and clearly distinguish any intentional demo mode.
7. **Operational UI overstates some local cleanup.** The admin action clears browser-accessible local/session storage and cookies, not device-wide Android cache or all browser cookies. Rename/limit the claim to what the browser can actually clear.
8. **Location defaults and privacy need review.** The app requests GPS on startup and substitutes a fixed city when permission is denied. Make location opt-in, disclose purpose, avoid asserting a GPS fix when none exists, and do not infer exact distance from mock profile coordinates.
9. **Commercial and adult-safety readiness remains unverified.** Before launch, enforce age eligibility, consent, reporting/blocking, moderation escalation, account deletion, privacy notice and retention; validate payment/order ownership and prevent replay/double approval.

## Work already present on this branch

- Firestore rules deny client writes to matches, identity-verification results, payments, and subscriptions.
- The client avoids fabricating mutual matches or paid tickets.
- Identity UI requires consent and a hosted provider handoff, and explicitly says it is disabled until backend/provider setup is complete.
- Admin review UI checks the server-issued Firebase `admin` claim and reports unavailable endpoints rather than simulating success.

These are useful safety boundaries, not proof that the whole service works.

## Execution plan and release gates

1. Add CI to run dependency installation, TypeScript checks and Vite production build on the repair branch.
2. Resolve every CI failure and add a committed lockfile.
3. Implement authenticated server endpoints with Firebase Admin SDK, role checks, schema validation, rate limits, idempotent transactions and append-only audit events.
4. Implement SPEI orders with server-calculated amount/product/reference; grant access only after explicit audited admin approval against independently checked bank settlement.
5. Integrate a contracted identity provider that supports Mexican INE, face comparison and liveness; validate signed/replay-protected webhooks server-side. Never store raw ID/selfie/biometric templates in the app database.
6. Replace mock production feeds with real persisted data and add authorization rules for every collection and API route.
7. Add automated tests for unauthenticated/non-admin access, self-approval, double approval, replayed webhooks, wrong/reused SPEI references, rejected verification, and entitlement integrity.
8. Run a production build and review CI results. Separately build and install-test an Android wrapper/APK on Android 10–15 if APK delivery remains required. Do not label an artifact production-ready until this passes.

## Release status

**NOT READY FOR COMMERCIAL RELEASE.** The missing server APIs/provider integration and absent verified Android build are release blockers. No payment, identity approval, APK build, or production deployment is claimed by this audit.
