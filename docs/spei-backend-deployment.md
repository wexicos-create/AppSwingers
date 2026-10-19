# AppSwinger — SPEI backend deployment and verification

This implementation adds trusted Firebase callable functions. It is not live until the Firebase project is configured and deployment succeeds.

## Included
- Server-priced SPEI order creation (MXN, catalog-controlled subtotal and 16% IVA display assumption).
- A user can report a transfer, but the report never grants benefits.
- Admin review requires the Firebase custom claim `admin: true`, a bank-confirmed flag, and a real bank transaction identifier before approval.
- Duplicate bank transaction IDs are rejected; the approval and entitlement grant happen in one Firestore transaction.
- Entitlements are server-created; timed VIP Plus (10 days), Ultra VIP (20 days), and profile boost (15 days) expire server-side.
- Scheduled hourly lifecycle marks expired orders/benefits and writes one in-app notification for a benefit expiring within 72 hours.
- Creator checkout deliberately fails closed. Creator subscriptions, PPV, tips and payouts are NOT implemented until an adult-content-approved provider and payout adapter exist.

## Required setup before deployment
1. Confirm project ownership and access for Firebase project `groovy-outcome-g8f9p` and the named Firestore database `ai-studio-bae18161-c5ba-4b69-99f2-4a83f48a6d69`. The web client already points at that database; deploying rules to the wrong database would be dangerous.
2. Install Firebase CLI and authenticate with an account authorized for this project.
3. Copy `functions/.env.example` to `functions/.env` (do not commit the real file) and confirm `FIRESTORE_DATABASE_ID` exactly matches the selected database.
4. Configure Firebase App Check for the deployed web domain, obtain the actual reCAPTCHA v3 site key, initialize App Check in the web client, and verify requests. Callable functions enforce App Check and will reject requests until this is configured.
5. Ensure billing is enabled for scheduled Cloud Functions/Cloud Scheduler. Configure the correct region and review expected costs.
6. Deploy functions and rules together only after reviewing the target project:
   ```sh
   firebase use groovy-outcome-g8f9p
   cd functions && npm install && npm run lint && npm run build && cd ..
   firebase deploy --only functions,firestore:rules
   ```
7. Grant the admin custom claim using a trusted, authenticated Admin SDK script or secured operator environment. Never grant admin from the client or through a public endpoint. Keep an audit trail of claim changes.
8. Do not advertise the 16% IVA breakdown as tax advice; have Mexican tax counsel/accounting confirm the tax base, seller-of-record and CFDI obligations.

## End-to-end acceptance checklist
- Unauthenticated order creation is rejected.
- A user cannot read or report another user's order.
- The client cannot write paymentOrders, entitlements, notifications or auditLogs directly.
- Creating an order does not activate a plan.
- Reporting a transfer only creates a review queue entry.
- Approval without bank confirmation or a real bank transaction ID is rejected.
- Wrong admin claim is rejected.
- The same bank transaction ID cannot approve two orders.
- A valid admin approval grants exactly one entitlement and writes an audit record.
- A second approval attempt is rejected and cannot extend expiry.
- Scheduled lifecycle expires terms and creates a single reminder within 72 hours.
- Expired orders stop accepting transfer reports.
- Creator checkout fails closed while provider/payout setup is absent.
- Verify refunds, chargebacks, duplicate webhook events, time zones, retries, App Check, rate limits, and rules using staging data before real deposits.

## Known limits
- The current admin queue is connected to SPEI cases; identity and support review endpoints are still not implemented.
- In-app notifications are stored in Firestore. Push notifications while the app is closed are not configured.
- The bank confirmation is manual. No bank API/SPEI automatic reconciliation is integrated.
- Creator subscriptions, creator media paywalls, earnings ledger, tax onboarding and payouts are not live.
- Event listing quota consumption and event attendee capacity still need server-side endpoints before those products are sold.
- No successful deployment is claimed until Firebase deployment and the CI build both pass.
