# AppSwinger — device security, bans and review cases

## What this branch adds

- A server endpoint (POST /api/security/device-login) that registers a per-installation identifier and checks it against the account's registered device.
- A second distinct device triggers an account suspension, a unique case folio, a security case with reason/evidence and a server-managed status, and Firebase refresh-token revocation.
- Ban email notification through Resend; delivery result is stored on the case. Scheduled retries run every five minutes and stop after three total attempts.
- A user clarification endpoint (POST /api/security/appeal) that accepts the case folio and an explanation. It deliberately accepts a signed Firebase token without revocation checking only for this limited appeal action, so a suspended user can submit an appeal.
- An administrator API (GET/PATCH /api/security/cases) with server-side custom-claim authorization, search across email/UID/folio/reason, status filters, internal observations, lift-suspension and confirm-ban actions.
- Firestore rules prevent client changes to account security state and block normal account data access while a ban is active.

## Required Vercel environment variables

Set these as server-side secrets only; do not use a VITE_ prefix:

- FIREBASE_SERVICE_ACCOUNT_JSON: service-account JSON for the same Firebase project.
- RESEND_API_KEY: Resend API key.
- SECURITY_EMAIL_FROM: verified sender address/domain in Resend.
- CRON_SECRET: long random secret; Vercel uses this to sign scheduled requests. SECURITY_CRON_SECRET is accepted as an alternative for manual scheduling.
- Keep existing Didit variables configured separately.

The Vercel cron is declared in vercel.json and calls /api/security/retry-notifications every five minutes. Confirm that the Vercel plan supports the chosen cron frequency. The endpoint requires Authorization: Bearer <CRON_SECRET> (or the configured SECURITY_CRON_SECRET fallback).

## Admin authorization

Admin API access is based on the Firebase custom claim admin: true, not a client-side password or a user-editable profile field. Assign that claim only through trusted Firebase Admin SDK code or a controlled server-side admin provisioning script. Then sign out and back in to refresh the ID token. Never use users/{uid}.isAdmin alone as the authorization check for these endpoints.

## Important policy and limitations

- This rule is deliberately strict: a second distinct installation suspends the account, even if the first session is no longer active. Device IDs are installation identifiers, not hardware attestation; clearing app data, reinstalling, or changing browsers can look like a new device. The appeal process is therefore essential, and the admin must review before treating a signal as conclusive account sharing.
- The device identifier is stored in browser local storage. It is not proof of a physical device identity and can be reset by the user or browser.
- The case record is the source of truth. Email is only a notification. If delivery fails, the failure and attempt count remain recorded.
- This branch does not send email to an unverified address. Ensure Firebase email verification is enforced for the relevant access policy before production.
- The case panel is connected through src/components/AdminModalWithSecurity.tsx and is shown only when the signed-in Firebase user has the admin custom claim. The legacy AdminModal still contains a client-side credential form for its other mock controls; that form is not authorization for the security-case API and should be replaced before production.
- A ban's session revocation does not instantly erase an already-issued client ID token. Firestore rules block banned-account reads/writes; every sensitive server endpoint must also check revocation and account status.
- Do not enable production bans until the backend deploy, Firestore rules, Resend delivery, cron schedule, and appeal path have been tested end-to-end.

## Required test plan

1. First device is registered and allowed.
2. Same device can sign in repeatedly without creating a case.
3. A second device creates exactly one case and suspends the account.
4. Duplicate requests on a banned account do not create duplicate cases or duplicate emails.
5. Email success, provider failure, retry count, and exhausted retries are recorded.
6. The suspended user can submit a 20–3000 character appeal with the correct case folio; another user cannot appeal that case.
7. A non-admin receives HTTP 403 from case management; an admin custom claim can search, add notes, lift suspension, and confirm a ban.
8. Firestore client writes cannot alter accountSecurity or the security case audit trail.
