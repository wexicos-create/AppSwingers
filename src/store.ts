// ---------- Almacenamiento de documentos sobre Supabase ----------
// Cada "colección" de la app (users, matches, spei_orders, ine_records, ...)
// corresponde a una tabla app_<coleccion> en el proyecto "Swingers App":
//   id (texto) | data (jsonb con el objeto completo) | created_at | updated_at
// Las consultas por campo (docQuery) filtran con el operador data->>campo.
// La seguridad la controla Row Level Security en Supabase: solo usuarios
// autenticados pueden leer y escribir estas tablas.

import { supabase } from './supabase';

function tableFor(collection: string): string {
  return 'app_' + collection;
}

interface DocRow {
  id: string;
  data: Record<string, any> | null;
}

function rowToDoc<T>(row: DocRow): T & { id: string } {
  return { ...(row.data ?? {}), id: row.id } as T & { id: string };
}

/** Devuelve todos los documentos de una colección. */
export async function docAll<T>(collection: string): Promise<Array<T & { id: string }>> {
  try {
    const { data, error } = await supabase.from(tableFor(collection)).select('id, data');
    if (error || !data) return [];
    return (data as DocRow[]).map(rowToDoc);
  } catch {
    return [];
  }
}

/** Devuelve los documentos cuyo campo JSONB `field` es igual a `value`. */
export async function docQuery<T>(collection: string, field: string, value: unknown): Promise<Array<T & { id: string }>> {
  try {
    if (value === null || value === undefined) return [];
    const { data, error } = await supabase
      .from(tableFor(collection))
      .select('id, data')
      .eq(`data->>${field}`, String(value));
    if (error || !data) return [];
    return (data as DocRow[]).map(rowToDoc);
  } catch {
    return [];
  }
}

/** Devuelve un documento por id, o null si no existe. */
export async function docGet<T>(collection: string, id: string): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from(tableFor(collection))
      .select('id, data')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return rowToDoc(data as DocRow) as T;
  } catch {
    return null;
  }
}

/** Crea o reemplaza un documento. Con merge=true conserva los campos previos. */
export async function docSet<T>(collection: string, id: string, payload: T, merge = false): Promise<boolean> {
  try {
    let data: Record<string, any> = { ...(payload as any) };
    if (merge) {
      const existing = await docGet<Record<string, any>>(collection, id);
      if (existing) {
        const { id: _omit, ...rest } = existing;
        data = { ...rest, ...data };
      }
    }
    const { error } = await supabase
      .from(tableFor(collection))
      .upsert({ id, data, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

/** Actualización parcial de un documento (conserva el resto de los campos). */
export async function docUpdate<T>(collection: string, id: string, partial: Partial<T>): Promise<boolean> {
  return docSet(collection, id, partial as any, true);
}

/** Elimina un documento por id. */
export async function docDelete(collection: string, id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(tableFor(collection)).delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/** Agrega un valor a un campo de tipo arreglo del documento (arrayUnion). */
export async function docArrayUnion<T>(collection: string, id: string, field: string, value: unknown): Promise<boolean> {
  const target = await docGet<Record<string, any>>(collection, id);
  if (!target) return false;
  const arr: unknown[] = Array.isArray(target[field]) ? [...target[field]] : [];
  if (!arr.some((item) => JSON.stringify(item) === JSON.stringify(value))) arr.push(value);
  return docUpdate(collection, id, { [field]: arr } as any);
}
