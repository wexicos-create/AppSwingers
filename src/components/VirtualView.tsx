import React, { useState } from 'react';
import { Creator, LiveStream, PaymentItem } from '../types';
import { Video, Radio, Upload, Play, ShieldCheck, Heart, Crown, Sparkles, Check, DollarSign } from 'lucide-react';

interface VirtualViewProps {
  creators: Creator[];
  lives: LiveStream[];
  userCreator: Creator | null;
  subscribedIds: string[];
  liveAccessIds: string[];
  onSubscribe: (creator: Creator) => void;
  onBuyLiveAccess: (live: LiveStream) => void;
  onRegisterCreator: (creatorData: Creator) => void;
  onUploadMedia: (uploadData: { caption: string; isPremium: boolean; price: number }) => void;
}

export const VirtualView: React.FC<VirtualViewProps> = ({
  creators,
  lives,
  userCreator,
  subscribedIds,
  liveAccessIds,
  onSubscribe,
  onBuyLiveAccess,
  onRegisterCreator,
  onUploadMedia,
}) => {
  const [activeTab, setActiveTab] = useState<'creadoras' | 'vivo' | 'subir'>('creadoras');
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [activeLiveStream, setActiveLiveStream] = useState<LiveStream | null>(null);
  const [creatorModalOpen, setCreatorModalOpen] = useState(false);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadPremium, setUploadPremium] = useState(false);
  const [uploadPrice, setUploadPrice] = useState(99);

  // Form for creator registration
  const [creatorForm, setCreatorForm] = useState({
    name: '',
    handle: '',
    bio: '',
    price: 149,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  });

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorForm.name.trim() || !creatorForm.handle.trim()) return;
    onRegisterCreator({
      ...creatorForm,
      handle: creatorForm.handle.startsWith('@') ? creatorForm.handle : `@${creatorForm.handle}`,
      status: 'activa',
      subs: 0
    });
    setCreatorModalOpen(false);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadCaption.trim()) return;
    onUploadMedia({
      caption: uploadCaption,
      isPremium: uploadPremium,
      price: uploadPremium ? uploadPrice : 0
    });
    setUploadCaption('');
    setUploadPremium(false);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 pb-24 text-white overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">
            Virtual & Creadoras
          </h2>
          <p className="text-xs text-purple-200/70">Contenido íntimo &bull; Transmisiones en vivo</p>
        </div>

        <button
          onClick={() => setCreatorModalOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-500/30 text-xs font-semibold text-pink-300 flex items-center gap-1.5 shadow-md active:scale-95 transition"
        >
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>{userCreator ? 'Mi Cuenta' : 'Soy Creadora'}</span>
        </button>
      </div>

      {/* Segment Selector */}
      <div className="flex p-1 rounded-2xl bg-neutral-900/80 border border-purple-500/20 mb-5">
        <button
          onClick={() => setActiveTab('creadoras')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'creadoras'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
              : 'text-white/60 hover:text-white'
          }`}
        >
          Creadoras
        </button>
        <button
          onClick={() => setActiveTab('vivo')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'vivo'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
              : 'text-white/60 hover:text-white'
          }`}
        >
          En Vivo
        </button>
        <button
          onClick={() => setActiveTab('subir')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'subir'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
              : 'text-white/60 hover:text-white'
          }`}
        >
          Subir
        </button>
      </div>

      {/* TAB 1: CREADORAS */}
      {activeTab === 'creadoras' && (
        <div className="space-y-4">
          {creators.map((c) => {
            const isSubscribed = subscribedIds.includes(c.handle);
            const userPays = Math.round(c.price * 1.28); // price + fee + taxes

            return (
              <div
                key={c.handle}
                className="p-4 rounded-3xl bg-neutral-900/70 border border-purple-500/20 shadow-lg space-y-3"
              >
                <div className="flex items-center gap-3.5">
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-purple-500/40 shadow-md"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5 truncate">
                      {c.name}
                      <Sparkles className="w-4 h-4 text-pink-400" />
                    </h3>
                    <p className="text-xs text-purple-300/80 font-mono">{c.handle} &bull; {c.followers} seguidores</p>
                  </div>

                  {isSubscribed ? (
                    <span className="px-3 py-1.5 rounded-xl bg-purple-900/50 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Suscrito
                    </span>
                  ) : (
                    <button
                      onClick={() => setSelectedCreator(c)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold text-xs shadow-md shadow-pink-600/30 active:scale-95 transition"
                    >
                      Suscribir
                    </button>
                  )}
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed font-normal bg-white/5 p-3 rounded-2xl border border-white/5">
                  {c.bio}
                </p>

                <div className="flex items-center justify-between text-[11px] text-white/50 pt-1">
                  <span>{c.free || 12} publicaciones públicas</span>
                  <span className="font-bold text-pink-300">${userPays} MXN / mes (IVA incl.)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: EN VIVO */}
      {activeTab === 'vivo' && (
        <div className="space-y-4">
          {lives.map((l) => {
            const hasAccess = liveAccessIds.includes(l.id);

            return (
              <div
                key={l.id}
                className="rounded-3xl bg-neutral-900/80 border border-purple-500/25 overflow-hidden shadow-xl"
              >
                <div className="relative h-44 w-full bg-black flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-tr from-purple-950 via-pink-950/40 to-black" />

                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-rose-600 text-[10px] font-black uppercase text-white shadow-md flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    {l.status === 'en vivo' ? 'En Vivo' : 'Programado'}
                  </span>

                  <div className="z-10 text-center">
                    <div className="w-14 h-14 rounded-full bg-purple-600/40 border border-purple-400 flex items-center justify-center mx-auto mb-2 backdrop-blur-md">
                      <Radio className="w-7 h-7 text-pink-300 animate-pulse" />
                    </div>
                    <span className="text-xs text-white/70 font-medium">{l.when}</span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="text-lg font-bold text-white">{l.title}</h3>
                  <p className="text-xs text-purple-300">Anfitriona: <strong className="text-white">{l.host}</strong></p>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-base font-black text-pink-400">${l.price} MXN</span>

                    {hasAccess ? (
                      <button
                        onClick={() => setActiveLiveStream(l)}
                        className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Entrar a la Sala
                      </button>
                    ) : (
                      <button
                        onClick={() => onBuyLiveAccess(l)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs shadow-md active:scale-95 transition"
                      >
                        Comprar Acceso Prime
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: SUBIR CONTENIDO */}
      {activeTab === 'subir' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-neutral-900/80 border border-purple-500/25 space-y-4">
            <h3 className="text-lg font-bold text-white">Publicar Nuevo Contenido</h3>
            <p className="text-xs text-purple-200/70">
              Fotos o videos exclusivos para tus suscriptores o pago por evento. Solo adultos con consentimiento expreso.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <textarea
                placeholder="Describe tu publicación o set de fotos..."
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-950 border border-purple-500/30 text-sm text-white focus:outline-none focus:border-purple-400 resize-none"
              />

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Contenido Premium (PPV)</span>
                  <span className="text-[11px] text-white/50">Gratis para suscriptores, de pago para el resto</span>
                </div>
                <input
                  type="checkbox"
                  checked={uploadPremium}
                  onChange={(e) => setUploadPremium(e.target.checked)}
                  className="w-5 h-5 accent-pink-500 rounded"
                />
              </div>

              {uploadPremium && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30">
                  <span className="text-xs font-semibold text-purple-200">Precio de desbloqueo:</span>
                  <div className="flex items-center gap-1 font-bold text-white">
                    <span>$</span>
                    <input
                      type="number"
                      value={uploadPrice}
                      onChange={(e) => setUploadPrice(Number(e.target.value))}
                      className="w-20 px-2 py-1 rounded-xl bg-neutral-900 border border-purple-500/40 text-center"
                    />
                    <span>MXN</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!uploadCaption.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 active:scale-95 transition disabled:opacity-50"
              >
                Subir Contenido a Moderación
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHECKOUT DE SUSCRIPCIÓN CON TRANSPARENCIA DE TARIFAS */}
      {selectedCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-[#140a24] border border-purple-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <img src={selectedCreator.avatar} alt={selectedCreator.name} className="w-12 h-12 rounded-full object-cover border-2 border-purple-400" />
              <div>
                <h3 className="text-base font-bold text-white">{selectedCreator.name}</h3>
                <p className="text-xs text-purple-300">{selectedCreator.handle}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2 text-xs">
              <span className="font-bold text-purple-300 uppercase tracking-wider block mb-1">Desglose Transparente</span>
              <div className="flex justify-between text-white/70">
                <span>Precio fijado por creadora:</span>
                <span className="font-semibold text-white">${selectedCreator.price} MXN</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Servicio de plataforma (10%):</span>
                <span>+${Math.round(selectedCreator.price * 0.1)} MXN</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>IVA (16%):</span>
                <span>+${Math.round(selectedCreator.price * 0.16)} MXN</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-sm text-pink-400">
                <span>Total a pagar por mes:</span>
                <span>${Math.round(selectedCreator.price * 1.28)} MXN</span>
              </div>
              <div className="text-[10px] text-emerald-400 pt-1">
                La creadora recibe directamente el 85% (${Math.round(selectedCreator.price * 0.85)} MXN).
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setSelectedCreator(null)}
                className="flex-1 py-3 rounded-2xl bg-white/10 text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onSubscribe(selectedCreator);
                  setSelectedCreator(null);
                }}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white text-xs font-bold shadow-lg"
              >
                Confirmar Suscripción
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRO DE CREADORA */}
      {creatorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-[#140a24] border border-purple-500/30 p-5 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-1">Registro de Creadora</h3>
            <p className="text-xs text-purple-200/70 mb-4">Vende contenido íntimo y suscripciones mensuales</p>

            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Nombre artístico"
                value={creatorForm.name}
                onChange={(e) => setCreatorForm({ ...creatorForm, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-900 border border-purple-500/30 text-sm text-white"
              />
              <input
                type="text"
                placeholder="@usuario_creadora"
                value={creatorForm.handle}
                onChange={(e) => setCreatorForm({ ...creatorForm, handle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-900 border border-purple-500/30 text-sm text-white"
              />
              <textarea
                placeholder="Describe tu contenido y estilo..."
                value={creatorForm.bio}
                onChange={(e) => setCreatorForm({ ...creatorForm, bio: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-900 border border-purple-500/30 text-sm text-white resize-none"
              />
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5">
                <span className="text-xs text-purple-200">Suscripción mensual:</span>
                <div className="flex items-center gap-1 font-bold text-white">
                  <span>$</span>
                  <input
                    type="number"
                    value={creatorForm.price}
                    onChange={(e) => setCreatorForm({ ...creatorForm, price: Number(e.target.value) })}
                    className="w-20 px-2 py-1 rounded-xl bg-neutral-900 border border-purple-500/40 text-center"
                  />
                  <span>MXN</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCreatorModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-white/10 text-white text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!creatorForm.name.trim() || !creatorForm.handle.trim()}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold disabled:opacity-50"
                >
                  Guardar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
