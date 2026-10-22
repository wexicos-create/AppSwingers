import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { BadgeKind } from '../types';

/**
 * Verified badge. Standard (blue) is reserved for content creators, event
 * agencies and coordinators. The gold variant is reserved for socios and
 * admins, and pairs with the AdminStamp seal.
 */
export function VerifiedBadge({ gold = false, size = 16 }: { gold?: boolean; size?: number }) {
  return (
    <span
      className={
        'inline-flex items-center justify-center rounded-full shrink-0 ' +
        (gold
          ? 'bg-amber-400/15 border border-amber-300/60 shadow-[0_0_8px_rgba(251,191,36,0.45)]'
          : 'bg-sky-400/15 border border-sky-300/60 shadow-[0_0_8px_rgba(56,189,248,0.35)]')
      }
      title={gold ? 'Socio / Administrador verificado' : 'Perfil verificado (creadora, agencia o coordinadora)'}
    >
      <BadgeCheck className={gold ? 'text-amber-300' : 'text-sky-300'} style={{ width: size, height: size }} />
    </span>
  );
}

/**
 * Gold rectangular ADMIN seal, rendered next to the name at mid-line height,
 * small size, outline style like a stamp.
 */
export function AdminStamp() {
  return (
    <span
      className="inline-flex items-center px-1.5 py-[1px] rounded-[4px] border-2 border-amber-300 bg-black/40 text-amber-300 text-[8px] font-black tracking-[0.22em] leading-none align-middle select-none shadow-[0_0_10px_rgba(251,191,36,0.4)]"
      style={{ transform: 'rotate(-6deg)' }}
    >
      ADMIN
    </span>
  );
}

/**
 * Renders the badge set for a profile name: the verified badge (blue or gold)
 * and, when the account is an admin, the ADMIN stamp.
 */
export function NameBadges({ badge, admin = false }: { badge?: BadgeKind | null; admin?: boolean }) {
  if (!badge && !admin) return null;
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      {badge && <VerifiedBadge gold={badge === 'oro'} />}
      {admin && <AdminStamp />}
    </span>
  );
}
