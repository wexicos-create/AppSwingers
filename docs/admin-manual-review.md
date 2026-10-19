# Manual operations review: SPEI, identity, support

## Current client behavior

The admin modal now includes a server-backed review queue for SPEI orders, identity-review cases, and technical-support cases. It calls:

- `GET /api/admin/review-queue` with a Firebase ID token in the Authorization header. Expected response: `{ "items": ReviewCase[] }`.
- `POST /api/admin/review/:caseId` with `{ "decision": "approve" | "reject" | "request_info", "notes": string }`. The client treats a decision as complete only when the server returns `{ "success": true }`.

**These endpoints are not yet implemented in this repository.** The UI intentionally shows an unavailable/error state and does not generate fake cases or claim that access has been granted. Do not deploy this as an operational admin workflow until the endpoints and tests below exist.

## Required server contract

### Authentication and authorization
- Verify the Firebase ID token using Firebase Admin SDK on every request.
- Require the server-issued custom claim `admin === true`; never trust a client flag, email string, hidden button, or local storage.
- Re-check authorization at the action endpoint, not only when loading the queue.
- Rate-limit, validate request schema and length, and write an immutable audit record with actor UID, case ID, decision, timestamp, reason, previous state, and resulting state. Avoid storing unnecessary personal data in logs.

### SPEI manual confirmation
1. The server creates a unique order and binds it to the authenticated UID, server-calculated amount/currency, product/level, and unique payment reference.
2. Admin checks the actual bank deposit independently. A screenshot or user claim alone is not proof of settlement.
3. Approve only a pending order; server uses a transaction/conditional update to prevent double approval and duplicate entitlement grants.
4. The server records reviewer UID, timestamp, order/reference, amount, decision and notes, then grants the purchased entitlement exactly once. The browser must not write paid status, subscription level, or access rights directly.
5. Reject or request information without granting access. Never accept a changed amount/product from the browser.
6. Reconcile reference, amount, currency, destination account and settlement date; support reversals/refunds and prevent one deposit from being used for multiple orders.

### Identity verification
- Prefer a contracted provider's hosted capture SDK/page with camera-only capture for INE front/back and live face, no gallery/file picker, document authenticity checks, face comparison and liveness. The exact provider must support Mexican INE and the required checks.
- Do not rely on a browser-only camera prompt as proof of liveness; a web client cannot reliably prove that an image came from a live camera.
- The provider returns a minimal result and session ID; verify its signed webhook server-to-server, with signature validation, timestamp tolerance, replay protection and idempotency.
- Store only status, provider reference, timestamps, check outcomes and a minimal review reason. Do not show or copy raw INE images, selfies, biometric templates, full OCR output, or full provider payload into the admin panel.
- A manual reviewer can approve/reject/escalate only with server-side authorization and an audit log. Do not expose a general-purpose override that bypasses the provider checks without an explicit, audited exception policy.
- Provide consent and a privacy notice before capture; document purpose, legal basis, provider/transfer recipients, retention/deletion, access controls, ARCO rights and appeal/contact details. Get qualified privacy/legal review before launch.

### Technical support
- The queue may show a ticket ID, user UID, category, timestamps and a redacted summary. Avoid exposing passwords, tokens, full payment instruments, ID images or biometric data.
- Decisions and staff notes are server-validated and audited. Any user-visible status update is sent by the server.

## Acceptance tests required before production
- Unauthenticated and non-admin requests receive 401/403.
- Client cannot approve itself or modify entitlements directly.
- A stale, already-decided, unknown, or cross-user case cannot be acted on.
- Concurrent/double SPEI approval grants exactly one entitlement.
- Incorrect amount/reference/product and reused deposits are rejected.
- Audit trail records reviewer, decision and before/after state without sensitive image payloads.
- Missing provider or webhook secrets fail closed; forged, replayed, expired and out-of-order webhook events cannot mark a user verified.
- Identity capture uses provider camera flow and cannot be completed by merely submitting a gallery photo; liveness failures and inconclusive face matches go to review/retry rather than auto-approval.
- Retention/deletion, user appeal and incident response procedures are tested.
