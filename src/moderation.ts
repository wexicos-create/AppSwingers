// ---------- Motor IA de moderación (heurística determinista) ----------
// Mini IA de la plataforma: analiza denuncias, reportes y perfiles, y audita
// procesos. Es un motor de reglas con pesos (no una red neuronal): determinista,
// auditable, sin latencia y sin costos por consulta. Cada veredicto sugiere una
// acción; la decisión final siempre es del administrador humano.

export type Urgency = 'baja' | 'media' | 'alta' | 'crítica';

export interface ModerationSignal {
  code: string;
  label: string;
  weight: number;
}

export interface ModerationReport {
  score: number;
  urgency: Urgency;
  category: string;
  recommended: 'Revisión manual' | 'Advertencia al usuario' | 'Suspensión sugerida' | 'Baneo sugerido';
  signals: ModerationSignal[];
  summary: string;
}

interface Rule {
  code: string;
  label: string;
  category: string;
  weight: number;
  recommend: ModerationReport['recommended'];
  patterns: RegExp[];
}

const RULES: Rule[] = [
  {
    code: 'menores',
    label: 'Posible involucramiento de menores de edad',
    category: 'Protección de menores',
    weight: 100,
    recommend: 'Baneo sugerido',
    patterns: [/menor(?:es)?\b/i, /ni[ñn]a?s?\b/i, /adolescent/i, /\b1[0-7] a[ñn]os\b/i, /secundaria/i, /preparatoria/i],
  },
  {
    code: 'trata',
    label: 'Indicios de trata, coacción o explotación',
    category: 'Trata o explotación',
    weight: 100,
    recommend: 'Baneo sugerido',
    patterns: [/trata de personas/i, /traer (?:chicas|chicos|mujeres|hombres)/i, /secuestr/i, /explotaci[óo]n/i, /forzar|forz[óo]/i, /obligar|oblig[óo]/i],
  },
  {
    code: 'violencia',
    label: 'Amenazas o violencia física',
    category: 'Violencia',
    weight: 95,
    recommend: 'Baneo sugerido',
    patterns: [/golp/i, /violencia/i, /amenaz[óo]/i, /te voy a matar/i, /pistola/i, /cuchillo/i],
  },
  {
    code: 'consentimiento',
    label: 'Contenido íntimo de terceros sin consentimiento',
    category: 'Violación de consentimiento',
    weight: 90,
    recommend: 'Suspensión sugerida',
    patterns: [/sin su consentimiento/i, /sub[ií] (?:su|la) (?:foto|foto|imagen|video)/i, /difund[ió]?\b/i, /filtrar (?:sus|la) (?:fotos|im[áa]genes|videos)/i, /material [íi]ntimo de/i],
  },
  {
    code: 'chantaje',
    label: 'Chantaje, extorsión o acoso persistente',
    category: 'Chantaje o acoso',
    weight: 80,
    recommend: 'Suspensión sugerida',
    patterns: [/chantaje/i, /extorsi[óo]n/i, /no me deja en paz/i, /insiste(?:nce)?/i, /despu[ée]s de un no/i, /acoso/i, /stalker/i],
  },
  {
    code: 'pago_externo',
    label: 'Pago o contacto fuera de los canales oficiales',
    category: 'Pago fuera de la plataforma',
    weight: 55,
    recommend: 'Advertencia al usuario',
    patterns: [/transferencia directa/i, /depos[íi]ta a mi (?:cuenta|clabe)/i, /fuera de la app/i, /p[áa]game por (?:fuera|whatsapp|dm)/i, /clabe personal/i, /efectivo directo/i],
  },
  {
    code: 'estafa',
    label: 'Posible estafa o robo',
    category: 'Fraude',
    weight: 70,
    recommend: 'Suspensión sugerida',
    patterns: [/estafa/i, /me rob[óo]/i, /no me (?:re)?embols[óo]/i, /fue un fraude/i],
  },
  {
    code: 'drogas',
    label: 'Mención de sustancias ilegales',
    category: 'Sustancias ilegales',
    weight: 50,
    recommend: 'Advertencia al usuario',
    patterns: [/cocaina/i, /coca[íi]na/i, /metanfetamina/i, /metrallas/i, /\bmotas?\b/i, /pastillas\b/i, /\bmariguana\b/i],
  },
  {
    code: 'odio',
    label: 'Discurso de odio o discriminación',
    category: 'Discurso de odio',
    weight: 75,
    recommend: 'Suspensión sugerida',
    patterns: [/odio a\b/i, /discriminaci[óo]n/i, /matemos a\b/i, /por su (?:color|raza|religi[óo]n)/i],
  },
  {
    code: 'spam',
    label: 'Promoción o spam de canales externos',
    category: 'Spam',
    weight: 25,
    recommend: 'Revisión manual',
    patterns: [/s[íi]gueme en/i, /mi instagram/i, /mi telegram/i, /mi (?:canal de )?whatsapp/i, /promo(?:ci[óo]n)?(?: de)? (?:grupo|canal)/i],
  },
  {
    code: 'perfil_falso',
    label: 'Posible perfil falso o suplantación',
    category: 'Perfil falso',
    weight: 40,
    recommend: 'Revisión manual',
    patterns: [/perfil falso/i, /no es quien dice ser/i, /suplant/i, /photos (?:robadas|de google)/i, /catfish/i],
  },
];

const normalize = (t: string) => (t ?? '').toLowerCase();

/** Analiza el texto de una denuncia o reporte y produce un dictamen de moderación. */
export function analyzeReport(text: string, extra?: { subject?: string; reporterReports?: number }): ModerationReport {
  const raw = normalize(text) + ' ' + normalize(extra?.subject ?? '');
  const signals: ModerationSignal[] = [];
  let top: Rule | null = null;
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(raw))) {
      signals.push({ code: rule.code, label: rule.label, weight: rule.weight });
      if (!top || rule.weight > top.weight) top = rule;
    }
  }
  // Historial del denunciante: denuncias múltiples ponderan la revisión.
  const repetida = (extra?.reporterReports ?? 0) >= 3;
  if (repetida) signals.push({ code: 'reincidente', label: 'Perfil con 3 o más denuncias acumuladas', weight: 30 });

  let score = signals.reduce((s, x) => s + x.weight, 0);
  score = Math.max(0, Math.min(100, score));

  const urgency: Urgency = score >= 90 ? 'crítica' : score >= 70 ? 'alta' : score >= 40 ? 'media' : 'baja';
  const category = top?.category ?? 'Sin señales evidentes';
  const recommended: ModerationReport['recommended'] =
    score >= 90 ? 'Baneo sugerido' : score >= 70 ? 'Suspensión sugerida' : score >= 40 ? 'Advertencia al usuario' : 'Revisión manual';

  const summary = signals.length === 0
    ? 'Sin señales de riesgo en el texto. Revisión manual rápida recomendada para confirmar el contexto.'
    : 'El motor detectó ' + signals.length + ' señal(es): ' + signals.map((s) => s.label.toLowerCase()).join('; ') + '. ' +
      'Prioridad ' + urgency + ' (' + score + '/100). Acción sugerida: ' + recommended + '.';

  return { score, urgency, category, recommended, signals, summary };
}

export interface ProfileScanInput {
  alias: string;
  age: number;
  bio: string;
  photosCount: number;
  identityStatus: string;
  openReports: number;
  suspendedBefore: boolean;
}

export interface ProfileScan {
  risk: 'bajo' | 'medio' | 'alto';
  score: number;
  findings: string[];
  recommendation: string;
}

/** Escaneo de riesgo de un perfil, combinando datos del documento y su historial. */
export function scanProfile(p: ProfileScanInput): ProfileScan {
  const findings: string[] = [];
  let score = 0;
  if (p.identityStatus !== 'aprobada') { findings.push('Identidad sin aprobar en la plataforma'); score += 10; }
  if (p.photosCount === 0) { findings.push('Perfil sin fotos'); score += 10; }
  if (p.age < 18) { findings.push('Edad menor a 18: bloqueo inmediato obligatorio'); score += 100; }
  const bio = normalize(p.bio);
  if (/pago|transferencia|clabe|dinero/.test(bio)) { findings.push('La bio menciona pagos o datos bancarios'); score += 30; }
  if (/(?:2[0-9]|[3-9][0-9]) ?a[ñn]os/.test(bio) === false && /busco chava|busco chicas|domingo|hospicio/i.test(bio)) { score += 10; }
  if (p.openReports > 0) { findings.push(p.openReports + ' denuncia(s) abierta(s) contra este perfil'); score += Math.min(60, p.openReports * 20); }
  if (p.suspendedBefore) { findings.push('La cuenta ya fue suspendida anteriormente'); score += 25; }
  score = Math.min(100, score);
  const risk = score >= 70 ? 'alto' : score >= 35 ? 'medio' : 'bajo';
  const recommendation =
    risk === 'alto'
      ? 'Sugerencia: suspender preventivamente hasta revisión de las denuncias.'
      : risk === 'medio'
        ? 'Sugerencia: revisar expediente y conversaciones recientes antes de actuar.'
        : 'Sin señales relevantes. Ninguna acción requerida.';
  return { risk, score, findings: findings.length ? findings : ['Sin señales de riesgo relevantes.'], recommendation };
}

export interface ProcessCheck {
  label: string;
  ok: boolean;
  detail: string;
}

export interface ProcessAuditInput {
  clabe: string;
  bank: string;
  pendingIne: number;
  pendingOrders: number;
  openTickets: number;
  pendingProposals: number;
  pendingCreators: number;
  pendingPosts: number;
  openQuestions: number;
  fullEvents: number;
}

/** Auditoría automática de procesos del negocio: todo pendiente crítico queda expuesto. */
export function auditProcesses(s: ProcessAuditInput): ProcessCheck[] {
  const checks: ProcessCheck[] = [];
  const digits = (s.clabe ?? '').replace(/\D/g, '');
  checks.push({
    label: 'Cuenta bancaria SPEI',
    ok: digits.length === 18 && !!s.bank.trim(),
    detail: digits.length === 18 && !!s.bank.trim() ? 'CLABE de 18 dígitos y banco configurados.' : 'Falta completar banco o CLABE de 18 dígitos en la sección Banco.',
  });
  checks.push({
    label: 'Expedientes INE',
    ok: s.pendingIne === 0,
    detail: s.pendingIne === 0 ? 'Sin expedientes pendientes de veredicto.' : s.pendingIne + ' expediente(s) esperando veredicto. Los usuarios están bloqueados mientras tanto.',
  });
  checks.push({
    label: 'Pagos por confirmar',
    ok: s.pendingOrders === 0,
    detail: s.pendingOrders === 0 ? 'Todos los pagos reportados fueron procesados.' : s.pendingOrders + ' orden(es) pendiente(s) o verificada(s) esperando tu decisión.',
  });
  checks.push({
    label: 'Reportes y denuncias',
    ok: s.openTickets === 0,
    detail: s.openTickets === 0 ? 'Sin reportes abiertos.' : s.openTickets + ' reporte(s) abierto(s). El motor IA sugiere prioridad en la sección IA.',
  });
  checks.push({
    label: 'Propuestas en revisión',
    ok: s.pendingProposals === 0,
    detail: s.pendingProposals === 0 ? 'Sin propuestas esperando aprobación.' : s.pendingProposals + ' propuesta(s) por aprobar o rechazar.',
  });
  checks.push({
    label: 'Creadoras y contenido',
    ok: s.pendingCreators === 0 && s.pendingPosts === 0,
    detail: s.pendingCreators === 0 && s.pendingPosts === 0
      ? 'Sin registros ni publicaciones por moderar.'
      : s.pendingCreators + ' registro(s) de creadora y ' + s.pendingPosts + ' contenido(s) por moderar.',
  });
  checks.push({
    label: 'Foro público',
    ok: s.openQuestions === 0,
    detail: s.openQuestions === 0 ? 'Todas las preguntas del foro tienen respuesta.' : s.openQuestions + ' pregunta(s) sin responder.',
  });
  checks.push({
    label: 'Eventos con cupo lleno',
    ok: true,
    detail: s.fullEvents === 0 ? 'Ningún evento ha agotado su cupo.' : s.fullEvents + ' evento(s) con cupo lleno. Considera ampliar cupo o publicar nuevas fechas.',
  });
  return checks;
}

