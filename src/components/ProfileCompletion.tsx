import React, { useState } from 'react';
import { ProfileKind } from '../types';
import { compressImage } from '../organizers';
import { inspectPublicPhoto, NO_NUDE_PUBLIC_MSG, NO_NUDE_PUBLIC_MSG_EN } from '../content-guard';
import { showToast } from './Toast';
import { buildSeekingOptions } from './OnboardingWizard';
import { Camera, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

export interface ProfileCompletionData {
  alias: string;
  age: number;
  bio: string;
  ageMin: number;
  ageMax: number;
  seeking: string[];
  photo: string;
}

interface ProfileCompletionProps {
  isEs: boolean;
  initial: { alias: string; kind: ProfileKind; seeking: string[] };
  onComplete: (data: ProfileCompletionData) => void;
}

export function ProfileCompletion({ isEs, initial, onComplete }: ProfileCompletionProps) {
  const [alias, setAlias] = useState(initial.alias);
  const [age, setAge] = useState<number>(18);
  const [bio, setBio] = useState('');
  const [bioFocused, setBioFocused] = useState(false);
  const [seeking, setSeeking] = useState<string[]>(initial.seeking);
  const [ageMin, setAgeMin] = useState(25);
  const [ageMax, setAgeMax] = useState(45);
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState(false);

  const seekingOptions = buildSeekingOptions(initial.kind, isEs);
  const minAgeLimit = 18;
  const maxAgeLimit = 65;

  const toggleSeeking = (item: string) => {
    setSeeking(prev => prev.includes(item) ? prev.filter(s => s !== item) : [...prev, item]);
  };

  const handlePhotoFile = async (file: File) => {
    try {
      const data = await compressImage(file);
      // Public-profile decency filter: nudes and semi-nudes are blocked here;
      // explicit content may only be shared through private messages later.
      const inspection = await inspectPublicPhoto(data);
      if (!inspection.ok) {
        showToast(isEs ? NO_NUDE_PUBLIC_MSG : NO_NUDE_PUBLIC_MSG_EN, 'error');
        return;
      }
      setPhoto(data);
    } catch { /* ignore unreadable file */ }
  };

  const handleMinSlide = (v: number) => {
    setAgeMin(Math.max(minAgeLimit, Math.min(v, ageMax - 1)));
  };

  const handleMaxSlide = (v: number) => {
    setAgeMax(Math.min(maxAgeLimit, Math.max(v, ageMin + 1)));
  };

  const handleFinish = () => {
    const cleanAlias = alias.trim();
    if (!cleanAlias || age < 18 || age > 100 || !seeking.length) return;
    setBusy(true);
    onComplete({
      alias: cleanAlias,
      age,
      bio: bio.trim(),
      ageMin,
      ageMax,
      seeking,
      photo,
    });
  };

  const pct = (v: number) => ((v - minAgeLimit) / (maxAgeLimit - minAgeLimit)) * 100;

  return (
    <div className="flex-1 flex flex-col py-6">
      <h1 className="text-xl font-black text-white">
        {isEs ? 'Tu perfil' : 'Your profile'}
      </h1>
      <p className="text-[11px] text-purple-200/70 mt-0.5">
        {isEs
          ? 'Ya con tus datos cargados, solo falta tu foto y tu presentación.'
          : 'With your data already loaded, only your photo and presentation are missing.'}
      </p>

      <div className="mt-5 space-y-6 flex-1 overflow-y-auto">

        {/* Profile photo */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {photo ? (
              <img src={photo} alt="Foto de perfil" className="w-20 h-20 rounded-full object-cover border-2 border-pink-400/60" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-black/60 border-2 border-dashed border-purple-500/40 flex items-center justify-center">
                <Camera className="w-6 h-6 text-purple-400/60" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <span className="text-xs font-bold text-white block">
              {isEs ? 'Foto de perfil' : 'Profile photo'}
            </span>
            <p className="text-[10px] text-white/40 mt-0.5">
              {isEs ? 'Se mostrará en la comunidad; puedes cambiarla después.' : 'Shown in the community; you can change it later.'}
            </p>
            <label className="mt-2 inline-block px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer transition">
              {photo ? (isEs ? 'Cambiar foto' : 'Change photo') : (isEs ? 'Subir foto' : 'Upload photo')}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handlePhotoFile(f); }}
              />
            </label>
          </div>
        </div>

        {/* Alias + age (loaded data, editable) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-white block">{isEs ? 'Nombre o apodo' : 'Name or alias'}</label>
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              maxLength={24}
              className="mt-2 w-full px-4 py-3 rounded-2xl bg-black/60 border border-purple-500/30 text-white text-sm focus:outline-none focus:border-pink-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-white block">{isEs ? 'Edad' : 'Age'}</label>
            <input
              type="number"
              min={18}
              max={100}
              value={age}
              onChange={(e) => {
                const v = Number(e.target.value);
                setAge(Number.isNaN(v) ? 18 : Math.max(18, Math.min(100, v)));
              }}
              className="mt-2 w-full px-4 py-3 rounded-2xl bg-black/60 border border-purple-500/30 text-white text-sm focus:outline-none focus:border-pink-500"
            />
            <p className="text-[9px] text-white/40 mt-1">
              {isEs ? 'Como aparece en tu INE; el administrador la coteja.' : 'As it appears on your ID; the admin cross-checks it.'}
            </p>
          </div>
        </div>

        {/* Interest tags */}
        <div>
          <span className="text-xs font-bold text-white block">
            {isEs ? 'Tus gustos y lo que buscas (etiquetas del perfil)' : 'Your tastes and what you seek (profile tags)'}
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {seekingOptions.map((opt) => {
              const active = seeking.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleSeeking(opt)}
                  className={
                    'px-3.5 py-2 rounded-full border text-[11px] font-bold transition active:scale-95 ' +
                    (active
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 border-pink-400/60 text-white shadow-[0_0_15px_rgba(255,45,120,0.4)]'
                      : 'bg-black/50 border-white/15 text-white/60 hover:border-purple-400/40 hover:text-white')
                  }
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Guided bio: brief questions that disappear when writing starts */}
        <div>
          <span className="text-xs font-bold text-white block">
            {isEs ? 'Tu presentación' : 'Your presentation'}
          </span>
          {!bioFocused && !bio && (
            <div className="mt-2 p-3.5 rounded-2xl bg-purple-950/50 border border-purple-500/25 space-y-1.5">
              <p className="text-[10px] text-purple-200/80 leading-relaxed">
                {isEs ? '¿Qué te gusta? Cuéntalo en una frase.' : 'What do you like? Tell it in one sentence.'}
              </p>
              <p className="text-[10px] text-purple-200/80 leading-relaxed">
                {isEs ? '¿Tienes alguna fantasía, fetiche o experiencia que quieras compartir?' : 'Do you have any fantasy, fetish or experience you want to share?'}
              </p>
              <p className="text-[10px] text-purple-200/80 leading-relaxed">
                {isEs ? '¿Algún límite o preferencia sexual que deban saber de ti?' : 'Any limit or sexual preference people should know about you?'}
              </p>
              <p className="text-[9px] text-pink-300/80 pt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {isEs ? 'Presiona para escribir y las preguntas desaparecerán.' : 'Tap to write and the questions will disappear.'}
              </p>
            </div>
          )}
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            onFocus={() => setBioFocused(true)}
            placeholder={isEs ? 'Escribe aquí tu presentación...' : 'Write your presentation here...'}
            maxLength={500}
            className={
              'mt-2 w-full px-4 py-3 rounded-2xl bg-black/60 border border-purple-500/30 text-white text-xs leading-relaxed focus:outline-none focus:border-pink-500 resize-none transition ' +
              (bioFocused || bio ? 'min-h-[120px]' : 'min-h-[70px]')
            }
          />
          <span className="text-[9px] text-white/40 block text-right mt-1">{bio.length}/500</span>
        </div>

        {/* Age range sought: dual-handle slider 18..65 */}
        <div>
          <span className="text-xs font-bold text-white block">
            {isEs ? '¿Entre qué edades buscas?' : 'What age range are you seeking?'}
          </span>
          <div className="mt-1 px-1">
            <div className="flex items-center justify-between text-[10px] text-white/50">
              <span>{minAgeLimit}</span>
              <span className="text-pink-300 font-bold text-xs">
                {isEs ? `Entre ${ageMin} y ${ageMax} años` : `Between ${ageMin} and ${ageMax} years old`}
              </span>
              <span>{maxAgeLimit}</span>
            </div>
            <div className="dual-range h-8 mt-1">
              <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-1.5 rounded-full bg-white/15 pointer-events-none" />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 pointer-events-none"
                style={{ left: pct(ageMin) + '%', width: (pct(ageMax) - pct(ageMin)) + '%' }}
              />
              <input
                type="range"
                min={minAgeLimit}
                max={maxAgeLimit}
                value={ageMin}
                onChange={(e) => handleMinSlide(Number(e.target.value))}
                aria-label={isEs ? 'Edad mínima' : 'Minimum age'}
              />
              <input
                type="range"
                min={minAgeLimit}
                max={maxAgeLimit}
                value={ageMax}
                onChange={(e) => handleMaxSlide(Number(e.target.value))}
                aria-label={isEs ? 'Edad máxima' : 'Maximum age'}
              />
            </div>
            <p className="text-[9px] text-white/40 mt-1">
              {isEs
                ? 'Mueve ambos extremos de la barra: el inicio puede subir hasta 25 y el máximo llega a 65.'
                : 'Move both ends of the bar: the start can go up to 25 and the maximum reaches 65.'}
            </p>
          </div>
        </div>
      </div>

      {/* Finish */}
      <div className="pt-4 shrink-0">
        <button
          type="button"
          onClick={handleFinish}
          disabled={busy || !alias.trim() || age < 18 || seeking.length === 0}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-extrabold text-sm shadow-xl shadow-purple-600/40 hover:brightness-110 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {busy
            ? (isEs ? 'Guardando...' : 'Saving...')
            : (isEs ? 'Completar perfil y entrar' : 'Complete profile and enter')}
          {busy ? <CheckCircle2 className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
