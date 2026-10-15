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
    <div className="flex items-center justify-center gap-3.5 py-3 px-2 w-full max-w-sm mx-auto">
      {/* Rewind */}
      <motion.button
        whileHover={{ scale: canRewind && !disabled ? 1.1 : 1 }}
        whileTap={{ scale: canRewind && !disabled ? 0.9 : 1 }}
        onClick={onRewind}
        disabled={!canRewind || disabled}
        aria-label="Rebobinar"
        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
          canRewind && !disabled
            ? 'bg-neutral-900/90 text-amber-400 border border-amber-400/40 shadow-lg shadow-amber-500/10 hover:border-amber-400'
            : 'bg-neutral-950/40 text-neutral-600 border border-neutral-900 cursor-not-allowed'
        }`}
      >
        <RotateCcw className="w-5 h-5" />
      </motion.button>

      {/* Dislike / Pass */}
      <motion.button
        whileHover={{ scale: !disabled ? 1.12 : 1 }}
        whileTap={{ scale: !disabled ? 0.88 : 1 }}
        onClick={() => onSwipe('pass')}
        disabled={disabled}
        aria-label="Pasar"
        className="w-14 h-14 rounded-full flex items-center justify-center bg-neutral-900/95 border-2 border-rose-500/50 text-rose-500 shadow-xl shadow-rose-950/40 hover:border-rose-400 hover:bg-rose-500/15 active:scale-95 transition-all"
      >
        <X className="w-7 h-7 stroke-[2.5]" />
      </motion.button>

      {/* Instant Message / Note */}
      <motion.button
        whileHover={{ scale: !disabled ? 1.12 : 1 }}
        whileTap={{ scale: !disabled ? 0.9 : 1 }}
        onClick={onQuickMessage}
        disabled={disabled}
        aria-label="Mensaje directo"
        className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-950/80 border border-purple-400/40 text-purple-300 shadow-lg shadow-purple-900/40 hover:border-purple-300 hover:text-white transition-all"
      >
        <MessageSquare className="w-5 h-5" />
      </motion.button>

      {/* Like */}
      <motion.button
        whileHover={{ scale: !disabled ? 1.15 : 1 }}
        whileTap={{ scale: !disabled ? 0.88 : 1 }}
        onClick={() => onSwipe('like')}
        disabled={disabled}
        aria-label="Me interesa"
        className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-tr from-pink-600 via-rose-500 to-purple-600 text-white shadow-2xl shadow-pink-600/50 hover:brightness-110 active:scale-95 transition-all"
      >
        <Heart className="w-8 h-8 fill-white stroke-none drop-shadow" />
      </motion.button>

      {/* Super Like */}
      <motion.button
        whileHover={{ scale: !disabled ? 1.12 : 1 }}
        whileTap={{ scale: !disabled ? 0.88 : 1 }}
        onClick={() => onSwipe('superlike')}
        disabled={disabled}
        aria-label="Super Like"
        className="w-12 h-12 rounded-full flex items-center justify-center bg-neutral-900/95 border-2 border-amber-400/60 text-amber-400 shadow-xl shadow-amber-950/30 hover:border-amber-300 hover:bg-amber-400/15 transition-all"
      >
        <Star className="w-6 h-6 fill-amber-400 stroke-none" />
      </motion.button>
    </div>
  );
};
