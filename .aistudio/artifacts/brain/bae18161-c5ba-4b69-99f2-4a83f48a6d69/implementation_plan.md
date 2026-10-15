# Implementation Plan - AppSwinguer Ultra Plus Updates

## User Requirements
1. **Community & Discovery Sections**:
   - "Historias y Experiencias" (Stories & Experiences)
   - "Tips y Consejos" (Tips & Advice - moderated)
   - "¿Dónde Buscar?" (Local venue recommendations)
   - "Preguntas Frecuentes" (Educational FAQ)
   - Moderation guidelines (No prostitution/minors/non-consensual illegal content; allowed: consensual sensual/erotic stories, lingerie/bikini content).
2. **Monetization Plans & Pricing**:
   - **Free Plan**: Basic profile, match boost, proposal submission, public events.
   - **Silver Plan**: $408 MXN / 15 days or $100 USD / 15 days. Includes match/proposal boost, 50 swipes/day, advanced filters, ad-free, unlimited chat, exclusive stories.
   - **Gold Plan**: $800 MXN / 1 month or $180 USD / 1 month. Includes permanent profile boost, unlimited swipes, see who liked you, match history, early bird event priority, ad-free, forums with matches or known users.
   - **Sponsored Profiles Advertising**: $1,500 MXN / month or $800 USD / month for clubs/agencies.
   - **Taxes**: 16% tax (IVA) applied to all transactions in both Mexico and USA.
3. **Secure Admin Login**:
   - Restricted admin access: email `jocervantes99@gmail.com`, password `Cervantes99`, secondary PIN `300799`. On first login, allow updating password and PIN.

## Proposed Changes
1. **Types (`src/types.ts`)**:
   - Add subscription plan types (`free`, `silver`, `gold`), story/forum posts, sponsored listings.
2. **Community & Forums Component (`src/components/CommunityView.tsx`)**:
   - Implement sections for "Historias y Experiencias", "Tips y Consejos", "¿Dónde Buscar?", "Preguntas Frecuentes", and "Foros de Matches".
3. **Monetization / Upgrade Modal (`src/components/MonetizationExtrasModal.tsx` or new `SubscriptionModal.tsx`)**:
   - Add Silver ($408 MXN / $100 USD) and Gold ($800 MXN / $180 USD) plans, Sponsored ad tier ($1500 MXN / $800 USD), and 16% tax calculation.
4. **Admin Modal (`src/components/AdminModal.tsx`)**:
   - Implement strict credentials login (`jocervantes99@gmail.com`, `Cervantes99`, PIN `300799`) with first-time credential update functionality.
5. **App.tsx Integration**:
   - Integrate the new Community view into navigation tabs and update subscription state.
