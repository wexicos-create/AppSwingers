import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as fbSignOut, User } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { 
  auth, 
    syncUserProfile, 
  recordSwipe, 
  fetchUserMatches, 
  testConnection,
  db
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
import { AccountAccessModal } from './components/AccountAccessModal';
import { WelcomeScreen } from './components/WelcomeScreen';
import { IdentityVerificationModal } from './components/IdentityVerificationModal';
import { MonetizationExtrasModal } from './components/MonetizationExtrasModal';
import { PushLookupModal } from './components/PushLookupModal';
import { BenefitNotificationsModal } from './components/BenefitNotificationsModal';
import { ApprovedEntitlement, entitlementState } from './lib/benefitLifecycle';
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
  const [events, setEvents] = useState<ClubEvent[]>(INITIAL_EVENTS);
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
  const [blockedProfileIds, setBlockedProfileIds] = useState<string[]>([]);

  // Modals & Drawers state
  const [matchModalProfile, setMatchModalProfile] = useState<Profile | null>(null);
  const [detailsProfile, setDetailsProfile] = useState<Profile | null>(null);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [collaborationModalOpen, setCollaborationModalOpen] = useState(false);
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [accountAccessOpen, setAccountAccessOpen] = useState(false);
  const [accountInitialMode, setAccountInitialMode] = useState<'register' | 'login'>('register');
  const [legalInitialTopic, setLegalInitialTopic] = useState<string | null>(null);
  const [identityVerificationOpen, setIdentityVerificationOpen] = useState(false);
  const [extrasModalOpen, setExtrasModalOpen] = useState(false);
  const [pushLookupOpen, setPushLookupOpen] = useState(false);
  const [benefitNotificationsOpen, setBenefitNotificationsOpen] = useState(false);
  const [approvedEntitlement, setApprovedEntitlement] = useState<ApprovedEntitlement | null>(null);
  const [benefitLoading, setBenefitLoading] = useState(false);
  const [benefitError, setBenefitError] = useState<string | null>(null);
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
      }
    });

    return () => unsubscribe();
  }, []);


  // Read benefits from the trusted backend; never infer activation from a client-writable field.
  useEffect(() => {
    let cancelled = false;
    const loadApprovedBenefit = async () => {
      if (!user) {
        setApprovedEntitlement(null);
        setSubscriptionTier('free');
        setBenefitError(null);
        setBenefitLoading(false);
        return;
      }
      setBenefitLoading(true);
      setBenefitError(null);
      try {
        const functions = getFunctions(undefined, 'us-central1');
        const getMyBenefits = httpsCallable(functions, 'getMyBenefits');
        const response = await getMyBenefits({});
        if (cancelled) return;
        const payload = response.data as {
          items?: Array<Record<string, unknown>>;
          notifications?: Array<{ id: string; type?: string; title?: string; body?: string }>;
        };
        const unreadNotification = Array.isArray(payload.notifications) ? payload.notifications[0] : undefined;
        if (unreadNotification) {
          setPushToast({
            title: unreadNotification.title || (isEs ? 'Notificación de AppSwinger' : 'AppSwinger notification'),
            body: unreadNotification.body || '',
          });
          void updateDoc(doc(db, 'userNotifications', user.uid, 'items', unreadNotification.id), { read: true }).catch(() => {
            // If marking as read fails, leave the notification available for the next attempt.
          });
        }
        const validKeys = ['vip_plus', 'ultra_vip', 'event_listing', 'featured_campaign', 'profile_boost', 'host_tools'];
        const items = Array.isArray(payload.items) ? payload.items.filter(item =>
          item.userId === undefined &&
          validKeys.includes(String(item.benefitKey)) &&
          ['active', 'expired', 'revoked'].includes(String(item.status)) &&
          item.paymentStatus === 'approved' &&
          typeof item.activatedAt === 'string'
        ) : [];
        items.sort((a, b) => Date.parse(String(b.activatedAt)) - Date.parse(String(a.activatedAt)));
        const data = items[0];
        if (!data) {
          setApprovedEntitlement(null);
          setSubscriptionTier('free');
          return;
        }
        const entitlement: ApprovedEntitlement = {
          userId: user.uid,
          benefitKey: data.benefitKey as ApprovedEntitlement['benefitKey'],
          status: data.status as ApprovedEntitlement['status'],
          paymentStatus: 'approved',
          activatedAt: String(data.activatedAt),
          expiresAt: typeof data.expiresAt === 'string' ? data.expiresAt : null,
          approvalReference: typeof data.approvalReference === 'string' ? data.approvalReference : undefined,
        };
        setApprovedEntitlement(entitlement);
        const expiry = entitlementState(entitlement);
        setSubscriptionTier(expiry.active ? (entitlement.benefitKey === 'vip_plus' ? 'plus' : entitlement.benefitKey === 'ultra_vip' ? 'ultra' : 'free') : 'free');
        if (!unreadNotification && expiry.shouldNotify) {
          setPushToast({
            title: isEs ? 'Tu beneficio está por vencer' : 'Your benefit is about to expire',
            body: isEs
              ? `Quedan ${expiry.daysRemaining} día(s) de tu beneficio pagado.`
              : `${expiry.daysRemaining} day(s) remain on your paid benefit.`,
          });
        }
      } catch {
        if (!cancelled) {
          setApprovedEntitlement(null);
          setSubscriptionTier('free');
          setBenefitError(isEs
            ? 'No se pudo consultar el beneficio seguro del servidor. No se concedieron permisos de pago.'
            : 'Could not read the server benefit. No paid access was granted.');
        }
      } finally {
        if (!cancelled) setBenefitLoading(false);
      }
    };
    void loadApprovedBenefit();
    return () => { cancelled = true; };
  }, [user, isEs]);

  const handleSignOut = async () => {
    try {
      await fbSignOut(auth);
      setUser(null);
    } catch (e) {
      console.warn('Sign Out error:', e);
    }
  };

  const handleReportProfile = async (profile: Profile) => {
    if (!user) {
      alert(isEs ? 'Inicia sesión para enviar una denuncia.' : 'Sign in to submit a report.');
      setAccountAccessOpen(true);
      return;
    }
    const reason = window.prompt(isEs
      ? 'Motivo de denuncia: acoso, amenaza, identidad falsa, contenido no consentido, posible menor u otro. Describe hechos, no suposiciones.'
      : 'Report reason: harassment, threat, fake identity, non-consensual content, possible minor or other. Describe facts, not assumptions.');
    if (!reason?.trim()) return;
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: user.uid,
        target: { type: 'usuario', id: profile.id, name: profile.name },
        reason: reason.trim().slice(0, 120),
        details: '',
        createdAt: serverTimestamp(),
        status: 'abierto',
      });
      alert(isEs ? 'Denuncia enviada para revisión. Si existe peligro inmediato, contacta a emergencias locales.' : 'Report submitted for review. If there is immediate danger, contact local emergency services.');
    } catch {
      alert(isEs ? 'No se pudo enviar la denuncia. Revisa la conexión e inténtalo de nuevo.' : 'Could not submit report. Check your connection and retry.');
    }
  };

  const handleBlockProfile = async (profile: Profile) => {
    if (!user) {
      alert(isEs ? 'Inicia sesión para bloquear usuarios.' : 'Sign in to block users.');
      setAccountAccessOpen(true);
      return;
    }
    if (!window.confirm(isEs ? `¿Bloquear a ${profile.name}? Dejarás de ver su perfil en esta sesión.` : `Block ${profile.name}? Their profile will be hidden in this session.`)) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'blocks', encodeURIComponent(profile.id)), {
        targetUserId: profile.id,
        targetName: profile.name.slice(0, 80),
        createdAt: serverTimestamp(),
      });
      setBlockedProfileIds(prev => prev.includes(profile.id) ? prev : [...prev, profile.id]);
      setMatches(prev => prev.filter(match => match.profile.id !== profile.id));
      setDetailsProfile(null);
      alert(isEs ? 'Usuario bloqueado en tu cuenta. El bloqueo entre dispositivos depende de sincronizar esta lista en todos los módulos.' : 'User blocked on your account. Cross-device blocking requires this list to be applied across all modules.');
    } catch {
      alert(isEs ? 'No se pudo guardar el bloqueo en el servidor.' : 'Could not save the block to the server.');
    }
  };

  // Regional & Distance filtered profiles (México vs USA)
  const visibleProfiles = profiles.filter(p => {
    const profileCountry = p.country || 'MX';
    return profileCountry === region && p.km <= maxDistance && !blockedProfileIds.includes(p.id);
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

    // A local "like", superlike, profile score, or mock likesYou flag is NOT a mutual match.
    // Only a trusted backend can confirm mutual consent and create a chat-enabled match.
    if (user) {
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/swipes/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ targetUserId: target.id, action }),
        });
        if (response.ok) {
          const result = await response.json();
          if (result?.match?.profile && result?.match?.id) {
            const confirmedMatch = result.match as MatchItem;
            setMatches(prev => prev.some(m => m.id === confirmedMatch.id) ? prev : [confirmedMatch, ...prev]);
            setMatchModalProfile(confirmedMatch.profile);
          }
        } else if (response.status !== 404) {
          console.warn('Match service rejected the swipe:', response.status);
        }
      } catch (err) {
        // Keep the swipe recorded; do not fabricate a match or open an unverified chat.
        console.warn('Mutual-match service unavailable:', err);
      }
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

  // Reservation requests never count as paid tickets. A trusted payment webhook
  // must confirm payment and issue a real ticket/access code before admission.
  const handleReserveEvent = (eventId: string, tierId: string | null) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    const reservationId = `res_${Date.now()}`;
    const newReservation: Reservation = {
      id: reservationId,
      eventId,
      tier: tierId,
      folio: reservationId,
      code: '',
      ts: Date.now(),
      status: event.paid ? 'pendiente_pago' : 'solicitud',
    };
    setReservations(prev => [newReservation, ...prev]);
    alert(event.paid
      ? (isEs ? 'Solicitud creada. Tu lugar no está pagado ni confirmado; el boleto se emitirá tras verificar el pago.' : 'Request created. Your place is not paid or confirmed; a ticket will be issued after payment verification.')
      : (isEs ? 'Solicitud de reservación enviada. Espera la confirmación del organizador.' : 'Reservation request submitted. Wait for organizer confirmation.'));
  };

  const handleCancelReservation = (reservationId: string) => {
    setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'cancelado' } : r));
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
      
      alert(alertMsg);
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
    alert(msg);
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
      // A proposal is not a payment receipt. Keep unpaid until a server-approved order
      // and bank reconciliation explicitly confirm the publication fee.
      paid: false,
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
    alert(isEs
      ? 'Propuesta recibida en esta sesión, pero aún no está pagada ni publicada. La tarifa se debe cobrar y conciliar antes de aprobarla.'
      : 'Proposal received in this session, but it is unpaid and unpublished. The fee must be charged and reconciled before approval.');
  };

  // Never unlock creator subscriptions or paid live access through a client-only click.
  // The server-side adult-content processor adapter is not enabled yet.
  const handleSubscribeCreator = (creator: Creator) => {
    alert(isEs
      ? `La suscripción a ${creator.name} aún no está habilitada: falta integrar y probar un procesador de pagos autorizado. No se realizó ningún cobro ni se activó acceso.`
      : `Subscriptions to ${creator.name} are not enabled yet. An approved payment processor must be integrated and tested. No charge or access was granted.`);
  };

  const handleBuyLiveAccess = (live: LiveStream) => {
    alert(isEs
      ? `El acceso pagado a "${live.title}" aún no está habilitado. No se realizó ningún cobro ni se concedió acceso.`
      : `Paid access to "${live.title}" is not enabled yet. No charge was made and no access was granted.`);
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
        {!user && !accountAccessOpen && !legalModalOpen && !registrationModalOpen && <WelcomeScreen isEs={isEs} onOpenAccount={(mode) => { setAccountInitialMode(mode); setAccountAccessOpen(true); }} onOpenLegal={(topic) => { setLegalInitialTopic(topic); setLegalModalOpen(true); }} />}
        
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

            <button type="button" onClick={() => setIdentityVerificationOpen(true)} className="p-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/30 text-white transition active:scale-95" title={isEs ? 'Verificar INE e identidad' : 'Verify ID and identity'} aria-label={isEs ? 'Verificación de identidad' : 'Identity verification'}>
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
            </button>

            <button
              type="button"
              onClick={() => setBenefitNotificationsOpen(true)}
              className="relative p-2 rounded-xl bg-amber-950/60 hover:bg-amber-900/70 border border-amber-400/30 text-white transition active:scale-95"
              title={isEs ? 'Notificaciones y vencimiento de beneficios' : 'Benefit notifications and expiry'}
              aria-label={isEs ? 'Notificaciones de beneficios' : 'Benefit notifications'}
            >
              <Bell className="w-4 h-4 text-amber-300" />
              {approvedEntitlement && entitlementState(approvedEntitlement).shouldNotify && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-300 ring-2 ring-amber-950" />}
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
              userId={user?.uid}
              displayName={userProfile.alias || user?.displayName || undefined}
            />
          )}

          {/* TAB 6: PERFIL & CLUB */}
          {activeTab === 'perfil' && (
            <ProfileView
              user={user}
              onSignIn={() => setAccountAccessOpen(true)}
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
              onOpenLegal={() => { setLegalInitialTopic(null); setLegalModalOpen(true); }}
              onExportData={handleExportData}
              onWipeData={handleWipeData}
              currentTier={subscriptionTier}
              onSelectTier={(tier) => {
                if (tier === 'free') {
                  // Only the trusted server benefit response can grant a paid tier.
                  if (!approvedEntitlement) setSubscriptionTier('free');
                  alert(isEs ? 'El plan gratuito sigue disponible.' : 'The free plan remains available.');
                  return;
                }
                setExtrasModalOpen(true);
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

        <AccountAccessModal
          isOpen={accountAccessOpen}
          onClose={() => setAccountAccessOpen(false)}
          isEs={isEs}
          initialMode={accountInitialMode}
          onSuccess={(created) => {
            setAccountAccessOpen(false);
            if (created) setRegistrationModalOpen(true);
          }}
        />

        {/* MODAL 1: REGISTRATION & SEXUAL TASTES / FANTASIES */}
        <RegistrationModal
          isOpen={registrationModalOpen}
          onClose={() => setRegistrationModalOpen(false)}
          lang={lang}
          region={region}
          initialData={userProfile}
          onSave={(data) => {
            const savedProfile = {
              alias: data.alias,
              kind: data.kind,
              bio: data.bio,
              interests: data.interests,
              seeking: data.seeking,
              ages: data.ages,
              maxKm: data.maxKm,
              locationCity: data.locationCity || (region === 'MX' ? 'San Luis Potosí, SLP' : 'United States'),
              onboardingCompleted: true,
              adultConsentDeclaredAt: new Date().toISOString(),
              profileUpdatedAt: new Date().toISOString(),
            };
            setUserProfile(savedProfile);
            setMaxDistance(data.maxKm);
            if (user) {
              void syncUserProfile(user, { ...savedProfile, ages: savedProfile.ages.join(', ') }).then(() => {
                alert(isEs ? `Perfil guardado en tu cuenta: ${data.alias}. Recuerda que la declaración 18+ no sustituye la validación de identidad.` : `Profile saved to your account: ${data.alias}. The 18+ declaration does not replace identity verification.`);
              }).catch(() => {
                alert(isEs ? 'El perfil cambió en esta sesión, pero no se pudo guardar en el servidor. Revisa la conexión e inténtalo de nuevo.' : 'Profile changed in this session but could not be saved to the server. Check your connection and retry.');
              });
            } else {
              alert(isEs ? 'Perfil editado solo en esta sesión. Inicia sesión para guardarlo en tu cuenta.' : 'Profile edited for this session only. Sign in to save it to your account.');
            }
          }}
          onRequestLocation={() => requestLocationAccess(true)}
          locationGranted={locationGranted}
        />

        <IdentityVerificationModal isOpen={identityVerificationOpen} onClose={() => setIdentityVerificationOpen(false)} user={user} isEs={isEs} />

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
          onReport={handleReportProfile}
          onBlock={handleBlockProfile}
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
            initialTopic={legalInitialTopic}
            onClose={() => { setLegalModalOpen(false); setLegalInitialTopic(null); }}
          />
        )}

        {/* MODAL 8: PUSH NOTIFICATION LOOKUP & SYSTEM */}
        <BenefitNotificationsModal
          isOpen={benefitNotificationsOpen}
          onClose={() => setBenefitNotificationsOpen(false)}
          isEs={isEs}
          entitlement={approvedEntitlement}
          loading={benefitLoading}
          error={benefitError}
        />

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
