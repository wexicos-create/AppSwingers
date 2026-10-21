import React from 'react';
import { X, ShieldCheck, Flag, Ban, EyeOff, MapPin, LockKeyhole, ExternalLink } from 'lucide-react';

type SafetyCenterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  isEs: boolean;
  onOpenChat: () => void;
  onOpenLegal: () => void;
};

export function SafetyCenterModal({ isOpen, onClose, isEs, onOpenChat, onOpenLegal }: SafetyCenterModalProps) {
  if (!isOpen) return null;
  const cards = isEs ? [
    { icon: Flag, title: 'Denunciar una cuenta', body: 'Abre Mensajes, entra a la conversación y usa la opción de reporte. El reporte se registra en el backend cuando la sesión y los permisos están activos.' },
    { icon: Ban, title: 'Bloquear a alguien', body: 'Desde la conversación usa Bloquear. El bloqueo debe persistir en tu cuenta y evitar futuros contactos; si falla la conexión, no asumas que se guardó.' },
    { icon: MapPin, title: 'Cuida tu ubicación', body: 'Comparte solo ciudad o zona aproximada. No publiques domicilio, hotel, placas, trabajo ni ubicaciones en tiempo real.' },
    { icon: EyeOff, title: 'Consentimiento y privacidad', body: 'El consentimiento debe ser explícito, libre y reversible. Puedes cambiar de opinión en cualquier momento; no compartas capturas o contenido íntimo sin permiso.' },
  ] : [
    { icon: Flag, title: 'Report an account', body: 'Open Messages, enter the conversation and use Report. Reports are saved by the backend when your session and permissions are active.' },
    { icon: Ban, title: 'Block someone', body: 'Use Block from the conversation. Blocking should persist and prevent future contact; if the connection fails, do not assume it was saved.' },
    { icon: MapPin, title: 'Protect your location', body: 'Share only a city or approximate area. Avoid home, hotel, license plate, workplace and live-location details.' },
    { icon: EyeOff, title: 'Consent and privacy', body: 'Consent must be explicit, freely given and reversible. Anyone can change their mind; never share intimate content without permission.' },
  ];
  return <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-xl flex justify-center p-3 sm:p-5 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="safety-title">
    <section className="w-full max-w-lg my-auto rounded-3xl border border-purple-400/30 bg-[#10061e] text-white shadow-2xl overflow-hidden">
      <header className="flex items-center justify-between p-5 border-b border-purple-400/20">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-500/15 p-2 text-emerald-300"><ShieldCheck className="w-6 h-6"/></span><div><h2 id="safety-title" className="font-bold text-lg">{isEs ? 'Centro de seguridad' : 'Safety center'}</h2><p className="text-xs text-purple-200/70">{isEs ? 'Control, consentimiento y protección' : 'Control, consent and protection'}</p></div></div>
        <button onClick={onClose} aria-label={isEs ? 'Cerrar' : 'Close'} className="p-2 rounded-full hover:bg-white/10"><X className="w-5 h-5"/></button>
      </header>
      <div className="p-5 space-y-3">
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
          <p className="font-semibold text-emerald-200">{isEs ? 'Regla de seguridad' : 'Safety rule'}</p>
          <p className="mt-1 text-sm text-white/80">{isEs ? 'Solo personas adultas. Nunca envíes dinero a desconocidos ni aceptes presión, amenazas, extorsión o encuentros sin consentimiento claro.' : 'Adults only. Never send money to strangers or accept pressure, threats, extortion or meetings without clear consent.'}</p>
        </div>
        {cards.map(({icon: Icon, title, body}) => <article key={title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5"><Icon className="w-5 h-5 text-pink-300 shrink-0 mt-0.5"/><div><h3 className="font-semibold text-sm">{title}</h3><p className="text-xs leading-relaxed text-white/65 mt-1">{body}</p></div></article>)}
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-3.5 text-xs text-amber-100/90"><LockKeyhole className="inline w-4 h-4 mr-1.5 align-text-bottom"/>{isEs ? 'Si existe peligro inmediato, aléjate y contacta los servicios de emergencia locales. AppSwinger no sustituye a las autoridades ni garantiza la seguridad física de un encuentro.' : 'If there is immediate danger, leave and contact local emergency services. AppSwinger cannot replace authorities or guarantee physical safety at a meeting.'}</div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button onClick={() => { onClose(); onOpenChat(); }} className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 p-3 text-sm font-bold">{isEs ? 'Abrir Mensajes' : 'Open Messages'}</button>
          <button onClick={() => { onClose(); onOpenLegal(); }} className="rounded-xl border border-purple-400/30 bg-white/5 p-3 text-sm font-bold flex items-center justify-center gap-1.5">{isEs ? 'Privacidad y reglas' : 'Privacy & rules'} <ExternalLink className="w-3.5 h-3.5"/></button>
        </div>
      </div>
    </section>
  </div>;
}
