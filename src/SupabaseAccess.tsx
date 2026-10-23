import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, LockKeyhole, LogOut, ShieldCheck, UserRound } from 'lucide-react';

const url = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const key = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '');
const cacheKey = 'appswinger_supabase_session_v1';
type User = { id: string; email?: string; user_metadata?: { birth_date?: string; requested_alias?: string } };
type Session = { access_token: string; refresh_token?: string; expires_at: number; user?: User };
type Profile = { id: string; display_name: string | null; status: string; created_at: string };
type ErrorResponse = { error?: string; message?: string; msg?: string; error_description?: string; code?: string };

function explanation(raw: ErrorResponse, status: number): string {
  const code = raw.code || raw.error || '';
  const message = raw.msg || raw.error_description || raw.message || raw.error || '';
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) return 'Confirma tu correo desde el enlace enviado por Supabase antes de iniciar sesión.';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) return 'Correo o contraseña incorrectos. Revisa tus datos.';
  if (code === 'email_exists' || /already registered/i.test(message)) return 'Ya existe una cuenta con este correo. Prueba iniciar sesión.';
  if (code === 'over_email_send_rate_limit' || /rate limit/i.test(message)) return 'Se alcanzó el límite temporal de intentos. Intenta más tarde.';
  if (status === 0) return 'No se pudo conectar con Supabase. Revisa tu red.';
  return 'Supabase respondió (' + status + '): ' + (message || code || 'Error sin descripción');
}

async function request<T>(path: string, options: { method?: string; token?: string; body?: unknown; prefer?: string } = {}): Promise<T> {
  if (!url || !key) throw new Error('Faltan las variables de Supabase en el despliegue de Vercel.');
  const headers: Record<string, string> = { apikey: key, Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = 'Bearer ' + options.token;
  if (options.prefer) headers.Prefer = options.prefer;
  let response: Response;
  try {
    response = await fetch(url + path, { method: options.method || 'GET', headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  } catch {
    throw new Error(explanation({}, 0));
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(explanation(data as ErrorResponse, response.status));
  return data as T;
}

function saveSession(raw: { access_token?: string; refresh_token?: string; expires_in?: number; user?: User }): Session | null {
  if (!raw.access_token) return null;
  const session: Session = { access_token: raw.access_token, refresh_token: raw.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (raw.expires_in || 3600), user: raw.user };
  localStorage.setItem(cacheKey, JSON.stringify(session));
  return session;
}

async function authenticatedSession(): Promise<Session | null> {
  let session: Session | null = null;
  try { session = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch { localStorage.removeItem(cacheKey); }
  if (!session?.access_token) return null;
  if (session.expires_at > Date.now() / 1000 + 60) return session;
  if (!session.refresh_token) { localStorage.removeItem(cacheKey); return null; }
  try {
    const updated = await request<{ access_token: string; refresh_token: string; expires_in: number; user: User }>('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token } });
    return saveSession(updated);
  } catch {
    localStorage.removeItem(cacheKey);
    return null;
  }
}

function validAdultBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const birth = new Date(value + 'T00:00:00');
  if (!Number.isFinite(birth.getTime()) || birth.getFullYear() !== Number(value.slice(0, 4)) || birth.getMonth() + 1 !== Number(value.slice(5, 7)) || birth.getDate() !== Number(value.slice(8, 10))) return false;
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear() - (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0);
  return age >= 18;
}

async function loadOrCreateProfile(token: string, user: User, displayName?: string, birthDate?: string): Promise<Profile> {
  const rows = await request<Profile[]>('/rest/v1/profiles?id=eq.' + encodeURIComponent(user.id) + '&select=id,display_name,status,created_at&limit=1', { token });
  if (rows[0]) return rows[0];
  const name = (displayName || user.user_metadata?.requested_alias || user.email?.split('@')[0] || 'Usuario').trim().slice(0, 60);
  const date = birthDate || user.user_metadata?.birth_date || '';
  if (!validAdultBirthDate(date)) throw new Error('Para completar tu perfil necesitas una fecha de nacimiento válida y tener al menos 18 años.');
  const created = await request<Profile[]>('/rest/v1/profiles?select=id,display_name,status,created_at', {
    method: 'POST', token, prefer: 'return=representation',
    // Account status is assigned by PostgreSQL; clients may only set profile fields.
    body: { id: user.id, display_name: name, birth_date: date },
  });
  if (!created[0]) throw new Error('El registro de perfil no devolvió una fila válida.');
  return created[0];
}

export default function SupabaseAccess() {
  const [mode, setMode] = useState<'login' | 'register'>((window.location.pathname.startsWith('/registro') || window.location.hash.startsWith('#/registro')) ? 'register' : 'login');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [alias, setAlias] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [positive, setPositive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const existing = await authenticatedSession();
      if (!active) return;
      if (existing) {
        try {
          const user = existing.user || await request<User>('/auth/v1/user', { token: existing.access_token });
          const loaded = await loadOrCreateProfile(existing.access_token, user);
          if (active) { setSession(existing); setProfile(loaded); }
        } catch (error) {
          if (active) setMessage(error instanceof Error ? error.message : String(error));
        }
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setPositive(false);
    if (!email.trim() || password.length < 6) { setMessage('Introduce un correo válido y una contraseña de al menos seis caracteres.'); return; }
    if (mode === 'register' && !adult) { setMessage('Para registrarte debes declarar que tienes al menos 18 años.'); return; }
    if (mode === 'register' && !validAdultBirthDate(birthDate)) { setMessage('Introduce tu fecha de nacimiento. El registro es exclusivo para mayores de 18 años.'); return; }
    setBusy(true);
    try {
      const endpoint = mode === 'register' ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password';
      const raw = await request<{ access_token?: string; refresh_token?: string; expires_in?: number; user?: User }>(endpoint, {
        method: 'POST', body: mode === 'register' ? { email: email.trim().toLowerCase(), password, data: { requested_alias: alias.trim().slice(0, 60), birth_date: birthDate, adult_declaration: adult } } : { email: email.trim().toLowerCase(), password },
      });
      const current = saveSession(raw);
      if (!current) {
        setPositive(true);
        setMessage('Cuenta solicitada. Revisa tu correo y confirma el enlace de Supabase; después inicia sesión.');
        setMode('login');
        window.history.replaceState(null, '', '/#/ingresar');
        return;
      }
      const user = raw.user || await request<User>('/auth/v1/user', { token: current.access_token });
      setSession(current);
      try {
        const result = await loadOrCreateProfile(current.access_token, user, mode === 'register' ? alias : undefined, mode === 'register' ? birthDate : undefined);
        setProfile(result);
        setPositive(true);
        setMessage('Tu sesión y tu perfil están registrados en Supabase.');
      } catch (error) {
        setMessage('Tu sesión fue creada, pero falta guardar el perfil: ' + (error instanceof Error ? error.message : String(error)));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error desconocido al autenticar.');
    } finally { setBusy(false); }
  };

  const completeProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) return;
    if (!validAdultBirthDate(birthDate)) { setMessage('Introduce una fecha de nacimiento válida. Debes tener al menos 18 años.'); setPositive(false); return; }
    setBusy(true); setMessage(''); setPositive(false);
    try {
      const user = await request<User>('/auth/v1/user', { token: session.access_token });
      setProfile(await loadOrCreateProfile(session.access_token, user, alias, birthDate));
      setPositive(true); setMessage('Tu perfil quedó guardado en Supabase.');
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };

  const logout = async () => {
    if (session) { try { await request('/auth/v1/logout', { method: 'POST', token: session.access_token }); } catch { /* local session still revoked */ } }
    localStorage.removeItem(cacheKey);
    setSession(null); setProfile(null); setPassword(''); setMessage('');
  };

  const changeMode = (value: 'login' | 'register') => {
    setMode(value); setMessage(''); setPositive(false);
    window.history.replaceState(null, '', value === 'register' ? '/#/registro' : '/#/ingresar');
  };

  const inputClass = 'w-full rounded-xl border border-purple-500/35 bg-black/50 px-4 py-3 text-white outline-none focus:border-pink-400';
  return (
    <main className="min-h-screen bg-[#08050d] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-purple-500/30 bg-[#150c23] p-7 shadow-2xl shadow-purple-900/20">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-purple-200 hover:text-white"><ArrowLeft size={17}/> Volver a AppSwinger</a>
        <div className="mt-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600"><LockKeyhole size={25}/></div>
        <h1 className="mt-4 text-2xl font-black">{session ? 'Mi cuenta AppSwinger' : mode === 'register' ? 'Crea tu cuenta' : 'Iniciar sesión'}</h1>
        <p className="mt-2 text-sm text-purple-200/80">Acceso seguro respaldado por Supabase. Comunidad exclusiva para mayores de 18 años.</p>
        {loading ? <p className="mt-6">Comprobando sesión…</p> : session ? (
          <section className="mt-6 space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-green-400/30 bg-green-900/20 p-4">
              <CheckCircle2 className="mt-0.5 text-green-300" size={22}/>
              <div><strong>Sesión autenticada</strong><p className="break-all text-sm text-green-100/85">{session.user?.email || email}</p></div>
            </div>
            {profile ? <div className="rounded-xl border border-purple-400/25 p-4 text-sm"><p className="flex items-center gap-2 font-semibold"><UserRound size={17}/> {profile.display_name || 'Nuevo perfil'}</p><p className="mt-2">Perfil creado en PostgreSQL: <strong>{profile.status}</strong></p><p className="mt-1 text-purple-200/70">ID: {profile.id}</p></div> : <form onSubmit={(event) => void completeProfile(event)} className="space-y-3"><p className="text-sm text-amber-200">Completa tu fecha de nacimiento para guardar el perfil.</p><label className="block text-sm">Fecha de nacimiento<input className={inputClass + ' mt-1'} type="date" value={birthDate} onChange={event => setBirthDate(event.target.value)} required /></label><button disabled={busy} className="w-full rounded-xl bg-purple-700 px-4 py-3 font-semibold disabled:opacity-50">{busy ? 'Guardando…' : 'Completar perfil'}</button></form>}
            <p className="text-sm text-purple-200/80"><ShieldCheck size={17} className="mr-1 inline"/> Esta pantalla confirma registro y acceso. La verificación de identidad, los chats y los pagos siguen pendientes de migración; no están habilitados aquí.</p>
            <button type="button" onClick={() => void logout()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-3 font-semibold"><LogOut size={17}/> Cerrar sesión</button>
          </section>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
            {mode === 'register' && <label className="block text-sm">Nombre o alias<input className={inputClass + ' mt-1'} value={alias} onChange={e => setAlias(e.target.value)} maxLength={60} placeholder="Tu alias" required /></label>}
            {mode === 'register' && <label className="block text-sm">Fecha de nacimiento<input className={inputClass + ' mt-1'} type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} required /></label>}
            <label className="block text-sm">Correo electrónico<input className={inputClass + ' mt-1'} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" required /></label>
            <label className="block text-sm">Contraseña<input className={inputClass + ' mt-1'} type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={6} value={password} onChange={e => setPassword(e.target.value)} required /></label>
            {mode === 'register' && <label className="flex items-start gap-3 text-sm text-purple-100"><input type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)} className="mt-1" required/><span>Declaro que tengo 18 años o más y acepto las normas de la plataforma.</span></label>}
            {message && <p role="alert" className={'rounded-lg border p-3 text-sm ' + (positive ? 'border-green-400/30 bg-green-900/25 text-green-200' : 'border-rose-400/30 bg-rose-900/25 text-rose-200')}>{message}</p>}
            <button disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 font-bold disabled:opacity-50">{busy ? 'Conectando…' : mode === 'register' ? 'Crear cuenta real' : 'Entrar a mi cuenta'}</button>
            <button type="button" onClick={() => changeMode(mode === 'register' ? 'login' : 'register')} className="w-full py-2 text-sm text-purple-200 underline">{mode === 'register' ? 'Ya tengo cuenta. Iniciar sesión' : 'Crear una cuenta nueva'}</button>
          </form>
        )}
        {session && message && <p role="status" className={'mt-3 text-sm ' + (positive ? 'text-green-200' : 'text-amber-200')}>{message}</p>}
      </div>
    </main>
  );
}
