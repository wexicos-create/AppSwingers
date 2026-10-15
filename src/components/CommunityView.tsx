import React, { useState } from 'react';
import { AppRegion, StoryPost, ForumPost } from '../types';
import { BookOpen, HelpCircle, MapPin, MessageSquare, ShieldCheck, Heart, Sparkles, Send, Plus, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface CommunityViewProps {
  region: AppRegion;
  isEs: boolean;
  userPhoneVerified?: boolean;
}

const getInitialStories = (isEs: boolean): StoryPost[] => [
  {
    id: 's1',
    title: isEs ? 'Nuestra primera noche en un club liberal de San Luis' : 'Our first night at a liberal club in SLP',
    author: 'Pareja Fuego SLP',
    category: 'historia',
    body: isEs 
      ? 'Llegamos con algo de nervios pero la recepción fue impecable. Protocolos claros, respeto absoluto y una atmósfera increíble que superó nuestras expectativas.'
      : 'We arrived a bit nervous but the reception was flawless. Clear protocols, absolute respect, and an incredible atmosphere that exceeded our expectations.',
    likes: 142,
    date: 'Hace 2 días',
    region: 'MX',
    sensualConsentTag: true,
  },
  {
    id: 's2',
    title: isEs ? 'Consejos clave para parejas primerizas en fiestas privadas' : 'Key tips for beginner couples at private parties',
    author: 'Dama Nocturna',
    category: 'consejo',
    body: isEs
      ? 'La regla de oro es la comunicación previa y el código rojo. Acuerden límites claros antes de salir y disfruten sin presiones.'
      : 'The golden rule is prior communication and code red. Agree on clear limits before going out and enjoy without pressure.',
    likes: 215,
    date: 'Hace 4 días',
    region: 'MX',
    sensualConsentTag: true,
  },
  {
    id: 's3',
    title: isEs ? 'Espacios y salones recomendados en México & USA' : 'Recommended venues and lounges in Mexico & USA',
    author: 'Admin AppSwinguer',
    category: 'donde_buscar',
    body: isEs
      ? 'En San Luis Potosí y CDMX existen salones privados exclusivos con filtros estrictos de INE y registro de parejas. En USA destacan clubs en Texas y California con membresía verificada.'
      : 'In San Luis Potosí and CDMX there are exclusive private lounges with strict INE filters and couple registration. In USA, clubs in Texas and California feature verified memberships.',
    likes: 320,
    date: 'Hace 1 semana',
    region: 'MX',
  }
];

const getInitialForums = (isEs: boolean): ForumPost[] => [
  {
    id: 'f1',
    title: isEs ? 'Círculo Exclusivo SLP - Fiestas Privadas de Fin de Semana' : 'SLP Exclusive Circle - Weekend Private Parties',
    author: 'Carlos & Sofia',
    postsCount: 28,
    lastActive: 'Hace 15 min',
    requiresMatchOrPhone: true,
    messages: [
      { id: 'm1', author: 'Carlos & Sofia', text: isEs ? 'Bienvenidos al foro exclusivo para verificados.' : 'Welcome to the exclusive verified forum.', time: '10:00 AM' },
      { id: 'm2', author: 'Pareja Fuego', text: isEs ? '¿Quién asiste este viernes al evento temática antifaz?' : 'Who is attending this Friday mask-themed event?', time: '10:15 AM' }
    ]
  },
  {
    id: 'f2',
    title: isEs ? 'Debate Abierto: Consentimiento y Códigos de Vestimenta' : 'Open Debate: Consent & Dress Codes',
    author: 'Moderación',
    postsCount: 54,
    lastActive: 'Hace 1 hora',
    requiresMatchOrPhone: false,
    messages: [
      { id: 'm3', author: 'Moderador', text: isEs ? 'Recordatorio: El uso de lencería, babydoll y atuendos elegantes es obligatorio en zonas VIP.' : 'Reminder: Lingerie, babydoll, and elegant attire are mandatory in VIP zones.', time: '09:00 AM' }
    ]
  }
];

export function CommunityView({ region, isEs }: CommunityViewProps) {
  const [tab, setTab] = useState<'historias' | 'tips' | 'donde' | 'faq' | 'foros'>('historias');
  const [stories, setStories] = useState<StoryPost[]>(() => getInitialStories(isEs));
  const [forums, setForums] = useState<ForumPost[]>(() => getInitialForums(isEs));
  const [activeForum, setActiveForum] = useState<ForumPost | null>(null);
  const [newMsgText, setNewMsgText] = useState('');
  const [showNewStoryModal, setShowNewStoryModal] = useState(false);

  // New story form
  const [storyTitle, setStoryTitle] = useState('');
  const [storyBody, setStoryBody] = useState('');
  const [storyCat, setStoryCat] = useState<'historia' | 'consejo' | 'donde_buscar'>('historia');

  const handlePostStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyTitle || !storyBody) return;
    const newS: StoryPost = {
      id: 's_' + Date.now(),
      title: storyTitle,
      author: isEs ? 'Usuario Verificado' : 'Verified User',
      category: storyCat,
      body: storyBody,
      likes: 1,
      date: isEs ? 'Hace un momento' : 'Just now',
      region: region,
      sensualConsentTag: true,
    };
    setStories([newS, ...stories]);
    setStoryTitle('');
    setStoryBody('');
    setShowNewStoryModal(false);
  };

  const handleSendForumMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgText.trim() || !activeForum) return;
    const updatedMsgs = [...activeForum.messages, {
      id: 'msg_' + Date.now(),
      author: isEs ? 'Tú (Verificado)' : 'You (Verified)',
      text: newMsgText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }];
    const updatedForum = { ...activeForum, messages: updatedMsgs, postsCount: activeForum.postsCount + 1 };
    setActiveForum(updatedForum);
    setForums(forums.map(f => f.id === updatedForum.id ? updatedForum : f));
    setNewMsgText('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6 pb-24">
      {/* Moderation Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200 text-xs sm:text-sm">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">{isEs ? 'Normas de Moderación Estrictas:' : 'Strict Moderation Rules:'}</span>{' '}
          {isEs 
            ? 'Prohibido: Prostitución, menores de edad, contenido ilegal sin consentimiento. Permitido: Historias sensuales, provocativas, recomendaciones y contenido erótico (bikini, bras, babydoll) bajo consentimiento expreso.'
            : 'Forbidden: Prostitution, minors, non-consensual illegal content. Allowed: Sensual/provocative stories, recommendations, and erotic content (bikini, bras, babydoll) under express consent.'}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setTab('historias')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 shrink-0 ${
            tab === 'historias' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          {isEs ? 'Historias y Experiencias' : 'Stories & Experiences'}
        </button>
        <button
          onClick={() => setTab('tips')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 shrink-0 ${
            tab === 'tips' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {isEs ? 'Tips y Consejos' : 'Tips & Advice'}
        </button>
        <button
          onClick={() => setTab('donde')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 shrink-0 ${
            tab === 'donde' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <MapPin className="w-4 h-4" />
          {isEs ? '¿Dónde Buscar?' : 'Where to Find'}
        </button>
        <button
          onClick={() => setTab('faq')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 shrink-0 ${
            tab === 'faq' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          {isEs ? 'Preguntas Frecuentes' : 'FAQ'}
        </button>
        <button
          onClick={() => setTab('foros')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 shrink-0 ${
            tab === 'foros' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          {isEs ? 'Foros de Matches' : 'Match Forums'}
        </button>
      </div>

      {/* Action Header for Stories */}
      {(tab === 'historias' || tab === 'tips') && (
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            {tab === 'historias' ? (isEs ? 'Historias de la Comunidad' : 'Community Stories') : (isEs ? 'Consejos de Expertos' : 'Expert Tips')}
          </h2>
          <button
            onClick={() => setShowNewStoryModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white text-sm font-semibold shadow-lg shadow-rose-600/30 hover:opacity-95 transition"
          >
            <Plus className="w-4 h-4" />
            {isEs ? 'Publicar Historia' : 'Post Story'}
          </button>
        </div>
      )}

      {/* Tab Contents */}
      {tab === 'historias' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stories.filter(s => s.category === 'historia').map(story => (
            <div key={story.id} className="p-5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between text-xs text-rose-400 mb-2">
                  <span className="font-semibold">{story.author}</span>
                  <span>{story.date}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{story.title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{story.body}</p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/15 text-xs text-white/60">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isEs ? 'Consentimiento verificado' : 'Consent verified'}
                </span>
                <button className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition">
                  <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                  <span>{story.likes}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'tips' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stories.filter(s => s.category === 'consejo').map(story => (
            <div key={story.id} className="p-5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between text-xs text-rose-400 mb-2">
                  <span className="font-semibold">{story.author}</span>
                  <span>{story.date}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{story.title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{story.body}</p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs text-white/60">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isEs ? 'Moderado & Seguro' : 'Moderated & Safe'}
                </span>
                <button className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition">
                  <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                  <span>{story.likes}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'donde' && (
        <div className="flex flex-col gap-4">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-rose-950/40 via-purple-950/40 to-black/60 border border-rose-500/30">
            <h3 className="text-xl font-bold text-white mb-2">
              {isEs ? 'Espacios Locales Recomendados (San Luis Potosí & México / USA)' : 'Recommended Local Spaces (SLP & Mexico / USA)'}
            </h3>
            <p className="text-sm text-white/70 mb-4">
              {isEs 
                ? 'Directorio verificado de salones privados, clubs liberales y organizadores certificados con estrictas políticas de admisión, INE y privacidad.'
                : 'Verified directory of private lounges, liberal clubs, and certified organizers with strict admission, INE, and privacy policies.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-black/55 border border-white/10">
                <h4 className="font-bold text-white mb-1">San Luis Potosí - Club L'Amant SLP</h4>
                <p className="text-xs text-white/70 mb-2">Zona Poniente, SLP • Privacidad 100% garantizada</p>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium">Verificado INE</span>
              </div>
              <div className="p-4 rounded-2xl bg-black/55 border border-white/10">
                <h4 className="font-bold text-white mb-1">CDMX / Polanco - Salón Privado Fusión</h4>
                <p className="text-xs text-white/70 mb-2">CDMX • Eventos exclusivos de fin de semana</p>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium">Verificado INE</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'faq' && (
        <div className="flex flex-col gap-3">
          <div className="p-5 rounded-2xl bg-black/40 border border-white/10">
            <h4 className="font-bold text-white mb-1">{isEs ? '¿Cómo se verifica la identidad (INE y Facial)?' : 'How is identity verified (INE & Facial)?'}</h4>
            <p className="text-sm text-white/70">
              {isEs 
                ? 'El sistema requiere subir foto del anverso y reverso del INE (o ID oficial) junto con una selfie en tiempo real para garantizar perfiles 100% reales y seguros.'
                : 'The system requires uploading front and back photos of your ID along with a real-time selfie to guarantee 100% real and secure profiles.'}
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-black/40 border border-white/10">
            <h4 className="font-bold text-white mb-1">{isEs ? '¿Cómo funcionan los planes Silver y Gold?' : 'How do Silver and Gold plans work?'}</h4>
            <p className="text-sm text-white/70">
              {isEs 
                ? 'Silver ofrece 50 swipes diarios, filtros avanzados y chat ilimitado por 15 días ($408 MXN / $100 USD). Gold ofrece swipes ilimitados, perfil destacado permanente, ver quién te vio y foros exclusivos por 1 mes ($800 MXN / $180 USD).'
                : 'Silver offers 50 daily swipes, advanced filters, and unlimited chat for 15 days ($408 MXN / $100 USD). Gold offers unlimited swipes, permanent spotlight, see who liked you, and exclusive forums for 1 month ($800 MXN / $180 USD).'}
            </p>
          </div>
        </div>
      )}

      {tab === 'foros' && (
        <div className="flex flex-col gap-4">
          {activeForum ? (
            <div className="flex flex-col h-[500px] rounded-2xl bg-black/60 border border-white/15 overflow-hidden">
              <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white">{activeForum.title}</h3>
                  <p className="text-xs text-white/60">{activeForum.author} • {activeForum.postsCount} {isEs ? 'mensajes' : 'messages'}</p>
                </div>
                <button 
                  onClick={() => setActiveForum(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition"
                >
                  {isEs ? '← Volver a Foros' : '← Back to Forums'}
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                {activeForum.messages.map(msg => (
                  <div key={msg.id} className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/10 max-w-lg">
                    <div className="flex justify-between items-center text-xs text-rose-400 font-semibold">
                      <span>{msg.author}</span>
                      <span className="text-white/40">{msg.time}</span>
                    </div>
                    <p className="text-sm text-white/80">{msg.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendForumMsg} className="p-3 bg-white/5 border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  value={newMsgText}
                  onChange={(e) => setNewMsgText(e.target.value)}
                  placeholder={isEs ? 'Escribe tu mensaje en el foro...' : 'Write your forum message...'}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-500 transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {isEs ? 'Enviar' : 'Send'}
                </button>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {forums.map(forum => (
                <div key={forum.id} className="p-5 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between text-xs text-rose-400 mb-2">
                      <span className="flex items-center gap-1 font-semibold">
                        {forum.requiresMatchOrPhone ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        {forum.requiresMatchOrPhone ? (isEs ? 'Exclusivo Matches / Verificados' : 'Matches / Verified Only') : (isEs ? 'Público' : 'Public')}
                      </span>
                      <span>{forum.lastActive}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{forum.title}</h3>
                    <p className="text-xs text-white/60">{isEs ? 'Creado por:' : 'Created by:'} {forum.author} • {forum.postsCount} {isEs ? 'participaciones' : 'posts'}</p>
                  </div>
                  <button
                    onClick={() => setActiveForum(forum)}
                    className="w-full py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-semibold text-sm transition border border-rose-500/30 flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {isEs ? 'Entrar al Foro' : 'Enter Forum'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Story Modal */}
      {showNewStoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-900 border border-white/15 shadow-2xl flex flex-col gap-4">
            <h3 className="text-lg font-bold text-white">
              {isEs ? 'Publicar Nueva Historia o Consejo' : 'Post New Story or Tip'}
            </h3>
            <form onSubmit={handlePostStory} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-white/60 mb-1 block">{isEs ? 'Categoría' : 'Category'}</label>
                <select
                  value={storyCat}
                  onChange={(e: any) => setStoryCat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-sm"
                >
                  <option value="historia">{isEs ? 'Historia y Experiencia' : 'Story & Experience'}</option>
                  <option value="consejo">{isEs ? 'Tip y Consejo' : 'Tip & Advice'}</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">{isEs ? 'Título' : 'Title'}</label>
                <input
                  type="text"
                  required
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  placeholder={isEs ? 'Ej. Nuestra gran experiencia...' : 'E.g. Our great experience...'}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">{isEs ? 'Contenido (Sujeto a moderación)' : 'Content (Subject to moderation)'}</label>
                <textarea
                  required
                  rows={4}
                  value={storyBody}
                  onChange={(e) => setStoryBody(e.target.value)}
                  placeholder={isEs ? 'Comparte tu vivencia o consejo bajo respeto y consentimiento...' : 'Share your experience or advice with respect and consent...'}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-sm resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewStoryModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition"
                >
                  {isEs ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-500 transition shadow-lg shadow-rose-600/30"
                >
                  {isEs ? 'Publicar' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
