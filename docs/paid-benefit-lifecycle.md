# Paid benefits lifecycle (AppSwinger)

## Price catalog (Mexico, 16% IVA)
All totals are calculated from the stated subtotal plus 16% IVA. Tax/accounting treatment should be confirmed by the platform's accountant before launch.

| Benefit | Subtotal | IVA | Total | Term / scope |
|---|---:|---:|---:|---|
| VIP Plus | $350 | $56 | $406 | 10 days |
| Ultra VIP | $650 | $104 | $754 | 20 days |
| Event listing | $1,500 | $240 | $1,740 | One publication; max 40 guests |
| Featured campaign | $2,500 | $400 | $2,900 | One campaign; max 40 guests |
| Profile boost | $300 | $48 | $348 | 15 days |
| Host tools | $1,500 | $240 | $1,740 | Two event publications; max 40 guests each |
| Event admission | $500–$1,200 | $80–$192 | $580–$1,392 | Organizer chooses per person or per couple; optional women's discount |

## Approval and activation rules
1. A payment submission creates a pending payment record only. Client-side code and uploaded screenshots must never grant a paid entitlement.
2. An authorized administrator reconciles the SPEI deposit against the bank account and records approved or rejected with reviewer, timestamp, bank reference, amount and audit trail.
3. A trusted server transaction creates/updates subscriptions/{uid} only after approval. Suggested schema: userId (authenticated UID), benefitKey (from src/lib/benefitLifecycle.ts), paymentStatus approved, status active, activatedAt (server timestamp at approval), expiresAt (activatedAt + durationDays), approvalReference, reviewedBy and reviewedAt.
4. VIP Plus expires 10 days after activatedAt; Ultra VIP after 20 days; profile boost after 15 days. At or after expiresAt, the trusted backend must deny/revoke gated operations even if the client remains open. The client-side timer is informational only.
5. Show an in-app reminder when 3 days or less remain. To notify while the app is closed, configure scheduled server jobs plus FCM/web-push tokens and user permission; the current repository does not yet contain that delivery service.
6. VIP Plus benefits: advanced filters, priority discovery and personal activity insights, with a limit of 15 proposal applications per rolling week.
7. Ultra VIP benefits: all VIP Plus features, unlimited proposal applications while active, more filters and saved preferences.
8. Paid access to gated features must be checked on trusted APIs/Firestore rules, not only by hiding UI. The existing project does not yet have SPEI reconciliation/admin review endpoints or server-side entitlement enforcement, so this catalog and status UI do not constitute production payment activation.
9. Event admission prices must be displayed as either per person or per couple; any women's discount must be an explicit price rule shown before booking. Maximum event capacity is 40 guests.
