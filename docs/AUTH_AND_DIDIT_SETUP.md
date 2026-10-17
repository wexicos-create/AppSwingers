# AppSwinger authentication and identity verification rollout

## Account access included in this branch

- Email/password registration and login using the existing Firebase Authentication project.
- Minimum password length of 8 characters.
- Email verification message after registration.
- Password recovery by email. The app does not ask for or collect a recovery phone number.
- Required acceptance of Terms and Privacy Notice.
- Separate, optional and unchecked-by-default consent to receive product/news emails. The preference and consent timestamp are saved to the signed-in user's Firestore profile.
- Google sign-in remains available as an alternative.
- User-facing errors avoid displaying raw Firebase exception details.

## Firebase Console setup required

1. Open Firebase Console for the project referenced by `firebase-applet-config.json`.
2. Authentication → Sign-in method → enable **Email/Password** and keep Google enabled if desired.
3. Authentication → Settings → Authorized domains: add the actual production domain and any approved preview domain.
4. Authentication → Templates: configure the email verification and password reset templates, sender name, and action URLs.
5. Test registration, verification, login, wrong-password handling, and password recovery before production.
6. Review Firestore rules for `users/{uid}`: an authenticated user should only read/write their own profile. Newsletter preference must not be treated as permission to send marketing unless the checkbox was selected.

## Didit identity verification: code added; activation/configuration still required

The app's Firebase login is separate from identity verification. Do not mark a profile verified based on a browser redirect or a client-side result.

This branch now includes a Vercel serverless session endpoint (`/api/identity/session`), a signed webhook receiver (`/api/identity/webhook`), and a profile UI that displays the server-confirmed state. It also blocks client-side writes to `identityVerification` in Firestore rules. This is code integration, not yet a live/validated production connection. Configure these server-only values:

- `DIDIT_API_KEY`
- `DIDIT_WORKFLOW_ID`
- `DIDIT_WEBHOOK_SECRET` (the signing secret from the Didit webhook destination)
- `DIDIT_WEBHOOK_URL` (the deployed HTTPS URL ending in `/api/identity/webhook`)
- `FIREBASE_SERVICE_ACCOUNT_JSON` (Firebase service account JSON, stored only in the hosting secret manager)
- A public HTTPS callback URL

The server must authenticate the Firebase user before creating a Didit session, set `vendor_data` to that user's stable Firebase UID, and return only the hosted session URL to the browser. The API key and webhook secret must never be bundled into Vite client variables or committed to Git.

The webhook validates Didit's `X-Signature-V2` HMAC signature, deduplicates events, rejects stale sessions, and updates the user's verification status only after a signed callback. Verify the signature implementation against Didit's current official test vectors before production. Keep statuses such as pending, in review, approved, declined, and expired distinct. Do not expose ID images or biometric results in public profile documents.

## Production checklist

- Enable and test Firebase email/password in the project console.
- Configure custom sender domain and email templates if needed.
- Configure and publish a Didit workflow that explicitly supports Mexican INE/document verification, OCR/document validation, passive liveness, and face match; confirm Mexican INE is enabled for the chosen workflow. Copy its workflow ID and configure the webhook URL/secret.
- Add the three Didit secrets to the hosting/backend secret manager, not to source code.
- Deploy and test the session endpoint and signed webhook.
- Test approved, declined, in-review, expired, duplicate-webhook, and invalid-signature cases.
- Add consent text and retention/deletion rules for identity and biometric data before launch.


## Remaining login decision

The current AuthModal uses Firebase email/password and email-based password reset. Firebase's built-in phone provider is OTP-based, not phone-plus-password; switching to phone/password with WhatsApp recovery requires a separate secure backend and an approved WhatsApp Business API provider. Do not claim that phone/password or WhatsApp recovery is live until that service is implemented and tested.
