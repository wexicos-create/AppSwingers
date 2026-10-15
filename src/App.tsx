import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut, User } from 'firebase/auth';
import { 
  auth, 
  googleProvider, 
  syncUserProfile, 
  recordSwipe, 
  recordMatch, 
  fetchUserMatches, 
  testConnection 
} from './firebase';
import { 
  Profile, 
  SwipeAction, 
  MatchItem, 
  ClubEvent, 
  Proposal, 
  Creator, 
  LiveStream, 
  ReportItem, 
  Reservation, 
  PaymentItem,
  SystemAnnouncement
} from './types';
import { 
  INITIAL_PROFILES, 
  INITIAL_EVENTS, 
  INITIAL_PROPOSALS, 
  INITIAL_CREATORS, 
  INITIAL_LIVES, 
  INITIAL_REPORTS 
} from './data/mockProfiles';
import { SwipeCard } from './components/SwipeCard';
import { ActionButtons } from './components/ActionButtons';
import { MatchModal } from './components/MatchModal';
import { ProfileDetailsModal } from './components/ProfileDetailsModal';
import { ProposalsView } from './components/ProposalsView';
import { EventsView } from './components/EventsView';
import { VirtualView } from './components/VirtualView';
import { ChatView } from './components/ChatView';
import { ProfileView } from './components/ProfileView';
import { AdminModal } from './components/AdminModal';
import { LegalModal } from './components/LegalModal';
import { 
  Flame, 
  Megaphone, 
  CalendarDays, 
  Radio, 
  User as UserIcon, 
  MessageCircle, 
  RotateCcw, 
  Shield, 
  Sparkles, 
  Bell,
  X
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'match' | 'propuestas' | 'eventos' | 'virtual' | 'perfil'>('match');

  // Core application collections
  const [profiles, setProfiles] = useState<Profile[]>(INITIAL_PROFILES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedHistory, setSwipedHistory] = useState<{ profile: Profile; action: SwipeAction }[]>([]);

  // Events & Ticketing
  const [events, setEvents] = useState<ClubEvent[]>(INITIAL_EVENTS);
  const [reservations, setReservations] = useState<Reservation[]>([
    {
      id: 'res_init',
      eventId: 'e1',
      tier: 'pareja',
      folio: 'F-892',
      code: 'AS-POL-782',
      ts: Date.now() - 86400000,
      status: 'pagado',
    }
  ]);

  // Proposals
  const [proposals, setProposals] = useState<Proposal[]>(INITIAL_PROPOSALS);
  const [appliedProposalIds, setAppliedProposalIds] = useState<string[]>([]);
  const [savedProposalIds, setSavedProposalIds] = useState<string[]>([]);

  // Virtual & Creators
  const [creators, setCreators] = useState<Creator[]>(INITIAL_CREATORS);
  const [userCreator, setUserCreator] = useState<Creator | null>(null);
  const [subscribedCreatorHandles, setSubscribedCreatorHandles] = useState<string[]>(['@lunaroja']);
  const [liveAccessIds, setLiveAccessIds] = useState<string[]>(['l1']);
  const [lives, setLives] = useState<LiveStream[]>(INITIAL_LIVES);

  // Moderation & Reports
  const [reports, setReports] = useState<ReportItem[]>(INITIAL_REPORTS);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([
    {
      id: 'ann_1',
      title: '¡Bienvenidos a la Noche de Antifaz Mascarada!',
      body: 'Recuerda que el acceso requiere registro previo y prueba de mayoría de edad. Código de vestimenta riguroso.',
      ts: Date.now(),
    }
  ]);
  const [activeAnnouncement, setActiveAnnouncement] = useState<SystemAnnouncement | null>(announcements[0]);

  // Club de Experiencias (10 stamps punch card)
  const [attendStamps, setAttendStamps] = useState(7);
  const [redeemedClubFolio, setRedeemedClubFolio] = useState<string | null>(null);

  // Matches & Chat
  const [matches, setMatches] = useState<MatchItem[]>([
    {
      id: 'm-1',
      profile: INITIAL_PROFILES[0], // Emma
      matchedAt: new Date(Date.now() - 3600000).toISOString(),
      lastMessage: 'Totally stealing that. Sounds weirdly healing.',
      unreadCount: 1,
    },
    {
      id: 'm-2',
      profile: INITIAL_PROFILES[2], // Ava Williams
      matchedAt: new Date(Date.now() - 7200000).toISOString(),
      lastMessage: '¡Culpable! 🍵 ¿Y tú qué prefieres antes de una fiesta?',
      unreadCount: 0,
    }
  ]);

  // Modals
  const [matchModalProfile, setMatchModalProfile] = useState<Profile | null>(null);
  const [detailsProfile, setDetailsProfile] = useState<Profile | null>(null);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);

  // Discovery Filter
  const [maxDistance, setMaxDistance] = useState(30);

  // Firebase auth & test connection
  useEffect(() => {
    testConnection().then(ok => setIsFirestoreConnected(ok));

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await syncUserProfile(currentUser);
          const remoteMatches = await fetchUserMatches(currentUser.uid);
          if (remoteMatches.length > 0) {
            setMatches(prev => {
              const combined = [...remoteMatches, ...prev];
              const seen = new Set();
              return combined.filter(m => {
                if (seen.has(m.profile.id)) return false;
                seen.add(m.profile.id);
                return true;
              });
            });
          }
        } catch (e) {
          console.warn('Firebase user sync note:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Google sign in
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncUserProfile(result.user);
      }
    } catch (e: any) {
      console.warn('Sign In error:', e);
    }
  };

  const handleSignOut = async () => {
    try {
      await fbSignOut(auth);
      setUser(null);
    } catch (e) {
      console.warn('Sign Out error:', e);
    }
  };

  // Swiping mechanics
  const currentProfile = currentIndex < profiles.length ? profiles[currentIndex] : null;

  const handleSwipe = async (action: SwipeAction) => {
    if (!currentProfile) return;

    const target = currentProfile;
    setSwipedHistory(prev => [...prev, { profile: target, action }]);
    setCurrentIndex(prev => prev + 1);

    if (user) {
      try {
        await recordSwipe(user.uid, target, action);
      } catch (err) {
        console.warn('Error recording swipe:', err);
      }
    }

    // Match criteria
    const isMatch = action === 'superlike' || (action === 'like' && (target.likesYou || (target.matchPercentage || 80) >= 90));

    if (isMatch) {
      const newMatch: MatchItem = {
        id: `match_${target.id}_${Date.now()}`,
        profile: target,
        matchedAt: new Date().toISOString(),
        lastMessage: '¡Nuevo Match mutuo! Saludarse primero ✨',
        unreadCount: 1,
      };

      setMatches(prev => [newMatch, ...prev]);

      if (user) {
        try {
          await recordMatch(user.uid, target);
        } catch (err) {
          console.warn('Error saving match:', err);
        }
      }

      setMatchModalProfile(target);
    }
  };

  const handleRewind = () => {
    if (swipedHistory.length === 0 || currentIndex === 0) return;
    setSwipedHistory(prev => prev.slice(0, -1));
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleResetDeck = () => {
    setCurrentIndex(0);
    setSwipedHistory([]);
  };

  // Event reservation handler
  const handleReserveEvent = (eventId: string, tierId: string | null) => {
    const code = `AS-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const newReservation: Reservation = {
      id: `res_${Date.now()}`,
      eventId,
      tier: tierId,
      folio: `F-${Math.floor(100 + Math.random() * 900)}`,
      code,
      ts: Date.now(),
      status: 'pagado',
    };
    setReservations(prev => [newReservation, ...prev]);
    // Also increase event sold count
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, sold: e.sold + 1 } : e));
    alert(`¡Pase apartado con éxito! Tu código de acceso es ${code}.`);
  };

  const handleCancelReservation = (reservationId: string) => {
    setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'cancelado' } : r));
  };

  // Proposal handlers
  const handleApplyProposal = (proposal: Proposal) => {
    setAppliedProposalIds(prev => [...prev, proposal.id]);
    alert("Postulación enviada en privado al autor. Tu identidad completa no se comparte hasta acordar mutuamente.");
  };

  const handleToggleSaveProposal = (id: string) => {
    setSavedProposalIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCreateProposal = (data: { title: string; cat: string; body: string; limited: boolean }) => {
    const newProp: Proposal = {
      id: `prop_${Date.now()}`,
      title: data.title,
      cat: data.cat,
      author: data.limited ? 'Pareja anfitriona · identidad limitada' : (user?.displayName || 'Tú'),
      when: 'ahora',
      apps: 0,
      status: 'publicada',
      body: data.body || 'Sin descripción adicional.',
      mine: true,
    };
    setProposals(prev => [newProp, ...prev]);
    alert("¡Propuesta publicada con éxito en la cartelera!");
  };

  // Creator handlers
  const handleSubscribeCreator = (creator: Creator) => {
    setSubscribedCreatorHandles(prev => [...prev, creator.handle]);
    alert(`¡Suscripción confirmada a ${creator.name}! Contenido íntimo desbloqueado.`);
  };

  const handleBuyLiveAccess = (live: LiveStream) => {
    setLiveAccessIds(prev => [...prev, live.id]);
    alert(`¡Pase Prime adquirido para "${live.title}"! Podrás ingresar a la transmisión.`);
  };

  // Club reward redemption
  const handleRedeemClubReward = () => {
    const folio = `CLB-${Math.floor(1000 + Math.random() * 9000)}`;
    setRedeemedClubFolio(folio);
    alert(`¡Felicidades por completar 10 sellos! Tu folio de canje es ${folio}.`);
  };

  // Check-in ticket validation for admin
  const handleCheckinTicket = (code: string) => {
    const res = reservations.find(r => (r.code === code || r.folio === code) && r.status !== 'cancelado');
    if (res) {
      setReservations(prev => prev.map(r => r.id === res.id ? { ...r, status: 'asistió' } : r));
      setAttendStamps(prev => Math.min(10, prev + 1));
      alert(`¡Check-in exitoso! Asistencia validada para ${res.code}. Se ha otorgado +1 sello del Club de Experiencias.`);
    } else {
      alert("Código no encontrado o reserva cancelada.");
    }
  };

  // Export data
  const handleExportData = () => {
    const data = {
      user: user?.displayName || 'Usuario',
      email: user?.email,
      reservations,
      appliedProposalIds,
      swipesCount: swipedHistory.length,
      matchesCount: matches.length,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appswinguer-mis-datos-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleWipeData = () => {
    if (window.confirm("¿Estás seguro de que deseas restablecer los datos de este dispositivo?")) {
      setCurrentIndex(0);
      setSwipedHistory([]);
      setAppliedProposalIds([]);
      setRedeemedClubFolio(null);
      alert("Datos locales restablecidos.");
    }
  };

  return (
    <div className="min-h-screen bg-[#07030d] flex justify-center text-white selection:bg-pink-500 selection:text-white">
      
      {/* Background neon ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-purple-900/25 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-0 w-[450px] h-[450px] bg-pink-900/20 rounded-full blur-[140px]" />
      </div>

      {/* Main Screen App Shell Container */}
      <div className="w-full max-w-md min-h-screen flex flex-col relative z-10 border-x border-purple-900/20 bg-gradient-to-b from-[#100720] via-[#090412] to-[#06020c] shadow-2xl">
        
        {/* App Top Bar */}
        <header className="px-5 py-3.5 flex items-center justify-between border-b border-purple-500/20 bg-neutral-950/60 backdrop-blur-xl sticky top-0 z-40">
          {/* Logo & Brand */}
          <div 
            onClick={() => setActiveTab('match')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-600/30 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent flex items-center gap-1.5">
                APPSWINGUER <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-900/50 text-purple-300 font-bold border border-purple-400/30">ULTRA</span>
              </h1>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            {/* Messages Drawer Trigger with glowing badge */}
            <button
              onClick={() => setChatDrawerOpen(true)}
              className="relative p-2 rounded-2xl bg-purple-950/60 hover:bg-purple-900/70 border border-purple-500/30 text-white transition active:scale-95"
              aria-label="Mensajes y Matches"
            >
              <MessageCircle className="w-5 h-5 text-pink-400" />
              {matches.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-[9px] font-bold text-white flex items-center justify-center shadow-md">
                  {matches.length}
                </span>
              )}
            </button>

            {/* User Profile or Google Sign In */}
            {user ? (
              <button
                onClick={() => setActiveTab('perfil')}
                className="p-1 rounded-full bg-purple-950 border-2 border-purple-500/60 hover:border-pink-500/80 transition"
              >
                <img
                  src={user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'}
                  alt={user.displayName || 'Perfil'}
                  className="w-7 h-7 rounded-full object-cover"
                />
              </button>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="px-3 py-1.5 rounded-xl bg-white text-neutral-950 text-xs font-bold shadow-md hover:bg-neutral-100 active:scale-95 transition"
              >
                Acceder
              </button>
            )}
          </div>
        </header>

        {/* System Push Announcement Banner (Dismissible with X) */}
        {activeAnnouncement && (
          <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/90 via-pink-950/80 to-purple-950/90 border border-pink-500/40 text-xs shadow-lg flex items-start gap-3 relative">
            <Sparkles className="w-5 h-5 text-pink-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1 pr-6">
              <strong className="text-white block font-bold text-xs">{activeAnnouncement.title}</strong>
              <p className="text-purple-200/90 text-[11px] mt-0.5 leading-snug">{activeAnnouncement.body}</p>
            </div>
            <button
              onClick={() => setActiveAnnouncement(null)}
              className="absolute top-3 right-3 text-white/50 hover:text-white p-1"
              aria-label="Cerrar anuncio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Content Display */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          
          {/* TAB 1: DESCUBRIR / SWIPE DECK */}
          {activeTab === 'match' && (
            <div className="flex-1 flex flex-col justify-between p-4 pb-20">
              
              {/* Card Deck Viewport */}
              <div className="relative w-full aspect-[3/4.4] max-h-[570px] my-auto">
                {currentProfile ? (
                  <>
                    {/* Render next card in background for tactile depth */}
                    {currentIndex + 1 < profiles.length && (
                      <SwipeCard
                        key={profiles[currentIndex + 1].id}
                        profile={profiles[currentIndex + 1]}
                        isFront={false}
                        onSwipe={() => {}}
                        onOpenDetails={() => {}}
                      />
                    )}

                    {/* Active front draggable card */}
                    <SwipeCard
                      key={currentProfile.id}
                      profile={currentProfile}
                      isFront={true}
                      onSwipe={handleSwipe}
                      onOpenDetails={(p) => setDetailsProfile(p)}
                    />
                  </>
                ) : (
                  /* Reached the end of the deck */
                  <div className="absolute inset-0 rounded-[36px] bg-neutral-900/70 border border-purple-500/20 p-8 flex flex-col items-center justify-center text-center shadow-xl backdrop-blur-md">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600/30 to-pink-600/30 border border-purple-500/40 flex items-center justify-center mb-4">
                      <Sparkles className="w-10 h-10 text-pink-400 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Has visto todos los perfiles</h3>
                    <p className="text-xs text-purple-200/70 max-w-xs mb-6 leading-relaxed">
                      Explora las propuestas de la comunidad o revisa los eventos privados programados para este fin de semana en CDMX.
                    </p>
                    <button
                      onClick={handleResetDeck}
                      className="py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 hover:brightness-110 active:scale-95 transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Revisar Perfiles Nuevamente
                    </button>
                  </div>
                )}
              </div>

              {/* Floating Action Buttons */}
              <div className="mt-2">
                <ActionButtons
                  onSwipe={handleSwipe}
                  onRewind={handleRewind}
                  canRewind={swipedHistory.length > 0 && currentIndex > 0}
                  onQuickMessage={() => {
                    if (currentProfile) {
                      setDetailsProfile(currentProfile);
                    }
                  }}
                  disabled={!currentProfile}
                />
              </div>
            </div>
          )}

          {/* TAB 2: PROPUESTAS */}
          {activeTab === 'propuestas' && (
            <ProposalsView
              proposals={proposals}
              appliedIds={appliedProposalIds}
              savedIds={savedProposalIds}
              onApply={handleApplyProposal}
              onToggleSave={handleToggleSaveProposal}
              onCreateProposal={handleCreateProposal}
              onOpenReport={(target) => alert(`Reporte recibido para propuesta "${target.name}". Se enviará a moderación.`)}
            />
          )}

          {/* TAB 3: EVENTOS */}
          {activeTab === 'eventos' && (
            <EventsView
              events={events}
              reservations={reservations}
              onReserve={handleReserveEvent}
              onCancelReservation={handleCancelReservation}
              onAgencyPromoRequest={(data) => {
                alert(`Solicitud recibida para la agencia "${data.agency}". Nos pondremos en contacto con las tarifas del plan seleccionado.`);
              }}
            />
          )}

          {/* TAB 4: VIRTUAL & CREADORAS */}
          {activeTab === 'virtual' && (
            <VirtualView
              creators={creators}
              lives={lives}
              userCreator={userCreator}
              subscribedIds={subscribedCreatorHandles}
              liveAccessIds={liveAccessIds}
              onSubscribe={handleSubscribeCreator}
              onBuyLiveAccess={handleBuyLiveAccess}
              onRegisterCreator={(c) => {
                setUserCreator(c);
                setCreators(prev => [c, ...prev]);
                alert("¡Perfil de creadora registrado! Ya puedes fijar precios y subir sets exclusivos.");
              }}
              onUploadMedia={(data) => {
                alert(`Contenido "${data.caption}" enviado a moderación. Estará disponible en tu perfil.`);
              }}
            />
          )}

          {/* TAB 5: PERFIL & CLUB */}
          {activeTab === 'perfil' && (
            <ProfileView
              user={user}
              onSignIn={handleGoogleSignIn}
              onSignOut={handleSignOut}
              stats={{
                swipesCount: swipedHistory.length,
                matchesCount: matches.length,
                likesCount: swipedHistory.filter(h => h.action === 'like' || h.action === 'superlike').length,
              }}
              attendStamps={attendStamps}
              redeemedClubFolio={redeemedClubFolio}
              onRedeemClubReward={handleRedeemClubReward}
              maxDistance={maxDistance}
              onChangeMaxDistance={setMaxDistance}
              isFirestoreConnected={isFirestoreConnected}
              onOpenAdmin={() => setAdminModalOpen(true)}
              onOpenLegal={() => setLegalModalOpen(true)}
              onExportData={handleExportData}
              onWipeData={handleWipeData}
            />
          )}
        </main>

        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto z-40 px-3 py-2.5 bg-[#0a0515]/90 backdrop-blur-2xl border-t border-purple-500/20 flex items-center justify-around shadow-2xl">
          <button
            onClick={() => setActiveTab('match')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'match' ? 'text-pink-500 scale-105' : 'text-neutral-500 hover:text-white'
            }`}
            aria-label="Descubrir"
          >
            <Flame className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-bold">Match</span>
          </button>

          <button
            onClick={() => setActiveTab('propuestas')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'propuestas' ? 'text-purple-400 scale-105' : 'text-neutral-500 hover:text-white'
            }`}
            aria-label="Propuestas"
          >
            <Megaphone className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-bold">Propuestas</span>
          </button>

          <button
            onClick={() => setActiveTab('eventos')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'eventos' ? 'text-purple-400 scale-105' : 'text-neutral-500 hover:text-white'
            }`}
            aria-label="Eventos"
          >
            <CalendarDays className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-bold">Eventos</span>
          </button>

          <button
            onClick={() => setActiveTab('virtual')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'virtual' ? 'text-purple-400 scale-105' : 'text-neutral-500 hover:text-white'
            }`}
            aria-label="Virtual"
          >
            <Radio className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-bold">Virtual</span>
          </button>

          <button
            onClick={() => setActiveTab('perfil')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'perfil' ? 'text-pink-500 scale-105' : 'text-neutral-500 hover:text-white'
            }`}
            aria-label="Perfil"
          >
            <UserIcon className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-bold">Perfil</span>
          </button>
        </nav>

        {/* DRAWER: CHAT & MENSAJES */}
        {chatDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-center bg-black/80 backdrop-blur-xl">
            <div className="w-full max-w-md h-full bg-[#0b0616] flex flex-col relative">
              <div className="p-3 border-b border-purple-500/20 flex items-center justify-between bg-neutral-950/70">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Mensajes</span>
                <button
                  onClick={() => setChatDrawerOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/80"
                  aria-label="Cerrar chat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatView
                  matches={matches}
                  onOpenProfile={(p) => setDetailsProfile(p)}
                  onOpenReport={(t) => alert(`Reporte registrado para ${t.name}.`)}
                  onBlockUser={(id) => {
                    setMatches(prev => prev.filter(m => m.profile.id !== id));
                    alert("Usuario bloqueado.");
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* MODAL: IT'S A MATCH CELEBRATION */}
        <MatchModal
          isOpen={!!matchModalProfile}
          matchProfile={matchModalProfile}
          currentUserPhoto={user?.photoURL || undefined}
          currentUserName={user?.displayName || 'Tú'}
          onClose={() => setMatchModalProfile(null)}
          onStartChat={(profile) => {
            setMatchModalProfile(null);
            setChatDrawerOpen(true);
          }}
        />

        {/* MODAL: DETALLES DE PERFIL */}
        <ProfileDetailsModal
          profile={detailsProfile}
          onClose={() => setDetailsProfile(null)}
          onSwipe={(action) => {
            if (detailsProfile) {
              handleSwipe(action);
            }
          }}
        />

        {/* MODAL: PANEL ADMIN */}
        <AdminModal
          isOpen={adminModalOpen}
          onClose={() => setAdminModalOpen(false)}
          profiles={profiles}
          events={events}
          proposals={proposals}
          reports={reports}
          reservations={reservations}
          payments={payments}
          announcements={announcements}
          attendStamps={attendStamps}
          onVerifyUser={(userId, status) => {
            setProfiles(prev => prev.map(p => p.id === userId ? { ...p, verify: status } : p));
            alert(`Estado de verificación actualizado a "${status}".`);
          }}
          onSuspendUser={(userId) => {
            setProfiles(prev => prev.map(p => p.id === userId ? { ...p, status: p.status === 'activo' ? 'suspendido' : 'activo' } : p));
          }}
          onResolveReport={(reportId, action) => {
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resuelto', action } : r));
            alert(`Reporte resuelto con acción: ${action}.`);
          }}
          onApproveProposal={(propId) => {
            setProposals(prev => prev.map(p => p.id === propId ? { ...p, status: 'publicada' } : p));
            alert("Propuesta aprobada y publicada.");
          }}
          onApproveEventRequest={(ev) => {
            setEvents(prev => [...prev, ev]);
            alert("Evento de agencia aprobado en cartelera.");
          }}
          onCheckinTicket={handleCheckinTicket}
          onConfirmPayment={(pId) => {
            setPayments(prev => prev.map(p => p.id === pId ? { ...p, status: 'confirmado' } : p));
            alert("Pago confirmado.");
          }}
          onBroadcastAnnouncement={(title, body) => {
            const newAnn = { id: `ann_${Date.now()}`, title, body, ts: Date.now() };
            setAnnouncements(prev => [newAnn, ...prev]);
            setActiveAnnouncement(newAnn);
            alert("¡Anuncio publicado a toda la comunidad!");
          }}
        />

        {/* MODAL: LEGAL & SEGURIDAD */}
        <LegalModal
          isOpen={legalModalOpen}
          onClose={() => setLegalModalOpen(false)}
        />

      </div>
    </div>
  );
}
