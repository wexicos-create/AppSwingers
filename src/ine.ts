// ---------- Validación de identidad (INE) ----------
// Módulo limpio de la reconstrucción desde cero. Gestiona:
//  - Captura y compresión de fotos (frente INE, reverso INE, selfie).
//  - Archivo legal `ine_records` (conservación para auditorías de identidad).
//  - Veredictos del administrador (aprobar / rechazar / banear) con notificación.
// Todos los accesos a la base de datos usan await correctamente.

import { docSet, docUpdate, docGet, docAll, docDelete, docQuery } from './store';
import { AppNotification, IdentityVerdict } from './types';

/** Comprime una imagen de archivo a dataURL JPEG (máximo 800px, calidad 0.7). */
export const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 800;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('canvas')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => reject(new Error('image'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('reader'));
    reader.readAsDataURL(file);
  });

export type IneRecordSource = 'organizador' | 'colaboracion' | 'registro';

export interface IneRecord {
  id: string;
  userUid: string | null;
  userEmail: string;
  alias: string;
  legalName: string;
  source: IneRecordSource;
  context: string;
  ineFront: string;
  ineBack: string;
  selfie: string;
  createdAt: number;
  verdict?: IdentityVerdict;
  verdictAt?: number;
  verdictNote?: string;
  retainedUntil?: number | null;
}

export const INE_BAN_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

export function ineRecordVerdict(rec: IneRecord): IdentityVerdict {
  return rec.verdict || 'pendiente';
}

export function newIneRecord(params: {
  userUid: string | null;
  userEmail: string;
  alias: string;
  legalName: string;
  source: IneRecordSource;
  context: string;
  ineFront: string;
  ineBack: string;
  selfie: string;
}): IneRecord {
  return { id: 'ine_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8), ...params, createdAt: Date.now() };
}

export async function saveRemoteIneRecord(record: IneRecord): Promise<boolean> {
  try {
    return await docSet('ine_records', record.id, record);
  } catch { return false; }
}

export async function fetchAllRemoteIneRecords(): Promise<IneRecord[]> {
  try {
    return await docAll<IneRecord>('ine_records');
  } catch { return []; }
}

export async function fetchIneRecordsForUser(uid: string): Promise<IneRecord[]> {
  if (!uid) return [];
  try {
    const items = await docQuery<IneRecord>('ine_records', 'userUid', uid);
    return items.sort((a, b) => b.createdAt - a.createdAt);
  } catch { return []; }
}

/**
 * Publica el veredicto del administrador sobre un expediente INE:
 * 1. Actualiza el expediente (veredicto, nota, ventana de retención al banear).
 * 2. Escribe identityStatus en el documento del usuario (y suspende la cuenta
 *    cuando el veredicto es baneo, para que el bloqueo sea efectivo).
 * 3. Crea una notificación que el propietario lee en su siguiente sesión.
 */
export async function issueIdentityVerdict(params: {
  record: IneRecord;
  verdict: Exclude<IdentityVerdict, 'pendiente'>;
}): Promise<boolean> {
  const { record, verdict } = params;
  if (!record.userUid) return false;
  const now = Date.now();
  const note =
    verdict === 'aprobada'
      ? 'Identidad aprobada por el administrador tras la revisión del archivo legal. Tu sello de verificación está activo.'
      : verdict === 'rechazada'
        ? 'No pudimos validar tu identidad con los documentos enviados. Puedes volver a subir tu INE con ambas caras legibles desde tu perfil.'
        : 'Cuenta baneada por decisión del administrador. Las credenciales se retienen un año por cualquier asunto legal posterior.';
  try {
    await docUpdate<IneRecord>('ine_records', record.id, {
      verdict,
      verdictAt: now,
      verdictNote: note,
      retainedUntil: verdict === 'baneada' ? now + INE_BAN_RETENTION_MS : null,
    } as Partial<IneRecord>);
    await docUpdate('users', record.userUid, {
      identityStatus: verdict,
      identityNote: note,
      identityVerdictAt: now,
      ...(verdict === 'baneada' ? { status: 'suspendido' } : {}),
    });
    const nid = 'nt_' + now + '_' + Math.random().toString(36).slice(2, 6) + '_' + record.userUid;
    await docSet('notifications', nid, {
      id: nid,
      userUid: record.userUid,
      kind: 'identidad',
      title: verdict === 'aprobada' ? 'Identidad verificada' : verdict === 'rechazada' ? 'No pudimos validar tu identidad' : 'Cuenta suspendida',
      body: note,
      ts: now,
      read: false,
    } as AppNotification);
    return true;
  } catch { return false; }
}

/** Depura credenciales de cuentas baneadas cuya ventana de retención de un año ya expiró. */
export async function purgeExpiredRetainedRecords(): Promise<number> {
  try {
    const records = await docAll<IneRecord>('ine_records');
    const now = Date.now();
    const expired = records.filter(
      (r) => ineRecordVerdict(r) === 'baneada' && typeof r.retainedUntil === 'number' && r.retainedUntil < now
    );
    for (const r of expired) {
      await docDelete('ine_records', r.id);
    }
    return expired.length;
  } catch { return 0; }
}

export async function fetchIdentityStatus(uid: string): Promise<IdentityVerdict | null> {
  try {
    const user = await docGet<{ identityStatus?: IdentityVerdict }>('users', uid);
    return user?.identityStatus || null;
  } catch { return null; }
}

export async function fetchNotificationsForUser(uid: string): Promise<AppNotification[]> {
  if (!uid) return [];
  try {
    const items = await docQuery<AppNotification>('notifications', 'userUid', uid);
    return items.sort((a, b) => b.ts - a.ts);
  } catch { return []; }
}

export async function markNotificationsRead(uid: string, ids: string[]): Promise<void> {
  for (const id of ids) {
    await docUpdate('notifications', id, { read: true } as Partial<AppNotification>);
  }
}
