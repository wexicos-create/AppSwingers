import React, { useState, useEffect } from 'react';
import {
  auth,
  db,
  googleProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser,
  User,
  deleteDoc,
  doc,
  syncUserProfile,
  recordSwipe,
  recordMatch,
  fetchUserMatches,
  testConnection
} from './supabase';
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
  SpeiOrder,
  SystemAnnouncement,
  AppRegion,
  CollaborationProposal,
  ProfileKind,
  SubscriptionTier
} from './types';
import { 
  INITIAL_PROFILES, 
  INITIAL_EVENTS, 
  EVENT_TIERS, 
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
import { LandingScreen } from './components/LandingScreen';
import { OnboardingWizard } from './components/OnboardingWizard';
import { saveOnboardingProfile, fetchOnboardingProfile } from './onboarding';
import { MonetizationExtrasModal } from './components/MonetizationExtrasModal';
import { PushLookupModal } from './components/PushLookupModal';
import { ToastHost, showToast } from './components/Toast';
import { SpeiModal } from './components/SpeiModal';
import { OrganizerModal } from './components/OrganizerModal';
import {
  newSpeiOrder,
  upsertLocalSpeiOrder,
  loadLocalSpeiOrders,
  saveLocalSpeiOrders,
  fetchRemoteSpeiOrdersForUser,
  appendRemoteTimelineAndStatus,
  createRemoteSpeiOrder,
  getPlanPricing,
} from './spei';
import {
  OrganizerApplication,
  OrganizerApplicationDraft,
  WalletTransaction,
  WithdrawalRequest,
  computeEarningSplit,
  walletBalance,
  namesMatch,
  organizerBenefitState,
  getEventPublishFee,
  newOrganizerApplication,
  newWithdrawalRequest,
  loadOrganizerApplication,
  saveOrganizerApplication,
  loadWallet,
  saveWallet,
  loadWithdrawals,
  saveWithdrawals,
  fetchRemoteOrganizerApplication,
  fetchRemoteWalletForUser,
  fetchRemoteWithdrawalsForUser,
  saveRemoteOrganizerApplication,
  newIneRecord,
  saveRemoteIneRecord,
  saveRemoteWalletTransaction,
  createRemoteWithdrawal,
  mergeById,
  fetchIdentityStatus,
  fetchNotificationsForUser,
  fetchRemoteWalletForCreator,
} from './organizers';
import { fetchStatePass } from './premium';
import { recommendRadiusKm } from './geolocation';
import {
  fetchEventPassesForUser,
  fetchRatingsByUser,
  fetchAllEventRatings,
  newSupportTicket,
  createRemoteTicket,
  reputationByOrganizer,
  isEventDay,
  isEventPast,
  OrganizerReputation,
} from './eventflow';
import { IdentityGate } from './components/IdentityGate';
import { PremiumStateSearch } from './components/PremiumStateSearch';
import { EventAttendModal } from './components/EventAttendModal';
import { DonateModal } from './components/DonateModal';
import { EventRatingModal } from './components/EventRatingModal';
import { ProfileRatingModal } from './components/ProfileRatingModal';
import { OrganizerProfileModal } from './components/OrganizerProfileModal';
import { UberSafeModal } from './components/UberSafeModal';
import { SafetyTipsModal } from './components/SafetyTipsModal';
import { saveProfileRating } from './ratings';
import { IdentityVerdict, StatePass, AppNotification, EventAccessPass, EventRating, EventTier, ProfileRating } from './types';
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
  MapPin as MapPinIcon,
  Crown as CrownIcon
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false);

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
  const [profiles, setProfiles] = useState<Profile[]>(INITIAL_PROFILES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedHistory, setSwipedHistory] = useState<{ profile: Profile; action: SwipeAction }[]>([]);

  // Events & Ticketing (Pristine clean launch en 0)
  const [events, setEvents] = useState<ClubEvent[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('appswinguer_user_events') || '[]') as ClubEvent[];
      return [...INITIAL_EVENTS, ...saved];
    } catch { return INITIAL_EVENTS; }
  });
  // Events published by organizers persist locally so they survive reloads; paid publishing is gated by SPEI approval.
  useEffect(() => {
    try {
      localStorage.setItem('appswinguer_user_events', JSON.stringify(events.filter(e => e.id.startsWith('uev_'))));
    } catch { /* ignore */ }
  }, [events]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // Proposals & Weekly Postulation Quotas
  const [proposals, setProposals] = useState<Proposal[]>(INITIAL_PROPOSALS);
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
  const [creators, setCreators] = useState<Creator[]>(INITIAL_CREATORS);
  const [userCreator, setUserCreator] = useState<Creator | null>(null);
  const [subscribedCreatorHandles, setSubscribedCreatorHandles] = useState<string[]>([]);
  const [liveAccessIds, setLiveAccessIds] = useState<string[]>([]);
  const [lives, setLives] = useState<LiveStream[]>(INITIAL_LIVES);

  // Moderation & Reports
  const [reports, setReports] = useState<ReportItem[]>(INITIAL_REPORTS);
  const [payments, setPayments] = useState<PaymentItem[]>([]);

  // SPEI payment orders (approval flow with automatic benefit activation)
  const [speiOrders, setSpeiOrders] = useState<SpeiOrder[]>(() => loadLocalSpeiOrders());
  const [speiModalOpen, setSpeiModalOpen] = useState(false);
  const [activeSpeiOrder, setActiveSpeiOrder] = useState<SpeiOrder | null>(null);
  const [appliedSpeiOrderIds, setAppliedSpeiOrderIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('appswinguer_spei_applied') || '[]'); } catch { return []; }
  });

  // Organizers: registration file, virtual wallet and withdrawal requests
  const [organizerApplication, setOrganizerApplication] = useState<OrganizerApplication | null>(() => loadOrganizerApplication());
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(() => loadWallet());
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(() => loadWithdrawals());
  const [organizerModalOpen, setOrganizerModalOpen] = useState(false);
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
  // Public funnel: landing gate + onboarding wizard (register/login/resume)
  const [onboardingMode, setOnboardingMode] = useState<'register' | 'login' | 'resume' | null>(null);
  const [legalTopic, setLegalTopic] = useState<string | null>(null);
  const [extrasModalOpen, setExtrasModalOpen] = useState(false);
  const [pushLookupOpen, setPushLookupOpen] = useState(false);
  const [pushToast, setPushToast] = useState<{ title: string; body: string } | null>(null);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);

  // Discovery Filter (KM Radius)
  const [maxDistance, setMaxDistance] = useState(userProfile.maxKm || 30);

  // Identity verdict & account gates (admin second validation)
  const [identityStatus, setIdentityStatus] = useState<IdentityVerdict | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Premium state-search day pass (travelers & tourists)
  const [premiumSearchOpen, setPremiumSearchOpen] = useState(false);
  const [statePass, setStatePass] = useState<StatePass | null>(null);

  // Event attendance flow: VIP passes, deposit modal, day-of reminders, ratings
  const [eventPasses, setEventPasses] = useState<EventAccessPass[]>([]);
  const [attendModal, setAttendModal] = useState<{ event: ClubEvent; tier: EventTier | null } | null>(null);
  const [ratingPass, setRatingPass] = useState<EventAccessPass | null>(null);
  const [organizerReputation, setOrganizerReputation] = useState<Record<string, OrganizerReputation>>({});

  // Calificación de perfil tras chat, perfil de agencia, SOS y Uber seguro.
  const [profileRatingTarget, setProfileRatingTarget] = useState<Profile | null>(null);
  const [organizerProfileOpen, setOrganizerProfileOpen] = useState<{ name: string; uid: string | null } | null>(null);
  const [uberSafeOpen, setUberSafeOpen] = useState(false);
  const [safetyTipsOpen, setSafetyTipsOpen] = useState(false);

  // Creator earnings: donations credit a wallet keyed by creator handle
  const [donateCreator, setDonateCreator] = useState<Creator | null>(null);
  const [creatorWallet, setCreatorWallet] = useState<WalletTransaction[]>([]);

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
            setUserProfile(prev => ({ ...prev, locationCity: 'San Luis Potosí, SLP' }));
          } else {
            setRegion('US');
            setUserProfile(prev => ({ ...prev, locationCity: 'United States' }));
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
          if (isManualClick) {
            setLocationGranted(true);
            setLocationBannerDismissed(true);
            const cityName = region === 'MX' ? 'San Luis Potosí, SLP' : 'United States';
            setUserProfile(prev => ({ ...prev, locationCity: cityName }));
            setPushToast({
              title: isEs ? '¡GPS & Distancias Activadas!' : 'GPS & Distances Active!',
              body: isEs 
                ? `Ubicación configurada en ${cityName}. Cálculo en KM activado.` 
                : `Location configured in ${cityName}. Distance calculations active.`
            });
          } else {
            setLocationGranted(false);
          }
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
      );
    } else {
      setIsLocating(false);
      if (isManualClick) {
        setLocationGranted(true);
        setLocationBannerDismissed(true);
        const cityName = region === 'MX' ? 'San Luis Potosí, SLP' : 'United States';
        setUserProfile(prev => ({ ...prev, locationCity: cityName }));
        setPushToast({
          title: isEs ? 'Ubicación Activada' : 'Location Activated',
          body: isEs ? `Ubicación configurada en ${cityName}.` : `Location set in ${cityName}.`
        });
      }
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
        // Cross-device funnel state: a user without a completed onboarding profile must finish the wizard.
        const storedOnboarding = await fetchOnboardingProfile(currentUser.uid);
        if (storedOnboarding) {
          setOnboardingMode(null);
        } else {
          setOnboardingMode(prev => (prev === 'register' || prev === 'login') ? prev : 'resume');
        }
        // Identity verdict, platform notifications and premium state pass.
        const [status, notes, pass] = await Promise.all([
          fetchIdentityStatus(currentUser.uid),
          fetchNotificationsForUser(currentUser.uid),
          fetchStatePass(currentUser.uid),
        ]);
        setIdentityStatus(status);
        setNotifications(notes);
        setStatePass(pass);
        // Event flow: VIP passes, organizer reputation, day-of alarms and
        // the post-event rating push (the day after the event).
        const [passes, myRatings, allRatings] = await Promise.all([
          fetchEventPassesForUser(currentUser.uid),
          fetchRatingsByUser(currentUser.uid),
          fetchAllEventRatings(),
        ]);
        setEventPasses(passes);
        setOrganizerReputation(reputationByOrganizer(allRatings));
        const todayPasses = passes.filter(p => p.status === 'activo' && isEventDay(p.eventDate));
        if (todayPasses.length > 0) {
          const p = todayPasses[0];
          setPushToast({
            title: isEs ? '¡Hoy es tu evento!' : 'Your event is today!',
            body: isEs
              ? `"${p.eventTitle}" · ${p.eventTime} · Zona: ${p.eventZone}. Presenta tu código VIP en la puerta.`
              : `"${p.eventTitle}" · ${p.eventTime} · Zone: ${p.eventZone}. Show your VIP code at the door.`,
          });
          setTimeout(() => setPushToast(null), 9000);
        }
        const ratedEventIds = new Set(myRatings.map(r => r.eventId));
        const toRate = passes.find(p => p.status === 'usado' && isEventPast(p.eventDate) && !ratedEventIds.has(p.eventId));
        if (toRate) setRatingPass(toRate);
      } else {
        setIdentityStatus(null);
        setNotifications([]);
        setStatePass(null);
        setEventPasses([]);
        setRatingPass(null);
        setOrganizerReputation({});
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
      setOnboardingMode(null);
    } catch (e) {
      console.warn('Sign Out error:', e);
    }
  };

  // ---------- Public funnel: email/password accounts + onboarding wizard ----------
  const handleCreateAccount = async (email: string, password: string): Promise<string | null> => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await syncUserProfile(cred.user);
      return null;
    } catch (e: any) {
      return e?.code || 'error';
    }
  };

  const handleLoginAccount = async (email: string, password: string): Promise<string | null> => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await syncUserProfile(cred.user);
      return null;
    } catch (e: any) {
      return e?.code || 'error';
    }
  };

  const handleAbortOnboarding = async () => {
    setOnboardingMode(null);
    try {
      await fbSignOut(auth);
      setUser(null);
    } catch (e) {
      console.warn('Abort onboarding sign out note:', e);
    }
  };

  const handleOnboardingComplete = (data: { alias: string; kind: ProfileKind; seeking: string[]; ineFront: string; ineBack: string; selfie: string; docType: 'ine' | 'pasaporte'; age: number; bio: string; ageMin: number; ageMax: number; photo: string; manualReview?: boolean }) => {
    const uid = user?.uid || null;
    // Sensible "busco" defaults per account kind; editable later in Fantasías & Filtros.
    const defaultSeeking: string[] = data.kind === 'Caballero'
      ? ['Mujeres', 'Parejas']
      : data.kind === 'Dama'
        ? ['Hombres', 'Parejas']
        : ['Parejas'];
    setUserProfile(prev => ({
      ...prev,
      alias: data.alias,
      kind: data.kind,
      bio: data.bio,
      interests: data.seeking,
      seeking: defaultSeeking,
      ages: [`${data.ageMin}–${data.ageMax}`],
    }));
    setOnboardingMode(null);
    if (uid) {
      void saveOnboardingProfile(uid, {
        alias: data.alias,
        kind: data.kind,
        seeking: data.seeking,
        age: data.age,
        bio: data.bio,
        ageMin: data.ageMin,
        ageMax: data.ageMax,
        photo: data.photo,
        docType: data.docType,
        onboardedAt: Date.now(),
      });
      // Legal archive: the registration INE and liveness selfie are preserved for
      // age verification and potential legal disputes.
      void saveRemoteIneRecord(newIneRecord({
        userUid: uid,
        userEmail: user?.email || 'sin-correo@local',
        alias: data.alias,
        legalName: data.alias,
        source: 'registro',
        context: data.docType === 'ine'
          ? 'Verificación de identidad al registro (INE)'
          : 'Verificación de identidad al registro (Pasaporte/ID)',
        ineFront: data.ineFront,
        ineBack: data.ineBack,
        selfie: data.selfie,
      })).then(ok => {
        if (ok) showToast(isEs ? 'Identificación resguardada en el archivo legal de la plataforma.' : 'Identification stored in the platform legal archive.');
      });
    }
    if (data.manualReview) {
      void createRemoteTicket(newSupportTicket({
        userUid: uid,
        userName: data.alias,
        userEmail: user?.email || 'sin-correo@local',
        requester: 'usuario',
        subject: 'Solicitud de validación manual de identidad',
        message: 'El usuario no superó la verificación automática de identidad y prueba de vida, y solicita revisión manual por parte de un Administrador.',
      }));
      showToast(isEs ? 'Tu verificación se envió a validación manual por un Administrador. Te avisaremos por notificación.' : 'Your verification was sent for manual review by an Administrator.', 'info');
    }
    setActiveTab('perfil');
    showToast(isEs ? `¡Bienvenido a AppSwinguer, ${data.alias}!` : `Welcome to AppSwinguer, ${data.alias}!`);
  };

  // ---------- Identity verdict consequences: rejected accounts self-delete ----------
  // Firebase client rules: an account can only delete its own Auth user. When
  // the admin rejects an identity, the owner deletes account + credentials
  // from this gate on next login.
  const handleDeleteRejectedAccount = async () => {
    if (!user) return;
    setDeletingAccount(true);
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      setUser(null);
      setIdentityStatus(null);
      setNotifications([]);
      setOnboardingMode(null);
      showToast(isEs ? 'Tu cuenta y tus credenciales fueron eliminadas por completo.' : 'Your account and credentials were fully deleted.');
    } catch (e: any) {
      if (e?.code === 'auth/requires-recent-login') {
        showToast(isEs
          ? 'Por seguridad debes iniciar sesión de nuevo: cierra sesión y vuelve a entrar; después podrás eliminar tu cuenta desde este aviso.'
          : 'For security you must sign in again: sign out and sign back in; then you can delete your account from this notice.', 'error');
      } else {
        showToast(isEs ? 'No se pudo eliminar la cuenta en este momento. Inténtalo de nuevo.' : 'Could not delete the account right now. Try again.', 'error');
      }
    }
    setDeletingAccount(false);
  };

  // ---------- Premium state search: interest from another state ----------
  const handleStatePassConnect = async (profile: Profile) => {
    if (matches.some(m => m.profile.id === profile.id)) {
      showToast(isEs ? `Ya enviaste interés a ${profile.name}. Harán Match si la persona accede.` : `You already sent interest to ${profile.name}. You will match if the person accepts.`, 'info');
      return;
    }
    const newMatch: MatchItem = {
      id: `match_${profile.id}_${Date.now()}`,
      profile,
      matchedAt: new Date().toISOString(),
      lastMessage: isEs ? 'Interés desde Búsqueda por Estado. Si accede al Match, pueden acordar una cita.' : 'Interest from State Search. If they accept the match, you can arrange a date.',
      unreadCount: 1,
    };
    setMatches(prev => [newMatch, ...prev]);
    if (user) {
      try {
        await recordMatch(user.uid, profile);
      } catch (err) {
        console.warn('Error saving state-pass match:', err);
      }
    }
    showToast(isEs ? `Interés enviado a ${profile.name}. Harán Match si la persona accede.` : `Interest sent to ${profile.name}. You will match if the person accepts.`);
  };

  // Regional & Distance filtered profiles (México vs USA)
  const visibleProfiles = profiles.filter(p => {
    const profileCountry = p.country || 'MX';
    return profileCountry === region && p.km <= maxDistance;
  });
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

  // ---------- SPEI: plan payment flow with admin approval ----------
  const persistSpeiOrder = (order: SpeiOrder) => {
    setSpeiOrders(upsertLocalSpeiOrder(order));
  };

  // Selecting a paid plan now generates a SPEI order instead of activating instantly.
  // The tier activates automatically once the admin approves the transfer.
  const handleRequestPlanPayment = (tier: SubscriptionTier) => {
    if (tier === 'free') {
      setSubscriptionTier('free');
      return;
    }
    const pricing = getPlanPricing(region)[tier];
    if (!pricing) return;
    const order = newSpeiOrder({
      kind: 'suscripcion',
      itemRef: tier,
      label: isEs ? pricing.labelEs : pricing.labelEn,
      amount: pricing.total,
      userName: userProfile.alias,
      userEmail: user?.email || 'sin-correo@local',
      userUid: user?.uid || null,
    });
    persistSpeiOrder(order);
    void createRemoteSpeiOrder(order);
    setActiveSpeiOrder(order);
    setSpeiModalOpen(true);
  };

  const handleSpeiTransferSent = (orderId: string) => {
    const current = speiOrders.find(o => o.id === orderId) || activeSpeiOrder;
    if (!current) return;
    const updated: SpeiOrder = {
      ...current,
      timeline: [...current.timeline, { ts: Date.now(), text: 'Transferencia SPEI reportada por el usuario. Esperando validación.' }],
    };
    persistSpeiOrder(updated);
    void appendRemoteTimelineAndStatus(current.id, 'pendiente', 'Transferencia SPEI reportada por el usuario. Esperando validación.');
    setSpeiModalOpen(false);
    setActiveSpeiOrder(null);
    showToast(
      isEs
        ? 'Transferencia reportada. El administrador validará tu pago y, al aprobarlo, tu plan se activará automáticamente.'
        : 'Transfer reported. The admin will validate your payment; your plan will activate automatically on approval.',
      'info'
    );
  };

  // ---------- Organizers: registration file, SPEI-gated event publishing and virtual wallet ----------
  const handleSubmitOrganizerApplication = (draft: OrganizerApplicationDraft) => {
    const app = newOrganizerApplication({ ...draft, userUid: user?.uid || null, userEmail: user?.email || 'sin-correo@local' });
    saveOrganizerApplication(app);
    setOrganizerApplication(app);
    void saveRemoteOrganizerApplication(app);
    // Legal archive: keep the organizer's INE on file for potential legal disputes.
    void saveRemoteIneRecord(newIneRecord({
      userUid: user?.uid || null,
      userEmail: user?.email || 'sin-correo@local',
      alias: userProfile.alias,
      legalName: app.legalName,
      source: 'organizador',
      context: 'Expediente de organizador: ' + app.role,
      ineFront: app.ineFront,
      ineBack: app.ineBack,
      selfie: '',
    }));
    showToast(
      isEs
        ? 'Expediente enviado. El administrador revisará tus documentos y te notificará la decisión.'
        : 'File submitted. The administrator will review your documents and notify you of the decision.',
      'info'
    );
  };

  const handlePublishOrganizerEvent = (data: { title: string; theme: string; date: string; time: string; zone: string; cap: number }) => {
    if (!organizerApplication || !organizerBenefitState(organizerApplication).active) return;
    const eventId = 'uev_' + Date.now();
    const newEvent: ClubEvent = {
      id: eventId,
      title: data.title,
      theme: data.theme,
      date: data.date,
      time: data.time,
      zone: data.zone,
      organizer: organizerApplication.legalName,
      organizerUid: user?.uid || null,
      own: false,
      cap: data.cap,
      sold: 0,
      reqs: [isEs ? 'Perfil verificado' : 'Verified profile', isEs ? 'Mayor de 18 años' : '18+ only'],
      paid: true,
      published: false,
      promoted: false,
      hue: 280 + Math.floor(Math.random() * 60),
    };
    setEvents(prev => [newEvent, ...prev]);
    const fee = getEventPublishFee(region);
    const order = newSpeiOrder({
      kind: 'evento',
      itemRef: eventId,
      label: (isEs ? 'Publicación de evento: ' : 'Event publishing: ') + data.title,
      amount: fee.total,
      userName: userProfile.alias,
      userEmail: user?.email || 'sin-correo@local',
      userUid: user?.uid || null,
    });
    persistSpeiOrder(order);
    void createRemoteSpeiOrder(order);
    setActiveSpeiOrder(order);
    setSpeiModalOpen(true);
  };

  const handleRequestWithdrawal = (amount: number) => {
    if (!organizerApplication || organizerApplication.status !== 'aprobada') {
      showToast(
        isEs ? 'Necesitas un expediente aprobado para retirar fondos.' : 'You need an approved file to withdraw funds.',
        'error'
      );
      return;
    }
    const balance = walletBalance(walletTransactions);
    if (amount <= 0 || amount > balance) {
      showToast(
        isEs ? 'Monto inválido: no puede exceder tu saldo disponible.' : 'Invalid amount: it cannot exceed your available balance.',
        'error'
      );
      return;
    }
    if (!namesMatch(organizerApplication.legalName, organizerApplication.payoutHolder)) {
      showToast(
        isEs ? 'La cuenta de retiro debe estar a nombre del titular del expediente.' : 'The withdrawal account must be in the file holder\u2019s name.',
        'error'
      );
      return;
    }
    const wd = newWithdrawalRequest({
      userUid: user?.uid || null,
      userName: organizerApplication.legalName,
      userEmail: user?.email || 'sin-correo@local',
      amount,
      bank: organizerApplication.payoutBank,
      clabe: organizerApplication.payoutClabe,
      holder: organizerApplication.payoutHolder,
    });
    const nextWithdrawals = [wd, ...loadWithdrawals()];
    saveWithdrawals(nextWithdrawals);
    setWithdrawals(nextWithdrawals);
    void createRemoteWithdrawal(wd);
    const withdrawalTx: WalletTransaction = {
      id: 'wtx_' + Date.now(),
      userUid: user?.uid || null,
      kind: 'retiro',
      gross: amount,
      commission: 0,
      isrRetained: 0,
      net: -amount,
      note: (isEs ? 'Solicitud de retiro a cuenta ' : 'Withdrawal request to ') + organizerApplication.payoutBank,
      ts: Date.now(),
    };
    const nextWallet = [...loadWallet(), withdrawalTx];
    saveWallet(nextWallet);
    setWalletTransactions(nextWallet);
    void saveRemoteWalletTransaction(withdrawalTx);
    showToast(
      isEs
        ? 'Retiro solicitado. La transferencia llegará en máximo 24 horas a tu cuenta registrada.'
        : 'Withdrawal requested. The transfer will arrive within 24 hours to your registered account.',
      'info'
    );
  };

  // SPEI: sync orders (local + remote) and apply admin decisions automatically.
  // Approval activates the purchased benefit; rejection keeps the account on the free plan.
  useEffect(() => {
    let cancelled = false;
    const readApplied = (): string[] => {
      try { return JSON.parse(localStorage.getItem('appswinguer_spei_applied') || '[]'); } catch { return []; }
    };
    const applyDecisions = (orders: SpeiOrder[]) => {
      const applied = readApplied();
      let nextApplied = [...applied];
      for (const order of orders) {
        if (nextApplied.includes(order.id)) continue;
        const isMine = user ? (order.userUid === user.uid || (user.email !== null && order.userEmail === user.email)) : false;
        if (!isMine) continue;
        if (order.status === 'aprobado') {
          if (order.kind === 'suscripcion') {
            setSubscriptionTier(order.itemRef as SubscriptionTier);
          } else if (order.kind === 'evento') {
            // Publishing fee paid: the event becomes visible to everyone in the cartelera.
            setEvents(prev => prev.map(e => e.id === order.itemRef ? { ...e, published: true } : e));
          }
          // Extend here with future kinds: 'propuesta_colaboracion', 'premium'
          nextApplied = [...nextApplied, order.id];
          showToast(isEs ? '¡Pago aprobado! Tu ' + order.label + ' ya está activo.' : 'Payment approved! Your ' + order.label + ' is now active.');
        } else if (order.status === 'rechazado') {
          nextApplied = [...nextApplied, order.id];
          showToast(isEs ? 'Tu pago fue rechazado por el administrador. Tu cuenta permanece en Plan Gratis.' : 'Your payment was rejected by the admin. Your account stays on the Free Plan.', 'error');
        }
      }
      if (nextApplied.length !== applied.length) {
        try { localStorage.setItem('appswinguer_spei_applied', JSON.stringify(nextApplied)); } catch { /* ignore */ }
        setAppliedSpeiOrderIds(nextApplied);
      }
    };
    const sync = async () => {
      if (user) {
        const remote = await fetchRemoteSpeiOrdersForUser(user.uid);
        if (cancelled) return;
        if (remote.length > 0) {
          const local = loadLocalSpeiOrders();
          const merged = [...remote];
          for (const l of local) {
            if (!merged.some(r => r.id === l.id)) merged.push(l);
          }
          saveLocalSpeiOrders(merged);
          applyDecisions(merged);
          return;
        }
      }
      applyDecisions(loadLocalSpeiOrders());
    };
    void sync();
    const timer = window.setInterval(() => { void sync(); }, 30000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [user, isEs]);

  // Organizers: sync file, wallet and withdrawals (local + remote) and apply admin decisions automatically.
  // Application approval enables publishing; withdrawal decisions notify and refund the wallet.
  useEffect(() => {
    let cancelled = false;
    const readAppliedWd = (): string[] => {
      try { return JSON.parse(localStorage.getItem('appswinguer_wd_applied') || '[]'); } catch { return []; }
    };
    const sync = async () => {
      if (!user) return;
      const [remoteApp, remoteWallet, remoteWithdrawals] = await Promise.all([
        fetchRemoteOrganizerApplication(user.uid),
        fetchRemoteWalletForUser(user.uid),
        fetchRemoteWithdrawalsForUser(user.uid),
      ]);
      if (cancelled) return;
      if (remoteApp) {
        const localApp = loadOrganizerApplication();
        if (!localApp || remoteApp.createdAt >= localApp.createdAt) {
          saveOrganizerApplication(remoteApp);
          setOrganizerApplication(remoteApp);
        }
      }
      const wallet = mergeById(loadWallet(), remoteWallet);
      saveWallet(wallet);
      setWalletTransactions(wallet);
      const allWithdrawals = mergeById(loadWithdrawals(), remoteWithdrawals);
      saveWithdrawals(allWithdrawals);
      setWithdrawals(allWithdrawals);
      let appliedWd = readAppliedWd();
      for (const wd of allWithdrawals) {
        if (appliedWd.includes(wd.id)) continue;
        if (wd.status === 'transferido') {
          appliedWd = [...appliedWd, wd.id];
          showToast(isEs ? '¡Retiro transferido! Revisa tu cuenta bancaria.' : 'Withdrawal transferred! Check your bank account.');
        } else if (wd.status === 'rechazado') {
          appliedWd = [...appliedWd, wd.id];
          const refundId = 'tx_refund_' + wd.id;
          const currentWallet = loadWallet();
          if (!currentWallet.some(t => t.id === refundId)) {
            const refundTx: WalletTransaction = {
              id: refundId,
              userUid: user.uid,
              kind: 'ajuste',
              gross: 0,
              commission: 0,
              isrRetained: 0,
              net: wd.amount,
              note: isEs ? 'Retiro rechazado: monto devuelto a la cartera.' : 'Withdrawal rejected: amount returned to the wallet.',
              ts: Date.now(),
            };
            const nextWallet = [...currentWallet, refundTx];
            saveWallet(nextWallet);
            setWalletTransactions(nextWallet);
            void saveRemoteWalletTransaction(refundTx);
          }
          showToast(isEs ? 'Tu retiro fue rechazado. El monto regresó a tu cartera.' : 'Your withdrawal was rejected. The amount returned to your wallet.', 'error');
        }
      }
      if (appliedWd.length !== readAppliedWd().length) {
        try { localStorage.setItem('appswinguer_wd_applied', JSON.stringify(appliedWd)); } catch { /* ignore */ }
      }
    };
    void sync();
    const timer = window.setInterval(() => { void sync(); }, 30000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [user, isEs]);

  // Event reservation handler (free events only: paid events go through the
  // attendance deposit modal — one SPEI payment per user, VIP pass issued by
  // the admin, and the organizer is paid at settlement, not at reservation).
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
    showToast(isEs ? `¡Pase apartado con éxito! Tu código de acceso es ${code}.` : `Pass confirmed! Your access code is ${code}.`);
  };

  // Paid event: open the attendance deposit modal (SPEI once per user; the
  // admin approves and issues the 12-digit VIP access pass).
  const handleAttendEvent = (eventId: string, tierId: string | null) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    const tier = EVENT_TIERS.find(t => t.id === tierId) || null;
    setAttendModal({ event, tier });
  };

  // Post-event rating push (opened automatically the day after the event).
  const handleRatePass = (pass: EventAccessPass) => {
    setRatingPass(pass);
  };

  const handleRated = (rating: EventRating) => {
    setRatingPass(null);
    void fetchAllEventRatings().then(all => setOrganizerReputation(reputationByOrganizer(all)));
    showToast(isEs ? '¡Gracias por calificar el evento! Tu opinión genera el estatus de la agencia u organizador.' : 'Thanks for rating the event! Your feedback builds the agency/organizer status.', 'success');
  };

  // ---------- Calificación de perfil tras abandonar un chat (cooldown de 7 días) ----------
  const handleAbandonChat = (profile: Profile, messageCount: number) => {
    if (messageCount < 2) return;
    try {
      const raw = localStorage.getItem('appswinguer_profile_rated');
      const seen: Record<string, number> = raw ? JSON.parse(raw) : {};
      const last = seen[profile.id] || 0;
      if (Date.now() - last < 7 * 24 * 60 * 60 * 1000) return;
    } catch { /* registro de cooldown no disponible: permitir calificar */ }
    setProfileRatingTarget(profile);
  };

  const handleProfileRated = (rating: ProfileRating) => {
    void saveProfileRating(rating);
    try {
      const raw = localStorage.getItem('appswinguer_profile_rated');
      const seen: Record<string, number> = raw ? JSON.parse(raw) : {};
      seen[rating.targetProfileId] = Date.now();
      localStorage.setItem('appswinguer_profile_rated', JSON.stringify(seen));
    } catch { /* ignore */ }
    setProfileRatingTarget(null);
    showToast(isEs ? '¡Gracias por calificar este perfil! Tu opinión mantiene una comunidad segura y confiable.' : 'Thanks for rating this profile! Your feedback keeps the community safe.', 'success');
  };

  // ---------- Alerta SOS (6 toques en el chat; ticket con ubicación en tiempo real) ----------
  const handleSosAlert = (info: { targetName: string; location: string }) => {
    void createRemoteTicket(newSupportTicket({
      userUid: user?.uid || null,
      userName: userProfile.alias,
      userEmail: user?.email || 'sin-correo@local',
      requester: 'usuario',
      subject: 'ALERTA SOS EN VIVO (emergencia)',
      message: 'La usuaria activó el botón de emergencia SOS (6 toques). Persona involucrada: ' + info.targetName + '. Ubicación en tiempo real: ' + info.location + '. Valorar el reporte inmediato a la policía.',
    }));
    showToast(isEs ? 'ALERTA SOS ENVIADA. Compartimos tu ubicación con el Administrador; te recomendamos llamar al 911 de inmediato.' : 'SOS ALERT SENT. Your location was shared with the Administrator; we recommend calling 911 immediately.', 'error');
  };

  // ---------- Retroalimentación de inasistencia a eventos ----------
  const handleNoShowFeedback = (pass: EventAccessPass, reason: string, details: string) => {
    void createRemoteTicket(newSupportTicket({
      userUid: user?.uid || null,
      userName: userProfile.alias,
      userEmail: user?.email || 'sin-correo@local',
      requester: 'usuario',
      subject: 'Inasistencia a evento: ' + pass.eventTitle,
      message: 'Motivo: ' + reason + (details ? '. Detalles: ' + details : '') + '. Pase: ' + pass.code + '. Agencia/Organizador: ' + pass.organizerName + '.',
    }));
    showToast(isEs ? 'Gracias. Registramos tu motivo de inasistencia; nos ayuda a mejorar los eventos y proteger a la comunidad.' : 'Thank you. Your no-show reason was registered.', 'info');
  };

  // ---------- Uber Privado de Seguridad (9 PM a 12 AM; +20% de honorarios + IVA 16%) ----------
  const handleUberSafeRequest = (origin: string, destination: string, uberFare: number) => {
    const base = Number(uberFare) || 0;
    const serviceFee = Math.round(base * 0.2 * 100) / 100;
    const tax = Math.round((base + serviceFee) * 0.16 * 100) / 100;
    const total = Math.round((base + serviceFee + tax) * 100) / 100;
    void createRemoteTicket(newSupportTicket({
      userUid: user?.uid || null,
      userName: userProfile.alias,
      userEmail: user?.email || 'sin-correo@local',
      requester: 'usuario',
      subject: 'Solicitud Uber Privado de Seguridad (9 PM - 12 AM)',
      message: 'Origen: ' + origin + '. Destino: ' + destination + '. Tarifa Uber estimada: $' + base + '. Honorarios (20%): $' + serviceFee + '. IVA (16%): $' + tax + '. Total a cobrar: $' + total + '. Despachar el viaje y coordinar el pago con la usuaria.',
    }));
    setUberSafeOpen(false);
    showToast(isEs ? 'Solicitud enviada al Administrador. Total del servicio (incluye 20% de honorarios e IVA 16%): $' + total : 'Request sent to the Administrator. Service total: $' + total, 'info');
  };

  const handleCancelReservation = (reservationId: string) => {
    setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'cancelado' } : r));
  };

  // Settlement released instantly (attendance >= 50%): the organizer's wallet
  // is credited locally and remotely so the money appears on their device.
  const handleOrganizerWalletCredit = (tx: WalletTransaction) => {
    const nextWallet = [...loadWallet(), tx];
    saveWallet(nextWallet);
    setWalletTransactions(nextWallet);
    void saveRemoteWalletTransaction(tx);
  };

  // Proposal handlers with strict weekly quota enforcement
  const handleApplyProposal = (proposal: Proposal) => {
    const weeklyLimit = getWeeklyLimit(subscriptionTier);
    const usedThisWeek = getWeeklyApplicationsCount();

    if (usedThisWeek >= weeklyLimit) {
      const planName = subscriptionTier === 'free' 
        ? (isEs ? 'Plan Gratis (máx. 4 por semana)' : 'Free Plan (max 4/week)')
        : (isEs ? 'Plan VIP Plus (máx. 15 por semana)' : 'VIP Plus Plan (max 15/week)');
      
      const nextPlanOffer = subscriptionTier === 'free'
        ? (isEs ? 'Siguiente plan (15 postulaciones/semana) o Ultra Plan (Ilimitadas)' : 'Next plan (15/week) or Ultra Plan (Unlimited)')
        : (isEs ? 'Ultra Plan (Postulaciones Ilimitadas)' : 'Ultra Plan (Unlimited postulations)');

      const alertMsg = isEs
        ? `Has alcanzado el límite semanal de ${weeklyLimit} postulaciones de tu ${planName}.\n\nPara continuar postulándote a fiestas y propuestas exclusivas, sube a: ${nextPlanOffer}.`
        : `You reached the weekly limit of ${weeklyLimit} applications of your ${planName}.\n\nUpgrade to ${nextPlanOffer} to post unlimited requests.`;
      
      showToast(alertMsg, 'info');
      setExtrasModalOpen(true);
      return;
    }

    const newRecord = {
      id: `app_${Date.now()}`,
      proposalId: proposal.id,
      ts: Date.now(),
    };
    setProposalApplications(prev => [newRecord, ...prev]);
    setAppliedProposalIds(prev => [...prev, proposal.id]);

    const remaining = weeklyLimit === Infinity ? (isEs ? 'Ilimitadas' : 'Unlimited') : (weeklyLimit - (usedThisWeek + 1));
    const msg = isEs
      ? `¡Postulación enviada con éxito a "${proposal.title}"!\nTu identidad se mantiene confidencial.\n\nPostulaciones restantes esta semana: ${remaining}.`
      : `Application sent successfully to "${proposal.title}"!\nConfidentiality preserved.\n\nRemaining applications this week: ${remaining}.`;
    showToast(msg);
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
    showToast(isEs ? 'Propuesta enviada para revisión.' : 'Proposal submitted for review.');
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
    // Legal archive: persist the collaborator's INE and selfie for potential legal disputes.
    void saveRemoteIneRecord(newIneRecord({
      userUid: user?.uid || null,
      userEmail: user?.email || 'sin-correo@local',
      alias: userProfile.alias,
      legalName: fullProposal.organizerName,
      source: 'colaboracion',
      context: fullProposal.title,
      ineFront: fullProposal.ineFrontUrl,
      ineBack: fullProposal.ineBackUrl,
      selfie: fullProposal.selfieUrl,
    })).then(ok => {
      if (ok) showToast(isEs ? 'Identificación resguardada en el archivo legal de la plataforma.' : 'Identification stored in the platform legal archive.');
    });
  };

  // Creator subscriptions (content earnings credit the creator's virtual card,
  // keyed by handle; the 85% net rule after 30% commission minus ISR is the
  // same breakdown used for events and donations)
  const creditCreatorEarning = (creator: Creator, gross: number, concept: string) => {
    const split = computeEarningSplit(gross);
    const tx: WalletTransaction = {
      id: 'wtx_c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      userUid: null,
      kind: 'ingreso_contenido',
      creatorHandle: creator.handle,
      gross,
      commission: split.commission,
      isrRetained: split.isrRetained,
      net: split.net,
      note: `${concept}: ${creator.name} (${creator.handle})`,
      ts: Date.now(),
    };
    void saveRemoteWalletTransaction(tx);
    if (userCreator && userCreator.handle === creator.handle) {
      setCreatorWallet(prev => [tx, ...prev]);
    }
  };

  const handleSubscribeCreator = (creator: Creator) => {
    setSubscribedCreatorHandles(prev => [...prev, creator.handle]);
    creditCreatorEarning(creator, creator.price, isEs ? 'Suscripción' : 'Subscription');
    showToast(isEs ? `¡Suscripción confirmada a ${creator.name} (${creator.handle})!` : `Subscribed to ${creator.name}!`);
  };

  const handleBuyLiveAccess = (live: LiveStream) => {
    setLiveAccessIds(prev => [...prev, live.id]);
    const hostCreator = creators.find(c => c.handle === live.host || c.name === live.host);
    if (hostCreator) {
      creditCreatorEarning(hostCreator, live.price, isEs ? 'Acceso a directo' : 'Live access');
    }
    showToast(isEs ? `¡Pase adquirido para "${live.title}"!` : `Live access confirmed!`);
  };

  // Donations to creators: user pays IVA + the donated amount; the creator
  // sees which profile sent it and the value is credited to her virtual card.
  const handleDonate = (creator: Creator) => {
    setDonateCreator(creator);
  };

  // Creator withdrawal request (the creator's card is a balance ledger: money
  // enters from subscriptions, lives and donations; withdrawals run through
  // the same 24-36 h SPEI queue as the organizers).
  const handleCreatorWithdrawal = (amount: number) => {
    if (!organizerApplication || organizerApplication.status !== 'aprobada') {
      showToast(
        isEs
          ? 'Para retirar fondos de tu tarjeta de creadora registra y aprueba tu expediente con cuenta de retiro (banco y CLABE a tu nombre). Puedes hacerlo desde el Panel de Organizadores, sección Registro.'
          : 'To withdraw funds from your creator card, register and get your payout file approved (bank and CLABE in your name). You can do it from the Organizer Panel, File section.',
        'error'
      );
      return;
    }
    const balance = walletBalance(mergeById(walletTransactions, creatorWallet));
    if (amount <= 0 || amount > balance) {
      showToast(
        isEs ? 'Monto inválido: no puede exceder tu saldo disponible.' : 'Invalid amount: it cannot exceed your available balance.',
        'error'
      );
      return;
    }
    const wd = newWithdrawalRequest({
      userUid: user?.uid || null,
      userName: organizerApplication.legalName,
      userEmail: user?.email || 'sin-correo@local',
      amount,
      bank: organizerApplication.payoutBank,
      clabe: organizerApplication.payoutClabe,
      holder: organizerApplication.payoutHolder,
    });
    const nextWithdrawals = [wd, ...loadWithdrawals()];
    saveWithdrawals(nextWithdrawals);
    setWithdrawals(nextWithdrawals);
    void createRemoteWithdrawal(wd);
    const withdrawalTx: WalletTransaction = {
      id: 'wtx_cwd_' + Date.now(),
      userUid: user?.uid || null,
      kind: 'retiro',
      creatorHandle: userCreator?.handle,
      gross: amount,
      commission: 0,
      isrRetained: 0,
      net: -amount,
      note: isEs ? 'Solicitud de retiro (tarjeta de creadora)' : 'Withdrawal request (creator card)',
      ts: Date.now(),
    };
    setCreatorWallet(prev => [withdrawalTx, ...prev]);
    void saveRemoteWalletTransaction(withdrawalTx);
    showToast(isEs
      ? 'Retiro solicitado: transferencia en máximo 24-36 h a tu cuenta registrada.'
      : 'Withdrawal requested: transfer within 24-36 h to your registered account.', 'success');
  };

  // Creator card balance: transactions keyed by the creator handle (remote)
  // merged with the local organizer wallet.
  useEffect(() => {
    const handle = userCreator?.handle;
    if (!handle) { setCreatorWallet([]); return; }
    let cancelled = false;
    void fetchRemoteWalletForCreator(handle).then(list => {
      if (!cancelled) setCreatorWallet(prev => {
        const merged = [...list];
        for (const t of prev) if (!merged.some(m => m.id === t.id)) merged.push(t);
        return merged.sort((a, b) => b.ts - a.ts);
      });
    }).catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [userCreator?.handle, donateCreator]);

  // Club reward redemption
  const handleRedeemClubReward = () => {
    const folio = `CLB-${Math.floor(1000 + Math.random() * 9000)}`;
    setRedeemedClubFolio(folio);
    showToast(isEs ? `¡Felicidades! Has canjeado tu recompensa del Club de Experiencias. Folio: ${folio}` : `Club reward redeemed! Folio: ${folio}`);
  };

  // Data privacy wipe
  const handleWipeData = () => {
    if (window.confirm(isEs ? '¿Restablecer datos locales de este dispositivo?' : 'Reset local data on this device?')) {
      setCurrentIndex(0);
      setSwipedHistory([]);
      setMatches([]);
      setAppliedProposalIds([]);
      setSavedProposalIds([]);
      showToast(isEs ? 'Datos restablecidos.' : 'Data reset.');
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

  // ---------- PUBLIC GATE 1: landing screen for visitors without a session ----------
  if (!user && !onboardingMode) {
    return (
      <div className="min-h-screen bg-[#050307] text-[#f5eeff]">
        <LandingScreen
          isEs={isEs}
          onRegister={() => setOnboardingMode('register')}
          onLogin={() => setOnboardingMode('login')}
          onGoogleSignIn={handleGoogleSignIn}
          onOpenLegal={(topic) => { setLegalTopic(topic || null); setLegalModalOpen(true); }}
        />
        {legalModalOpen && (
          <LegalModal isOpen={legalModalOpen} onClose={() => setLegalModalOpen(false)} initialTopic={legalTopic} />
        )}
        <ToastHost />
      </div>
    );
  }

  // ---------- PUBLIC GATE 2: onboarding wizard until the funnel (profile + INE) is complete ----------
  if (onboardingMode) {
    return (
      <div className="min-h-screen bg-[#050307] text-[#f5eeff]">
        <OnboardingWizard
          mode={onboardingMode}
          isEs={isEs}
          region={region}
          onCreateAccount={handleCreateAccount}
          onLoginAccount={handleLoginAccount}
          onComplete={handleOnboardingComplete}
          onAbort={handleAbortOnboarding}
          onOpenLegal={(topic) => { setLegalTopic(topic || null); setLegalModalOpen(true); }}
        />
        {legalModalOpen && (
          <LegalModal isOpen={legalModalOpen} onClose={() => setLegalModalOpen(false)} initialTopic={legalTopic} />
        )}
        <ToastHost />
      </div>
    );
  }

  // ---------- IDENTITY GATE: accounts rejected or banned by the admin ----------
  // Reject: the owner is notified that we could not validate who they claim to
  // be and deletes account + credentials here. Ban: credentials stay retained
  // for one year (legal window) and the account remains blocked.
  if (user && (identityStatus === 'rechazada' || identityStatus === 'baneada')) {
    return (
      <div className="min-h-screen bg-[#050307] text-[#f5eeff]">
        <IdentityGate
          mode={identityStatus}
          isEs={isEs}
          alias={userProfile.alias}
          notifications={notifications}
          deleting={deletingAccount}
          onDeleteAccount={() => { void handleDeleteRejectedAccount(); }}
          onSignOut={() => { void handleSignOut(); }}
        />
        <ToastHost />
      </div>
    );
  }

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
              onClick={() => setPushLookupOpen(true)}
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

                  {/* Radius recommendation based on the granted GPS location */}
                  {locationGranted && maxDistance > 6 && (
                    <button
                      type="button"
                      onClick={() => {
                        const suggested = recommendRadiusKm();
                        setMaxDistance(suggested);
                        setUserProfile(prev => ({ ...prev, maxKm: suggested }));
                        showToast(isEs
                          ? `Con tu ubicación te recomendamos un radio de ${suggested} km: perfiles cercanos y mayor seguridad.`
                          : `Based on your location we recommend a ${suggested} km radius: nearby profiles and higher safety.`);
                      }}
                      className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-[9px] font-bold text-emerald-300 flex items-center gap-1 active:scale-95 transition"
                    >
                      <MapPinIcon className="w-2.5 h-2.5" />
                      {isEs ? `Sugerido: ${recommendRadiusKm()} km` : `Suggested: ${recommendRadiusKm()} km`}
                    </button>
                  )}

                  {/* Premium state-search pass entry (travelers & tourists) */}
                  <button
                    onClick={() => setPremiumSearchOpen(true)}
                    className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/25 to-pink-500/25 hover:from-amber-500/40 hover:to-pink-500/40 border border-amber-400/50 text-[10px] font-bold text-amber-200 flex items-center gap-1 active:scale-95 transition shadow-sm"
                    title={isEs ? 'Búsqueda por estado para viajeros (pase premium de 24 horas)' : 'State search for travelers (24-hour premium pass)'}
                  >
                    <CrownIcon className="w-3 h-3 text-amber-300" />
                    <span>
                      {statePass
                        ? `${statePass.stateName} · ${Math.max(0, Math.ceil((statePass.expiresAt - Date.now()) / 3600000))} h`
                        : (isEs ? 'Búsqueda por estado' : 'Search by state')}
                    </span>
                  </button>

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
              onOpenReport={(target) => showToast(isEs ? `Reporte recibido para "${target.name}".` : `Report registered.`, 'info')}
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
              events={events.filter(e => e.published)}
              reservations={reservations}
              passes={eventPasses}
              reputation={organizerReputation}
              onReserve={handleReserveEvent}
              onAttend={handleAttendEvent}
              onCancelReservation={handleCancelReservation}
              onRatePass={handleRatePass}
              onOpenOrganizerPanel={() => setOrganizerModalOpen(true)}
              onOpenOrganizerProfile={(name, uid) => setOrganizerProfileOpen({ name, uid })}
              onNoShowFeedback={handleNoShowFeedback}
              onAgencyPromoRequest={(data) => {
                showToast(isEs ? `Solicitud recibida para la agencia "${data.agency}". Nos pondremos en contacto con las tarifas.` : `Request submitted.`);
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
              walletTransactions={mergeById(walletTransactions, creatorWallet)}
              onSubscribe={handleSubscribeCreator}
              onBuyLiveAccess={handleBuyLiveAccess}
              onDonate={handleDonate}
              onRegisterCreator={(c) => {
                setUserCreator(c);
                setCreators(prev => [c, ...prev]);
                showToast(isEs ? "¡Perfil de creadora registrado! Ya puedes fijar precios y subir sets exclusivos." : "Creator profile registered!");
              }}
              onUploadMedia={(data) => {
                showToast(isEs ? `Contenido "${data.caption}" enviado a moderación.` : `Content submitted to moderation.`);
              }}
              onRequestWithdrawal={handleCreatorWithdrawal}
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
              currentTier={subscriptionTier}
              onSelectTier={handleRequestPlanPayment}
              weeklyApplicationsUsed={getWeeklyApplicationsCount()}
              weeklyApplicationsLimit={getWeeklyLimit(subscriptionTier)}
              region={region}
              isEs={isEs}
              onOpenExtrasModal={() => setExtrasModalOpen(true)}
              matches={matches}
              identityApproved={identityStatus === 'aprobada'}
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
                  initialChatUserId={activeChatUserId}
                  onOpenProfile={(p) => setDetailsProfile(p)}
                  onOpenReport={(t) => showToast(isEs ? `Reporte registrado para ${t.name}.` : `Report received.`, 'info')}
                  onBlockUser={(id) => {
                    setMatches(prev => prev.filter(m => m.profile.id !== id));
                    if (activeChatUserId === id) {
                      setActiveChatUserId(null);
                    }
                  }}
                  onBackToApp={() => setChatDrawerOpen(false)}
                  onAbandonChat={handleAbandonChat}
                  onSosAlert={handleSosAlert}
                  onRequestUberSafe={() => setUberSafeOpen(true)}
                  isDama={userProfile.kind === 'Dama'}
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
            showToast(isEs ? `¡Perfil actualizado para ${data.alias} (${data.kind})!` : `Profile updated!`);
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
          onSelectTier={handleRequestPlanPayment}
        />

        {/* MODAL 2B: SPEI CHECKOUT (instructions + transfer confirmation) */}
        <SpeiModal
          isOpen={speiModalOpen}
          onClose={() => {
            setSpeiModalOpen(false);
            setActiveSpeiOrder(null);
          }}
          order={activeSpeiOrder}
          region={region}
          isEs={isEs}
          onTransferSent={handleSpeiTransferSent}
        />

        {/* MODAL 2C: ORGANIZER PANEL (expediente documental, publicación de eventos y cartera virtual) */}
        <OrganizerModal
          isOpen={organizerModalOpen}
          onClose={() => setOrganizerModalOpen(false)}
          isEs={isEs}
          region={region}
          userEmail={user?.email || 'sin-correo@local'}
          userName={userProfile.alias}
          userUid={user?.uid || null}
          application={organizerApplication}
          benefit={organizerBenefitState(organizerApplication)}
          eventFee={getEventPublishFee(region)}
          ownEvents={organizerApplication ? events.filter(e => e.organizer === organizerApplication.legalName) : []}
          wallet={walletTransactions}
          withdrawals={withdrawals}
          onSubmitApplication={handleSubmitOrganizerApplication}
          onPublishEvent={handlePublishOrganizerEvent}
          onRequestWithdrawal={handleRequestWithdrawal}
          onWalletCredit={handleOrganizerWalletCredit}
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
          onOpenSafetyTips={() => setSafetyTipsOpen(true)}
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
            initialTopic={legalTopic}
          />
        )}

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

        {/* MODAL 9: PREMIUM STATE SEARCH (travelers & tourists, 24-hour SPEI pass) */}
        <PremiumStateSearch
          isOpen={premiumSearchOpen}
          onClose={() => setPremiumSearchOpen(false)}
          isEs={isEs}
          region={region}
          userUid={user?.uid || null}
          userName={userProfile.alias}
          userEmail={user?.email || 'sin-correo@local'}
          profiles={profiles}
          events={events}
          onConnect={(p) => { void handleStatePassConnect(p); }}
          onPassChange={(p) => setStatePass(p)}
        />

        {/* MODAL 10: EVENT ATTENDANCE DEPOSIT (paid events: one SPEI payment
            per user, VIP pass issued by the admin, same-day location release) */}
        <EventAttendModal
          isOpen={!!attendModal}
          onClose={() => setAttendModal(null)}
          isEs={isEs}
          region={region}
          event={attendModal?.event || null}
          tier={attendModal?.tier || null}
          userUid={user?.uid || null}
          userName={userProfile.alias}
          userEmail={user?.email || 'sin-correo@local'}
          passes={eventPasses}
          onPassChange={(list) => setEventPasses(list)}
        />

        {/* MODAL 11: DONATION TO CREATOR (user pays IVA + amount; the creator
            sees which profile donated; credited to her virtual card) */}
        <DonateModal
          isOpen={!!donateCreator}
          onClose={() => setDonateCreator(null)}
          isEs={isEs}
          region={region}
          creator={donateCreator}
          userUid={user?.uid || null}
          userName={userProfile.alias}
          userProfileName={userProfile.alias}
          userEmail={user?.email || 'sin-correo@local'}
        />

        {/* MODAL 12: POST-EVENT RATING (5 stars + comment; builds the agency
            reputation and raises admin alerts on bad references) */}
        <EventRatingModal
          isOpen={!!ratingPass}
          onClose={() => setRatingPass(null)}
          isEs={isEs}
          pass={ratingPass}
          userUid={user?.uid || null}
          userName={userProfile.alias}
          onRated={handleRated}
        />

        {/* MODAL 13: CALIFICACIÓN DE PERFIL TRAS ABANDONAR UN CHAT (5 estrellas +
            tipo de encuentro; construye la reputación de cada perfil con cooldown de 7 días) */}
        <ProfileRatingModal
          isOpen={!!profileRatingTarget}
          onClose={() => setProfileRatingTarget(null)}
          isEs={isEs}
          target={profileRatingTarget}
          raterUid={user?.uid || null}
          raterName={userProfile.alias}
          onPublished={handleProfileRated}
        />

        {/* MODAL 14: PERFIL PÚBLICO DE AGENCIA/ORGANIZADOR (calificación, número de
            eventos publicados y comentarios de asistentes; sin mensajería directa) */}
        {organizerProfileOpen && (
          <OrganizerProfileModal
            isOpen={true}
            onClose={() => setOrganizerProfileOpen(null)}
            isEs={isEs}
            organizerName={organizerProfileOpen.name}
            organizerUid={organizerProfileOpen.uid}
            events={events.filter(e => e.published)}
          />
        )}

        {/* MODAL 15: UBER PRIVADO DE SEGURIDAD (9 PM a 12 AM; +20% honorarios + IVA) */}
        <UberSafeModal
          isOpen={uberSafeOpen}
          onClose={() => setUberSafeOpen(false)}
          isEs={isEs}
          onRequest={handleUberSafeRequest}
        />

        {/* MODAL 16: CONSEJOS DE SEGURIDAD E HIGIENE (lugar público, protección,
            avisar a un contacto de confianza) */}
        <SafetyTipsModal
          isOpen={safetyTipsOpen}
          onClose={() => setSafetyTipsOpen(false)}
          isEs={isEs}
          onRequestUberSafe={() => setUberSafeOpen(true)}
        />

        {/* GLOBAL IN-APP TOASTS (replaces native alert dialogs) */}
        <ToastHost />

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
