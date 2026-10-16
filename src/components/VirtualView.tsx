import React, { useState } from 'react';
import { Creator, LiveStream, AppRegion } from '../types';
import { 
  Video, 
  Radio, 
  Upload, 
  Play, 
  ShieldCheck, 
  Heart, 
  Crown, 
  Sparkles, 
  Check, 
  DollarSign, 
  Camera, 
  Image as ImageIcon,
  CreditCard,
  Lock,
  X,
  Users,
  UserCheck
} from 'lucide-react';

interface VirtualViewProps {
  creators: Creator[];
  lives: LiveStream[];
  userCreator: Creator | null;
  subscribedIds: string[];
  liveAccessIds: string[];
  region: AppRegion;
  lang: 'es' | 'en';
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
  region,
  lang,
  onSubscribe,
  onBuyLiveAccess,
  onRegisterCreator,
  onUploadMedia,
}) => {
  const isEs = lang === 'es';
  const isMx = region === 'MX';
  const currencySymbol = isMx ? '$' : '$';
  const currencyCode = isMx ? 'MXN' : 'USD';
  const taxLabel = isMx ? 'IVA (16% México)' : (isEs ? 'Impuestos por configurar' : 'Tax setup pending');
  const taxRate = isMx ? 0.16 : 0;

  const [activeTab, setActiveTab] = useState<'creadoras' | 'vivo' | 'subir'>('creadoras');
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [activeLiveStream, setActiveLiveStream] = useState<LiveStream | null>(null);
  
  // Modals
  const [creatorModalOpen, setCreatorModalOpen] = useState(false);
  const [virtualCardModalOpen, setVirtualCardModalOpen] = useState(false);
  const [ineVerificationModalOpen, setIneVerificationModalOpen] = useState(false);

  // Creator registration form (requires INE + facial verification)
  const [creatorForm, setCreatorForm] = useState({
    name: '',
    handle: '',
    bio: '',
    price: isMx ? 149 : 25,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    verifiedIne: false,
    verifiedFace: false,
  });

  // Upload new content form
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadPremium, setUploadPremium] = useState(true);
  const [uploadPrice, setUploadPrice] = useState(isMx ? 99 : 15);
  const [uploadImageFile, setUploadImageFile] = useState<string | null>(null);

  // My uploaded items mock state for creator
  const [myUploads, setMyUploads] = useState<Array<{ id: string; caption: string; price: number; url: string; date: string }>>([]);

  // Virtual card balance
  const [virtualCardBalance, setVirtualCardBalance] = useState(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadImageFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorForm.name.trim() || !creatorForm.handle.trim()) return;
    
    if (!creatorForm.verifiedIne || !creatorForm.verifiedFace) {
      setIneVerificationModalOpen(true);
      return;
    }

    onRegisterCreator({
      name: creatorForm.name.trim(),
      handle: creatorForm.handle.startsWith('@') ? creatorForm.handle : `@${creatorForm.handle}`,
      bio: creatorForm.bio.trim() || (isEs ? 'Perfil pendiente de revisión; sin verificar.' : 'Profile pending review; not verified.'),
      price: Number(creatorForm.price),
      avatar: creatorForm.avatar,
      status: 'activa',
      subs: 12
    });
    setCreatorModalOpen(false);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadCaption.trim()) return;

    const newUp = {
      id: `up_${Date.now()}`,
      caption: uploadCaption.trim(),
      price: uploadPremium ? uploadPrice : 0,
      url: uploadImageFile || 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
      date: isEs ? 'Hace un momento' : 'Just now',
    };

    setMyUploads(prev => [newUp, ...prev]);
    onUploadMedia({
      caption: uploadCaption,
      isPremium: uploadPremium,
      price: uploadPremium ? uploadPrice : 0
    });
    setUploadCaption('');
    setUploadImageFile(null);
    alert(isEs ? 'Borrador guardado solo en esta sesión. El contenido no se publicó ni se habilitaron pagos.' : 'Draft saved in this session only. Content was not published and payments were not enabled.');
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 pb-28 text-white overflow-y-auto">
      
      {/* Top Header with 2 Distinct Buttons for Women/Couples vs Men */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-black bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">
              {isEs ? 'Virtual & Creadoras' : 'Virtual & Creators'}
            </h2>
            <p className="text-xs text-purple-200/70">
              {isEs ? 'Contenido íntimo • Transmisiones en vivo' : 'Intimate content • Live streams'}
            </p>
          </div>

          {/* Virtual Card Balance Button */}
          <button
            onClick={() => setVirtualCardModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-xs font-bold text-pink-300 flex items-center gap-1.5 shadow-md active:scale-95 transition"
            title={isEs ? 'Tarjeta virtual de ingresos y eventos' : 'Virtual Earnings Card'}
          >
            <CreditCard className="w-3.5 h-3.5 text-pink-400" />
            <span>${virtualCardBalance} {currencyCode}</span>
          </button>
        </div>

        {/* REQUIRED 2 BUTTONS SECTION (Women/Couples vs Men) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Button 1: Mujeres o Parejas (SUBIR CONTENIDO / CREAR) */}
          <button
            onClick={() => {
              if (!userCreator) {
                setCreatorModalOpen(true);
              } else {
                setActiveTab('subir');
              }
            }}
            className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-xs shadow-lg shadow-pink-600/30 flex flex-col items-center justify-center gap-1 active:scale-95 transition text-center"
          >
            <div className="flex items-center gap-1">
              <Upload className="w-4 h-4" />
              <span>{isEs ? 'Mujeres / Parejas' : 'Women / Couples'}</span>
            </div>
            <span className="text-[10px] font-normal text-purple-100">
              {isEs ? 'Subir contenido & Transmitir' : 'Upload content & Stream'}
            </span>
          </button>

          {/* Button 2: Hombres (HOMBRE CONTENIDO & PAGAN POR VER) */}
          <button
            onClick={() => setActiveTab('creadoras')}
            className="p-3 rounded-2xl bg-neutral-900/90 border border-purple-500/40 hover:bg-purple-950/60 text-white font-bold text-xs shadow-lg flex flex-col items-center justify-center gap-1 active:scale-95 transition text-center"
          >
            <div className="flex items-center gap-1 text-purple-300">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>{isEs ? 'Hombres (Pagan por Ver)' : 'Men (Pay-per-View)'}</span>
            </div>
            <span className="text-[10px] font-normal text-white/60">
              {isEs ? 'Explorar creadoras y PPV' : 'Explore creators & PPV'}
            </span>
          </button>
        </div>
      </div>

      {/* Segment Selector Tabs */}
      <div className="flex p-1 rounded-2xl bg-neutral-900/80 border border-purple-500/20 mb-5">
        <button
          onClick={() => setActiveTab('creadoras')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'creadoras'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
              : 'text-white/60 hover:text-white'
          }`}
        >
          {isEs ? 'Creadoras' : 'Creators'}
        </button>
        <button
          onClick={() => setActiveTab('vivo')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'vivo'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
              : 'text-white/60 hover:text-white'
          }`}
        >
          {isEs ? 'En Vivo' : 'Live'}
        </button>
        <button
          onClick={() => setActiveTab('subir')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'subir'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
              : 'text-white/60 hover:text-white'
          }`}
        >
          {isEs ? 'Subir / Mis Sets' : 'Upload / Sets'}
        </button>
      </div>

      {/* TAB 1: CREADORAS & PAY-PER-VIEW */}
      {activeTab === 'creadoras' && (
        <div className="space-y-4">
          {creators.map((c) => {
            const isSubscribed = subscribedIds.includes(c.handle);
            // Calculate total price with IVA (16% in Mexico or max 20% in USA)
            const basePrice = c.price;
            const taxAmount = Math.round(basePrice * taxRate);
            const totalPrice = basePrice + taxAmount;

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
                    <p className="text-xs text-purple-300/80 font-mono">{c.handle} &bull; {c.followers} {isEs ? 'seguidores' : 'followers'}</p>
                  </div>

                  {isSubscribed ? (
                    <span className="px-3 py-1.5 rounded-xl bg-purple-900/50 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {isEs ? 'Suscrito' : 'Subscribed'}
                    </span>
                  ) : (
                    <button
                      onClick={() => setSelectedCreator(c)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold text-xs shadow-md shadow-pink-600/30 active:scale-95 transition"
                    >
                      {isEs ? 'Suscribir' : 'Subscribe'}
                    </button>
                  )}
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed font-normal bg-white/5 p-3 rounded-2xl border border-white/5">
                  {c.bio}
                </p>

                <div className="flex items-center justify-between text-[11px] text-white/50 pt-1">
                  <span>{c.free || 12} {isEs ? 'publicaciones públicas' : 'public posts'}</span>
                  <span className="font-bold text-pink-300">
                    {currencySymbol}{totalPrice} {currencyCode} / {isEs ? 'mes' : 'mo'} ({taxLabel})
                  </span>
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
            const taxAmount = Math.round(l.price * taxRate);
            const totalLivePrice = l.price + taxAmount;

            return (
              <div
                key={l.id}
                className="rounded-3xl bg-neutral-900/80 border border-purple-500/25 overflow-hidden shadow-xl"
              >
                <div className="relative h-44 w-full bg-black flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-tr from-purple-950 via-pink-950/40 to-black" />

                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-rose-600 text-[10px] font-black uppercase text-white shadow-md flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    {l.status === 'en vivo' ? (isEs ? 'En Vivo' : 'Live Now') : (isEs ? 'Programado' : 'Scheduled')}
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
                  <p className="text-xs text-purple-300">{isEs ? 'Anfitriona' : 'Host'}: <strong className="text-white">{l.host}</strong></p>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-base font-black text-pink-400">{currencySymbol}{totalLivePrice} {currencyCode}</span>
                      <span className="text-[10px] text-white/40 block">({taxLabel})</span>
                    </div>

                    {hasAccess ? (
                      <button
                        onClick={() => setActiveLiveStream(l)}
                        className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {isEs ? 'Entrar a la Sala' : 'Enter Room'}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onBuyLiveAccess(l);
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs shadow-md active:scale-95 transition"
                      >
                        {isEs ? 'Comprar Acceso Prime' : 'Buy Prime Access'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: SUBIR CONTENIDO & GESTIÓN DE SETS */}
      {activeTab === 'subir' && (
        <div className="space-y-4">
          
          {/* Upload Form Box */}
          <div className="p-5 rounded-3xl bg-neutral-900/80 border border-purple-500/25 space-y-4">
            <h3 className="text-lg font-bold text-white">
              {isEs ? 'Publicar Nuevo Contenido' : 'Publish New Content'}
            </h3>
            <p className="text-xs text-purple-200/70">
              {isEs 
                ? 'Fotos o videos exclusivos para tus suscriptores o pago por evento. Solo adultos con consentimiento expreso.' 
                : 'Exclusive photos or videos for subscribers or pay-per-view.'}
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <textarea
                placeholder={isEs ? 'Describe tu publicación o set de fotos...' : 'Describe your publication or photo set...'}
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-950 border border-purple-500/30 text-sm text-white focus:outline-none focus:border-purple-400 resize-none"
              />

              {/* Upload gallery image button */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-950 border border-dashed border-purple-500/40">
                <label className="cursor-pointer flex items-center gap-2 text-xs font-bold text-purple-200 hover:text-white transition">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Camera className="w-4 h-4 text-pink-400" />
                  <span>{uploadImageFile ? (isEs ? 'Archivo cargado con éxito' : 'File uploaded successfully') : (isEs ? 'Adjuntar foto o video (Galería/Cámara)' : 'Attach media (Gallery/Camera)')}</span>
                </label>
                {uploadImageFile && <Check className="w-4 h-4 text-emerald-400" />}
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">{isEs ? 'Contenido Premium (PPV)' : 'Premium Content (PPV)'}</span>
                  <span className="text-[11px] text-white/50">{isEs ? 'Gratis para suscriptores, de pago para el resto' : 'Free for subscribers, paid for others'}</span>
                </div>
                <input
                  type="checkbox"
                  checked={uploadPremium}
                  onChange={(e) => setUploadPremium(e.target.checked)}
                  className="w-5 h-5 accent-pink-500 rounded cursor-pointer"
                />
              </div>

              {uploadPremium && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30">
                  <span className="text-xs font-semibold text-purple-200">{isEs ? 'Precio de desbloqueo' : 'Unlock price'}:</span>
                  <div className="flex items-center gap-1 font-bold text-white">
                    <span>{currencySymbol}</span>
                    <input
                      type="number"
                      value={uploadPrice}
                      onChange={(e) => setUploadPrice(Number(e.target.value))}
                      className="w-20 px-2 py-1 rounded-xl bg-neutral-900 border border-purple-500/40 text-center text-xs"
                    />
                    <span>{currencyCode}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!uploadCaption.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>{isEs ? 'Subir Contenido (Online)' : 'Upload Content Online'}</span>
              </button>
            </form>
          </div>

          {/* List of My Uploads (Online management & deletion) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">
              {isEs ? 'Tus Publicaciones Activas Online' : 'Your Active Online Posts'}
            </h4>

            {myUploads.map((item) => (
              <div key={item.id} className="p-3.5 rounded-2xl bg-neutral-900/70 border border-purple-500/20 flex items-center gap-3.5">
                <img src={item.url} alt="Set" className="w-14 h-14 rounded-xl object-cover border border-white/10" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{item.caption}</p>
                  <span className="text-[10px] text-pink-300 font-bold block mt-0.5">
                    {currencySymbol}{item.price} {currencyCode} ({taxLabel})
                  </span>
                  <span className="text-[9px] text-white/40">{item.date}</span>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(isEs ? '¿Eliminar este contenido?' : 'Delete this content?')) {
                      setMyUploads(prev => prev.filter(i => i.id !== item.id));
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-[11px] font-bold"
                >
                  {isEs ? 'Eliminar' : 'Delete'}
                </button>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* MODAL 1: SUBSCRIBE / PPV BREAKDOWN */}
      {selectedCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-[#140a24] border border-purple-500/40 p-5 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-3">
              <img src={selectedCreator.avatar} alt={selectedCreator.name} className="w-12 h-12 rounded-full object-cover border-2 border-purple-400" />
              <div>
                <h3 className="text-base font-bold text-white">{selectedCreator.name}</h3>
                <p className="text-xs text-purple-300">{selectedCreator.handle}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2 text-xs">
              <span className="font-bold text-purple-300 uppercase tracking-wider block mb-1">
                {isEs ? 'Desglose Transparente (con Impuestos)' : 'Transparent Breakdown (with Tax)'}
              </span>
              <div className="flex justify-between text-white/70">
                <span>{isEs ? 'Precio creadora' : 'Creator price'}:</span>
                <span className="font-semibold text-white">{currencySymbol}{selectedCreator.price} {currencyCode}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>{isEs ? 'Servicio de plataforma (10%)' : 'Platform fee (10%)'}:</span>
                <span>+{currencySymbol}{Math.round(selectedCreator.price * 0.1)} {currencyCode}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>{taxLabel}:</span>
                <span>+{currencySymbol}{Math.round(selectedCreator.price * taxRate)} {currencyCode}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-sm text-pink-400">
                <span>{isEs ? 'Total a pagar' : 'Total to pay'}:</span>
                <span>{currencySymbol}{Math.round(selectedCreator.price * (1.1 + taxRate))} {currencyCode}</span>
              </div>
              <div className="text-[10px] text-emerald-400 pt-1">
                {isEs 
                  ? 'La liquidación no está conectada; no se registran ingresos ni pagos a creadoras.'
                  : 'Payouts are not connected; no creator earnings or payments are recorded.'}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setSelectedCreator(null)}
                className="flex-1 py-3 rounded-2xl bg-white/10 text-white text-xs font-semibold"
              >
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  onSubscribe(selectedCreator);
                  setSelectedCreator(null);
                }}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white text-xs font-bold shadow-lg"
              >
                {isEs ? 'Confirmar Pago' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRO DE CREADORA (CON VERIFICACIÓN INE Y FACIAL OBLIGATORIA) */}
      {creatorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-[#140a24] border border-purple-500/30 p-5 shadow-2xl text-white space-y-4">
            <h3 className="text-xl font-bold text-white mb-0.5">
              {isEs ? 'Registro de Creadora & Verificación' : 'Creator Registration & Verification'}
            </h3>
            <p className="text-xs text-purple-200/70">
              {isEs 
                ? 'Requisito indispensable: Verificación de perfil con INE y rostro facial. Las ganancias se abonan a tu tarjeta virtual.' 
                : 'Mandatory requirement: ID and facial verification.'}
            </p>

            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <input
                type="text"
                placeholder={isEs ? 'Nombre artístico' : 'Stage name'}
                required
                value={creatorForm.name}
                onChange={(e) => setCreatorForm({ ...creatorForm, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-900 border border-purple-500/30 text-white"
              />
              <input
                type="text"
                placeholder="@usuario_creadora"
                required
                value={creatorForm.handle}
                onChange={(e) => setCreatorForm({ ...creatorForm, handle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-900 border border-purple-500/30 text-white"
              />
              <textarea
                placeholder={isEs ? 'Describe tu contenido...' : 'Describe your content...'}
                value={creatorForm.bio}
                onChange={(e) => setCreatorForm({ ...creatorForm, bio: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-900 border border-purple-500/30 text-white resize-none"
              />

              {/* INE & Facial Validation Checkboxes / Uploaders */}
              <div className="space-y-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-purple-200">
                  <input
                    type="checkbox"
                    checked={creatorForm.verifiedIne}
                    onChange={(e) => setCreatorForm({ ...creatorForm, verifiedIne: e.target.checked })}
                    className="rounded accent-pink-500"
                  />
                  <span>{isEs ? 'Verificación de INE (Documento oficial)' : 'ID Verification'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-purple-200">
                  <input
                    type="checkbox"
                    checked={creatorForm.verifiedFace}
                    onChange={(e) => setCreatorForm({ ...creatorForm, verifiedFace: e.target.checked })}
                    className="rounded accent-pink-500"
                  />
                  <span>{isEs ? 'Reconocimiento Facial (Prueba de vida)' : 'Facial Recognition'}</span>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5">
                <span className="text-xs text-purple-200">{isEs ? 'Suscripción mensual' : 'Monthly subscription'}:</span>
                <div className="flex items-center gap-1 font-bold text-white">
                  <span>{currencySymbol}</span>
                  <input
                    type="number"
                    value={creatorForm.price}
                    onChange={(e) => setCreatorForm({ ...creatorForm, price: Number(e.target.value) })}
                    className="w-20 px-2 py-1 rounded-xl bg-neutral-900 border border-purple-500/40 text-center text-xs"
                  />
                  <span>{currencyCode}</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCreatorModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-white/10 text-white font-semibold"
                >
                  {isEs ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg"
                >
                  {isEs ? 'Validar & Publicar' : 'Validate & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TARJETA VIRTUAL DE INGRESOS & RETIROS */}
      {virtualCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-[#1e0f38] via-[#100720] to-[#080310] border border-purple-500/50 p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-pink-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  {isEs ? 'Tarjeta Virtual AppSwinguer' : 'Virtual Earnings Card'}
                </span>
              </div>
              <button onClick={() => setVirtualCardModalOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Virtual Card Graphic */}
            <div className="p-5 rounded-3xl bg-gradient-to-tr from-purple-900 via-pink-900 to-indigo-900 border border-pink-400/40 shadow-xl space-y-4 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs tracking-widest text-white/70">ULTRA VIRTUAL CARD</span>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <span className="text-[10px] text-white/60 block uppercase">{isEs ? 'Saldo Acumulado' : 'Available Balance'}</span>
                <span className="text-3xl font-black text-white">{currencySymbol}{virtualCardBalance} <span className="text-xs font-normal">{currencyCode}</span></span>
              </div>
              <div className="flex justify-between items-end text-xs font-mono text-white/80">
                <span>•••• 8924</span>
                <span>EXP 12/28</span>
              </div>
            </div>

            <p className="text-[11px] text-purple-200/80 leading-relaxed">
              {isEs 
                ? 'La cartera es solo una maqueta visual. No se han registrado ingresos ni hay retiros bancarios conectados.'
                : 'This wallet is a visual prototype only. No earnings are recorded and bank withdrawals are not connected.'}
            </p>

            <button
              type="button"
              onClick={() => {
                if (virtualCardBalance <= 0) {
                  alert(isEs ? 'Saldo insuficiente para retirar.' : 'Insufficient balance.');
                  return;
                }
                alert(isEs ? 'Los retiros están deshabilitados: no hay fondos reales ni cuenta bancaria conectada.' : 'Withdrawals are disabled: there are no real funds or connected bank account.');
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              <span>{isEs ? 'Retiros no disponibles' : 'Withdrawals unavailable'}</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: ADVERTENCIA INE & FACIAL REQUISITO */}
      {ineVerificationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-[#140a24] border border-rose-500/40 p-5 shadow-2xl text-white space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <ShieldCheck className="w-5 h-5" />
              <span>{isEs ? 'Verificación de Identidad Requerida' : 'Identity Verification Required'}</span>
            </div>
            <p className="text-xs text-white/80 leading-relaxed">
              {isEs 
                ? 'Para garantizar la seguridad de la comunidad y activar tu tarjeta virtual de cobro, debes marcar y completar la verificación de INE y reconocimiento facial en el formulario.' 
                : 'To ensure community safety and activate your earnings card, you must complete ID and facial verification.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setCreatorForm(prev => ({ ...prev, verifiedIne: true, verifiedFace: true }));
                setIneVerificationModalOpen(false);
              }}
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg"
            >
              {isEs ? 'Simular Verificación OK' : 'Simulate Verification OK'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
