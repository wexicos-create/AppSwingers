import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Profile, SwipeAction } from '../types';
import { X, MapPin, CheckCircle2, Heart, Star, Sparkles, Briefcase, Calendar, Ruler, ShieldAlert, Ban } from 'lucide-react';

interface ProfileDetailsModalProps {
  profile: Profile | null;
  lang?: 'es' | 'en';
  onClose: () => void;
  onSwipe: (action: SwipeAction) => void;
  onReport?: (profile: Profile) => void;
  onBlock?: (profile: Profile) => void;
}

export const ProfileDetailsModal: React.FC<ProfileDetailsModalProps> = ({
  profile,
  lang = 'es',
  onClose,
  onSwipe,
}) => {
  if (!profile) return null;

  const isEs = lang === 'es';
  const displayAge = profile.ages || (profile.age ? String(profile.age) : '');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-[36px] sm:rounded-[36px] bg-[#140e24] border border-purple-500/30 text-white shadow-2xl p-0 scrollbar-none"
        >
          {/* Header image carousel / hero */}
          <div className="relative h-72 sm:h-96 w-full">
            <img
              src={profile.photos[0] || profile.photo || ''}
              alt={profile.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#140e24] via-transparent to-black/40" />

            {/* Close floating button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-black/50 backdrop-blur text-white hover:bg-black/75 transition"
              aria-label={isEs ? 'Cerrar detalles' : 'Close details'}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Verified badge */}
            <div className="absolute bottom-4 left-6 flex items-center gap-2">
              <h2 className="text-3xl font-extrabold text-white">
                {profile.name}{displayAge ? `, ${displayAge}` : ''}
              </h2>
              {profile.verify === 'verificado' && (
                <CheckCircle2 className="w-6 h-6 text-blue-400 fill-blue-400/20" />
              )}
            </div>
          </div>

          {/* Details body */}
          <div className="p-6 space-y-5">
            {/* Location & active status */}
            <div className="flex items-center justify-between text-sm text-purple-200/80">
              <div className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-4 h-4 text-pink-400" />
                <span>{profile.distance || `~${profile.km} km`}</span>
                <span className="text-white/40">•</span>
                <span className="text-pink-300 font-bold">{profile.kind}</span>
              </div>
              {profile.online && (
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {isEs ? 'En línea ahora' : 'Active now'}
                </div>
              )}
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {profile.occupation && (
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
                  <Briefcase className="w-4 h-4 text-purple-400 mb-1" />
                  <span className="text-[10px] text-white/50">{isEs ? 'Ocupación' : 'Work'}</span>
                  <span className="text-xs font-semibold truncate w-full">{profile.occupation}</span>
                </div>
              )}
              {profile.zodiac && (
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
                  <Calendar className="w-4 h-4 text-pink-400 mb-1" />
                  <span className="text-[10px] text-white/50">{isEs ? 'Signo' : 'Zodiac'}</span>
                  <span className="text-xs font-semibold truncate w-full">{profile.zodiac}</span>
                </div>
              )}
              {profile.height && (
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
                  <Ruler className="w-4 h-4 text-amber-400 mb-1" />
                  <span className="text-[10px] text-white/50">{isEs ? 'Estatura' : 'Height'}</span>
                  <span className="text-xs font-semibold truncate w-full">{profile.height}</span>
                </div>
              )}
            </div>

            {/* About Me / Bio */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-2">
                {isEs ? 'Sobre este perfil' : 'About this profile'}
              </h4>
              <p className="text-sm text-neutral-300 leading-relaxed font-normal bg-white/5 p-4 rounded-2xl border border-white/5">
                {profile.bio}
              </p>
            </div>

            {/* Interests & Tags */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                {isEs ? 'Gustos & Fantasías Pasionales' : 'Interests & Fantasies'}
              </h4>
              <div className="flex flex-wrap gap-2">
                {profile.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-full bg-purple-900/50 border border-purple-500/30 text-xs font-semibold text-purple-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Additional Photos gallery */}
            {profile.photos.length > 1 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-3">
                  {isEs ? 'Galería de fotos' : 'Photo Gallery'}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {profile.photos.slice(1).map((pic, i) => (
                    <img
                      key={i}
                      src={pic}
                      alt={`${profile.name} photo ${i + 2}`}
                      className="w-full h-48 object-cover rounded-2xl border border-white/10"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
              <button type="button" onClick={() => onReport?.(profile)} className="flex items-center justify-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/5 px-3 py-2.5 text-xs font-bold text-amber-200 hover:bg-amber-300/10">
                <ShieldAlert className="h-4 w-4" /> {isEs ? 'Denunciar perfil' : 'Report profile'}
              </button>
              <button type="button" onClick={() => onBlock?.(profile)} className="flex items-center justify-center gap-2 rounded-xl border border-rose-300/25 bg-rose-300/5 px-3 py-2.5 text-xs font-bold text-rose-200 hover:bg-rose-300/10">
                <Ban className="h-4 w-4" /> {isEs ? 'Bloquear usuario' : 'Block user'}
              </button>
            </div>

            {/* Bottom floating swipe actions */}
            <div className="pt-4 pb-2 flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  onClose();
                  onSwipe('pass');
                }}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-neutral-900 border-2 border-rose-500 text-rose-500 shadow-lg hover:bg-rose-500/10 transition active:scale-95"
                aria-label={isEs ? 'Pasar' : 'Pass'}
              >
                <X className="w-7 h-7" />
              </button>

              <button
                onClick={() => {
                  onClose();
                  onSwipe('superlike');
                }}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-neutral-900 border-2 border-amber-400 text-amber-400 shadow-lg hover:bg-amber-400/10 transition active:scale-95"
                aria-label={isEs ? 'Superlike' : 'Superlike'}
              >
                <Star className="w-6 h-6 fill-amber-400" />
              </button>

              <button
                onClick={() => {
                  onClose();
                  onSwipe('like');
                }}
                className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-tr from-purple-600 via-pink-600 to-rose-500 text-white shadow-xl shadow-pink-600/40 hover:scale-105 active:scale-95 transition"
                aria-label={isEs ? 'Me interesa' : 'Like'}
              >
                <Heart className="w-8 h-8 fill-white" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
