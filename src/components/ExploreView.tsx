import React from 'react';
import { Profile } from '../types';
import { Sparkles, MapPin, Heart, Flame } from 'lucide-react';

interface ExploreViewProps {
  profiles: Profile[];
  onSelectProfile: (profile: Profile) => void;
  onLikeProfile: (profile: Profile) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  profiles,
  onSelectProfile,
  onLikeProfile,
}) => {
  return (
    <div className="w-full max-w-md mx-auto p-4 pb-24 text-white overflow-y-auto">
      {/* Title */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Explore & Discover
          </h2>
          <p className="text-xs text-purple-300/70">Top curated souls near your frequency</p>
        </div>
        <div className="p-2 rounded-2xl bg-purple-900/40 border border-purple-500/30 text-pink-400">
          <Flame className="w-5 h-5 fill-pink-500/20" />
        </div>
      </div>

      {/* Goal based categories row inspired by screenshot 1 */}
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        <div className="p-4 rounded-3xl bg-gradient-to-br from-pink-900/40 via-purple-900/20 to-neutral-900 border border-pink-500/20 flex flex-col justify-between h-28 relative overflow-hidden group hover:border-pink-500/50 transition cursor-pointer">
          <span className="text-xs font-semibold text-pink-300">Long-term connection</span>
          <p className="text-[11px] text-white/60">Find someone to share life with</p>
          <div className="absolute right-2 -bottom-2 opacity-30 group-hover:opacity-60 transition">
            <Heart className="w-16 h-16 text-pink-400 fill-pink-400" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-gradient-to-br from-purple-900/40 via-indigo-900/20 to-neutral-900 border border-purple-500/20 flex flex-col justify-between h-28 relative overflow-hidden group hover:border-purple-500/50 transition cursor-pointer">
          <span className="text-xs font-semibold text-purple-300">Spontaneous & Fun</span>
          <p className="text-[11px] text-white/60">Live music, night drinks & vibe</p>
          <div className="absolute right-2 -bottom-2 opacity-30 group-hover:opacity-60 transition">
            <Sparkles className="w-16 h-16 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Most Popular section header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-purple-200">
          Most Popular Vibes
        </h3>
        <span className="text-xs text-pink-400 font-medium cursor-pointer hover:underline">
          View All
        </span>
      </div>

      {/* Popular Profiles Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {profiles.slice(0, 4).map((profile) => (
          <div
            key={profile.id}
            onClick={() => onSelectProfile(profile)}
            className="group relative h-60 rounded-3xl overflow-hidden cursor-pointer border border-purple-500/20 shadow-lg hover:shadow-purple-500/20 transition-all transform hover:-translate-y-1"
          >
            <img
              src={profile.photos[0]}
              alt={profile.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

            {/* Distance badge */}
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-white/90 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-pink-400" />
              {profile.distance}
            </div>

            {/* Quick Like button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLikeProfile(profile);
              }}
              className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/50 backdrop-blur hover:bg-pink-600 text-white transition active:scale-90"
              aria-label="Like"
            >
              <Heart className="w-4 h-4" />
            </button>

            {/* Profile info bottom */}
            <div className="absolute bottom-3 left-3 right-3">
              <h4 className="text-sm font-bold text-white truncate">
                {profile.name}, {profile.age}
              </h4>
              <p className="text-[11px] text-purple-200/80 truncate">
                {profile.occupation || profile.tags[0]}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* All Profiles Row */}
      <h3 className="text-sm font-bold uppercase tracking-wider text-purple-200 mb-3">
        Nearby Right Now
      </h3>
      <div className="space-y-3">
        {profiles.slice(2).map((profile) => (
          <div
            key={profile.id}
            onClick={() => onSelectProfile(profile)}
            className="p-3 rounded-2xl bg-neutral-900/60 border border-purple-500/20 flex items-center gap-3.5 hover:bg-purple-950/30 transition cursor-pointer"
          >
            <img
              src={profile.photos[0]}
              alt={profile.name}
              className="w-14 h-14 rounded-2xl object-cover border border-purple-500/30"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white truncate">{profile.name}, {profile.age}</h4>
                {profile.online && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </div>
              <p className="text-xs text-white/60 truncate">{profile.bio}</p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-purple-300">
                <span>📍 {profile.distance}</span>
                <span>•</span>
                <span>{profile.tags[0]}</span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onLikeProfile(profile);
              }}
              className="p-2.5 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:scale-105 active:scale-95 transition"
              aria-label="Like"
            >
              <Heart className="w-4 h-4 fill-white" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
