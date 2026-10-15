import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Profile } from '../types';
import { MessageSquare, Flame, X, Sparkles } from 'lucide-react';

interface MatchModalProps {
  isOpen: boolean;
  matchProfile: Profile | null;
  currentUserPhoto?: string;
  currentUserName?: string;
  onClose: () => void;
  onStartChat: (profile: Profile) => void;
}

export const MatchModal: React.FC<MatchModalProps> = ({
  isOpen,
  matchProfile,
  currentUserPhoto = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
  currentUserName = 'Tú',
  onClose,
  onStartChat,
}) => {
  useEffect(() => {
    if (isOpen && matchProfile) {
      const count = 220;
      const defaults = {
        origin: { y: 0.7 },
        colors: ['#ff2d78', '#b14cff', '#a855f7', '#ec4899', '#38bdf8', '#fbbf24'],
      };

      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      };

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    }
  }, [isOpen, matchProfile]);

  if (!isOpen || !matchProfile) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm rounded-[40px] bg-gradient-to-b from-[#1e0f38] via-[#100720] to-[#080310] border border-purple-500/40 p-6 flex flex-col items-center text-center shadow-[0_0_60px_rgba(177,76,255,0.4)] overflow-hidden"
        >
          {/* Neon atmospheric glow */}
          <div className="absolute -top-20 -left-20 w-44 h-44 bg-pink-500/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-purple-500/25 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* AI Match Badge */}
          <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-purple-900/60 border border-purple-400/40 text-purple-200 text-xs font-semibold mb-6 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Ai Match &bull; Conexión Pasional</span>
          </div>

          {/* Interlocking Heart / Circle Avatar Frames (Exact styling from Screenshot 3) */}
          <div className="relative flex items-center justify-center my-2">
            {/* User Photo Frame */}
            <motion.div
              initial={{ x: -45, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring' }}
              className="relative w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-purple-500 via-pink-500 to-indigo-500 shadow-2xl z-10"
            >
              <img
                src={currentUserPhoto}
                alt={currentUserName}
                className="w-full h-full object-cover rounded-full border-2 border-black"
              />
            </motion.div>

            {/* Central 100% Match Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 400 }}
              className="absolute z-30 flex flex-col items-center justify-center w-13 h-13 rounded-full bg-[#120524] border-2 border-purple-400 text-white shadow-[0_0_15px_rgba(177,76,255,0.8)]"
            >
              <span className="text-pink-400 font-black text-[13px] leading-none">
                {matchProfile.matchPercentage || 100}%
              </span>
              <span className="text-[8px] font-bold text-white/70 tracking-wider">MATCH</span>
            </motion.div>

            {/* Match Photo Frame */}
            <motion.div
              initial={{ x: 45, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring' }}
              className="relative -ml-4 w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400 shadow-2xl z-20"
            >
              <img
                src={matchProfile.photos[0] || matchProfile.photo || ''}
                alt={matchProfile.name}
                className="w-full h-full object-cover rounded-full border-2 border-black"
              />
            </motion.div>
          </div>

          {/* Headline (Inspired by Screenshot 3) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-5 mb-2"
          >
            <h3 className="font-serif italic text-3xl font-bold bg-gradient-to-r from-pink-300 via-purple-200 to-indigo-200 bg-clip-text text-transparent">
              It&apos;s a Match
            </h3>
            <p className="text-xs text-purple-200/90 mt-2 max-w-xs leading-relaxed font-normal">
              Adventurous, creative, and always chasing sunsets. Let&apos;s turn coffee dates into something more.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-2.5 mt-6">
            <button
              onClick={() => onStartChat(matchProfile)}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-sm shadow-xl shadow-purple-600/40 hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2 animate-pulse"
            >
              <MessageSquare className="w-4 h-4" />
              💬 Chatear ahora con {matchProfile.name.split(' ')[0]}
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 px-6 rounded-2xl bg-white/10 hover:bg-white/15 text-white/80 font-medium text-xs transition active:scale-[0.98]"
            >
              Seguir descubriendo perfiles
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
