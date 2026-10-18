# AppSwinger México — Didit

## Secrets (Supabase Edge Functions)
Configure these server-side secrets; never place them in Vite variables or commit them:
- `DIDIT_API_KEY`
- `DIDIT_WORKFLOW_ID`
- `DIDIT_WEBHOOK_SECRET`

The workflow must include the Mexican identity document/INE supported by Didit, liveness, and face match. Confirm the exact document types and webhook signature format in the Didit dashboard before production.

## Deploy
1. Apply the new SQL migration.
2. Deploy `didit-session` and `didit-webhook` Edge Functions.
3. Register the public `didit-webhook` function URL in Didit and configure its signing secret.
4. Test pending, approved, rejected, duplicate webhook, wrong signature, and session/user mismatch.
5. Confirm that an account only becomes discoverable after document/age/face verification and photo-match status are all approved.

No real credentials are included. The functions are code scaffolding and are not active until the secrets, workflow, webhook and end-to-end tests are configured.
