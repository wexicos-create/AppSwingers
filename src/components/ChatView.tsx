import React, { useState, useRef, useEffect } from 'react';
import { MatchItem, Profile, ChatMessage } from '../types';
import { Search, Send, ArrowLeft, MoreVertical, Sparkles, Image as ImageIcon, Shield, Ban, Trash2, Mic } from 'lucide-react';

interface ChatViewProps {
  matches: MatchItem[];
  onOpenProfile: (profile: Profile) => void;
  onOpenReport?: (target: { type: 'usuario'; id: string; name: string }) => void;
  onBlockUser?: (userId: string) => void;
  onBackToApp?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  matches,
  onOpenProfile,
  onOpenReport,
  onBlockUser,
  onBackToApp,
}) => {
  const [activeChat, setActiveChat] = useState<MatchItem | null>(null);
  const [inputText, setInputText] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({
    'p-emma': [
      { id: 'e1', me: false, ts: Date.now() - 3600000, t: 'What does peace look like to you?' },
      { id: 'e2', me: true, ts: Date.now() - 3400000, t: 'For me, strolling at sunrise with a cup of coffee is so peaceful.' },
      { id: 'e3', me: false, ts: Date.now() - 3200000, t: 'Ugh, yes. Mine is jazz + pancakes + no talking.' },
      { id: 'e4', me: false, ts: Date.now() - 3000000, t: 'Or laying on the floor, staring at the ceiling. It helps.' },
      { id: 'e5', me: true, ts: Date.now() - 2800000, t: 'Totally stealing that. Sounds weirdly healing.' },
    ],
    'p-ava': [
      { id: 'm1', me: false, ts: Date.now() - 7200000, t: '¡Hola! Me encantó la energía de tu perfil ✨' },
      { id: 'm2', me: true, ts: Date.now() - 7100000, t: '¡Hola Ava! ¿De verdad tan fan del matcha ceremonial?' },
      { id: 'm3', me: false, ts: Date.now() - 7000000, t: '¡Culpable! 🍵 ¿Y tú qué prefieres antes de una fiesta?' }
    ],
    'p1': [
      { id: 'p1_1', me: false, ts: Date.now() - 14400000, t: 'Hola, vimos que están en la misma zona. ¿Van a la Noche de Antifaz?' }
    ]
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeChat]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;

    const chatKey = activeChat.profile.id;
    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      me: true,
      ts: Date.now(),
      t: inputText.trim(),
    };

    setChatMessages(prev => ({
      ...prev,
      [chatKey]: [...(prev[chatKey] || []), newMessage]
    }));
    setInputText('');

    // Trigger realistic response
    setTimeout(() => {
      const matchResponses = [
        "¡Totalmente de acuerdo! Me encanta esa actitud 😊",
        "Jajaja exactamente lo que estaba pensando. ¿Cuándo nos vemos para un cóctel?",
        "Las reglas claras siempre primero. ¿Has ido antes a una fiesta privada?",
        "Qué buena vibra transmites. Me alegra mucho que hayamos hecho Match ✨"
      ];
      const randomReply = matchResponses[Math.floor(Math.random() * matchResponses.length)];
      const replyMessage: ChatMessage = {
        id: `reply_${Date.now()}`,
        me: false,
        ts: Date.now(),
        t: randomReply,
      };
      setChatMessages(prev => ({
        ...prev,
        [chatKey]: [...(prev[chatKey] || []), replyMessage]
      }));
    }, 1200);
  };

  // If in active conversation
  if (activeChat) {
    const chatKey = activeChat.profile.id;
    const currentMsgs = chatMessages[chatKey] || [
      { id: 'init', me: false, ts: Date.now(), t: `¡Hola! Qué gusto coincidir. ¿Qué plan te llama más la atención? ✨` }
    ];

    return (
      <div className="w-full max-w-md mx-auto h-[calc(100vh-76px)] flex flex-col bg-[#0b0616] text-white">
        {/* Chat Top Header */}
        <div className="p-3.5 border-b border-purple-500/20 flex items-center justify-between bg-neutral-950/70 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveChat(null)}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/80 transition active:scale-95"
              aria-label="Volver a la lista de mensajes"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div
              onClick={() => onOpenProfile(activeChat.profile)}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="relative">
                <img
                  src={activeChat.profile.photos[0] || activeChat.profile.photo || ''}
                  alt={activeChat.profile.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/70 shadow-md group-hover:scale-105 transition-transform"
                />
                {activeChat.profile.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-black" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5 leading-none">
                  {activeChat.profile.name}
                  <span className="text-xs font-normal text-white/50">{activeChat.profile.ages || activeChat.profile.age}</span>
                </h3>
                <span className="text-[10px] text-purple-300 font-medium">
                  {activeChat.profile.online ? 'En línea ahora' : 'Activo recientemente'}
                </span>
              </div>
            </div>
          </div>

          {/* Options Dropdown trigger */}
          <div className="relative">
            <button 
              onClick={() => setOptionsOpen(prev => !prev)}
              className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition"
              aria-label="Opciones del chat"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {optionsOpen && (
              <div className="absolute right-0 top-12 w-48 rounded-2xl bg-[#170e28] border border-purple-500/30 p-2 shadow-2xl z-30 flex flex-col gap-1 text-xs">
                <button
                  onClick={() => {
                    setOptionsOpen(false);
                    onOpenProfile(activeChat.profile);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-white flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-purple-300" />
                  Ver perfil completo
                </button>
                <button
                  onClick={() => {
                    setOptionsOpen(false);
                    onOpenReport?.({ type: 'usuario', id: activeChat.profile.id, name: activeChat.profile.name });
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-500/20 text-rose-300 flex items-center gap-2"
                >
                  <Shield className="w-4 h-4 text-rose-400" />
                  Reportar perfil
                </button>
                <button
                  onClick={() => {
                    setOptionsOpen(false);
                    onBlockUser?.(activeChat.profile.id);
                    setActiveChat(null);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-500/20 text-rose-300 flex items-center gap-2"
                >
                  <Ban className="w-4 h-4 text-rose-400" />
                  Bloquear usuario
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-none">
          <div className="text-center my-3">
            <span className="px-3 py-1 rounded-full bg-purple-950/70 border border-purple-500/30 text-[11px] text-purple-300">
              Match mutuo &bull; Conversación cifrada y privada
            </span>
          </div>

          {currentMsgs.map((msg) => {
            const isMe = msg.me;
            const timeStr = new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-3xl text-sm leading-relaxed shadow-md ${
                    isMe
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-xs shadow-purple-900/30'
                      : 'bg-[#181128] text-white border border-purple-500/20 rounded-bl-xs'
                  }`}
                >
                  {msg.t}
                </div>
                <span className="text-[10px] text-white/40 mt-1 px-1">
                  {timeStr}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 border-t border-purple-500/20 bg-neutral-950/80 backdrop-blur-xl flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Escribe a ${activeChat.profile.name}...`}
            className="flex-1 bg-neutral-900/90 border border-purple-500/30 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-purple-400 transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white hover:brightness-110 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Enviar mensaje"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    );
  }

  // Matches list view
  return (
    <div className="w-full max-w-md mx-auto p-4 pb-24 text-white overflow-y-auto">
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">
            Mensajes & Matches
          </h2>
          <p className="text-xs text-purple-200/70">Conexiones mutuas y acuerdos claros</p>
        </div>
      </div>

      {/* Horizontal Strip of Recent Matches (Screenshot 4) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
            Nuevos Matches ({matches.length})
          </span>
          <span className="text-[11px] text-pink-400 flex items-center gap-1 font-semibold">
            <Sparkles className="w-3 h-3" />
            Conexión mutua
          </span>
        </div>

        {matches.length === 0 ? (
          <div className="p-4 rounded-3xl bg-white/5 border border-white/10 text-center text-xs text-white/60">
            Sigue deslizando a la derecha en Descubrir para abrir Matches.
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {matches.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveChat(item)}
                className="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0"
              >
                <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 shadow-md group-hover:scale-105 transition-transform">
                  <img
                    src={item.profile.photos[0] || item.profile.photo || ''}
                    alt={item.profile.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-black"
                  />
                  {item.profile.online && (
                    <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-black" />
                  )}
                </div>
                <span className="text-xs font-semibold text-white truncate max-w-[72px]">
                  {item.profile.name.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-3">
          Conversaciones
        </h3>

        {matches.length === 0 ? (
          <div className="py-12 text-center text-white/50 text-xs">
            Sin conversaciones activas aún. ¡Haz Match con alguien para chatear!
          </div>
        ) : (
          <div className="space-y-2.5">
            {matches.map((item) => {
              const msgs = chatMessages[item.profile.id];
              const lastMsg = msgs ? msgs[msgs.length - 1]?.t : item.lastMessage || '¡Hola! Es un Match mutuo ✨';
              return (
                <div
                  key={item.id}
                  onClick={() => setActiveChat(item)}
                  className="p-3.5 rounded-2xl bg-neutral-900/60 border border-purple-500/20 hover:bg-purple-950/30 flex items-center gap-3.5 transition cursor-pointer"
                >
                  <div className="relative">
                    <img
                      src={item.profile.photos[0] || item.profile.photo || ''}
                      alt={item.profile.name}
                      className="w-13 h-13 rounded-2xl object-cover border border-purple-500/30"
                    />
                    {item.profile.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-black" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-bold text-white truncate">
                        {item.profile.name}
                      </h4>
                      <span className="text-[10px] text-white/40">reciente</span>
                    </div>
                    <p className="text-xs text-purple-200/80 truncate">
                      {lastMsg}
                    </p>
                  </div>

                  {item.unreadCount && item.unreadCount > 0 ? (
                    <span className="w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-[10px] font-bold text-white flex items-center justify-center shadow-md">
                      {item.unreadCount}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
