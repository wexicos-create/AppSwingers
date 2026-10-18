/**
 * AppSwinger — Mexico-only tax helpers.
 *
 * The platform's own membership/publication service is calculated separately
 * from money collected directly by an event organizer from attendees.
 * This is an operational ledger helper, not tax advice or a substitute for CFDI/accountant review.
 */
export const MX_IVA_RATE = 0.16;

export type TaxBreakdown = {
  currency: 'MXN';
  netAmount: number;
  ivaRate: number;
  ivaAmount: number;
  totalAmount: number;
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateMexicanIva(netAmount: number, ivaRate = MX_IVA_RATE): TaxBreakdown {
  if (!Number.isFinite(netAmount) || netAmount < 0) {
    throw new RangeError('El importe debe ser un número válido mayor o igual a cero.');
  }
  if (!Number.isFinite(ivaRate) || ivaRate < 0 || ivaRate > 1) {
    throw new RangeError('La tasa de IVA debe expresarse entre 0 y 1.');
  }
  const net = money(netAmount);
  const iva = money(net * ivaRate);
  return {
    currency: 'MXN',
    netAmount: net,
    ivaRate,
    ivaAmount: iva,
    totalAmount: money(net + iva),
  };
}

/** Prices agreed for AppSwinger. Amounts are pre-IVA unless marked otherwise. */
export const APPSWINGER_PRICING_MXN = {
  primeVelvet: { netAmount: 329, durationDays: 15 },
  blackGoldVipElite: { netAmount: 549, durationDays: 30 },
  ultraPlus: { netAmount: 599, durationDays: 30 },
  agencyCreatorFourEvents: { netAmount: 2500, durationDays: 30, eventCount: 4, maxApplicationsPerEvent: 25 },
} as const;

/**
 * Event admission money is collected in cash by the agency at the event,
 * not by AppSwinger. Never record that cash as platform sales. Track it as
 * organizer-reported activity pending accountant review. Do not invent/auto-
 * withhold ISR or assert AppSwinger files the organizer's taxes without a
 * confirmed legal/accounting workflow.
 */
export type OrganizerEventSettlement = {
  collectedBy: 'organizer_cash';
  platformRevenue: 0;
  taxStatus: 'organizer_accountant_review_required';
  attendeesReported: number;
  reportedGrossMxN: number;
};

export function recordOrganizerCashEvent(attendeesReported: number, pricePerAttendee: number): OrganizerEventSettlement {
  if (!Number.isInteger(attendeesReported) || attendeesReported < 0) {
    throw new RangeError('El número de asistentes debe ser un entero no negativo.');
  }
  if (!Number.isFinite(pricePerAttendee) || pricePerAttendee < 0) {
    throw new RangeError('El precio por asistente debe ser válido.');
  }
  return {
    collectedBy: 'organizer_cash',
    platformRevenue: 0,
    taxStatus: 'organizer_accountant_review_required',
    attendeesReported,
    reportedGrossMxN: money(attendeesReported * pricePerAttendee),
  };
}
