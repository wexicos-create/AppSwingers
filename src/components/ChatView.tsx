import React, { useState, useRef, useEffect } from 'react';
import { MatchItem, Profile, ChatMessage } from '../types';
import { fetchChatMessages, getOrCreateConversation, sendChatMessage } from '../backend';
import { INITIAL_PROFILES } from '../data/mockProfiles';
import { 
  Search, 
  Send, 
  ArrowLeft, 
  MoreVertical, 
  Sparkles, 
  Paperclip, 
  Mic, 
  ShieldAlert, 
  Ban, 
  Play, 
  Pause, 
  Check, 
  Image as ImageIcon,
  CheckCheck,
  X,
  AlertTriangle,
  Lock,
  ThumbsUp,
  MapPin,
  Video,
  Phone
} from 'lucide-react';

interface ChatViewProps {
  matches: MatchItem[];
  currentUserId?: string | null;
  initialChatUserId?: string | null;
  onOpenProfile: (profile: Profile) => void;
  onOpenReport?: (target: { type: 'usuario'; id: string; name: string; reason: string; details: string }) => void | Promise<void>;
  onBlockUser?: (userId: string) => void;
  onBackToApp?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  matches,
  currentUserId = null,
  initialChatUserId,
  onOpenProfile,
  onOpenReport,
  onBlockUser,
  onBackToApp,
}) => {
  const [activeChat, setActiveChat] = useState<MatchItem | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals for Report and Block
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Incumplimiento de consentimiento y reglas');
  const [reportDetails, setReportDetails] = useState('');
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<any>(null);

  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>(() => {
    if (!import.meta.env.DEV) return {};
    try {
      const saved = localStorage.getItem('appswinguer_chat_messages');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    try {
      localStorage.setItem('appswinguer_chat_messages', JSON.stringify(chatMessages));
    } catch (e) {
      console.warn('LocalStorage save note:', e);
    }
  }, [chatMessages]);

  // Real-Time Location Sharing State per Chat (Strict Privacy by Default)
  const [liveLocationChats, setLiveLocationChats] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('appswinguer_live_locations');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('appswinguer_live_locations', JSON.stringify(liveLocationChats));
    } catch (e) {
      console.warn('LocalStorage save note:', e);
    }
  }, [liveLocationChats]);

  const toggleLiveLocation = (chatKey: string, partnerName: string) => {
    if (currentUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chatKey)) {
      showToast('La ubicación en tiempo real todavía no está conectada al backend. No se compartió ninguna coordenada.');
      return;
    }
    const isCurrentlyShared = !!liveLocationChats[chatKey];
    const willShare = !isCurrentlyShared;
    setLiveLocationChats(prev => ({ ...prev, [chatKey]: willShare }));

    const statusMsg: ChatMessage = {
      id: `loc_${Date.now()}`,
      me: true,
      ts: Date.now(),
      t: willShare
        ? `📍 Has activado la función de compartir ubicación en tiempo real con ${partnerName}. Ambos perfiles pueden ver coordenadas dinámicas de encuentro.`
        : `🔒 Has apagado la ubicación en tiempo real. Tu posición física exacta ahora está completamente protegida y oculta.`,
    };

    setChatMessages(prev => ({
      ...prev,
      [chatKey]: [...(prev[chatKey] || []), statusMsg]
    }));

    showToast(willShare 
      ? `Ubicación en tiempo real: ACTIVADA (Compartiendo con ${partnerName})` 
      : `Ubicación en tiempo real: APAGADA (Modo Privado Seguro)`
    );
  };

  // Automatically select chat if initialChatUserId is provided (from Match modal or matches list)
  useEffect(() => {
    if (initialChatUserId) {
      const match = matches.find(m => m.profile.id === initialChatUserId);
      if (match) {
        setActiveChat(match);
      } else {
        // Fallback: look up in initial profiles to immediately open chat
        const fallbackProfile = INITIAL_PROFILES.find(p => p.id === initialChatUserId);
        if (fallbackProfile) {
          setActiveChat({
            id: `match_${fallbackProfile.id}_fallback`,
            profile: fallbackProfile,
            matchedAt: new Date().toISOString(),
            lastMessage: '¡Nuevo Match mutuo! Saludarse primero ✨',
            unreadCount: 0
          });
        }
      }
    }
  }, [initialChatUserId, matches]);

  useEffect(() => {
    if (!currentUserId || !activeChat ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(activeChat.profile.id)) {
      setActiveConversationId(null);
      return;
    }

    let cancelled = false;
    let conversationId: string | null = null;
    const chatKey = activeChat.profile.id;
    const loadMessages = async () => {
      try {
        if (!conversationId) conversationId = await getOrCreateConversation(currentUserId, activeChat.profile.id);
        if (cancelled || !conversationId) return;
        setActiveConversationId(conversationId);
        const messages = await fetchChatMessages(currentUserId, conversationId);
        if (!cancelled) setChatMessages(prev => ({ ...prev, [chatKey]: messages }));
      } catch (error) {
        if (!cancelled) showToast(error instanceof Error ? error.message : 'No fue posible cargar el chat.');
      }
    };

    void loadMessages();
    const interval = setInterval(() => { void loadMessages(); }, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentUserId, activeChat?.profile.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeChat]);

  // 3-second polling interval simulating recibir.php / backend sync
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const pollInterval = setInterval(() => {
      try {
        const stored = localStorage.getItem('appswinguer_chat_messages');
        if (stored && activeChat) {
          const parsed = JSON.parse(stored);
          if (parsed[activeChat.profile.id]) {
            setChatMessages(prev => ({ ...prev, [activeChat.profile.id]: parsed[activeChat.profile.id] }));
          }
        }
      } catch (e) {
        // ignore polling note
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [activeChat]);

  // PeerJS Video Call State & WebRTC & Google Keep Sync
  const [videoCallOpen, setVideoCallOpen] = useState(false);
  const [keepSyncOpen, setKeepSyncOpen] = useState(false);
  const [keepSynced, setKeepSynced] = useState(false);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerInstance = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const startVideoCall = async () => {
    setVideoCallOpen(true);
    setCallStatus('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const PeerModule = await import('peerjs');
      const Peer = PeerModule.Peer;
      const peer = new Peer();
      peerInstance.current = peer;

      peer.on('open', () => {
        setCallStatus('connected');
      });

      peer.on('call', (call: any) => {
        call.answer(stream);
        call.on('stream', (remoteStream: MediaStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });
      });
    } catch (err) {
      console.warn('WebRTC Media preview note:', err);
      setCallStatus('connected');
    }
  };

  const endVideoCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerInstance.current) {
      peerInstance.current.destroy();
    }
    setVideoCallOpen(false);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Voice recording simulation
  const startVoiceRecording = () => {
    setIsRecordingVoice(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds(sec => sec + 1);
    }, 1000);
  };

  const stopAndSendVoiceRecording = () => {
    if (!activeChat) return;
    clearInterval(recordingTimerRef.current);
    if (currentUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(activeChat.profile.id)) {
      setIsRecordingVoice(false);
      showToast('Las notas de voz todavía no están habilitadas para conversaciones reales. Usa mensajes de texto.');
      return;
    }
    setIsRecordingVoice(false);

    const seconds = recordingSeconds || 4;
    const durStr = `00:${seconds < 10 ? '0' : ''}${seconds}`;
    const chatKey = activeChat.profile.id;

    const newVoiceMsg: ChatMessage = {
      id: `voice_${Date.now()}`,
      me: true,
      ts: Date.now(),
      voiceUrl: 'voice_audio_record',
      voiceDuration: durStr,
      t: `Nota de voz (${durStr})`,
    };

    setChatMessages(prev => ({
      ...prev,
      [chatKey]: [...(prev[chatKey] || []), newVoiceMsg]
    }));

    triggerBotReply(chatKey, "¡Qué linda voz tienes! Me gusta mucho escuchar a la persona antes de encontrarnos ✨");
  };

  const cancelVoiceRecording = () => {
    clearInterval(recordingTimerRef.current);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  // Image attachment handler (Paperclip 📎)
  const handleAttachImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;
    if (currentUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(activeChat.profile.id)) {
      showToast('Los adjuntos todavía no están habilitados para conversaciones reales. No se subió ningún archivo.');
      e.target.value = '';
      return;
    }

    const chatKey = activeChat.profile.id;
    const reader = new FileReader();
    reader.onload = () => {
      const imgUrl = reader.result as string;
      const newImgMsg: ChatMessage = {
        id: `img_${Date.now()}`,
        me: true,
        ts: Date.now(),
        img: imgUrl,
      };

      setChatMessages(prev => ({
        ...prev,
        [chatKey]: [...(prev[chatKey] || []), newImgMsg]
      }));

      triggerBotReply(chatKey, "¡Increíble foto! Te ves espectacular 🔥");
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const triggerBotReply = (chatKey: string, customReply?: string) => {
    setTimeout(() => {
      const matchResponses = [
        "¡Totalmente de acuerdo! Me encanta esa actitud y tener reglas claras 😊",
        "Jajaja exactamente lo que estaba pensando. ¿Cuándo nos vemos para un cóctel?",
        "Las reglas claras siempre primero. ¿Has ido antes a una fiesta privada en San Luis Potosí?",
        "Qué buena vibra transmites. Me alegra mucho que hayamos hecho Match ✨"
      ];
      const randomReply = customReply || matchResponses[Math.floor(Math.random() * matchResponses.length)];
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;

    const chatKey = activeChat.profile.id;
    const messageText = inputText.trim();
    const isRealProfile = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chatKey);

    if (isRealProfile) {
      if (!currentUserId) {
        showToast('Inicia sesión para enviar mensajes.');
        return;
      }
      try {
        const conversationId = activeConversationId || await getOrCreateConversation(currentUserId, chatKey);
        setActiveConversationId(conversationId);
        const savedMessage = await sendChatMessage(currentUserId, conversationId, messageText);
        setChatMessages(prev => ({ ...prev, [chatKey]: [...(prev[chatKey] || []), savedMessage] }));
        setInputText('');
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'No se pudo enviar el mensaje.');
      }
      return;
    }

    if (!import.meta.env.DEV) {
      showToast('El chat real requiere una cuenta verificada y una conversación autorizada.');
      return;
    }
    const newMessage: ChatMessage = { id: `msg_${Date.now()}`, me: true, ts: Date.now(), t: messageText };
    setChatMessages(prev => ({ ...prev, [chatKey]: [...(prev[chatKey] || []), newMessage] }));
    setInputText('');
    triggerBotReply(chatKey);
  };

  const handleConfirmReport = async () => {
    if (!activeChat) return;
    try {
      await onOpenReport?.({
        type: 'usuario',
        id: activeChat.profile.id,
        name: activeChat.profile.name,
        reason: reportReason,
        details: reportDetails,
      });
      setReportModalOpen(false);
      showToast('Reporte enviado al sistema de seguridad.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo enviar el reporte.');
    }
  };

  const handleConfirmBlock = () => {
    if (!activeChat) return;
    const blockedName = activeChat.profile.name;
    const blockedId = activeChat.profile.id;
    setBlockModalOpen(false);
    setActiveChat(null);
    onBlockUser?.(blockedId);
    showToast(`Has bloqueado a ${blockedName}. No podrá comunicarse ni interactuar contigo.`);
  };

  // IF AN ACTIVE CHAT CONVERSATION IS OPEN
  if (activeChat) {
    const chatKey = activeChat.profile.id;
    const currentMsgs = chatMessages[chatKey] || [
      { id: 'init', me: false, ts: Date.now(), t: `¡Hola! Qué gusto coincidir. ¿Qué plan te llama más la atención? ✨` }
    ];

    return (
      <div className="w-full max-w-md mx-auto h-[calc(100vh-76px)] flex flex-col bg-[#090414] text-white relative">
        
        {/* Toast feedback */}
        {toastMessage && (
          <div className="absolute top-16 inset-x-4 z-50 p-3 rounded-2xl bg-neutral-900/95 border border-purple-500/50 shadow-2xl text-xs text-white flex items-center gap-2 animate-bounce">
            <ThumbsUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="flex-1">{toastMessage}</span>
          </div>
        )}

        {/* Chat Top Header with Direct Report & Block actions */}
        <div className="p-3 border-b border-purple-500/20 flex items-center justify-between bg-neutral-950/90 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveChat(null)}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/80 transition active:scale-95"
              aria-label="Volver a lista de mensajes"
              title="Volver a lista de mensajes"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div
              onClick={() => onOpenProfile(activeChat.profile)}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="relative">
                <img
                  src={activeChat.profile.photos[0] || activeChat.profile.photo || ''}
                  alt={activeChat.profile.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/70 shadow-md group-hover:scale-105 transition-transform"
                />
                {activeChat.profile.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-black animate-pulse" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1 leading-none">
                  {activeChat.profile.name}
                  <span className="text-xs font-normal text-white/50">{activeChat.profile.ages || activeChat.profile.age}</span>
                </h3>
                <span className="text-[10px] text-purple-300 font-medium">
                  {activeChat.profile.online ? 'En línea ahora' : 'Recientemente activo'} &bull; {activeChat.profile.distance || `${activeChat.profile.km} km`}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons: VideoCall (PeerJS), Keep Sync, Reportar & Bloquear */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setVideoCallOpen(true)}
              className="p-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-pink-300 flex items-center justify-center active:scale-95 transition shadow-sm"
              title="Videollamada segura WebRTC (PeerJS)"
            >
              <Video className="w-4 h-4 text-pink-400" />
            </button>

            <button
              onClick={() => setKeepSyncOpen(true)}
              className="p-1.5 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 flex items-center justify-center active:scale-95 transition shadow-sm"
              title="Sincronizar notas y acuerdos con Google Keep"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
            </button>

            <button
              onClick={() => setReportModalOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-[11px] font-bold text-rose-300 flex items-center gap-1 active:scale-95 transition"
              title="Reportar usuario a moderación"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Reportar</span>
            </button>

            <button
              onClick={() => setBlockModalOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 text-[11px] font-bold text-white/80 flex items-center gap-1 active:scale-95 transition"
              title="Bloquear usuario"
            >
              <Ban className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Bloquear</span>
            </button>
          </div>
        </div>

        {/* Live Location Privacy Switch Bar with ON/OFF Control */}
        <div className="px-3.5 py-2.5 bg-gradient-to-r from-purple-950/70 via-neutral-900/90 to-purple-950/70 border-b border-purple-500/25 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-lg border ${
              liveLocationChats[chatKey] 
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-400' 
                : 'bg-purple-950/40 border-purple-500/30 text-purple-400'
            }`}>
              <MapPin className={`w-3.5 h-3.5 ${liveLocationChats[chatKey] ? 'animate-bounce text-emerald-400' : 'text-purple-300'}`} />
            </div>
            <div className="truncate">
              <span className="font-bold text-white text-[11px] block leading-tight truncate">
                {liveLocationChats[chatKey] ? 'Ubicación en Tiempo Real: ACTIVA' : 'Ubicación en Tiempo Real: PROTEGIDA'}
              </span>
              <span className="text-[10px] text-purple-300/80 block leading-tight truncate">
                {liveLocationChats[chatKey] 
                  ? `Compartiendo punto dinámico con ${activeChat.profile.name}` 
                  : `Solo distancia estimada en Match (${activeChat.profile.distance || `${activeChat.profile.km} km`})`}
              </span>
            </div>
          </div>

          {/* Interactive On/Off Switch Button */}
          <button
            type="button"
            onClick={() => toggleLiveLocation(chatKey, activeChat.profile.name)}
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 border shadow-sm active:scale-95 ${
              liveLocationChats[chatKey]
                ? 'bg-emerald-500 text-neutral-950 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] hover:bg-emerald-400'
                : 'bg-neutral-800 hover:bg-neutral-700 text-purple-200 border-neutral-600'
            }`}
            title="Presiona para activar o apagar compartir ubicación en tiempo real"
            aria-label="Interruptor de ubicación en tiempo real"
          >
            <span className={`w-2 h-2 rounded-full ${liveLocationChats[chatKey] ? 'bg-neutral-950 animate-pulse' : 'bg-rose-500'}`} />
            <span>{liveLocationChats[chatKey] ? 'ON (Activa)' : 'OFF (Apagada)'}</span>
          </button>
        </div>

        {/* Message Thread Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-none">
          <div className="text-center my-2">
            <span className="px-3.5 py-1 rounded-full bg-purple-950/70 border border-purple-500/30 text-[11px] text-purple-300 shadow-sm inline-flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-pink-400" />
              Match mutuo con {activeChat.profile.name} &bull; Mensajes seguros y privados
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
                {/* Voice Note Bubble */}
                {msg.voiceUrl ? (
                  <div
                    onClick={() => setPlayingVoiceId(playingVoiceId === msg.id ? null : (msg.id || 'voice'))}
                    className={`p-3 rounded-3xl flex items-center gap-3 cursor-pointer transition shadow-md ${
                      isMe
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-xs'
                        : 'bg-[#1a102e] text-white border border-purple-500/30 rounded-bl-xs'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      {playingVoiceId === msg.id ? (
                        <Pause className="w-4 h-4 fill-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      )}
                    </div>

                    <div className="flex items-center gap-1 h-5 overflow-hidden">
                      <span className={`w-1 rounded-full bg-white ${playingVoiceId === msg.id ? 'animate-wave-1' : 'h-2'}`} />
                      <span className={`w-1 rounded-full bg-white ${playingVoiceId === msg.id ? 'animate-wave-2' : 'h-3'}`} />
                      <span className={`w-1 rounded-full bg-white ${playingVoiceId === msg.id ? 'animate-wave-3' : 'h-4'}`} />
                      <span className={`w-1 rounded-full bg-white ${playingVoiceId === msg.id ? 'animate-wave-4' : 'h-2'}`} />
                      <span className={`w-1 rounded-full bg-white ${playingVoiceId === msg.id ? 'animate-wave-5' : 'h-4'}`} />
                      <span className={`w-1 rounded-full bg-white ${playingVoiceId === msg.id ? 'animate-wave-1' : 'h-3'}`} />
                      <span className={`w-1 rounded-full bg-white ${playingVoiceId === msg.id ? 'animate-wave-2' : 'h-2'}`} />
                    </div>

                    <span className="text-[11px] font-mono font-medium ml-1">
                      {msg.voiceDuration || '00:15'}
                    </span>
                  </div>
                ) : msg.img ? (
                  /* Image Attachment Bubble */
                  <div className="max-w-[75%] rounded-3xl overflow-hidden border border-purple-500/30 shadow-lg">
                    <img src={msg.img} alt="Foto enviada" className="w-full h-auto object-cover max-h-60" />
                  </div>
                ) : (
                  /* Standard Text Bubble */
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-3xl text-sm leading-relaxed shadow-md ${
                      isMe
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-xs shadow-purple-900/30'
                        : 'bg-[#181028] text-white border border-purple-500/20 rounded-bl-xs'
                    }`}
                  >
                    {msg.t}
                  </div>
                )}

                <div className="flex items-center gap-1 text-[10px] text-white/40 mt-1 px-1">
                  <span>{timeStr}</span>
                  {isMe && <CheckCheck className="w-3 h-3 text-pink-400" />}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* VOICE RECORDING OVERLAY BAR */}
        {isRecordingVoice ? (
          <div className="p-3 border-t border-purple-500/30 bg-neutral-950/95 backdrop-blur-xl flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span>Grabando audio: 00:{recordingSeconds < 10 ? '0' : ''}{recordingSeconds}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white/80 font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={stopAndSendVoiceRecording}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-xs font-bold text-white shadow-md flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                Enviar nota
              </button>
            </div>
          </div>
        ) : (
          /* STANDARD INPUT BAR WITH ATTACHMENT 📎 AND MICROPHONE 🎙 */
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-purple-500/20 bg-neutral-950/90 backdrop-blur-xl flex items-center gap-2"
          >
            {/* Hidden File Input for Paperclip */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAttachImage}
              accept="image/*"
              className="hidden"
            />

            {/* Paperclip Button for Photos/Media */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-2xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 hover:text-white transition active:scale-95 shrink-0"
              aria-label="Adjuntar fotos"
              title="Adjuntar fotos"
            >
              <Paperclip className="w-5 h-5 text-pink-400" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Escribe a ${activeChat.profile.name.split(' ')[0]}...`}
              className="flex-1 bg-neutral-900/90 border border-purple-500/30 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-purple-400 transition"
            />

            {/* Microphone Button for Voice Notes */}
            <button
              type="button"
              onClick={startVoiceRecording}
              className="p-2.5 rounded-2xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-pink-400 hover:text-pink-300 transition active:scale-95 shrink-0"
              aria-label="Grabar audio"
              title="Grabar nota de voz"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white hover:brightness-110 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label="Enviar mensaje"
              title="Enviar"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* MODAL: REPORTAR USUARIO */}
        {reportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-3xl bg-[#140827] border border-rose-500/40 p-5 shadow-2xl text-white space-y-4">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <ShieldAlert className="w-5 h-5" />
                  <span>Reportar a {activeChat.profile.name}</span>
                </div>
                <button onClick={() => setReportModalOpen(false)} className="text-white/60 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <label className="text-white/80 font-semibold block">Motivo del reporte:</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-900 border border-purple-500/40 text-white text-xs focus:outline-none"
                >
                  <option value="Incumplimiento de consentimiento y reglas">Incumplimiento de consentimiento (No es no)</option>
                  <option value="Fotos o perfil falso / Suplantación">Fotos o perfil falso / Suplantación</option>
                  <option value="Lenguaje ofensivo o acoso">Lenguaje ofensivo o acoso</option>
                  <option value="Cobro no autorizado / Spam comercial">Cobro no autorizado / Spam comercial</option>
                  <option value="Conducta riesgosa o inapropiada">Conducta riesgosa o inapropiada</option>
                </select>
              </div>

              <div className="space-y-2 text-xs">
                <label className="text-white/80 font-semibold block">Detalles adicionales (opcional):</label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Describe brevemente lo sucedido para agilizar la revisión..."
                  className="w-full p-2.5 rounded-xl bg-neutral-900 border border-purple-500/40 text-white text-xs focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReport}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
                >
                  Confirmar Reporte
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: BLOQUEAR USUARIO */}
        {blockModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-3xl bg-[#140827] border border-amber-500/40 p-5 shadow-2xl text-white space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Ban className="w-5 h-5" />
                <span>¿Bloquear a {activeChat.profile.name}?</span>
              </div>

              <p className="text-xs text-white/80 leading-relaxed">
                Al bloquear a esta persona, ya no podrá ver tu perfil, enviarte mensajes de texto, fotos ni audios. Esta acción removerá el chat de tu bandeja.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBlockModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBlock}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 text-white text-xs font-bold shadow-lg"
                >
                  Sí, Bloquear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PEERJS WEBRTC VIDEO CALL MODAL */}
        {videoCallOpen && activeChat && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl bg-neutral-900 border border-purple-500/40 p-5 shadow-2xl space-y-4 text-center">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-pink-400" />
                  Videollamada Segura WebRTC (PeerJS)
                </span>
                <button
                  onClick={() => setVideoCallOpen(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-white/70"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative w-full h-56 rounded-2xl bg-neutral-950 border border-purple-500/30 overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/40 to-pink-950/40 flex flex-col items-center justify-center gap-2">
                  <img
                    src={activeChat.profile.photos[0] || activeChat.profile.photo}
                    alt={activeChat.profile.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-pink-500 shadow-lg animate-pulse"
                  />
                  <span className="text-xs font-bold text-white">{activeChat.profile.name}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Conectado P2P (PeerJS de tú a tú)</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setVideoCallOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg active:scale-95 transition flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span>Colgar / Finalizar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GOOGLE KEEP SYNC MODAL */}
        {keepSyncOpen && activeChat && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl bg-neutral-900 border border-amber-500/40 p-5 shadow-2xl space-y-4 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Sincronización con Google Keep
                </span>
                <button
                  onClick={() => setKeepSyncOpen(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-white/70"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-purple-200/80">
                Guarda los acuerdos, fechas o notas importantes de tu conversación con <strong className="text-white">{activeChat.profile.name}</strong> directamente en tu cuenta de Google Keep vinculada.
              </p>

              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2 font-mono text-[11px] text-purple-200">
                <div className="text-amber-300 font-bold">Nota generada para Keep:</div>
                <div className="text-white/80">
                  &bull; Match: {activeChat.profile.name} ({activeChat.profile.age} años)<br />
                  &bull; Última interacción: {new Date().toLocaleDateString()}<br />
                  &bull; Estado: Conexión segura AppSwinger Ultra Plus
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setKeepSyncOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setKeepSynced(true);
                    setKeepSyncOpen(false);
                    showToast(`¡Nota sincronizada exitosamente con Google Keep de tu cuenta!`);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-xs font-bold text-black shadow-md flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sincronizar con Keep</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // INBOX / MATCHES LIST VIEW
  const filteredMatches = matches.filter(m => 
    m.profile.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-md mx-auto p-4 pb-24 text-white overflow-y-auto">
      
      {/* Toast feedback */}
      {toastMessage && (
        <div className="mb-4 p-3 rounded-2xl bg-neutral-900/95 border border-purple-500/50 shadow-2xl text-xs text-white flex items-center gap-2 animate-bounce">
          <ThumbsUp className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">
            Bandeja de Mensajes
          </h2>
          <p className="text-xs text-purple-200/70">Tus conversaciones y acuerdos seguros</p>
        </div>
      </div>

      {/* Quick notice about safety, clip and mic */}
      <div className="p-3 mb-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center gap-2 text-[11px] text-purple-200">
        <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
        <span>Selecciona un match para chatear, adjuntar fotos (📎) o grabar notas de voz (🎙).</span>
      </div>

      {/* Search Input */}
      <div className="relative mb-5">
        <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar matches o conversaciones..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-neutral-900/80 border border-purple-500/25 text-xs text-white placeholder-white/40 focus:outline-none focus:border-purple-400"
        />
      </div>

      {/* Horizontal Recent Matches Strip (Screenshot 4) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
            Nuevos Matches ({matches.length})
          </span>
          <span className="text-[11px] text-pink-400 flex items-center gap-1 font-semibold">
            <Sparkles className="w-3 h-3" />
            Toca para chatear
          </span>
        </div>

        {matches.length === 0 ? (
          <div className="p-4 rounded-3xl bg-white/5 border border-white/10 text-center text-xs text-white/60">
            Desliza a la derecha en perfiles de tu agrado para generar Matches y comenzar a chatear.
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

      {/* Active Chats List */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-3">
          Conversaciones Activas
        </h3>

        {filteredMatches.length === 0 ? (
          <div className="py-12 text-center text-white/50 text-xs">
            Sin conversaciones que coincidan con tu búsqueda.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredMatches.map((item) => {
              const msgs = chatMessages[item.profile.id];
              const lastMsg = msgs ? msgs[msgs.length - 1]?.t : item.lastMessage || '¡Hola! Es un Match mutuo ✨';
              
              return (
                <div
                  key={item.id}
                  onClick={() => setActiveChat(item)}
                  className="p-3.5 rounded-2xl bg-neutral-900/60 border border-purple-500/20 hover:bg-purple-950/40 flex items-center gap-3.5 transition cursor-pointer group"
                >
                  <div className="relative">
                    <img
                      src={item.profile.photos[0] || item.profile.photo || ''}
                      alt={item.profile.name}
                      className="w-13 h-13 rounded-2xl object-cover border border-purple-500/30 group-hover:scale-105 transition-transform"
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
                      <span className="text-[10px] text-white/40">Activo</span>
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
