# AppSwinger — release checklist

## Implemented in this branch
- Capacitor configuration with permanent package ID `com.appswinger.app`.
- CI job for web type-check/build/tests and an installable **debug** APK artifact.
- Firebase Functions source for authenticated Didit session creation, signed webhook processing, reports, blocks, and user notification preferences.
- Demo SPEI image and payment UI that explicitly keeps paid access disabled.
- Prime/Gold base prices for Mexico changed to MXN $350 / $500; IVA calculation is displayed separately.

## Must be configured before deploy
1. In Firebase Console, select the exact Firebase project used by `firebase-applet-config.json`; deploy Functions only after confirming that project and reviewing existing Firestore data/rules.
2. Set Functions parameters/secrets:
   - `DIDIT_API_KEY` — secret, never a Vite `VITE_*` variable.
   - `DIDIT_WEBHOOK_SECRET` — signing secret from the Didit webhook destination.
   - `DIDIT_WORKFLOW_ID` — published workflow ID that checks identity AND confirms the user is an adult under the product's age policy.
   - `APPSWINGER_PUBLIC_URL` — canonical HTTPS URL for callbacks.
3. Configure a Didit v3 webhook destination for `status.updated`, point it to the deployed `diditVerificationWebhook` URL, and test signature validation with Didit's test webhook before production. Verify the exact current signature scheme against the active Didit app.
4. Review whether the existing published workflow includes reliable adult-age assurance. The currently recorded “AppSwinger INE + Rostro Económico” workflow was reported without age-assurance metadata; do not treat identity approval alone as proof of adult age until the workflow is corrected and tested.
5. Add and review Firestore Security Rules. Client users must not write their own `verificationStatus`, admin role, paid membership, payment approval, moderation outcome, or audit log. Callable functions must be the only path for sensitive transitions.
6. Wire the report and block callables into the current ChatView. The existing chat is partly mock/local state; adding server endpoints alone does not make existing mock conversations persistent or enforce blocks server-side.
7. Wire `updateTrustPreferences` to a user settings UI and load preferences on sign-in. The endpoint supports sound on/off, muted user IDs, and auto-delete periods (0, 7, 30, 90 days), but retention cleanup must be implemented by a scheduled trusted backend job before claiming server-side automatic deletion.
8. SPEI: configure the verified beneficiary and order-generation backend. The current UI intentionally shows placeholders only. A reference alone is not enough to prove payment. Do not use automated scraping of the Banxico portal; use an authorized/validated data source if available, otherwise queue an admin manual CEP review. Add duplicate prevention, order expiry, retries, immutable audit logs, and transactional membership activation.
9. Configure actual push delivery (Firebase Cloud Messaging), Android notification channel/sound, token registration, opt-out, and delivery tests. Browser notification permission is not push delivery.
10. Android release signing requires an owner-controlled keystore and protected CI secrets (for example `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`). Never commit the keystore. The CI debug APK is not a Play Store/release-signed APK.
11. Run end-to-end tests on real Android devices and web browsers, including auth/session continuity, Didit approve/decline/review, invalid/replayed webhook, payment mismatch/duplicate/timeout, admin access, report/block, notification settings, and data deletion.
12. Get legal/privacy and Mexican tax review for identity data retention, adult verification, IVA/CFDI, refunds, and the exact SPEI operating model.

## Release safety
- Production charges remain disabled until payment verification is independently tested and the owner explicitly approves enabling them.
- Do not display any bank destination until it is confirmed by the account owner.
- Do not say the APK is release-signed or deployed until the corresponding artifact/deployment is confirmed.
