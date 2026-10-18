export type Language = 'es' | 'en';
export type AppRegion = 'MX';

export interface Translations {
  appName: string;
  tagline: string;
  regionLabel: string;
  slpBadge: string;
  
  // Navigation
  tabMatch: string;
  tabProposals: string;
  tabEvents: string;
  tabVirtual: string;
  tabCommunity: string;
  tabProfile: string;

  // Header
  messages: string;
  login: string;
  logout: string;
  online: string;

  // Match Modal
  itsAMatch: string;
  matchDesc: string;
  startChatBtn: string;
  keepSwipingBtn: string;
  matchScore: string;

  // Chat
  inboxTitle: string;
  inboxSubtitle: string;
  searchPlaceholder: string;
  newMatches: string;
  activeChats: string;
  typeMessagePlaceholder: string;
  attachPhotoTitle: string;
  recordAudioTitle: string;
  recordingAudio: string;
  cancel: string;
  send: string;
  reportUser: string;
  blockUser: string;
  userBlockedToast: string;
  reportSentToast: string;
  reportReasonPrompt: string;
  confirmBlockPrompt: string;
  safeChatNotice: string;

  // Collaboration Proposals
  collabBannerTitle: string;
  collabBannerSubtitle: string;
  collabBannerBadge: string;
  collabModalTitle: string;
  collabReviewFeeLabel: string;
  collabReviewFeeAmount: string;
  collabRequirementTitle: string;
  collabRequirementDesc: string;
  collabEligibleOnly: string;
  collabChangeRoleToPareja: string;
  collabStep1Title: string;
  collabStep2Title: string;
  collabStep3Title: string;
  collabStep4Title: string;
  collabStep5Title: string;
  collabStep6Title: string;
  collabSubmitBtn: string;

  // Verification
  ineFrontLabel: string;
  ineBackLabel: string;
  selfieLabel: string;
  uploaded: string;
  clickToUpload: string;
}

export const DICTIONARY: Record<Language, Translations> = {
  es: {
    appName: 'AppSwinger',
    tagline: 'Conexiones exclusivas & experiencias para adultos',
    regionLabel: 'San Luis Potosí, México',
    slpBadge: 'SLP & México',

    tabMatch: 'Match',
    tabProposals: 'Propuestas',
    tabEvents: 'Eventos',
    tabVirtual: 'Virtual',
    tabCommunity: 'Comunidad',
    tabProfile: 'Perfil',

    messages: 'Mensajes',
    login: 'Entrar con Google',
    logout: 'Cerrar sesión',
    online: 'En línea',

    itsAMatch: '¡Es un Match!',
    matchDesc: 'Han coincidido mutuamente. Conéctense ahora con respeto, reglas claras y consentimiento activo.',
    startChatBtn: '💬 Chatear ahora',
    keepSwipingBtn: 'Seguir deslizando',
    matchScore: 'COINCIDENCIA',

    inboxTitle: 'Bandeja de Mensajes',
    inboxSubtitle: 'Tus conversaciones y acuerdos seguros',
    searchPlaceholder: 'Buscar matches o conversaciones...',
    newMatches: 'Nuevos Matches',
    activeChats: 'Conversaciones Activas',
    typeMessagePlaceholder: 'Escribe un mensaje seguro...',
    attachPhotoTitle: 'Adjuntar foto',
    recordAudioTitle: 'Grabar audio',
    recordingAudio: 'Grabando nota de voz...',
    cancel: 'Cancelar',
    send: 'Enviar',
    reportUser: 'Reportar usuario',
    blockUser: 'Bloquear usuario',
    userBlockedToast: 'Usuario bloqueado. Ya no podrá enviarte mensajes ni ver tu perfil.',
    reportSentToast: 'Reporte enviado al equipo de moderación en San Luis Potosí.',
    reportReasonPrompt: 'Selecciona el motivo del reporte:',
    confirmBlockPrompt: '¿Estás seguro de que deseas bloquear a este usuario?',
    safeChatNotice: 'Match mutuo &bull; Mensajes cifrados y privados',

    collabBannerTitle: 'Colaboración Evento Swinger / GangBang',
    collabBannerSubtitle: 'Revisión oficial de propuestas para fiestas privadas con anfitriona.',
    collabBannerBadge: 'Mujeres / Parejas',
    collabModalTitle: 'Propuesta de Evento Swinger o GangBang',
    collabReviewFeeLabel: 'Costo de Revisión & Auditoría Legal',
    collabReviewFeeAmount: '$350 MXN',
    collabRequirementTitle: 'Requisito Indispensable de Seguridad',
    collabRequirementDesc: 'La propuesta debe ser postulada obligatoriamente por una Mujer o una Pareja.',
    collabEligibleOnly: 'Solo perfiles de Dama o Pareja pueden enviar propuestas de eventos Swinger o GangBang.',
    collabChangeRoleToPareja: 'Cambiar a perfil Pareja o Dama',
    collabStep1Title: '1. Tipo y Logística del Evento',
    collabStep2Title: '2. Aforo y Proporción (Ratio de Parejas y Solos)',
    collabStep3Title: '3. Protocolo de Consentimiento y Regla de Oro',
    collabStep4Title: '4. Requisitos de Salud e Higiene (Pruebas y Protección)',
    collabStep5Title: '5. Verificación de Identidad Oficial (INE y Selfie)',
    collabStep6Title: '6. Pago de Auditoría y Envío de Propuesta',
    collabSubmitBtn: 'Enviar propuesta y pagar revisión $350 MXN',

    ineFrontLabel: 'INE / ID Oficial (Frente)',
    ineBackLabel: 'INE / ID Oficial (Reverso)',
    selfieLabel: 'Selfie en tiempo real con documento',
    uploaded: 'Subido correctamente',
    clickToUpload: 'Toca para subir foto',
  },

  en: {
    appName: 'AppSwinguer Ultra Plus',
    tagline: 'Exclusive connections & adult lifestyle experiences',
    regionLabel: 'México',
    slpBadge: 'México',

    tabMatch: 'Match',
    tabProposals: 'Proposals',
    tabEvents: 'Events',
    tabVirtual: 'Virtual',
    tabCommunity: 'Community',
    tabProfile: 'Profile',

    messages: 'Messages',
    login: 'Sign in with Google',
    logout: 'Sign out',
    online: 'Online',

    itsAMatch: "It's a Match!",
    matchDesc: 'You both liked each other. Connect now with mutual respect, clear boundaries, and active consent.',
    startChatBtn: '💬 Chat now',
    keepSwipingBtn: 'Keep swiping',
    matchScore: 'MATCH',

    inboxTitle: 'Messages Inbox',
    inboxSubtitle: 'Your secure conversations & private arrangements',
    searchPlaceholder: 'Search matches or conversations...',
    newMatches: 'New Matches',
    activeChats: 'Active Conversations',
    typeMessagePlaceholder: 'Type a secure message...',
    attachPhotoTitle: 'Attach photo',
    recordAudioTitle: 'Record voice note',
    recordingAudio: 'Recording voice note...',
    cancel: 'Cancel',
    send: 'Send',
    reportUser: 'Report user',
    blockUser: 'Block user',
    userBlockedToast: 'User blocked. They will no longer be able to message you or view your profile.',
    reportSentToast: 'Report submitted to the moderation team.',
    reportReasonPrompt: 'Select the reason for reporting:',
    confirmBlockPrompt: 'Are you sure you want to block this user?',
    safeChatNotice: 'Mutual Match &bull; Encrypted & Private Chat',

    collabBannerTitle: 'Swinger / GangBang Event Collaboration',
    collabBannerSubtitle: 'Official event review for vetted adult parties with hostesses.',
    collabBannerBadge: 'Women / Couples',
    collabModalTitle: 'Swinger or GangBang Event Proposal',
    collabReviewFeeLabel: 'Review & Safety Audit Fee',
    collabReviewFeeAmount: '$500 MXN',
    collabRequirementTitle: 'Mandatory Safety Requirement',
    collabRequirementDesc: 'Event proposals must be submitted strictly by a Woman or a Couple.',
    collabEligibleOnly: 'Only Female or Couple accounts can submit Swinger or GangBang proposals.',
    collabChangeRoleToPareja: 'Switch to Couple or Female profile',
    collabStep1Title: '1. Event Type & Logistics',
    collabStep2Title: '2. Capacity & Ratio (Couples vs Singles)',
    collabStep3Title: '3. Consent Protocol & Golden Rule (No Means No)',
    collabStep4Title: '4. Health & Hygiene Protocols (Testing & Protection)',
    collabStep5Title: '5. Official ID & Selfie Verification',
    collabStep6Title: '6. Review Fee Payment & Proposal Submission',
    collabSubmitBtn: 'Submit proposal for review · $500 MXN',

    ineFrontLabel: 'Official ID / Driver License (Front)',
    ineBackLabel: 'Official ID / Driver License (Back)',
    selfieLabel: 'Real-time selfie holding ID',
    uploaded: 'Uploaded successfully',
    clickToUpload: 'Tap to upload photo',
  }
};

/**
 * Detects user region and language using IP and browser timezone/locale.
 * Default: San Luis Potosí, México (MX)
 */
export async function detectUserRegionAndLang(): Promise<{ region: AppRegion; lang: Language }> {
  try {
    // 1. Fast timezone check
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const browserLang = (navigator.language || '').toLowerCase();

    // Check for US timezones
    const isUsTimezone = 
      tz.includes('New_York') || 
      tz.includes('Chicago') || 
      tz.includes('Los_Angeles') || 
      tz.includes('Denver') || 
      tz.includes('Phoenix') || 
      tz.includes('Detroit') ||
      tz.includes('Anchorage') ||
      tz.includes('Honolulu');

    // 2. Try fast IP lookup with abort controller (max 1200ms)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('https://ipwho.is/', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.country_code) {
          const code = String(data.country_code).toUpperCase();
          if (code === 'US') {
            return { region: 'US', lang: 'en' };
          }
          if (code === 'MX') {
            return { region: 'MX', lang: 'es' };
          }
        }
      }
    } catch {
      // Ignore network errors and fall back to timezone
    }

    if (isUsTimezone || (browserLang.startsWith('en') && !tz.includes('Mexico'))) {
      return { region: 'US', lang: 'en' };
    }
  } catch {
    // fallback
  }

  // Default to Mexico (San Luis Potosí)
  return { region: 'MX', lang: 'es' };
}
