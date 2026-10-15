import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { Profile, SwipeAction } from '../types';
import { MapPin, Sparkles, CheckCircle2, Info, ChevronLeft, ChevronRight, Play, Pause, Volume2 } from 'lucide-react';

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
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

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

  const toggleVoiceNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlayingAudio(prev => !prev);
  };

  const displayAge = profile.ages || (profile.age ? String(profile.age) : '');

  return (
    <motion.div
      style={{
        x: isFront ? x : 0,
        y: isFront ? y : 0,
        rotate: isFront ? rotate : 0,
        scale: isFront ? scale : 0.96,
      }}
      drag={isFront ? true : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.8}
      onDragEnd={isFront ? handleDragEnd : undefined}
      className={`absolute inset-0 w-full h-full rounded-[36px] overflow-hidden select-none cursor-grab active:cursor-grabbing border border-purple-500/25 shadow-2xl bg-neutral-950 ${
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

      {/* Top Floating Badges */}
      <div className="absolute top-8 left-5 right-5 flex items-center justify-between z-20 pointer-events-none">
        {profile.online && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-black/60 backdrop-blur-md border border-emerald-500/30 rounded-full text-[11px] font-semibold text-emerald-400 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </div>
        )}
        {profile.matchPercentage ? (
          <div className="ml-auto px-3.5 py-1 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 backdrop-blur-md border border-white/25 rounded-full text-xs font-bold text-white shadow-lg shadow-purple-900/40">
            {profile.matchPercentage}% Match
          </div>
        ) : null}
      </div>

      {/* Bottom Profile Details Container */}
      <div className="absolute bottom-0 inset-x-0 p-5 pt-8 z-20 flex flex-col gap-2.5 bg-gradient-to-t from-black via-black/90 to-transparent">
        
        {/* Voice Note Audio Pill (From Reference Image 2!) */}
        {profile.voiceNote && (
          <div 
            onClick={toggleVoiceNote}
            className="w-full py-2.5 px-3.5 rounded-2xl bg-purple-950/70 hover:bg-purple-900/80 border border-purple-500/30 backdrop-blur-md flex items-center gap-3 transition-colors cursor-pointer shadow-lg"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shrink-0">
              {isPlayingAudio ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </div>

            {/* Audio Waveform visualization */}
            <div className="flex-1 flex items-center gap-1 h-5 overflow-hidden">
              <span className={`w-1 rounded-full bg-purple-400 ${isPlayingAudio ? 'animate-wave-1' : 'h-2'}`} />
              <span className={`w-1 rounded-full bg-pink-400 ${isPlayingAudio ? 'animate-wave-2' : 'h-3'}`} />
              <span className={`w-1 rounded-full bg-purple-300 ${isPlayingAudio ? 'animate-wave-3' : 'h-4'}`} />
              <span className={`w-1 rounded-full bg-pink-300 ${isPlayingAudio ? 'animate-wave-4' : 'h-2'}`} />
              <span className={`w-1 rounded-full bg-purple-400 ${isPlayingAudio ? 'animate-wave-5' : 'h-4'}`} />
              <span className={`w-1 rounded-full bg-pink-400 ${isPlayingAudio ? 'animate-wave-1' : 'h-3'}`} />
              <span className={`w-1 rounded-full bg-purple-300 ${isPlayingAudio ? 'animate-wave-2' : 'h-5'}`} />
              <span className={`w-1 rounded-full bg-pink-300 ${isPlayingAudio ? 'animate-wave-3' : 'h-2'}`} />
              <span className={`w-1 rounded-full bg-purple-400 ${isPlayingAudio ? 'animate-wave-4' : 'h-4'}`} />
              <span className={`w-1 rounded-full bg-pink-400 ${isPlayingAudio ? 'animate-wave-5' : 'h-3'}`} />
              <span className={`w-1 rounded-full bg-purple-300 ${isPlayingAudio ? 'animate-wave-1' : 'h-2'}`} />
              <span className={`w-1 rounded-full bg-pink-300 ${isPlayingAudio ? 'animate-wave-2' : 'h-4'}`} />
            </div>

            <span className="text-[11px] font-mono font-medium text-purple-200 shrink-0">
              {profile.voiceNote.duration}
            </span>
          </div>
        )}

        {/* Reflection Quote Box (From Reference Image 2!) */}
        {profile.voiceNote?.reflectionQuote && (
          <div className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] text-purple-200/90 italic leading-snug">
            <span className="font-semibold text-pink-400 not-italic block mb-0.5 text-[10px] uppercase tracking-wider">
              {profile.voiceNote.reflectionPrompt}
            </span>
            &ldquo;{profile.voiceNote.reflectionQuote}&rdquo;
          </div>
        )}

        {/* Tag chips */}
        <div className="flex flex-wrap gap-1.5">
          {profile.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-2.5 py-0.5 rounded-full bg-purple-900/50 backdrop-blur-md border border-purple-400/20 text-[11px] font-semibold text-purple-200"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Name, Age and Verification */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white tracking-tight drop-shadow">
              {profile.name}{displayAge ? `, ` : ''}
              {displayAge && <span className="font-light text-white/90">{displayAge}</span>}
            </h2>
            {profile.verify === 'verificado' && (
              <CheckCircle2 className="w-5 h-5 text-blue-400 fill-blue-400/20 drop-shadow" />
            )}
          </div>

          {/* Details Modal Trigger */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(profile);
            }}
            className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white transition active:scale-90"
            aria-label="Ver detalles"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        {/* Distance & Kind */}
        <div className="flex items-center gap-1.5 text-xs text-purple-200/80">
          <MapPin className="w-3.5 h-3.5 text-pink-400" />
          <span>{profile.distance || `~${profile.km} km`}</span>
          <span className="text-white/40">•</span>
          <span>{profile.kind}</span>
          {profile.occupation && (
            <>
              <span className="text-white/40">•</span>
              <span className="truncate">{profile.occupation}</span>
            </>
          )}
        </div>

        {/* Bio summary */}
        {!profile.voiceNote && (
          <p className="text-xs text-white/90 line-clamp-2 leading-relaxed font-normal">
            {profile.bio}
          </p>
        )}
      </div>
    </motion.div>
  );
};
