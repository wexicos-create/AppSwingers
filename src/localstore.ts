// ---------- Local persistence layer (database-free) ----------
// Generic localStorage-backed document store. Every module in this app keeps
// its records here, in the browser, so the application runs completely
// offline with zero backend configuration. There is no external database.

const PREFIX = 'appswinguer_db_';

function storage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    /* storage unavailable (private mode, embedded frame, etc.) */
  }
  return null;
}

function collectionKey(collection: string): string {
  return PREFIX + collection;
}

function readMap(collection: string): Record<string, any> {
  try {
    const s = storage();
    if (!s) return {};
    const raw = s.getItem(collectionKey(collection));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, any>) : {};
  } catch {
    return {};
  }
}

function writeMap(collection: string, map: Record<string, any>): boolean {
  try {
    const s = storage();
    if (!s) return false;
    s.setItem(collectionKey(collection), JSON.stringify(map));
    return true;
  } catch {
    return false; // quota exceeded or serialization failure
  }
}

/** Returns every document of a collection, each guaranteed to carry its id. */
export function lsAll<T>(collection: string): Array<T & { id: string }> {
  const map = readMap(collection);
  return Object.entries(map).map(([id, data]) => ({ ...(data as any), id }));
}

/** Returns the documents whose `field` equals `value`. */
export function lsWhere<T>(collection: string, field: string, value: unknown): Array<T & { id: string }> {
  return lsAll<T>(collection).filter((doc: any) => doc[field] === value);
}

/** Returns a single document by id, or null when it does not exist. */
export function lsGet<T>(collection: string, id: string): T | null {
  const map = readMap(collection);
  return (map[id] as T) ?? null;
}

/** Creates or replaces a document. When `merge` is true, keeps existing fields. */
export function lsSet<T>(collection: string, id: string, data: T, merge = false): boolean {
  const map = readMap(collection);
  if (merge && map[id] && typeof map[id] === 'object' && data && typeof data === 'object') {
    map[id] = { ...map[id], ...(data as any) };
  } else {
    map[id] = data;
  }
  return writeMap(collection, map);
}

/** Partial update of a document (missing fields are preserved). */
export function lsUpdate<T>(collection: string, id: string, partial: Partial<T>): boolean {
  return lsSet(collection, id, partial as any, true);
}

/** Removes a document. Returns false when the storage is unavailable. */
export function lsDelete(collection: string, id: string): boolean {
  const map = readMap(collection);
  if (!(id in map)) return true;
  delete map[id];
  return writeMap(collection, map);
}

/** Appends a value to an array field of a document (Firestore arrayUnion equivalent). */
export function lsArrayUnion<T>(collection: string, id: string, field: string, value: unknown): boolean {
  const doc = lsGet<any>(collection, id);
  if (!doc) return false;
  const arr: unknown[] = Array.isArray(doc[field]) ? [...doc[field]] : [];
  if (!arr.some((item) => JSON.stringify(item) === JSON.stringify(value))) arr.push(value);
  return lsUpdate(collection, id, { [field]: arr } as any);
}
