import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { Profile, SwipeAction } from '../types';
import { MapPin, Sparkles, CheckCircle2, Info, ChevronLeft, ChevronRight, Share2, Check } from 'lucide-react';

interface SwipeCardProps {
  profile: Profile;
  isFront: boolean;
  onSwipe: (action: SwipeAction) => void;
  onOpenDetails: (profile: Profile) => void;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({
  profile,
  isFront,
  onSwipe,
  onOpenDetails,
}) => {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [copiedShare, setCopiedShare] = useState(false);

  const displayAge = profile.ages || (profile.age ? String(profile.age) : '');

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/#profile-${profile.id}`;
    const shareData = {
      title: `${profile.name} • AppSwinguer Ultra`,
      text: `Conoce el perfil de ${profile.name} (${profile.kind}${displayAge ? `, ${displayAge}` : ''}) en AppSwinguer Ultra.`,
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback to clipboard
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch (clipErr) {
      console.warn('Clipboard fallback failed:', clipErr);
    }
  };

  // Motion drag values
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Transforms
  const rotate = useTransform(x, [-260, 0, 260], [-18, 0, 18]);
  const scale = useTransform(x, [-260, 0, 260], [1.02, 1, 1.02]);

  // Reactive Drag Stamps
  const likeOpacity = useTransform(x, [35, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-35, -120], [0, 1]);
  const superLikeOpacity = useTransform(y, [-35, -110], [0, 1]);

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 110;
    const velocityThreshold = 400;

    if (info.offset.y < -threshold || info.velocity.y < -velocityThreshold) {
      onSwipe('superlike');
    } else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      onSwipe('like');
    } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
      onSwipe('pass');
    }
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photoIndex < profile.photos.length - 1) {
      setPhotoIndex(prev => prev + 1);
    }
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photoIndex > 0) {
      setPhotoIndex(prev => prev - 1);
    }
  };

  return (
    <motion.div
      style={{
        x: isFront ? x : 0,
        y: isFront ? y : 0,
        rotate: isFront ? rotate : 0,
        scale: isFront ? scale : 0.96,
      }}
      drag={isFront ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={isFront ? handleDragEnd : undefined}
      className={`swipe-card absolute inset-0 w-full h-full rounded-[36px] overflow-hidden select-none cursor-grab active:cursor-grabbing border border-purple-500/25 shadow-2xl bg-neutral-950 touch-pan-y ${
        isFront ? 'z-20' : 'z-10 pointer-events-none'
      }`}
    >
      {/* Background Image / Color Portrait */}
      <img
        src={profile.photos[photoIndex] || profile.photo || profile.photos[0]}
        alt={profile.name}
        className="w-full h-full object-cover transition-opacity duration-300"
        draggable={false}
      />

      {/* Dark Vignette Overlay for rich contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/25 pointer-events-none" />

      {/* Multiple Photos Progress Indicators */}
      {profile.photos.length > 1 && (
        <div className="absolute top-3.5 left-5 right-5 flex gap-1.5 z-30 pointer-events-none">
          {profile.photos.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i === photoIndex ? 'bg-white shadow-[0_0_8px_white]' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}

      {/* Photo Tap Navigation Zones */}
      {isFront && profile.photos.length > 1 && (
        <>
          <button
            onClick={prevPhoto}
            aria-label="Foto anterior"
            className="absolute left-0 top-14 bottom-48 w-1/3 z-20 opacity-0 hover:opacity-30 transition flex items-center justify-start pl-3"
          >
            <span className="p-2 bg-black/50 backdrop-blur rounded-full text-white">
              <ChevronLeft className="w-5 h-5" />
            </span>
          </button>
          <button
            onClick={nextPhoto}
            aria-label="Siguiente foto"
            className="absolute right-0 top-14 bottom-48 w-1/3 z-20 opacity-0 hover:opacity-30 transition flex items-center justify-end pr-3"
          >
            <span className="p-2 bg-black/50 backdrop-blur rounded-full text-white">
              <ChevronRight className="w-5 h-5" />
            </span>
          </button>
        </>
      )}

      {/* DRAG FEEDBACK STAMPS */}
      {/* LIKE Stamp */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-14 left-6 z-40 border-4 border-pink-400 bg-pink-500/25 backdrop-blur-md rounded-2xl px-5 py-2 rotate-[-14deg] pointer-events-none shadow-[0_0_25px_rgba(255,45,120,0.6)]"
      >
        <span className="text-pink-300 font-black text-2xl tracking-wider uppercase">
          ME INTERESA
        </span>
      </motion.div>

      {/* NOPE Stamp */}
      <motion.div
        style={{ opacity: nopeOpacity }}
        className="absolute top-14 right-6 z-40 border-4 border-rose-500 bg-rose-500/25 backdrop-blur-md rounded-2xl px-5 py-2 rotate-[14deg] pointer-events-none shadow-[0_0_25px_rgba(244,63,94,0.6)]"
      >
        <span className="text-rose-400 font-black text-2xl tracking-wider uppercase">
          PASAR
        </span>
      </motion.div>

      {/* SUPER LIKE Stamp */}
      <motion.div
        style={{ opacity: superLikeOpacity }}
        className="absolute top-1/4 left-1/2 -translate-x-1/2 z-40 border-4 border-amber-400 bg-amber-500/30 backdrop-blur-md rounded-2xl px-6 py-2.5 pointer-events-none shadow-[0_0_35px_rgba(251,191,36,0.7)] flex items-center gap-2"
      >
        <Sparkles className="w-6 h-6 text-amber-300 animate-spin" />
        <span className="text-amber-300 font-black text-2xl tracking-widest uppercase">
          SUPER LIKE
        </span>
      </motion.div>

      {/* Do not fabricate presence or compatibility badges; show them only when backed by live, validated data. */}
      {profile.lastSeenAt && (
        <div className="absolute top-8 left-5 z-20 pointer-events-none flex items-center gap-1.5 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/15 rounded-full text-[11px] font-semibold text-white/85 shadow-md">
          {new Date(profile.lastSeenAt).toLocaleDateString()}
        </div>
      )}

      {/* Bottom Profile Details Container */}
      <div className="absolute bottom-0 inset-x-0 p-3.5 sm:p-4 pt-6 z-20 flex flex-col gap-1.5 sm:gap-2 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-auto">
        
        {/* Tag chips */}
        <div className="flex flex-wrap gap-1 sm:gap-1.5">
          {profile.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-full bg-purple-900/60 backdrop-blur-md border border-purple-400/30 text-[10px] font-semibold text-purple-200 shadow-sm"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Name, Age and Verification */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow truncate">
              {profile.name}{displayAge ? `, ` : ''}
              {displayAge && <span className="font-light text-white/90">{displayAge}</span>}
            </h2>
            {profile.verify === 'verificado' && (
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 fill-blue-400/20 drop-shadow shrink-0" />
            )}
          </div>

          {/* Actions: Share via Web Share API & Details Info */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className={`p-2.5 rounded-full backdrop-blur-md transition active:scale-90 flex items-center justify-center ${
                copiedShare
                  ? 'bg-emerald-500/80 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                  : 'bg-white/15 hover:bg-white/25 text-white'
              }`}
              title={copiedShare ? '¡Enlace copiado!' : 'Compartir perfil'}
              aria-label="Compartir perfil"
            >
              {copiedShare ? (
                <Check className="w-5 h-5 text-emerald-100" />
              ) : (
                <Share2 className="w-5 h-5" />
              )}
            </button>

            {/* Details Modal Trigger */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(profile);
              }}
              className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white transition active:scale-90"
              aria-label="Ver detalles"
              title="Ver detalles"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Distance & Kind */}
        <div className="flex items-center gap-1.5 text-xs text-purple-200/90 font-medium">
          <MapPin className="w-3.5 h-3.5 text-pink-400" />
          <span>{profile.distance || `~${profile.km} km`}</span>
          <span className="text-white/40">•</span>
          <span className="font-bold text-pink-300">{profile.kind}</span>
          {profile.occupation && (
            <>
              <span className="text-white/40">•</span>
              <span className="truncate">{profile.occupation}</span>
            </>
          )}
        </div>

        {/* Bio summary */}
        {profile.bio && (
          <p className="text-xs text-white/90 line-clamp-2 leading-relaxed font-normal">
            {profile.bio}
          </p>
        )}
      </div>
    </motion.div>
  );
};
