export type PaidBenefitKey = 'vip_plus' | 'ultra_vip' | 'event_listing' | 'featured_campaign' | 'profile_boost' | 'host_tools';

export interface BenefitDefinition { key: PaidBenefitKey; label: string; subtotalMxn: number; vatRate: number; durationDays?: number; includedEvents?: number; maxGuests?: number; }

export const BENEFIT_CATALOG: Record<PaidBenefitKey, BenefitDefinition> = {
  vip_plus: { key: 'vip_plus', label: 'VIP Plus', subtotalMxn: 350, vatRate: 0.16, durationDays: 10 },
  ultra_vip: { key: 'ultra_vip', label: 'Ultra VIP', subtotalMxn: 650, vatRate: 0.16, durationDays: 20 },
  event_listing: { key: 'event_listing', label: 'Publicación de evento', subtotalMxn: 1500, vatRate: 0.16, maxGuests: 40 },
  featured_campaign: { key: 'featured_campaign', label: 'Campaña destacada', subtotalMxn: 2500, vatRate: 0.16, maxGuests: 40 },
  profile_boost: { key: 'profile_boost', label: 'Impulso de perfil', subtotalMxn: 300, vatRate: 0.16, durationDays: 15 },
  host_tools: { key: 'host_tools', label: 'Herramientas para anfitriones', subtotalMxn: 1500, vatRate: 0.16, includedEvents: 2, maxGuests: 40 },
};

export const moneyBreakdown = (subtotalMxn: number, vatRate = 0.16) => {
  const vatMxn = Math.round(subtotalMxn * vatRate * 100) / 100;
  return { subtotalMxn, vatMxn, totalMxn: Math.round((subtotalMxn + vatMxn) * 100) / 100 };
};

export interface ApprovedEntitlement { userId: string; benefitKey: PaidBenefitKey; status: 'active' | 'expired' | 'revoked'; paymentStatus: 'pending' | 'approved' | 'rejected'; activatedAt: string | number | Date; expiresAt?: string | number | Date | null; approvalReference?: string; }

export const toMillis = (value: ApprovedEntitlement['activatedAt'] | ApprovedEntitlement['expiresAt']): number | null => {
  if (value == null) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value < 1e12 ? value * 1000 : value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const entitlementState = (entitlement: ApprovedEntitlement, now = Date.now()) => {
  const activatedAt = toMillis(entitlement.activatedAt);
  const expiresAt = toMillis(entitlement.expiresAt);
  const approved = entitlement.paymentStatus === 'approved' && entitlement.status === 'active';
  const expired = expiresAt !== null && now >= expiresAt;
  const daysRemaining = expiresAt === null ? null : Math.ceil((expiresAt - now) / 86400000);
  return { approved, expired, active: approved && !expired && activatedAt !== null, expiresAt, daysRemaining, shouldNotify: approved && !expired && daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3 };
};
