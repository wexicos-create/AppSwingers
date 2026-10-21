import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut, User } from './firebase';
import { 
  auth, 
  googleProvider, 
  syncUserProfile, 
  recordSwipe, 
  fetchUserMatches, 
  fetchDiscoverableProfiles,
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
import { PushLookupModal } from './components/PushLookupModal';
import { SafetyCenterModal } from './components/SafetyCenterModal';
import { supabase } from './supabase';
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
  BookOpen,
  Bell,
  Loader2,
  ShieldCheck
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  // Region and Language Detection (Default San Luis Potosí, México with USA option)
  const [region, setRegion] = useState<AppRegion>('MX');
  const [lang, setLang] = useState<Language>('es');
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationBannerDismissed, setLocationBannerDismissed] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedHistory, setSwipedHistory] = useState<{ profile: Profile; action: SwipeAction }[]>([]);

  // Events & Ticketing (Pristine clean launch en 0)
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // Proposals & Weekly Postulation Quotas
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [appliedProposalIds, setAppliedProposalIds] = useState<string[]>([]);
  const [savedProposalIds, setSavedProposalIds] = useState<string[]>([]);
  const [proposalApplications, setProposalApplications] = useState<{ id: string; proposalId: string; ts: number }[]>(() => {
    try {
      const saved = localStorage.getItem('appswinguer_proposal_applications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('appswinguer_proposal_applications', JSON.stringify(proposalApplications));
    } catch (e) {
      console.warn('Error saving proposal applications:', e);
    }
  }, [proposalApplications]);

  // Weekly postulation limits helper: Free (4/sem), Siguiente plan (15/sem), Ultra plan (Ilimitadas)
  const getWeeklyLimit = (tier: SubscriptionTier): number => {
    if (tier === 'ultra' || tier === 'gold') return Infinity;
    if (tier === 'plus' || tier === 'silver') return 15;
    return 4; // Plan gratis máximo 4 postulaciones a la semana
  };

  const getWeeklyApplicationsCount = (): number => {
    const oneWeekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    return proposalApplications.filter(a => a.ts >= oneWeekAgo).length;
  };

  // Virtual & Creators (Pristine clean launch en 0)
  const [creators, setCreators] = useState<Creator[]>([]);
  const [userCreator, setUserCreator] = useState<Creator | null>(null);
  const [subscribedCreatorHandles, setSubscribedCreatorHandles] = useState<string[]>([]);
  const [liveAccessIds, setLiveAccessIds] = useState<string[]>([]);
  const [lives, setLives] = useState<LiveStream[]>([]);

  // Moderation & Reports
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([
    {
      id: 'ann_1',
      title: isEs ? 'Bienvenido a AppSwinger' : 'Welcome to AppSwinger',
      body: isEs 
        ? 'Comunidad para adultos. La disponibilidad depende de perfiles y funciones verificados en tu región.' 
        : 'Adults-only community. Availability depends on verified profiles and features in your region.',
      ts: Date.now(),
    }
  ]);
  const [activeAnnouncement, setActiveAnnouncement] = useState<SystemAnnouncement | null>(announcements[0]);

  // Club de Experiencias (10 stamps punch card)
  const [attendStamps, setAttendStamps] = useState(0);
  const [redeemedClubFolio, setRedeemedClubFolio] = useState<string | null>(null);

  // Matches & Chat (Pristine clean launch en 0)
  const [matches, setMatches] = useState<MatchItem[]>([]);

  // Modals & Drawers state
  const [matchModalProfile, setMatchModalProfile] = useState<Profile | null>(null);
  const [detailsProfile, setDetailsProfile] = useState<Profile | null>(null);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [collaborationModalOpen, setCollaborationModalOpen] = useState(false);
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [extrasModalOpen, setExtrasModalOpen] = useState(false);
  const [pushLookupOpen, setPushLookupOpen] = useState(false);
  const [safetyCenterOpen, setSafetyCenterOpen] = useState(false);
  const [pushToast, setPushToast] = useState<{ title: string; body: string } | null>(null);
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
  const requestLocationAccess = (isManualClick: boolean = false) => {
    setIsLocating(true);
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          setLocationGranted(true);
          setLocationBannerDismissed(true);
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          // Mexico geographical bounds: lat 14 to 33, lng -119 to -85
          if (lat >= 14 && lat <= 33 && lng >= -119 && lng <= -85) {
            setRegion('MX');
            // GPS identifies country only; it does not identify a city. Preserve the user's selected city.
          } else {
            setRegion('US');
            // Preserve the user's selected city; GPS country detection is not city geocoding.
          }
          if (isManualClick) {
            setPushToast({
              title: isEs ? '¡GPS Conectado!' : 'GPS Connected!',
              body: isEs 
                ? 'Coordenadas GPS obtenidas. Cálculo de distancias en KM activo.' 
                : 'GPS coordinates acquired. Real-time KM distance active.'
            });
          }
        },
        (err) => {
          setIsLocating(false);
          console.warn('Geolocation note:', err);
          setLocationGranted(false);
          if (isManualClick) {
            setPushToast({
              title: isEs ? 'Ubicación no disponible' : 'Location unavailable',
              body: isEs ? 'No se concedió acceso GPS. No se calcularán distancias exactas ni se inventará una ciudad.' : 'GPS access was not granted. Exact distances will not be calculated and no city will be invented.'
            });
          }
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
      );
    } else {
      setIsLocating(false);
      setLocationGranted(false);
      if (isManualClick) setPushToast({
        title: isEs ? 'GPS no disponible' : 'GPS unavailable',
        body: isEs ? 'Este navegador no ofrece geolocalización. Selecciona tu ciudad manualmente.' : 'This browser does not provide geolocation. Select your city manually.'
      });
    }
  };

  // Global helper for opening collaboration modal
  useEffect(() => {
    (window as any).__openCollaborationModal = () => setCollaborationModalOpen(true);
    return () => {
      delete (window as any).__openCollaborationModal;
    };
  }, []);

  // Supabase Auth and verified data loading
  useEffect(() => {
    testConnection().then(ok => setIsSupabaseConnected(ok));

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser?.displayName) setUserProfile(prev => ({ ...prev, alias: currentUser.displayName || prev.alias }));
      setCurrentIndex(0);
      if (!currentUser) {
        setProfiles([]);
        setMatches([]);
        return;
      }
      try {
        await syncUserProfile(currentUser);
        const [remoteMatches, discoverableProfiles] = await Promise.all([
          fetchUserMatches(currentUser.uid),
          fetchDiscoverableProfiles(),
        ]);
        setMatches(remoteMatches);
        setProfiles(discoverableProfiles);
      } catch (e) {
        console.warn('Supabase profile/match loading failed:', e);
        setProfiles([]);
        setMatches([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Public proposals come from moderated server records only.
  useEffect(() => {
    if (!supabase) { setProposals([]); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase!.from('experience_proposals')
        .select('id,owner_user_id,title,description,category,created_at,status')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        console.warn('Approved proposals could not be loaded:', error);
        if (!cancelled) setProposals([]);
        return;
      }
      if (!cancelled) setProposals((data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        cat: row.category,
        author: row.owner_user_id === user?.uid ? (isEs ? 'Tú' : 'You') : (isEs ? 'Miembro verificado' : 'Verified member'),
        when: new Date(row.created_at).toLocaleDateString(isEs ? 'es-MX' : 'en-US'),
        apps: 0,
        status: 'aprobada',
        body: row.description,
        mine: row.owner_user_id === user?.uid,
      })));
    })();
    return () => { cancelled = true; };
  }, [user?.uid, isEs]);

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

  // Regional & Distance filtered profiles (México vs USA)
  const visibleProfiles = profiles.filter(p => {
    const profileCountry = p.country || 'MX';
    return profileCountry === region && p.km <= maxDistance;
  });
  const currentProfile = currentIndex < visibleProfiles.length ? visibleProfiles[currentIndex] : null;

  const handleSwipe = async (action: SwipeAction) => {
    if (!currentProfile) return;
    if (!user) {
      setRegistrationModalOpen(true);
      return;
    }

    const target = currentProfile;
    try {
      await recordSwipe(user.uid, target, action);
      setSwipedHistory(prev => [...prev, { profile: target, action }]);
      setCurrentIndex(prev => prev + 1);

      // The database creates matches only after reciprocal swipes.
      const remoteMatches = await fetchUserMatches(user.uid);
      setMatches(remoteMatches);
      const mutualMatch = remoteMatches.find(match => match.profile.id === target.id);
      if (mutualMatch) setMatchModalProfile(mutualMatch.profile);
    } catch (err) {
      console.warn('Supabase swipe failed:', err);
      setPushToast({
        title: isEs ? 'Acción no guardada' : 'Action not saved',
        body: isEs
          ? 'Completa la verificación de edad, identidad y foto para interactuar con perfiles.'
          : 'Complete age, identity and photo verification before interacting with profiles.',
      });
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
    const confirmedMatch = matches.some(m => m.profile.id === profile.id);
    if (!confirmedMatch) {
      setPushToast({ title: isEs ? 'Match no confirmado' : 'Match not confirmed', body: isEs ? 'El chat solo se abre después de que el servidor confirme un match mutuo.' : 'Chat opens only after the server confirms a mutual match.' });
      return;
    }
    setActiveChatUserId(profile.id);
    setMatchModalProfile(null);
    setChatDrawerOpen(true);
  };

  // Event reservation handler
  const handleReserveEvent = (_eventId: string, _tierId: string | null) => {
    setPushToast({ title: isEs ? 'Reservas no activadas' : 'Reservations unavailable', body: isEs ? 'No se generará un folio ni se marcará como pagado hasta conectar reserva, inventario y confirmación real de pago.' : 'No pass or paid status is created until reservations, capacity and verified payment are connected.' });
  };

  const handleCancelReservation = (reservationId: string) => {
    setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'cancelado' } : r));
  };

  // Proposal handlers with strict weekly quota enforcement
  const handleApplyProposal = async (proposal: Proposal) => {
    if (!user || !supabase) {
      setRegistrationModalOpen(true);
      setPushToast({ title: isEs ? 'Inicia sesión' : 'Sign in', body: isEs ? 'Necesitas una cuenta para enviar una postulación.' : 'Sign in to apply.' });
      return;
    }
    if (!/^[0-9a-f-]{36}$/i.test(proposal.id)) {
      setPushToast({ title: isEs ? 'Propuesta no disponible' : 'Proposal unavailable', body: isEs ? 'Esta propuesta no tiene un identificador de servidor válido.' : 'This proposal has no valid server identifier.' });
      return;
    }
    const { error } = await supabase.from('experience_interests').insert({
      proposal_id: proposal.id,
      requester_user_id: user.uid,
      message: isEs ? 'Me interesa esta propuesta. Solicito más información.' : 'I am interested in this proposal. Please share more information.',
      status: 'pending',
    });
    if (error) {
      setPushToast({ title: isEs ? 'Postulación no enviada' : 'Application not sent', body: isEs ? 'No se confirmó el registro en el servidor. Inténtalo de nuevo.' : 'The server did not confirm the application. Try again.' });
      return;
    }
    setAppliedProposalIds(prev => prev.includes(proposal.id) ? prev : [...prev, proposal.id]);
    setPushToast({ title: isEs ? 'Postulación registrada' : 'Application recorded', body: isEs ? 'Tu interés se guardó y queda sujeto a la respuesta del organizador.' : 'Your interest was saved and awaits the organizer.' });
  };

  const handleToggleSaveProposal = (proposalId: string) => {
    setSavedProposalIds(prev => 
      prev.includes(proposalId) ? prev.filter(id => id !== proposalId) : [...prev, proposalId]
    );
  };

  const handleCreateProposal = async (newProp: { title: string; cat: string; body: string; limited: boolean }) => {
    if (!user || !supabase) {
      setRegistrationModalOpen(true);
      setPushToast({ title: isEs ? 'Inicia sesión' : 'Sign in', body: isEs ? 'Inicia sesión para enviar una propuesta a revisión.' : 'Sign in to submit a proposal for review.' });
      return;
    }
    const { error } = await supabase.from('experience_proposals').insert({
      owner_user_id: user.uid,
      title: newProp.title.trim().slice(0, 120),
      description: newProp.body.trim().slice(0, 4000) || (isEs ? 'Propuesta privada con reglas claras.' : 'Private proposal with clear boundaries.'),
      category: newProp.cat.slice(0, 60),
      boundaries: newProp.limited ? (isEs ? 'Identidad limitada hasta aceptación' : 'Identity limited until accepted') : '',
      location_mode: 'city_only',
      city: userProfile.locationCity || null,
      status: 'pending',
    });
    if (error) {
      setPushToast({ title: isEs ? 'No se guardó la propuesta' : 'Proposal not saved', body: isEs ? 'El servidor no confirmó el envío. Revisa tu perfil y vuelve a intentarlo.' : 'The server did not confirm submission. Check your profile and retry.' });
      return;
    }
    setPushToast({ title: isEs ? 'En revisión' : 'Pending review', body: isEs ? 'La propuesta se guardó en el servidor y no será pública hasta su aprobación.' : 'The proposal was saved and will remain private until approved.' });
  };

  // Collaboration Proposal (Swinger/Gangbang $350 MXN / $80 USD)
  const handleSubmitCollaboration = async (proposal: Omit<CollaborationProposal, 'id' | 'createdAt' | 'status' | 'paid'>) => {
    if (!user || !supabase) {
      setRegistrationModalOpen(true);
      setPushToast({ title: isEs ? 'Inicia sesión' : 'Sign in', body: isEs ? 'Inicia sesión para enviar la propuesta de colaboración.' : 'Sign in to submit a collaboration proposal.' });
      return;
    }
    const { error } = await supabase.from('experience_proposals').insert({
      owner_user_id: user.uid,
      title: proposal.title.trim().slice(0, 120),
      description: [proposal.description, 'Organizador: ' + proposal.organizerName, 'Ciudad: ' + proposal.city, 'Ratio: ' + proposal.attendeeRatio, 'Reglas: ' + proposal.consentRules, 'Protocolos: ' + proposal.healthProtocols].filter(Boolean).join('\n').slice(0, 4000),
      category: proposal.eventType.slice(0, 60),
      boundaries: proposal.consentRules.slice(0, 1200),
      location_mode: 'city_only',
      city: proposal.city.slice(0, 100),
      status: 'pending',
    });
    if (error) setPushToast({ title: isEs ? 'No se guardó' : 'Not saved', body: isEs ? 'No se confirmó la propuesta en el servidor.' : 'The server did not confirm the proposal.' });
    else setPushToast({ title: isEs ? 'Propuesta enviada a revisión' : 'Proposal submitted for review', body: isEs ? 'No se cobró ningún pago ni se publicó automáticamente.' : 'No payment was taken and nothing was auto-published.' });
  };

  // Creator subscriptions
  const handleSubscribeCreator = (_creator: Creator) => {
    setPushToast({ title: isEs ? 'Suscripciones no activadas' : 'Subscriptions unavailable', body: isEs ? 'No se registrará una suscripción ni se cobrará hasta conectar el sistema de membresías de creadoras.' : 'No subscription or charge is created until creator billing is connected.' });
  };

  const handleBuyLiveAccess = (_live: LiveStream) => {
    setPushToast({ title: isEs ? 'Acceso virtual no activado' : 'Virtual access unavailable', body: isEs ? 'No se marcará un pase como comprado sin pago y permisos reales.' : 'No access pass is granted without real payment and entitlements.' });
  };

  // Club reward redemption
  const handleRedeemClubReward = () => {
    setPushToast({ title: isEs ? 'Recompensas en preparación' : 'Rewards not active', body: isEs ? 'No se genera un folio de canje hasta que el programa de asistencia esté conectado al servidor.' : 'No redemption code is issued until attendance tracking is server-backed.' });
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
          
          {/* Brand Wordmark with Country Switcher in place of ULTRA */}
          <div className="flex items-center gap-1.5">
            <div 
              onClick={() => setActiveTab('match')}
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,45,120,0.5)] cursor-pointer hover:scale-105 transition-transform"
              title={isEs ? 'Ir a Match' : 'Go to Match'}
            >
              <Flame className="w-5 h-5 fill-white" />
            </div>
            <div className="leading-none flex items-center gap-1">
              <span 
                onClick={() => setActiveTab('match')}
                className="font-black text-sm tracking-wider uppercase text-white font-mono cursor-pointer"
              >
                APPSWINGUER
              </span>
              {/* Selectores independientes: País (MX/US) e Idioma (ES/EN) */}
              <div className="flex items-center gap-1 ml-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextReg = region === 'MX' ? 'US' : 'MX';
                    setRegion(nextReg);
                    setCurrentIndex(0);
                    setPushToast({
                      title: nextReg === 'MX' ? '🇲🇽 Región: México' : '🇺🇸 Region: United States',
                      body: nextReg === 'MX' 
                        ? 'Catálogo regional de México activado (distancias en KM).' 
                        : 'US lifestyle catalog activated (distances in MI).'
                    });
                  }}
                  className="px-1.5 py-0.5 rounded bg-purple-900/90 hover:bg-pink-900/90 text-[10px] font-black tracking-wider uppercase text-pink-300 border border-pink-400/50 flex items-center gap-0.5 active:scale-95 transition shadow-sm"
                  title={isEs ? 'Cambiar región: México / Estados Unidos' : 'Switch region: Mexico / United States'}
                  aria-label="Selector de país o región"
                >
                  <span>{region === 'MX' ? '🇲🇽 MX' : '🇺🇸 US'}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextLang = lang === 'es' ? 'en' : 'es';
                    setLang(nextLang);
                  }}
                  className="px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-purple-950 text-[10px] font-black tracking-wider uppercase text-purple-200 border border-purple-500/30 flex items-center gap-0.5 active:scale-95 transition shadow-sm"
                  title={isEs ? 'Cambiar idioma: Español / English' : 'Switch language: Spanish / English'}
                  aria-label="Selector de idioma"
                >
                  <Globe className="w-2.5 h-2.5 text-pink-400" />
                  <span>{lang.toUpperCase()}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5">
            
            {/* Push Notification Lookup Button */}
            <button
              type="button"
              onClick={() => setSafetyCenterOpen(true)}
              className="p-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/30 text-white transition active:scale-95"
              title={isEs ? 'Centro de seguridad' : 'Safety center'}
              aria-label={isEs ? 'Centro de seguridad' : 'Safety center'}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
            </button>

            <button
              type="button"
              onClick={() => setPushLookupOpen(true)
              className="relative p-2 rounded-xl bg-purple-950/70 hover:bg-purple-900/80 border border-purple-500/30 text-white transition active:scale-95 flex items-center justify-center"
              title={isEs ? 'Lookup de Notificaciones Push & Diagnóstico' : 'Push Notification Lookup & Alert System'}
              aria-label="Push notifications lookup"
            >
              <Bell className="w-4 h-4 text-pink-400" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-purple-950 animate-pulse" />
            </button>

            {/* User Profile / Registration Pill */}
            <button
              type="button"
              onClick={() => setRegistrationModalOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-neutral-900/80 hover:bg-purple-950 border border-purple-500/30 text-[11px] font-bold text-purple-200 flex items-center gap-1 transition truncate max-w-[105px]"
              title={isEs ? 'Editar perfil, pareja o individual, y gustos' : 'Edit profile & fantasies'}
            >
              <UserIcon className="w-3 h-3 text-pink-400 shrink-0" />
              <span className="truncate">{userProfile.alias}</span>
            </button>

            {/* Messages Drawer Trigger */}
            <button
              type="button"
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

        {/* Location GPS Permission Reminder Banner - Ultra-Compact */}
        {!locationGranted && !locationBannerDismissed && (
          <div className="mx-2 mt-1 px-2.5 py-1 rounded-xl bg-purple-950/90 border border-purple-500/30 flex items-center justify-between gap-2 text-[10px] shadow-sm shrink-0 z-30">
            <div className="flex items-center gap-1.5 min-w-0">
              <Navigation className="w-3 h-3 text-pink-400 shrink-0" />
              <span className="text-purple-200 truncate">
                {isEs 
                  ? 'Activa GPS para calcular KM exactos' 
                  : 'Enable GPS for accurate KM calculations'}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                disabled={isLocating}
                onClick={() => requestLocationAccess(true)}
                className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-[10px] font-bold text-white shrink-0 active:scale-95 transition flex items-center gap-1 shadow-sm disabled:opacity-60"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    <span>...</span>
                  </>
                ) : (
                  <span>{isEs ? 'Activar' : 'Enable'}</span>
                )}
              </button>
              <button
                onClick={() => setLocationBannerDismissed(true)}
                className="p-0.5 rounded text-purple-300 hover:text-white transition"
                title={isEs ? 'Cerrar' : 'Dismiss'}
                aria-label={isEs ? 'Cerrar' : 'Dismiss'}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* System Announcement Banner - Ultra-Compact */}
        {activeAnnouncement && (
          <div className="mx-2 mt-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-950/90 via-pink-950/80 to-purple-950/90 border border-pink-500/40 text-[10px] shadow-sm flex items-center justify-between gap-2 shrink-0 z-30">
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="w-3 h-3 text-pink-400 shrink-0 animate-pulse" />
              <div className="truncate">
                <span className="text-white font-bold mr-1.5">{activeAnnouncement.title}</span>
                <span className="text-purple-200/80 hidden sm:inline">{activeAnnouncement.body}</span>
              </div>
            </div>
            <button
              onClick={() => setActiveAnnouncement(null)}
              className="text-white/60 hover:text-white p-0.5 shrink-0"
              aria-label="Cerrar anuncio"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Tab Content Display */}
        <main className={`flex-1 flex flex-col relative min-h-0 ${activeTab === 'match' ? 'overflow-hidden' : 'overflow-y-auto overscroll-y-contain'}`}>
          
          {/* TAB 1: MATCH / DISCOVER DECK */}
          {activeTab === 'match' && (
            <div className="flex-1 flex flex-col justify-between px-3 pt-1 pb-[62px] h-full min-h-0 select-none overflow-hidden">
              
              {/* Distance adjustment & Extras bar */}
              <div className="flex items-center justify-between py-1 px-1 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-purple-200/90 font-medium flex items-center gap-1">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-pink-400" />
                    <span>{isEs ? 'Radio:' : 'Radius:'} <strong className="text-white">{maxDistance} km</strong></span>
                  </span>

                  {/* Extras Modal button safely placed here */}
                  <button
                    onClick={() => setExtrasModalOpen(true)}
                    className="px-2 py-0.5 rounded-full bg-purple-900/60 hover:bg-purple-800 border border-purple-400/40 text-[10px] font-bold text-pink-300 flex items-center gap-1 active:scale-95 transition shadow-sm"
                    title="Ver Extras y Beneficios VIP"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>＋ Extras VIP</span>
                  </button>
                </div>

                <button
                  onClick={() => setRegistrationModalOpen(true)}
                  className="text-[11px] text-pink-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isEs ? 'Fantasías & Filtros' : 'Fantasies & Filters'}</span>
                </button>
              </div>

              {/* Card Deck Viewport - Flexible adapting to screen height with 100% visible buttons */}
              <div className="relative w-full flex-1 min-h-0 my-0.5 overflow-hidden">
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
                  <div className="absolute inset-0 rounded-[28px] bg-neutral-900/80 border border-purple-500/25 p-5 flex flex-col items-center justify-center text-center shadow-xl backdrop-blur-md">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600/30 to-pink-600/30 border border-purple-500/40 flex items-center justify-center mb-2.5">
                      <Sparkles className="w-7 h-7 text-pink-400 animate-pulse" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">
                      {isEs ? 'Has visto todos los perfiles en este radio' : 'No more profiles in this radius'}
                    </h3>
                    <p className="text-[11px] text-purple-200/70 max-w-xs mb-3 leading-relaxed">
                      {isEs 
                        ? `Ajusta tu radio de ${maxDistance} km o explora las propuestas y eventos privados en tu región.` 
                        : `Expand your ${maxDistance} km radius or explore private parties.`}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleResetDeck}
                        className="py-2 px-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {isEs ? 'Revisar de nuevo' : 'Review again'}
                      </button>
                      <button
                        onClick={() => setRegistrationModalOpen(true)}
                        className="py-2 px-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
                      >
                        {isEs ? 'Aumentar KM' : 'Expand KM'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: 100% Visible, Guaranteed Unclipped above bottom nav */}
              <div className="shrink-0 pt-0.5 pb-1 z-30">
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
              subscriptionTier={subscriptionTier}
              weeklyApplicationsUsed={getWeeklyApplicationsCount()}
              weeklyApplicationsLimit={getWeeklyLimit(subscriptionTier)}
              onUpgradePlan={() => setExtrasModalOpen(true)}
              isEs={isEs}
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
              isSupabaseConnected={isSupabaseConnected}
              onOpenAdmin={() => setAdminModalOpen(true)}
              onOpenLegal={() => setLegalModalOpen(true)}
              onExportData={handleExportData}
              onWipeData={handleWipeData}
              currentTier={subscriptionTier}
              onSelectTier={(tier) => {
                setPushToast({ title: isEs ? 'Membresía no activada' : 'Membership not activated', body: isEs ? `El plan ${tier.toUpperCase()} no se activará hasta confirmar un pago real por SPEI y recibir la confirmación del servidor.` : `The ${tier.toUpperCase()} plan will not activate until a real SPEI payment is confirmed by the server.` });
              }}
              weeklyApplicationsUsed={getWeeklyApplicationsCount()}
              weeklyApplicationsLimit={getWeeklyLimit(subscriptionTier)}
              region={region}
              isEs={isEs}
              onOpenExtrasModal={() => setExtrasModalOpen(true)}
              matches={matches}
            />
          )}
        </main>

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
                  currentUserId={user?.uid}
                  initialChatUserId={activeChatUserId}
                  onOpenProfile={(p) => setDetailsProfile(p)}
                  onOpenReport={async (t) => {
                    if (!user || !supabase) { setPushToast({ title: isEs ? 'Inicia sesión' : 'Sign in', body: isEs ? 'Debes iniciar sesión para enviar un reporte seguro.' : 'Sign in to submit a safety report.' }); return; }
                    const { error } = await supabase.from('safety_reports').insert({ reporter_user_id: user.uid, reported_user_id: t.id, category: 'user_report', description: isEs ? 'Reporte iniciado desde Mensajes; solicita seguimiento de moderación.' : 'Report started from Messages; moderation follow-up requested.' });
                    setPushToast(error ? { title: isEs ? 'No se envió el reporte' : 'Report not sent', body: isEs ? 'No se confirmó el registro. Inténtalo de nuevo.' : 'The report was not confirmed. Try again.' } : { title: isEs ? 'Reporte enviado' : 'Report submitted', body: isEs ? 'El reporte quedó registrado para revisión.' : 'Your report was recorded for review.' });
                  }}
                  onBlockUser={async (id) => {
                    if (!user || !supabase) { setPushToast({ title: isEs ? 'Inicia sesión' : 'Sign in', body: isEs ? 'Debes iniciar sesión para bloquear una cuenta.' : 'Sign in to block an account.' }); return; }
                    const { error } = await supabase.from('user_blocks').upsert({ blocker_user_id: user.uid, blocked_user_id: id }, { onConflict: 'blocker_user_id,blocked_user_id' });
                    if (error) { setPushToast({ title: isEs ? 'Bloqueo no confirmado' : 'Block not confirmed', body: isEs ? 'No se guardó el bloqueo. Inténtalo de nuevo.' : 'The block was not saved. Try again.' }); return; }
                    setMatches(prev => prev.filter(m => m.profile.id !== id));
                    if (activeChatUserId === id) setActiveChatUserId(null);
                    setPushToast({ title: isEs ? 'Cuenta bloqueada' : 'Account blocked', body: isEs ? 'El bloqueo quedó guardado en tu cuenta.' : 'The block was saved to your account.' });
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
          onRequestLocation={() => requestLocationAccess(true)}
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
          isEs={isEs}
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

        <SafetyCenterModal
          isOpen={safetyCenterOpen}
          onClose={() => setSafetyCenterOpen(false)}
          isEs={isEs}
          onOpenChat={() => { setActiveChatUserId(null); setChatDrawerOpen(true); }}
          onOpenLegal={() => setLegalModalOpen(true)}
        />

        {/* MODAL 8: PUSH NOTIFICATION LOOKUP & SYSTEM */}
        <PushLookupModal
          isOpen={pushLookupOpen}
          onClose={() => setPushLookupOpen(false)}
          region={region}
          isEs={isEs}
          onSendTestNotification={(title, body) => {
            setPushToast({ title, body });
            setTimeout(() => setPushToast(null), 5500);
          }}
        />

        {/* IN-APP FLOATING PUSH NOTIFICATION TOAST */}
        {pushToast && (
          <div className="fixed top-4 inset-x-4 max-w-sm mx-auto z-[9999] p-3.5 rounded-2xl bg-[#17092c]/95 border border-pink-500/60 shadow-[0_0_35px_rgba(255,45,120,0.5)] backdrop-blur-2xl text-white flex items-start gap-3 animate-in slide-in-from-top-4 duration-300">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center shrink-0 text-white shadow-md">
              <Bell className="w-5 h-5 fill-white/20 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-300 block">
                {region === 'MX' ? 'Notificación Push México (SLP)' : 'Push Notification USA'}
              </span>
              <h4 className="font-bold text-xs text-white truncate mt-0.5">{pushToast.title}</h4>
              <p className="text-[11px] text-purple-200/90 leading-tight mt-0.5">{pushToast.body}</p>
            </div>
            <button
              onClick={() => setPushToast(null)}
              className="p-1 rounded-full text-white/50 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
