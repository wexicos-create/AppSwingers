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
  SystemAnnouncement,
  AppRegion,
  CollaborationProposal,
  ProfileKind,
  SubscriptionTier
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
import { CommunityView } from './components/CommunityView';
import { ChatView } from './components/ChatView';
import { ProfileView } from './components/ProfileView';
import { AdminModal } from './components/AdminModal';
import { LegalModal } from './components/LegalModal';
import { CollaborationModal } from './components/CollaborationModal';
import { RegistrationModal } from './components/RegistrationModal';
import { MonetizationExtrasModal } from './components/MonetizationExtrasModal';
import { DICTIONARY, Language, detectUserRegionAndLang } from './i18n';
import { 
  Flame, 
  Megaphone, 
  CalendarDays, 
  Radio, 
  User as UserIcon, 
  MessageCircle, 
  RotateCcw, 
  Sparkles, 
  Globe,
  X,
  Navigation,
  SlidersHorizontal,
  Zap,
  Users,
  BookOpen
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false);

  // Region and Language Detection (Default San Luis Potosí, México with USA option)
  const [region, setRegion] = useState<AppRegion>('MX');
  const [lang, setLang] = useState<Language>('es');
  const [locationGranted, setLocationGranted] = useState(false);
  const isEs = lang === 'es';
  const dict = DICTIONARY[lang] || DICTIONARY.es;

  // Registered User Profile (Pareja o Individual, con gustos pasionales y fantasías)
  const [userProfile, setUserProfile] = useState<{
    alias: string;
    kind: ProfileKind;
    bio: string;
    interests: string[];
    seeking: string[];
    ages: string[];
    maxKm: number;
    locationCity: string;
  }>({
    alias: 'Pareja Fuego',
    kind: 'Pareja',
    bio: 'Pareja liberal de San Luis Potosí. Reglas claras, respeto y química mutua.',
    interests: ['Swinger', 'Fiestas privadas', 'Intercambio suave', 'Antifaz'],
    seeking: ['Parejas', 'Mujeres'],
    ages: ['26–39'],
    maxKm: 30,
    locationCity: 'San Luis Potosí, SLP',
  });

  // Active navigation tab & subscription tier
  const [activeTab, setActiveTab] = useState<'match' | 'propuestas' | 'eventos' | 'virtual' | 'comunidad' | 'perfil'>('match');
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');

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
      title: isEs ? '¡Bienvenidos a AppSwinguer Ultra Plus!' : 'Welcome to AppSwinguer Ultra Plus!',
      body: isEs 
        ? 'Lanzamiento oficial en San Luis Potosí y cobertura en México & USA. Acceso exclusivo para adultos con verificación obligatoria.' 
        : 'Official launch in San Luis Potosí & full coverage in Mexico & USA. Adults only with mandatory verification.',
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
      lastMessage: isEs ? 'Totalmente de acuerdo. Las reglas claras hacen todo más divertido.' : 'Totally stealing that. Sounds healing.',
      unreadCount: 1,
    },
    {
      id: 'm-2',
      profile: INITIAL_PROFILES[2], // Ava Williams
      matchedAt: new Date(Date.now() - 7200000).toISOString(),
      lastMessage: isEs ? '¡Culpable! 🍵 ¿Y tú qué prefieres antes de una fiesta?' : 'Guilty as charged! What do you prefer?',
      unreadCount: 0,
    }
  ]);

  // Modals & Drawers state
  const [matchModalProfile, setMatchModalProfile] = useState<Profile | null>(null);
  const [detailsProfile, setDetailsProfile] = useState<Profile | null>(null);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [collaborationModalOpen, setCollaborationModalOpen] = useState(false);
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [extrasModalOpen, setExtrasModalOpen] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);

  // Discovery Filter (KM Radius)
  const [maxDistance, setMaxDistance] = useState(userProfile.maxKm || 30);

  // Auto-detect IP and Region on startup
  useEffect(() => {
    detectUserRegionAndLang().then(({ region: r, lang: l }) => {
      setRegion(r);
      setLang(l);
    });

    // Request GPS location automatically
    requestLocationAccess();
  }, []);

  // Location request to determine exact KM distances and country
  const requestLocationAccess = () => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationGranted(true);
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          // Mexico geographical bounds: lat 14 to 33, lng -119 to -85
          if (lat >= 14 && lat <= 33 && lng >= -119 && lng <= -85) {
            setRegion('MX');
            setLang('es');
            setUserProfile(prev => ({ ...prev, locationCity: 'San Luis Potosí, SLP' }));
          } else {
            setRegion('US');
            setLang('en');
            setUserProfile(prev => ({ ...prev, locationCity: 'United States' }));
          }
        },
        (err) => {
          console.warn('Geolocation note:', err);
          setLocationGranted(false);
        },
        { enableHighAccuracy: false, timeout: 8000 }
      );
    }
  };

  // Global helper for opening collaboration modal
  useEffect(() => {
    (window as any).__openCollaborationModal = () => setCollaborationModalOpen(true);
    return () => {
      delete (window as any).__openCollaborationModal;
    };
  }, []);

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
        if (result.user.displayName) {
          setUserProfile(prev => ({ ...prev, alias: result.user.displayName || prev.alias }));
        }
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

  // Distance filtered profiles
  const visibleProfiles = profiles.filter(p => p.km <= maxDistance);
  const currentProfile = currentIndex < visibleProfiles.length ? visibleProfiles[currentIndex] : null;

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
        lastMessage: isEs ? '¡Nuevo Match mutuo! Saludarse primero ✨' : 'Mutual match! Say hi first ✨',
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

  // CRITICAL REQUIREMENT: DIRECT MATCH-TO-CHAT NAVIGATION
  const handleStartChatFromMatch = (profile: Profile) => {
    setMatches(prev => {
      const exists = prev.some(m => m.profile.id === profile.id);
      if (exists) return prev;
      return [
        {
          id: `match_${profile.id}_${Date.now()}`,
          profile: profile,
          matchedAt: new Date().toISOString(),
          lastMessage: isEs ? '¡Nuevo Match mutuo! Saludarse primero ✨' : 'New match! Say hello first ✨',
          unreadCount: 1,
        },
        ...prev,
      ];
    });
    setActiveChatUserId(profile.id);
    setMatchModalProfile(null);
    setChatDrawerOpen(true);
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
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, sold: e.sold + 1 } : e));
    alert(isEs ? `¡Pase apartado con éxito! Tu código de acceso es ${code}.` : `Pass confirmed! Your access code is ${code}.`);
  };

  const handleCancelReservation = (reservationId: string) => {
    setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'cancelado' } : r));
  };

  // Proposal handlers
  const handleApplyProposal = (proposal: Proposal) => {
    setAppliedProposalIds(prev => [...prev, proposal.id]);
    alert(isEs ? `Postulación enviada a "${proposal.title}". Tu identidad se mantiene confidencial.` : `Application sent to "${proposal.title}". Confidentiality preserved.`);
  };

  const handleToggleSaveProposal = (proposalId: string) => {
    setSavedProposalIds(prev => 
      prev.includes(proposalId) ? prev.filter(id => id !== proposalId) : [...prev, proposalId]
    );
  };

  const handleCreateProposal = (newProp: { title: string; cat: string; body: string; limited: boolean }) => {
    const created: Proposal = {
      id: `prop_${Date.now()}`,
      title: newProp.title,
      cat: newProp.cat,
      author: newProp.limited ? (isEs ? 'Tú (Identidad limitada)' : 'You (Discreet)') : (userProfile.alias || 'Tú'),
      when: isEs ? 'ahora' : 'just now',
      apps: 0,
      status: 'en revisión',
      body: newProp.body || (isEs ? 'Propuesta privada con reglas claras.' : 'Private proposal with clear boundaries.'),
      mine: true,
    };
    setProposals(prev => [created, ...prev]);
    alert(isEs ? 'Propuesta enviada para revisión.' : 'Proposal submitted for review.');
  };

  // Collaboration Proposal (Swinger/Gangbang $350 MXN / $80 USD)
  const handleSubmitCollaboration = (proposal: Omit<CollaborationProposal, 'id' | 'createdAt' | 'status' | 'paid'>) => {
    const fullProposal: CollaborationProposal = {
      ...proposal,
      id: `collab_${Date.now()}`,
      status: 'en revisión',
      paid: true,
      createdAt: Date.now(),
    };
    // Also insert as a public proposal
    const asProp: Proposal = {
      id: fullProposal.id,
      title: fullProposal.title,
      cat: fullProposal.eventType,
      author: `${fullProposal.organizerName} (${fullProposal.organizerType} Verificada)`,
      when: isEs ? 'ahora' : 'just now',
      apps: 0,
      status: 'en revisión',
      body: `Ciudad: ${fullProposal.city} | Ratio: ${fullProposal.attendeeRatio} | Reglas: ${fullProposal.consentRules} | Salud: ${fullProposal.healthProtocols}`,
      mine: true,
    };
    setProposals(prev => [asProp, ...prev]);
  };

  // Creator subscriptions
  const handleSubscribeCreator = (creator: Creator) => {
    setSubscribedCreatorHandles(prev => [...prev, creator.handle]);
    alert(isEs ? `¡Suscripción confirmada a ${creator.name} (${creator.handle})!` : `Subscribed to ${creator.name}!`);
  };

  const handleBuyLiveAccess = (live: LiveStream) => {
    setLiveAccessIds(prev => [...prev, live.id]);
    alert(isEs ? `¡Pase adquirido para "${live.title}"!` : `Live access confirmed!`);
  };

  // Club reward redemption
  const handleRedeemClubReward = () => {
    const folio = `CLB-${Math.floor(1000 + Math.random() * 9000)}`;
    setRedeemedClubFolio(folio);
    alert(isEs ? `¡Felicidades! Has canjeado tu recompensa del Club de Experiencias. Folio: ${folio}` : `Club reward redeemed! Folio: ${folio}`);
  };

  // Data privacy wipe
  const handleWipeData = () => {
    if (window.confirm(isEs ? '¿Restablecer datos locales de este dispositivo?' : 'Reset local data on this device?')) {
      setCurrentIndex(0);
      setSwipedHistory([]);
      setMatches([]);
      setAppliedProposalIds([]);
      setSavedProposalIds([]);
      alert(isEs ? 'Datos restablecidos.' : 'Data reset.');
    }
  };

  const handleExportData = () => {
    const payload = {
      userProfile,
      matches,
      reservations,
      appliedProposalIds,
      attendStamps,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appswinguer-data-${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#050307] text-[#f5eeff] flex justify-center font-sans select-none antialiased overflow-x-hidden">
      {/* Mobile Screen Shell container */}
      <div className="relative w-full max-w-[430px] min-h-screen h-[100dvh] flex flex-col bg-[#050307] shadow-[0_0_80px_rgba(177,76,255,0.25)] border-x border-purple-500/20 overflow-hidden">
        
        {/* Ambient Neon Aura Blob */}
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute top-2/3 -right-20 w-72 h-72 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Bar Header */}
        <header className="px-4 py-3 flex items-center justify-between border-b border-purple-500/20 bg-[#08050c]/90 backdrop-blur-xl sticky top-0 z-40 shrink-0">
          
          {/* Brand Wordmark */}
          <div 
            onClick={() => setActiveTab('match')}
            className="flex items-center gap-1.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,45,120,0.5)] group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 fill-white" />
            </div>
            <div className="leading-none">
              <span className="font-black text-sm tracking-wider uppercase text-white font-mono">
                APPSWINGUER
              </span>
              <span className="px-1.5 py-0.2 rounded bg-purple-900/80 text-[9px] font-black tracking-widest uppercase text-pink-300 ml-1 border border-pink-400/40">
                ULTRA
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5">
            
            {/* Location & Language Toggle (San Luis Potosí, México vs USA) */}
            <button
              onClick={() => {
                const nextReg = region === 'MX' ? 'US' : 'MX';
                const nextLang = nextReg === 'MX' ? 'es' : 'en';
                setRegion(nextReg);
                setLang(nextLang);
              }}
              className="px-2.5 py-1 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-[11px] font-bold text-white flex items-center gap-1 shadow-md active:scale-95 transition"
              title={isEs ? 'Cambiar a English (USA)' : 'Cambiar a Español (México - San Luis Potosí)'}
            >
              <Globe className="w-3.5 h-3.5 text-pink-400" />
              <span>{region === 'MX' ? '🇲🇽 ES' : '🇺🇸 EN'}</span>
            </button>

            {/* User Profile / Registration Pill */}
            <button
              onClick={() => setRegistrationModalOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-neutral-900/80 hover:bg-purple-950 border border-purple-500/30 text-[11px] font-bold text-purple-200 flex items-center gap-1 transition truncate max-w-[105px]"
              title={isEs ? 'Editar perfil, pareja o individual, y gustos' : 'Edit profile & fantasies'}
            >
              <UserIcon className="w-3 h-3 text-pink-400 shrink-0" />
              <span className="truncate">{userProfile.alias}</span>
            </button>

            {/* Messages Drawer Trigger */}
            <button
              onClick={() => {
                setActiveChatUserId(null);
                setChatDrawerOpen(true);
              }}
              className="relative p-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/70 border border-purple-500/30 text-white transition active:scale-95"
              aria-label={dict.messages}
            >
              <MessageCircle className="w-4 h-4 text-pink-400" />
              {matches.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-[9px] font-bold text-white flex items-center justify-center shadow-md">
                  {matches.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Location GPS Permission Reminder Banner */}
        {!locationGranted && (
          <div className="mx-3.5 mt-2.5 p-2.5 rounded-2xl bg-purple-950/70 border border-purple-500/30 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-pink-400 shrink-0" />
              <span className="text-[11px] text-purple-200">
                {isEs 
                  ? 'Activa tu GPS para calcular KM de distancia exactos en San Luis Potosí / México.' 
                  : 'Enable GPS location for accurate KM distance calculations in your area.'}
              </span>
            </div>
            <button
              onClick={requestLocationAccess}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-[10px] font-bold text-white shrink-0 active:scale-95 transition"
            >
              {isEs ? 'Activar' : 'Enable'}
            </button>
          </div>
        )}

        {/* System Announcement Banner */}
        {activeAnnouncement && (
          <div className="mx-3.5 mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-purple-950/90 via-pink-950/80 to-purple-950/90 border border-pink-500/40 text-xs shadow-lg flex items-start gap-2.5 relative">
            <Sparkles className="w-4 h-4 text-pink-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1 pr-6">
              <strong className="text-white block font-bold text-xs">{activeAnnouncement.title}</strong>
              <p className="text-purple-200/90 text-[11px] mt-0.5 leading-snug">{activeAnnouncement.body}</p>
            </div>
            <button
              onClick={() => setActiveAnnouncement(null)}
              className="absolute top-2.5 right-2.5 text-white/50 hover:text-white p-1"
              aria-label="Cerrar anuncio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Content Display */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          
          {/* TAB 1: MATCH / DISCOVER DECK */}
          {activeTab === 'match' && (
            <div className="flex-1 flex flex-col justify-between p-4 pb-20">
              
              {/* Distance adjustment chip bar */}
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs text-purple-200/80 font-medium flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-pink-400" />
                  <span>{isEs ? 'Radio:' : 'Radius:'} <strong>{maxDistance} km</strong></span>
                </span>

                <button
                  onClick={() => setRegistrationModalOpen(true)}
                  className="text-[11px] text-pink-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isEs ? 'Fantasías & Filtros' : 'Fantasies & Filters'}</span>
                </button>
              </div>

              {/* Card Deck Viewport */}
              <div className="relative w-full aspect-[3/4.4] max-h-[570px] my-auto">
                {currentProfile ? (
                  <>
                    {currentIndex + 1 < visibleProfiles.length && (
                      <SwipeCard
                        key={visibleProfiles[currentIndex + 1].id}
                        profile={visibleProfiles[currentIndex + 1]}
                        isFront={false}
                        onSwipe={() => {}}
                        onOpenDetails={() => {}}
                      />
                    )}

                    <SwipeCard
                      key={currentProfile.id}
                      profile={currentProfile}
                      isFront={true}
                      onSwipe={handleSwipe}
                      onOpenDetails={(p) => setDetailsProfile(p)}
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 rounded-[36px] bg-neutral-900/70 border border-purple-500/20 p-8 flex flex-col items-center justify-center text-center shadow-xl backdrop-blur-md">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600/30 to-pink-600/30 border border-purple-500/40 flex items-center justify-center mb-4">
                      <Sparkles className="w-10 h-10 text-pink-400 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {isEs ? 'Has visto todos los perfiles en este radio' : 'No more profiles in this radius'}
                    </h3>
                    <p className="text-xs text-purple-200/70 max-w-xs mb-6 leading-relaxed">
                      {isEs 
                        ? `Ajusta tu radio de ${maxDistance} km o explora las propuestas y eventos privados en San Luis Potosí y México.` 
                        : `Expand your ${maxDistance} km radius or explore private parties in the USA.`}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleResetDeck}
                        className="py-3 px-5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 hover:brightness-110 active:scale-95 transition"
                      >
                        <RotateCcw className="w-4 h-4" />
                        {isEs ? 'Revisar de nuevo' : 'Review again'}
                      </button>
                      <button
                        onClick={() => setRegistrationModalOpen(true)}
                        className="py-3 px-5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
                      >
                        {isEs ? 'Aumentar KM' : 'Expand KM'}
                      </button>
                    </div>
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
              onOpenReport={(target) => alert(isEs ? `Reporte recibido para "${target.name}".` : `Report registered.`)}
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
                alert(isEs ? `Solicitud recibida para la agencia "${data.agency}". Nos pondremos en contacto con las tarifas.` : `Request submitted.`);
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
              region={region}
              lang={lang}
              onSubscribe={handleSubscribeCreator}
              onBuyLiveAccess={handleBuyLiveAccess}
              onRegisterCreator={(c) => {
                setUserCreator(c);
                setCreators(prev => [c, ...prev]);
                alert(isEs ? "¡Perfil de creadora registrado! Ya puedes fijar precios y subir sets exclusivos." : "Creator profile registered!");
              }}
              onUploadMedia={(data) => {
                alert(isEs ? `Contenido "${data.caption}" enviado a moderación.` : `Content submitted to moderation.`);
              }}
            />
          )}

          {/* TAB 5: COMUNIDAD */}
          {activeTab === 'comunidad' && (
            <CommunityView
              region={region}
              isEs={isEs}
            />
          )}

          {/* TAB 6: PERFIL & CLUB */}
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
              onChangeMaxDistance={(val) => {
                setMaxDistance(val);
                setUserProfile(prev => ({ ...prev, maxKm: val }));
              }}
              isFirestoreConnected={isFirestoreConnected}
              onOpenAdmin={() => setAdminModalOpen(true)}
              onOpenLegal={() => setLegalModalOpen(true)}
              onExportData={handleExportData}
              onWipeData={handleWipeData}
            />
          )}
        </main>

        {/* FLOATING EXTRAS BUTTON (Direct from attached script!) */}
        <button
          onClick={() => setExtrasModalOpen(true)}
          id="asx-launch"
          className="fixed right-3.5 bottom-20 z-40 px-3.5 py-2 rounded-full bg-[#211a2f] border border-[#9b6bff] text-white text-xs font-bold shadow-xl flex items-center gap-1.5 active:scale-95 transition hover:brightness-110"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#d9c2ff]" />
          <span>＋ Extras</span>
        </button>

        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 inset-x-0 max-w-[430px] mx-auto z-40 px-3 py-2 bg-[#08050c]/90 backdrop-blur-2xl border-t border-purple-500/20 flex items-center justify-around shadow-2xl">
          <button
            onClick={() => setActiveTab('match')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'match' ? 'text-pink-500 scale-105' : 'text-neutral-500 hover:text-white'
            }`}
            aria-label="Descubrir"
          >
            <Flame className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-bold">{dict.tabMatch}</span>
          </button>

          <button
            onClick={() => setActiveTab('propuestas')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'propuestas' ? 'text-purple-400 scale-105' : 'text-neutral-500 hover:text-white'
            }`}
            aria-label="Propuestas"
          >
            <Megaphone className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-bold">{dict.tabProposals}</span>
          </button>

          <button
            onClick={() => setActiveTab('eventos')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'eventos' ? 'text-purple-400 scale-105' : 'text-neutral-500 hover:text-white'
            }`}
            aria-label="Eventos"
          >
            <CalendarDays className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-bold">{dict.tabEvents}</span>
          </button>

          <button
            onClick={() => setActiveTab('virtual')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'virtual' ? 'text-purple-400 scale-105' : 'text-neutral-500 hover:text-white'
            }`}
            aria-label="Virtual"
          >
            <Radio className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-bold">{dict.tabVirtual}</span>
          </button>

          <button
            onClick={() => setActiveTab('comunidad')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'comunidad' ? 'text-purple-400 scale-105' : 'text-neutral-500 hover:text-white'
            }`}
            aria-label="Comunidad"
          >
            <BookOpen className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-bold">{dict.tabCommunity}</span>
          </button>

          <button
            onClick={() => setActiveTab('perfil')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'perfil' ? 'text-pink-500 scale-105' : 'text-neutral-500 hover:text-white'
            }`}
            aria-label="Perfil"
          >
            <UserIcon className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-bold">{dict.tabProfile}</span>
          </button>
        </nav>

        {/* DRAWER: CHAT & MENSAJES (WITH PAPERCLIP 📎, MIC 🎙, AND BLOCK/REPORT) */}
        {chatDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-center bg-black/85 backdrop-blur-xl">
            <div className="w-full max-w-[430px] h-full bg-[#090414] flex flex-col relative">
              <div className="p-3 border-b border-purple-500/20 flex items-center justify-between bg-neutral-950/80">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  {dict.inboxTitle}
                </span>
                <button
                  onClick={() => {
                    setChatDrawerOpen(false);
                    setActiveChatUserId(null);
                  }}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/80"
                  aria-label="Cerrar chat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatView
                  matches={matches}
                  initialChatUserId={activeChatUserId}
                  onOpenProfile={(p) => setDetailsProfile(p)}
                  onOpenReport={(t) => alert(isEs ? `Reporte registrado para ${t.name}.` : `Report received.`)}
                  onBlockUser={(id) => {
                    setMatches(prev => prev.filter(m => m.profile.id !== id));
                    if (activeChatUserId === id) {
                      setActiveChatUserId(null);
                    }
                  }}
                  onBackToApp={() => setChatDrawerOpen(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* MODAL 1: REGISTRATION & SEXUAL TASTES / FANTASIES */}
        <RegistrationModal
          isOpen={registrationModalOpen}
          onClose={() => setRegistrationModalOpen(false)}
          lang={lang}
          region={region}
          initialData={userProfile}
          onSave={(data) => {
            setUserProfile({
              alias: data.alias,
              kind: data.kind,
              bio: data.bio,
              interests: data.interests,
              seeking: data.seeking,
              ages: data.ages,
              maxKm: data.maxKm,
              locationCity: data.locationCity || (region === 'MX' ? 'San Luis Potosí, SLP' : 'United States'),
            });
            setMaxDistance(data.maxKm);
            alert(isEs ? `¡Perfil actualizado para ${data.alias} (${data.kind})!` : `Profile updated!`);
          }}
          onRequestLocation={requestLocationAccess}
          locationGranted={locationGranted}
        />

        {/* MODAL 2: MONETIZATION EXTRAS (from script!) */}
        <MonetizationExtrasModal
          isOpen={extrasModalOpen}
          onClose={() => setExtrasModalOpen(false)}
          region={region}
          isEs={isEs}
          currentTier={subscriptionTier}
          onSelectTier={(tier) => setSubscriptionTier(tier)}
        />

        {/* MODAL 3: SWINGER / GANGBANG COLLABORATION PROPOSAL */}
        <CollaborationModal
          isOpen={collaborationModalOpen}
          onClose={() => setCollaborationModalOpen(false)}
          userKind={userProfile.kind}
          userName={userProfile.alias}
          region={region}
          onSwitchProfileKind={(kind) => {
            setUserProfile(prev => ({ ...prev, kind }));
          }}
          onSubmitProposal={handleSubmitCollaboration}
        />

        {/* MODAL 4: CELEBRATORY MATCH MODAL (DIRECT CHAT BUTTON) */}
        <MatchModal
          isOpen={!!matchModalProfile}
          matchProfile={matchModalProfile}
          currentUserPhoto={user?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'}
          currentUserName={userProfile.alias}
          onClose={() => setMatchModalProfile(null)}
          onStartChat={handleStartChatFromMatch}
        />

        {/* MODAL 5: COMPLETE PROFILE DETAILS */}
        <ProfileDetailsModal
          profile={detailsProfile}
          lang={lang}
          onClose={() => setDetailsProfile(null)}
          onSwipe={(action) => {
            setDetailsProfile(null);
            handleSwipe(action);
          }}
        />

        {/* MODAL 6: ADMIN PANEL */}
        {adminModalOpen && (
          <AdminModal
            isOpen={adminModalOpen}
            onClose={() => setAdminModalOpen(false)}
            isEs={isEs}
          />
        )}

        {/* MODAL 7: LEGAL RULES & CONSENT */}
        {legalModalOpen && (
          <LegalModal
            isOpen={legalModalOpen}
            onClose={() => setLegalModalOpen(false)}
          />
        )}

      </div>
    </div>
  );
}
