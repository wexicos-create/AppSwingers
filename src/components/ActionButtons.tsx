import React from 'react';
import { motion } from 'motion/react';
import { X, Heart, Star, RotateCcw, MessageSquare } from 'lucide-react';
import { SwipeAction } from '../types';

interface ActionButtonsProps {
  onSwipe: (action: SwipeAction) => void;
  onRewind: () => void;
  canRewind: boolean;
  onQuickMessage?: () => void;
  disabled?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onSwipe,
  onRewind,
  canRewind,
  onQuickMessage,
  disabled = false,
}) => {
  return (
    <div className="flex items-center justify-center gap-3 py-1 px-2 w-full max-w-xs mx-auto shrink-0 z-30 select-none">
      {/* Rewind */}
      <motion.button
        whileHover={{ scale: canRewind && !disabled ? 1.08 : 1 }}
        whileTap={{ scale: canRewind && !disabled ? 0.92 : 1 }}
        onClick={onRewind}
        disabled={!canRewind || disabled}
        aria-label="Rebobinar perfil anterior"
        title="Rebobinar"
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
          canRewind && !disabled
            ? 'bg-neutral-900/90 text-amber-400 border border-amber-400/40 shadow-md shadow-amber-500/10 hover:border-amber-400 active:scale-95'
            : 'bg-neutral-950/40 text-neutral-600 border border-neutral-900 cursor-not-allowed opacity-50'
        }`}
      >
        <RotateCcw className="w-4 h-4" />
      </motion.button>

      {/* Dislike / Pass */}
      <motion.button
        whileHover={{ scale: !disabled ? 1.08 : 1 }}
        whileTap={{ scale: !disabled ? 0.92 : 1 }}
        onClick={() => onSwipe('pass')}
        disabled={disabled}
        aria-label="Pasar al siguiente perfil"
        title="Pasar"
        className="w-[52px] h-[52px] rounded-full flex items-center justify-center bg-neutral-900/95 border-2 border-rose-500/60 text-rose-500 shadow-lg shadow-rose-950/40 hover:border-rose-400 hover:bg-rose-500/15 active:scale-90 transition-all cursor-pointer shrink-0 disabled:opacity-50"
      >
        <X className="w-6 h-6 stroke-[2.5]" />
      </motion.button>

      {/* Instant Message / Note */}
      <motion.button
        whileHover={{ scale: !disabled ? 1.08 : 1 }}
        whileTap={{ scale: !disabled ? 0.92 : 1 }}
        onClick={onQuickMessage}
        disabled={disabled}
        aria-label="Mensaje directo o detalles"
        title="Mensaje directo"
        className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-950/80 border border-purple-400/40 text-purple-300 shadow-md shadow-purple-900/40 hover:border-purple-300 hover:text-white active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
      >
        <MessageSquare className="w-4 h-4" />
      </motion.button>

      {/* Like (Heart) - ALWAYS 100% UNCLIPPED & INTERACTIVE */}
      <motion.button
        whileHover={{ scale: !disabled ? 1.1 : 1 }}
        whileTap={{ scale: !disabled ? 0.9 : 1 }}
        onClick={() => onSwipe('like')}
        disabled={disabled}
        aria-label="Me interesa / Dar Like"
        title="Dar Like"
        className="w-[62px] h-[62px] rounded-full flex items-center justify-center bg-gradient-to-tr from-pink-600 via-rose-500 to-purple-600 text-white shadow-xl shadow-pink-600/50 hover:brightness-110 active:scale-90 transition-all cursor-pointer shrink-0 disabled:opacity-50 ring-2 ring-pink-400/30"
      >
        <Heart className="w-7 h-7 fill-white stroke-none drop-shadow-md" />
      </motion.button>

      {/* Super Like */}
      <motion.button
        whileHover={{ scale: !disabled ? 1.08 : 1 }}
        whileTap={{ scale: !disabled ? 0.92 : 1 }}
        onClick={() => onSwipe('superlike')}
        disabled={disabled}
        aria-label="Super Like"
        title="Super Like"
        className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-900/95 border-2 border-amber-400/60 text-amber-400 shadow-md shadow-amber-950/30 hover:border-amber-300 hover:bg-amber-400/15 active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
      >
        <Star className="w-5 h-5 fill-amber-400 stroke-none" />
      </motion.button>
    </div>
  );
};
