# Identity verification (Mexico INE + facial comparison)

## Current implementation
The app now has an identity-verification entry point and a consent-gated hosted-session handoff. The browser does not accept INE uploads, selfies, face templates, or user-submitted "verified" flags. It expects these authenticated endpoints:

- `POST /api/identity-verification/session`
  - Verify Firebase ID token with Firebase Admin SDK.
  - Require explicit consent and record consent version, timestamp, purpose, provider, and policy version.
  - Create a provider-hosted verification session for Mexican INE document authenticity, face match, and liveness.
  - Return only `{ verificationUrl }`; URL must be HTTPS and point to the configured provider's allowlisted host.
  - Never accept document images or biometric data in this endpoint.
- `GET /api/identity-verification/status`
  - Verify Firebase ID token and return only the signed-in user's minimal state: `not_started | pending | verified | rejected`.
- Provider webhook (server-to-server)
  - Verify the provider's webhook signature and replay protection.
  - Map the provider's final result to the user's status in `identityVerifications/{uid}` using Firebase Admin SDK.
  - Never trust the browser redirect or client-supplied status as proof of verification.

## Required before production
This repository does not yet contain a contracted provider, provider credentials, the server-side session endpoint, the webhook, or the status endpoint. Therefore the UI deliberately fails closed until those are deployed; it does not simulate verification.

Select and contract an identity provider that explicitly supports Mexico's INE and liveness/face comparison. Configure secrets only in the server deployment environment (never Vite `VITE_*` variables or the client bundle). Use a provider-hosted capture flow so sensitive images are sent directly to the provider. Do not persist raw documents, selfies, biometric templates, full provider responses, or document numbers in Firestore, logs, analytics, or support tools.

Before launch, publish a privacy notice covering purpose, legal basis/consent, recipients and international transfers, retention/deletion, ARCO rights, responsible entity/contact, and how to appeal a rejection. Complete a security/privacy review and test the provider webhook against forged, duplicate, expired, and out-of-order events. Avoid making identity verification a pretext to collect more data than necessary.

## Manual acceptance checklist
1. Signed-out user cannot create a session.
2. No consent means no request is sent.
3. Missing provider configuration returns a clear unavailable response; no user is marked verified.
4. Provider URL must be HTTPS and use an allowlisted host.
5. A browser redirect alone never marks the account verified.
6. Only a valid provider webhook can change status; duplicate/replayed webhook events are idempotent.
7. Client can read only its own minimal status; client writes are denied by Firestore rules.
8. Retention and deletion behavior is documented and exercised.
