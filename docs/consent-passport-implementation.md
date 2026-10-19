# Consent Passport — implementation contract and acceptance tests

This document is a technical specification. It is not legal advice and is not itself a legally sufficient consent form.

## Suggested data model

- `consentTemplates/{templateId}`: `version`, `locale`, `purpose`, `bodyHash`, `effectiveAt`, `retiredAt`; immutable once published.
- `consentRecords/{recordId}`: random ID, authenticated signer UID, template/version, specific purpose flags, event/order reference if applicable, accepted timestamp (server time), signature asset reference, PDF object reference, PDF SHA-256, evidence metadata, status and withdrawal timestamp.
- `consentAudit/{eventId}`: append-only event, actor UID, record ID, action, server timestamp, previous/new status, request correlation ID. Never store raw signature strokes or document content in general-purpose logs.
- Private object storage: encrypted sealed PDF and signature evidence; server-only write; owner-only read/download under authorization; short-lived signed URL; retention policy and deletion/legal-hold behavior documented.

## Signature capture flow

1. Require an authenticated adult account and re-check eligibility server-side.
2. Load exact published template/version from server. Present summary plus complete text and separate consent switches.
3. User signs with pointer/touch in a canvas; show a clear button, preview, and explicit “Sign and save” action. Signature is not prefilled and not bundled with marketing consent.
4. Server validates CSRF/origin where applicable, auth, template version, accepted required purposes and rate limits. It records server timestamp and signer UID.
5. Server creates a PDF from the exact immutable template and embeds the captured signature asset. Add record ID, template version, signer, UTC timestamp, evidence description and SHA-256 digest. The hash must be calculated over the final PDF bytes after rendering.
6. Store PDF privately and commit record/audit state idempotently. Return a download link only after persistence succeeds.
7. If any step fails, do not display “signed” and do not mark consent accepted. Retrying the same idempotency key must not create duplicate agreements.
8. A later template change creates a new document and signature request. Withdrawal changes the status for future processing; it does not silently rewrite the signed historical PDF or imply that legally required recordkeeping is erased.

## Signature and evidence limits

A drawing on a screen is evidence of an interaction, not automatic proof of identity, informed consent, legal capacity, or a particular level of electronic signature. For higher-assurance transactions, use a vetted electronic-signature provider and legal review of applicable Mexican law. Each adult must sign for themselves; no partner may sign for another.

## Acceptance tests

- Anonymous users cannot create/read a consent record.
- User A cannot read User B's PDF or signature asset.
- Client cannot write `signed`, `verified`, timestamps, hashes, PDF URL or withdrawal state directly.
- PDF hash matches the stored final bytes; changing the file invalidates the recorded digest.
- Missing checkbox, missing signature, stale template, invalid signature payload or failed storage leaves no successful record.
- Duplicate requests are idempotent.
- A new template version never overwrites a prior signed document.
- Marketing, public stories, explicit-content licensing, sensitive-data processing and event-specific consent are separate purposes.
- Admin read access is role-scoped, masked and audited.
- Withdrawal stops future optional processing/publication as required, with retention exceptions explained.
