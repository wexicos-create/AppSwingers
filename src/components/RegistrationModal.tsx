import React, { useState } from 'react';
import { ProfileKind, AppRegion } from '../types';
import { 
  X, 
  Users, 
  User, 
  Heart, 
  Flame, 
  MapPin, 
  Check, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  SlidersHorizontal,
  Navigation
} from 'lucide-react';

export const GUSTOS_SEXUALES_FANTASIAS = [
  'Swinger',
  'Intercambio suave',
  'Intercambio completo',
  'Tríos HMH',
  'Tríos MHM',
  'Gangbang',
  'Encuentros casuales',
  'Encuentros informales',
  'Solo mirar',
  'Hotwife',
  'Exhibicionismo',
  'Fiestas privadas',
  'Antifaz',
  'BDSM suave',
  'Primera vez'
];

export const BUSCO_OPCIONES = ['Parejas', 'Mujeres', 'Hombres', 'Grupos'];

export const EDAD_OPCIONES = ['Colágeno 18–25', '26–39', 'Madura / maduro 40+'];

interface UserProfileData {
  alias: string;
  kind: ProfileKind;
  bio: string;
  interests: string[]; // gustos sexuales y fantasías
  seeking: string[];
  ages: string[];
  maxKm: number;
  locationCity?: string;
}

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'es' | 'en';
  region: AppRegion;
  initialData?: Partial<UserProfileData>;
  onSave: (data: UserProfileData) => void;
  onRequestLocation: () => void;
  locationGranted?: boolean;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  lang,
  region,
  initialData,
  onSave,
  onRequestLocation,
  locationGranted = false,
}) => {
  const isEs = lang === 'es';

  // Form states
  const [kind, setKind] = useState<ProfileKind>(initialData?.kind || 'Pareja');
  const [alias, setAlias] = useState(initialData?.alias || '');
  const [bio, setBio] = useState(initialData?.bio || '');
  const [interests, setInterests] = useState<string[]>(
    initialData?.interests || ['Swinger', 'Fiestas privadas', 'Intercambio suave']
  );
  const [seeking, setSeeking] = useState<string[]>(
    initialData?.seeking || ['Parejas', 'Mujeres']
  );
  const [ages, setAges] = useState<string[]>(
    initialData?.ages || ['26–39']
  );
  const [maxKm, setMaxKm] = useState<number>(initialData?.maxKm || 25);
  const [city, setCity] = useState(
    initialData?.locationCity || (region === 'MX' ? 'San Luis Potosí, SLP' : 'Houston, TX')
  );
  const [acceptedConsent, setAcceptedConsent] = useState(false);

  if (!isOpen) return null;

  const toggleInterest = (item: string) => {
    setInterests(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const toggleSeeking = (item: string) => {
    setSeeking(prev => 
      prev.includes(item) ? prev.filter(s => s !== item) : [...prev, item]
    );
  };

  const toggleAge = (item: string) => {
    setAges(prev => 
      prev.includes(item) ? prev.filter(a => a !== item) : [...prev, item]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alias.trim()) return;

    onSave({
      alias: alias.trim(),
      kind,
      bio: bio.trim(),
      interests,
      seeking,
      ages,
      maxKm,
      locationCity: city.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-2xl overflow-y-auto">
      <div className="w-full max-w-lg my-auto max-h-[92vh] overflow-y-auto rounded-[36px] bg-[#10061e] border border-violet-500/40 p-5 sm:p-6 shadow-[0_0_60px_rgba(177,76,255,0.4)] text-white space-y-4 scrollbar-none">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-violet-500/20 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-fuchsia-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-300">
                {isEs ? 'Registro & Perfil' : 'Registration & Profile'} &bull; AppSwinguer Ultra
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              {isEs ? 'Configura tu Perfil y Fantasías' : 'Set Up Your Profile & Fantasies'}
            </h2>
            <p className="text-xs text-violet-200/70 mt-0.5">
              {isEs 
                ? 'Pareja o individual, gustos pasionales, radio en KM y ubicación' 
                : 'Couples or singles, passion preferences, KM radius & location'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          
          {/* 1. TIPO DE PERFIL: PAREJA O INDIVIDUAL */}
          <div>
            <label className="text-white/80 font-bold block mb-1.5 uppercase text-[11px] tracking-wider">
              {isEs ? '1. Tipo de Perfil' : '1. Profile Type'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Pareja', label: isEs ? 'Pareja' : 'Couple', icon: Users, desc: isEs ? 'Ambos de acuerdo' : 'Both consenting' },
                { id: 'Dama', label: isEs ? 'Dama' : 'Single Female', icon: Heart, desc: isEs ? 'Mujer liberal' : 'Solo woman' },
                { id: 'Caballero', label: isEs ? 'Caballero' : 'Single Male', icon: User, desc: isEs ? 'Hombre selecto' : 'Solo man' },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setKind(item.id as ProfileKind)}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1 ${
                    kind === item.id
                      ? 'bg-violet-900/60 border-fuchsia-400 text-white shadow-[0_0_15px_rgba(255,45,120,0.4)]'
                      : 'bg-neutral-950/70 border-white/10 text-white/60 hover:border-white/20'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${kind === item.id ? 'text-fuchsia-400' : 'text-violet-300'}`} />
                  <span className="font-bold text-xs text-white">{item.label}</span>
                  <span className="text-[9px] text-violet-200/60">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. NOMBRE O ALIAS */}
          <div>
            <label className="text-white/80 font-bold block mb-1 uppercase text-[11px] tracking-wider">
              {isEs ? '2. Tu Nombre o Alias' : '2. Name or Alias'}
            </label>
            <input
              type="text"
              required
              value={alias}
              onChange={(e) => setAlias(e.target.value.slice(0, 30))}
              placeholder={kind === 'Pareja' ? (isEs ? 'Ej. Marina & Leo' : 'Ex. Alex & Mia') : (isEs ? 'Ej. Valeria' : 'Ex. Sophia')}
              className="w-full p-3 rounded-2xl bg-neutral-950/80 border border-violet-500/30 text-white text-xs focus:outline-none focus:border-fuchsia-400"
            />
            <span className="text-[10px] text-white/40 mt-0.5 block">
              {isEs ? 'Tu nombre legal nunca se expone a otros usuarios.' : 'Your real legal identity is kept discreet.'}
            </span>
          </div>

          {/* 3. GUSTOS SEXUALES O FANTASÍAS (CHIPS) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-white/80 font-bold uppercase text-[11px] tracking-wider">
                {isEs ? '3. Gustos Sexuales o Fantasías' : '3. Sexual Preferences & Fantasies'}
              </label>
              <span className="text-fuchsia-400 font-bold text-[10px]">
                {interests.length} {isEs ? 'seleccionados' : 'selected'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 rounded-2xl bg-neutral-950/60 border border-white/5 scrollbar-none">
              {GUSTOS_SEXUALES_FANTASIAS.map(f => {
                const isSelected = interests.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleInterest(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1 active:scale-95 ${
                      isSelected
                        ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md'
                        : 'bg-white/5 text-violet-200/70 border border-white/10 hover:border-violet-400/40'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    <span>{f}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. BUSCO Y RANGO DE EDADES */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/80 font-bold block mb-1 uppercase text-[10px] tracking-wider">
                {isEs ? 'Busco' : 'Looking for'}
              </label>
              <div className="flex flex-wrap gap-1">
                {BUSCO_OPCIONES.map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleSeeking(b)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition ${
                      seeking.includes(b)
                        ? 'bg-fuchsia-600 text-white font-bold'
                        : 'bg-neutral-950 border border-white/10 text-white/60'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-white/80 font-bold block mb-1 uppercase text-[10px] tracking-wider">
                {isEs ? 'Edades' : 'Ages'}
              </label>
              <div className="flex flex-wrap gap-1">
                {EDAD_OPCIONES.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAge(a)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-medium transition ${
                      ages.includes(a)
                        ? 'bg-violet-600 text-white font-bold'
                        : 'bg-neutral-950 border border-white/10 text-white/60'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. RADIO DE DISTANCIA EN KM */}
          <div className="p-3.5 rounded-2xl bg-neutral-950/70 border border-violet-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                <SlidersHorizontal className="w-4 h-4 text-violet-400" />
                {isEs ? 'Radio de Búsqueda de Resultados' : 'Search Distance Radius'}
              </span>
              <span className="font-extrabold text-fuchsia-400 text-sm">{maxKm} km</span>
            </div>

            <input
              type="range"
              min="2"
              max="100"
              value={maxKm}
              onChange={(e) => setMaxKm(Number(e.target.value))}
              className="w-full accent-fuchsia-500 h-2 bg-neutral-800 rounded-lg cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-white/40">
              <span>2 km ({isEs ? 'Mismo barrio' : 'Nearby'})</span>
              <span>25 km (San Luis Potosí)</span>
              <span>100 km ({isEs ? 'Región' : 'Regional'})</span>
            </div>
          </div>

          {/* 6. PERMISO DE UBICACIÓN & CIUDAD */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-violet-950/60 via-fuchsia-950/40 to-violet-950/60 border border-violet-400/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Navigation className="w-5 h-5 text-fuchsia-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">
                  {locationGranted ? (isEs ? 'Ubicación GPS Conectada' : 'GPS Location Active') : (isEs ? 'Permitir Ubicación para KM' : 'Enable Location for KM')}
                </span>
                <span className="text-[10px] text-violet-200/70 block">
                  {isEs 
                    ? `Zona: ${city} (SLP / CDMX)` 
                    : `Zone: ${city}`}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onRequestLocation}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                locationGranted
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-400/40'
                  : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md active:scale-95'
              }`}
            >
              {locationGranted ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
              <span>{locationGranted ? (isEs ? 'Activo' : 'Active') : (isEs ? 'Activar GPS' : 'Enable GPS')}</span>
            </button>
          </div>

          {/* Bio / Reglas de convivencia */}
          <div>
            <label className="text-white/80 font-bold block mb-1 uppercase text-[10px] tracking-wider">
              {isEs ? 'Biografía y Reglas del Perfil' : 'Bio & Personal Rules'}
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              placeholder={isEs ? 'Qué buscan y cuáles son sus reglas claras...' : 'What you are looking for and your rules...'}
              className="w-full p-2.5 rounded-xl bg-neutral-950/80 border border-violet-500/30 text-white text-xs focus:outline-none resize-none"
            />
          </div>

          {/* Consent Checkbox */}
          <label className="flex items-start gap-2 text-[11px] text-violet-200/80 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={acceptedConsent}
              onChange={(e) => setAcceptedConsent(e.target.checked)}
              className="mt-0.5 rounded accent-fuchsia-500"
            />
            <span>
              {isEs 
                ? 'Confirmo mayoría de edad (18+), consentimiento mutuo y aceptación de las reglas de respeto y confidencialidad.' 
                : 'I confirm legal age (18+), mutual consent, and agree to the rules of respect and privacy.'}
            </span>
          </label>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!alias.trim() || !acceptedConsent}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 text-white font-extrabold text-sm shadow-xl shadow-violet-600/40 hover:brightness-110 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isEs ? 'Guardar Perfil y Preferencias' : 'Save Profile & Preferences'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
