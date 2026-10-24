import React from 'react';
import { X, ShieldCheck, Car } from 'lucide-react';

interface SafetyTipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEs: boolean;
  onRequestUberSafe?: () => void;
}

const TIPS = {
  es: [
    'Primera reunión siempre en un lugar público (café, lobby de hotel) y, de ser posible, de día.',
    'Avisa a una persona de confianza dónde estarás, con quién y a qué hora regresas.',
    'Usa protección en todo momento: el preservativo y la higiene son obligatorios para prevenir infecciones.',
    'Acuerda límites claros por chat antes del encuentro. El consentimiento puede retirarse en cualquier momento: No es no.',
    'No compartas datos financieros, domicilios exactos ni aceptes cobros sorpresa.',
    'Comparte tu ubicación en tiempo real solo con perfiles verificados y desactívala al terminar.',
    'Si sientes peligro en un chat, usa el botón SOS (6 toques rápidos): envía una alerta real con tu ubicación al Administrador para un reporte a la policía.',
    'Mujeres: si es de noche y necesitas trasladarte, solicita el Uber Privado de Seguridad de la plataforma (9 PM a 12 AM).',
  ],
  en: [
    'First meetings always in a public place (coffee shop, hotel lobby) and, when possible, during the day.',
    'Tell a trusted person where you will be, with whom, and when you return.',
    'Use protection at all times: condoms and hygiene are mandatory to prevent infections.',
    'Agree on clear limits by chat before meeting. Consent can be withdrawn at any moment: no means no.',
    'Never share financial data, exact home addresses, or accept surprise charges.',
    'Share your real-time location only with verified profiles and turn it off afterwards.',
    'If you feel in danger in a chat, use the SOS button (6 quick taps): it sends a real alert with your location to the administrator for a police report.',
    'Women: at night, request the platform Private Safety Uber (9 PM to 12 AM).',
  ],
};

export function SafetyTipsModal({ isOpen, onClose, isEs, onRequestUberSafe }: SafetyTipsModalProps) {
  if (!isOpen) return null;
  const tips = isEs ? TIPS.es : TIPS.en;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl overflow-y-auto">
      <div className="w-full max-w-md my-auto max-h-[92vh] overflow-y-auto rounded-[32px] bg-[#0a1420] border border-emerald-500/40 p-5 shadow-[0_0_50px_rgba(16,185,129,0.25)] text-white space-y-4">

        <div className="flex items-start justify-between border-b border-emerald-500/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-sky-600 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white leading-tight">
                {isEs ? 'Consejos de Seguridad e Higiene' : 'Safety & Hygiene Tips'}
              </h2>
              <p className="text-[10px] text-emerald-200/70">
                {isEs ? 'Recomendaciones oficiales de la plataforma para encuentros' : 'Official platform recommendations for encounters'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {tips.map((t, i) => (
            <div key={i} className="p-3 rounded-2xl bg-black/40 border border-emerald-500/20 text-[11px] text-emerald-50/90 leading-relaxed flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>

        {onRequestUberSafe && (
          <button
            type="button"
            onClick={() => { onClose(); onRequestUberSafe(); }}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-pink-500 text-black text-xs font-black shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Car className="w-4 h-4" />
            {isEs ? 'Solicitar Uber Privado de Seguridad' : 'Request Private Safety Uber'}
          </button>
        )}
      </div>
    </div>
  );
}
