import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Profile, SubscriptionTier, AppRegion, MatchItem } from '../types';
import { fetchUserMatches } from '../firebase';
import { 
  LogOut, 
  LogIn, 
  CheckCircle2, 
  ShieldCheck, 
  Database, 
  Sliders, 
  Heart, 
  Sparkles, 
  Flame, 
  Crown, 
  Gift, 
  Lock, 
  Camera, 
  Image as ImageIcon, 
  Eye, 
  Download, 
  Trash2, 
  FileText,
  SlidersHorizontal,
  Bell,
  Smartphone,
  Check,
  Zap,
  Clock
} from 'lucide-react';

interface ProfileViewProps {
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  stats: {
    swipesCount: number;
    matchesCount: number;
    likesCount: number;
  };
  attendStamps: number;
  redeemedClubFolio: string | null;
  onRedeemClubReward: () => void;
  maxDistance: number;
  onChangeMaxDistance: (val: number) => void;
  isFirestoreConnected: boolean;
  onOpenAdmin: () => void;
  onOpenLegal: () => void;
  onExportData: () => void;
  onWipeData: () => void;
  currentTier?: SubscriptionTier;
  onSelectTier?: (tier: SubscriptionTier) => void;
  weeklyApplicationsUsed?: number;
  weeklyApplicationsLimit?: number;
  region?: AppRegion;
  isEs?: boolean;
  onOpenExtrasModal?: () => void;
  matches?: MatchItem[];
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onSignIn,
  onSignOut,
  stats,
  attendStamps,
  redeemedClubFolio,
  onRedeemClubReward,
  maxDistance,
  onChangeMaxDistance,
  isFirestoreConnected,
  onOpenAdmin,
  onOpenLegal,
  onExportData,
  onWipeData,
  currentTier = 'free',
  onSelectTier,
  weeklyApplicationsUsed = 0,
  weeklyApplicationsLimit = 4,
  region = 'MX',
  isEs = true,
  onOpenExtrasModal,
  matches = [],
}) => {
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [discreetNotifs, setDiscreetNotifs] = useState(true);
  const [photosMatchOnly, setPhotosMatchOnly] = useState(true);
  const [hideDistance, setHideDistance] = useState(false);
  const [activePhotoSlot, setActivePhotoSlot] = useState<number | null>(null);
  const [firestoreMatches, setFirestoreMatches] = useState<MatchItem[]>(matches);

  React.useEffect(() => {
    let isMounted = true;
    if (user) {
      fetchUserMatches(user.uid).then(res => {
        if (isMounted && res.length > 0) {
          setFirestoreMatches(res);
        }
      }).catch(err => console.warn('Error fetching Firestore matches in ProfileView:', err));
    } else if (matches.length > 0) {
      setFirestoreMatches(matches);
    }
    return () => { isMounted = false; };
  }, [user, matches]);

  // 9 sample gallery slots
  const [gallery, setGallery] = useState([
    { src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80', vis: 'publica' },
    { src: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80', vis: 'match' },
    { src: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80', vis: 'match' },
  ]);

  return (
    <div className="w-full max-w-md mx-auto p-4 pb-28 text-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">
            Mi Perfil & Club
          </h2>
          <p className="text-xs text-purple-200/70">Identidad, recompensas y privacidad</p>
        </div>

        <button
          onClick={onOpenAdmin}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-900 to-indigo-900 border border-purple-500/40 text-xs font-bold text-pink-300 shadow-md active:scale-95 transition"
        >
          Panel Admin
        </button>
      </div>

      {/* User Hero Card */}
      <div className="relative p-6 rounded-[36px] bg-gradient-to-b from-[#1b0f34] via-[#100720] to-[#080310] border border-purple-500/30 shadow-2xl mb-5 flex flex-col items-center text-center">
        {/* Avatar with glow */}
        <div className="relative mb-3">
          <img
            src={
              user?.photoURL ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'
            }
            alt={user?.displayName || 'Explorador'}
            className="w-24 h-24 rounded-full object-cover border-4 border-purple-500/60 shadow-[0_0_25px_rgba(177,76,255,0.5)]"
          />
          <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-lg">
            <Flame className="w-4 h-4 fill-white" />
          </div>
        </div>

        <h3 className="text-xl font-bold text-white flex items-center gap-1.5">
          {user?.displayName || 'Pareja / Explorador Liberal'}
          <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-400/20" />
        </h3>
        <p className="text-xs text-purple-200/70 mt-0.5">
          {user?.email || 'Nivel de confianza: Verificado en WhatsApp & Google'}
        </p>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-2 w-full mt-5 pt-4 border-t border-white/10">
          <div className="p-2.5 rounded-2xl bg-white/5 flex flex-col items-center">
            <span className="text-lg font-black text-pink-400">{stats.swipesCount}</span>
            <span className="text-[10px] text-white/50">Swipes</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/5 flex flex-col items-center">
            <span className="text-lg font-black text-purple-300">{stats.matchesCount}</span>
            <span className="text-[10px] text-white/50">Matches</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/5 flex flex-col items-center">
            <span className="text-lg font-black text-amber-400">{attendStamps}</span>
            <span className="text-[10px] text-white/50">Sellos Club</span>
          </div>
        </div>
      </div>

      {/* Recently Active Matches Widget with Progress Bars (Firestore Timestamp Integration) */}
      <div className="p-5 rounded-3xl bg-neutral-900/80 border border-purple-500/30 shadow-xl mb-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center">
              <Flame className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                {isEs ? 'Actividad Reciente de Matches' : 'Recently Active Matches'}
              </h3>
              <p className="text-[10px] text-purple-200/70">
                {isEs ? 'Última interacción registrada en Firestore' : 'Last interaction timestamp from Firestore'}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-pink-300 px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40">
            {firestoreMatches.length} {isEs ? 'Activos' : 'Active'}
          </span>
        </div>

        {firestoreMatches.length === 0 ? (
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center text-xs text-purple-200/60">
            {isEs ? 'Aún no tienes matches recientes. ¡Haz swipe para conectar!' : 'No recent matches yet. Swipe to connect!'}
          </div>
        ) : (
          <div className="space-y-3">
            {firestoreMatches.map((m) => {
              const matchTime = new Date(m.matchedAt).getTime();
              const now = Date.now();
              const diffHours = Math.max(0, (now - matchTime) / (1000 * 60 * 60));
              const progress = Math.max(15, Math.min(100, Math.round(100 * (1 - Math.min(diffHours, 168) / 168))));

              return (
                <div key={m.id} className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={m.profile.photos[0] || m.profile.photo}
                          alt={m.profile.name}
                          className="w-10 h-10 rounded-full object-cover border border-purple-500/50"
                        />
                        {m.profile.online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">{m.profile.name}</span>
                        <span className="text-[10px] text-purple-300/80 block truncate">
                          {m.lastMessage || (isEs ? 'Match mutuo establecido' : 'Mutual match established')}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-pink-400 shrink-0">
                      {new Date(m.matchedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Visual Progress Bar for Activity Freshness */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-purple-200/60">
                      <span>{isEs ? 'Nivel de Actividad' : 'Activity Level'}</span>
                      <span className="font-mono text-emerald-400">{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-neutral-900 overflow-hidden border border-white/10">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CLUB DE EXPERIENCIAS (10 Stamps Punch Card from script!) */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-900/60 via-pink-900/30 to-[#100720] border border-pink-500/30 shadow-xl mb-5 space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">Club de Experiencias</h3>
          </div>
          <span className="text-xs font-mono font-black text-amber-300">{attendStamps}/10 Sellos</span>
        </div>

        <p className="text-xs text-purple-200/80 leading-relaxed">
          Cada asistencia validada en puerta suma un sello. Al completar 10 sellos desbloqueas una recompensa VIP de valor definido.
        </p>

        {/* 10 Stamps Circle Grid */}
        <div className="grid grid-cols-5 gap-2.5 py-2">
          {Array.from({ length: 10 }).map((_, i) => {
            const isStamped = i < attendStamps;
            return (
              <div
                key={i}
                className={`aspect-square rounded-2xl flex items-center justify-center font-mono font-bold text-xs transition-all ${
                  isStamped
                    ? 'bg-gradient-to-tr from-pink-600 to-purple-600 text-white shadow-[0_0_12px_rgba(255,45,120,0.7)] scale-105'
                    : 'bg-black/40 border border-white/10 text-white/30'
                }`}
              >
                {isStamped ? '✓' : i + 1}
              </div>
            );
          })}
        </div>

        {redeemedClubFolio ? (
          <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-center">
            <span className="text-[11px] text-emerald-300 uppercase tracking-widest block font-bold">Folio de Canje VIP</span>
            <span className="text-base font-mono font-black text-white">{redeemedClubFolio}</span>
            <span className="text-[10px] text-emerald-300/80 block mt-0.5">Muéstralo en taquilla en tu próximo evento</span>
          </div>
        ) : attendStamps >= 10 ? (
          <button
            onClick={onRedeemClubReward}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-black font-black text-xs shadow-lg shadow-amber-500/30 uppercase tracking-wider active:scale-95 transition"
          >
            Canjear Recompensa VIP
          </button>
        ) : null}
      </div>

      {/* 9-PHOTO GALLERY (From AppSwinguer script!) */}
      <div className="p-5 rounded-3xl bg-neutral-900/70 border border-purple-500/20 mb-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-200">
              Galería Íntima ({gallery.length}/9)
            </h3>
          </div>
          <span className="text-[10px] text-pink-400">Tú decides la visibilidad</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {gallery.map((img, i) => (
            <div
              key={i}
              onClick={() => setActivePhotoSlot(i)}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-purple-500/30 cursor-pointer shadow-md"
            >
              <img src={img.src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                {img.vis === 'match' && <Lock className="w-2.5 h-2.5 text-pink-400" />}
                {img.vis}
              </span>
            </div>
          ))}

          {gallery.length < 9 && (
            <div
              onClick={() => {
                setGallery(prev => [
                  ...prev,
                  { src: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80', vis: 'match' }
                ]);
              }}
              className="aspect-[3/4] rounded-2xl border-2 border-dashed border-purple-500/30 bg-white/5 flex flex-col items-center justify-center text-purple-300 hover:border-pink-500/50 hover:bg-purple-950/20 transition cursor-pointer"
            >
              <Camera className="w-6 h-6 text-pink-400 mb-1" />
              <span className="text-[10px] font-bold">+ Foto</span>
            </div>
          )}
        </div>
      </div>

      {/* PLANES & MEMBRESÍAS: COMPARATIVA SIDE-BY-SIDE (GRATIS, PLUS, ULTRA) */}
      <div className="space-y-3.5 mb-6">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              {isEs ? 'Planes de Acceso & Membresías' : 'Access Plans & Memberships'}
            </h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            {isEs ? 'Transparencia Total' : 'Total Transparency'}
          </span>
        </div>

        {/* Weekly Quota Status Bar */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/70 via-pink-950/50 to-purple-950/70 border border-purple-500/30 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="truncate">
              <span className="text-xs font-bold text-white block">
                {isEs ? 'Cuota semanal de postulaciones' : 'Weekly postulation quota'}
              </span>
              <span className="text-[10px] text-purple-200/80">
                {weeklyApplicationsUsed} / {weeklyApplicationsLimit === Infinity ? (isEs ? 'Ilimitadas' : 'Unlimited') : `${weeklyApplicationsLimit} ${isEs ? 'usadas esta semana' : 'used this week'}`}
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-purple-900/60 border border-purple-400/30 text-[10px] font-mono font-bold text-pink-300 shrink-0">
            {currentTier.toUpperCase()}
          </span>
        </div>

        {/* Side-by-side comparison cards: horizontal snap on mobile, 3-column on larger screens */}
        <div className="flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto pb-2 snap-x snap-mandatory no-scrollbar">
          
          {/* CARD 1: PLAN GRATIS (4 POSTULACIONES / SEMANA) */}
          <div className={`min-w-[240px] sm:min-w-0 flex-1 snap-center p-4 rounded-3xl border flex flex-col justify-between transition-all shadow-xl ${
            currentTier === 'free'
              ? 'bg-gradient-to-b from-neutral-900 via-neutral-950 to-black border-2 border-emerald-500/60 shadow-emerald-950/20'
              : 'bg-neutral-900/60 border-white/10 opacity-90 hover:opacity-100'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  currentTier === 'free' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                    : 'bg-white/10 text-white/70'
                }`}>
                  {currentTier === 'free' ? (isEs ? 'Plan Activo' : 'Active Plan') : (isEs ? 'Básico' : 'Basic')}
                </span>
                <span className="text-sm font-mono font-black text-emerald-400">$0 Gratis</span>
              </div>

              <h4 className="text-base font-black text-white">
                {isEs ? 'Plan Gratis' : 'Free Plan'}
              </h4>
              <p className="text-[11px] text-emerald-300/90 font-semibold mt-0.5">
                {isEs ? 'Máximo 4 postulaciones a la semana' : 'Max 4 applications per week'}
              </p>

              <ul className="space-y-1.5 pt-2.5 mt-2.5 text-[10px] text-neutral-300 border-t border-white/10">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{isEs ? '4 postulaciones a eventos/semana' : '4 event applications/week'}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{isEs ? 'Swipes & Match mutuo en tu radio' : 'Swipes & mutual matches'}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{isEs ? 'Chat ilimitado con tus matches' : 'Unlimited chat with matches'}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{isEs ? 'Privacidad de ubicación (On/Off)' : 'Location privacy toggle'}</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 pt-1">
              <button
                disabled={currentTier === 'free'}
                onClick={() => onSelectTier?.('free')}
                className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                  currentTier === 'free'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                    : 'bg-white/10 hover:bg-white/20 text-white active:scale-95'
                }`}
              >
                {currentTier === 'free' ? '✓ Plan Activo' : (isEs ? 'Seleccionar' : 'Select')}
              </button>
            </div>
          </div>

          {/* CARD 2: SIGUIENTE PLAN - VIP PLUS (15 POSTULACIONES / SEMANA) */}
          <div className={`min-w-[240px] sm:min-w-0 flex-1 snap-center p-4 rounded-3xl border flex flex-col justify-between transition-all shadow-xl ${
            currentTier === 'plus' || currentTier === 'silver'
              ? 'bg-gradient-to-b from-purple-950/80 via-[#150a26] to-black border-2 border-purple-400/80 shadow-purple-900/30'
              : 'bg-neutral-900/70 border-purple-500/30 hover:border-purple-400'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                  {currentTier === 'plus' || currentTier === 'silver' ? (isEs ? 'Plan Activo' : 'Active Plan') : (isEs ? 'Siguiente Plan' : 'Next Tier')}
                </span>
                <span className="text-sm font-mono font-black text-pink-300">
                  {region === 'MX' ? '$199 MXN' : '$12 USD'}
                </span>
              </div>

              <h4 className="text-base font-black text-white flex items-center gap-1">
                <span>VIP Plus</span>
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              </h4>
              <p className="text-[11px] text-pink-300 font-semibold mt-0.5">
                {isEs ? '15 postulaciones a la semana' : '15 applications per week'}
              </p>

              <ul className="space-y-1.5 pt-2.5 mt-2.5 text-[10px] text-neutral-300 border-t border-white/10">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <span>{isEs ? '15 postulaciones a eventos/semana' : '15 event applications/week'}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <span>{isEs ? 'Filtros pasionales avanzados' : 'Advanced passion filters'}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <span>{isEs ? 'Prioridad en solicitudes' : 'Priority in proposals'}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <span>{isEs ? 'Sin límites diarios de swipes' : 'No daily swipe caps'}</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 pt-1">
              <button
                onClick={() => onSelectTier ? onSelectTier('plus') : onOpenExtrasModal?.()}
                className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                  currentTier === 'plus' || currentTier === 'silver'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-400/50 cursor-default'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md active:scale-95 hover:brightness-110'
                }`}
              >
                {currentTier === 'plus' || currentTier === 'silver' ? '✓ Plan Activo' : (isEs ? 'Obtener VIP Plus' : 'Get VIP Plus')}
              </button>
            </div>
          </div>

          {/* CARD 3: ULTRA PLAN (POSTULACIONES ILIMITADAS) */}
          <div className={`min-w-[240px] sm:min-w-0 flex-1 snap-center p-4 rounded-3xl border flex flex-col justify-between transition-all shadow-xl ${
            currentTier === 'ultra' || currentTier === 'gold'
              ? 'bg-gradient-to-b from-[#240e3f] via-[#160829] to-black border-2 border-amber-400 shadow-amber-900/30'
              : 'bg-gradient-to-b from-[#1b0f34]/80 to-[#0e051b] border border-amber-400/40 hover:border-amber-300'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-black text-[9px] font-black uppercase tracking-wider shadow-sm">
                  {currentTier === 'ultra' || currentTier === 'gold' ? (isEs ? 'Plan Activo' : 'Active Plan') : 'Ultra VIP'}
                </span>
                <span className="text-sm font-mono font-black text-amber-300">
                  {region === 'MX' ? '$400 MXN' : '$25 USD'}
                </span>
              </div>

              <h4 className="text-base font-black text-white flex items-center gap-1">
                <span>Ultra Plan</span>
                <Crown className="w-3.5 h-3.5 text-amber-400" />
              </h4>
              <p className="text-[11px] text-amber-300 font-semibold mt-0.5">
                {isEs ? 'Postulaciones ILIMITADAS' : 'UNLIMITED applications'}
              </p>

              <ul className="space-y-1.5 pt-2.5 mt-2.5 text-[10px] text-neutral-300 border-t border-white/10">
                <li className="flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{isEs ? 'Postulaciones ilimitadas 24/7' : 'Unlimited applications 24/7'}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{isEs ? 'Modo incógnito & Ver quién te dio like' : 'Incognito mode & See who liked'}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{isEs ? 'Prioridad en villas privadas' : 'VIP villa priority'}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{isEs ? 'Super Likes y rebobinados libres' : 'Unlimited Super Likes & Rewind'}</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 pt-1">
              <button
                onClick={() => onSelectTier ? onSelectTier('ultra') : onOpenExtrasModal?.()}
                className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                  currentTier === 'ultra' || currentTier === 'gold'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50 cursor-default'
                    : 'bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-black font-black shadow-lg shadow-amber-500/20 active:scale-95 hover:brightness-110'
                }`}
              >
                {currentTier === 'ultra' || currentTier === 'gold' ? '✓ Plan Activo' : (isEs ? 'Activar Ultra Plan' : 'Activate Ultra Plan')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PRIVACIDAD & SEGURIDAD */}
      <div className="p-5 rounded-3xl bg-neutral-900/70 border border-purple-500/20 mb-5 space-y-3.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300">
          Controles de Privacidad
        </h3>

        <div className="flex items-center justify-between py-1">
          <div>
            <span className="text-xs font-bold text-white block">Notificaciones discretas</span>
            <span className="text-[10px] text-white/50">Sin detalles sensibles en pantalla bloqueada</span>
          </div>
          <input
            type="checkbox"
            checked={discreetNotifs}
            onChange={(e) => setDiscreetNotifs(e.target.checked)}
            className="w-5 h-5 accent-pink-500 rounded cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between py-1 border-t border-white/5">
          <div>
            <span className="text-xs font-bold text-white block">Fotos completas solo con Match</span>
            <span className="text-[10px] text-white/50">Protege tu rostro hasta que haya interés mutuo</span>
          </div>
          <input
            type="checkbox"
            checked={photosMatchOnly}
            onChange={(e) => setPhotosMatchOnly(e.target.checked)}
            className="w-5 h-5 accent-pink-500 rounded cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between py-1 border-t border-white/5">
          <div>
            <span className="text-xs font-bold text-white block">Ocultar distancia exacta</span>
            <span className="text-[10px] text-white/50">Calcula compatibilidad sin mostrar kilómetros</span>
          </div>
          <input
            type="checkbox"
            checked={hideDistance}
            onChange={(e) => setHideDistance(e.target.checked)}
            className="w-5 h-5 accent-pink-500 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* DISCOVERY DISTANCE SLIDER */}
      <div className="p-5 rounded-3xl bg-neutral-900/70 border border-purple-500/20 mb-5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white flex items-center gap-1.5">
            <SlidersHorizontal className="w-4 h-4 text-purple-400" />
            Radio de Búsqueda
          </span>
          <span className="font-bold text-pink-400">{maxDistance} km</span>
        </div>

        <input
          type="range"
          min="2"
          max="100"
          value={maxDistance}
          onChange={(e) => onChangeMaxDistance(Number(e.target.value))}
          className="w-full accent-pink-500 h-2 bg-neutral-800 rounded-lg cursor-pointer"
        />

        <div className="flex justify-between text-[10px] text-white/40">
          <span>2 km (Local)</span>
          <span>50 km</span>
          <span>100 km (Región)</span>
        </div>
      </div>

      {/* DATA & LEGAL ACTIONS */}
      <div className="space-y-2">
        <button
          onClick={onOpenLegal}
          className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-purple-200 flex items-center justify-center gap-2 transition"
        >
          <FileText className="w-4 h-4" />
          Marco Legal, Privacidad y Reglas
        </button>

        <button
          onClick={onExportData}
          className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-purple-200 flex items-center justify-center gap-2 transition"
        >
          <Download className="w-4 h-4" />
          Exportar mis datos (JSON)
        </button>

        {user ? (
          <button
            onClick={onSignOut}
            className="w-full py-3 px-4 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        ) : (
          <button
            onClick={onSignIn}
            className="w-full py-3.5 px-4 rounded-2xl bg-white text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-neutral-100 transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Crear cuenta / Iniciar sesión
          </button>
        )}

        <button
          onClick={onWipeData}
          className="w-full py-2.5 text-xs text-rose-400 hover:text-rose-300 transition flex items-center justify-center gap-1.5 opacity-80 hover:opacity-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Restablecer datos locales
        </button>
      </div>

      {/* MODAL: PREMIUM DETAILS */}
      {premiumModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-[#150a26] border border-purple-500/40 p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <Crown className="w-10 h-10 text-amber-400 mx-auto" />
              <h3 className="text-2xl font-black text-white">Membresía Premium</h3>
              <p className="text-xs text-purple-200/70">Herramientas exclusivas para parejas y singles selectos</p>
            </div>

            <div className="space-y-2 p-3.5 rounded-2xl bg-white/5 border border-white/5 text-xs text-neutral-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                <span>Likes ilimitados sin espera de 24 horas</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                <span>Filtro de gustos pasionales específicos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                <span>Modo incógnito y ocultar distancia</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                <span>Prioridad en solicitudes de fiestas privadas</span>
              </div>
            </div>

            <div className="text-center">
              <span className="text-2xl font-black text-pink-400">$400 MXN</span>
              <span className="text-xs text-white/50 block">cada 15 días con cancelación voluntaria</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPremiumModalOpen(false)}
                className="flex-1 py-3 rounded-2xl bg-white/10 text-white text-xs font-semibold"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  if (onSelectTier) {
                    onSelectTier('ultra');
                  } else {
                    onOpenExtrasModal?.();
                  }
                  setPremiumModalOpen(false);
                }}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-black font-black text-xs shadow-lg"
              >
                Contratar Ultra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
