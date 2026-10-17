import { FormEvent, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type Props = { children: (context: { user: User; isAdmin: boolean; signOut: () => Promise<void> }) => React.ReactNode };

export default function AuthGate({ children }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRole() {
      setIsAdmin(false);
      if (!session?.user) return;
      // Privilege is derived from the database; never from local storage or user metadata.
      const { data, error: roleError } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .in('role', ['admin', 'moderator', 'support'])
        .maybeSingle();
      if (!cancelled) {
        if (roleError) console.error('Unable to load administrative role:', roleError.message);
        setIsAdmin(Boolean(data));
      }
    }
    loadRole();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (authError) throw authError;
        setMessage(data.session ? 'Cuenta creada correctamente.' : 'Cuenta creada. Revisa tu correo para confirmar la dirección antes de iniciar sesión.');
      } else if (mode === 'reset') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (authError) throw authError;
        setMessage('Si el correo está registrado, recibirás instrucciones para restablecer la contraseña.');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible completar la operación.');
    } finally { setBusy(false); }
  }

  if (loading) return <div className="min-h-screen bg-[#090414] text-white grid place-items-center"><p>Verificando sesión segura…</p></div>;

  if (!session?.user) {
    const title = mode === 'signup' ? 'Crear cuenta AppSwinger' : mode === 'reset' ? 'Recuperar contraseña' : 'Iniciar sesión';
    return <main className="min-h-screen bg-[#090414] text-white flex items-center justify-center p-5">
      <section className="w-full max-w-md rounded-3xl border border-purple-500/30 bg-[#120a20] p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 text-2xl font-black">A</div>
          <h1 className="text-2xl font-black">AppSwinger</h1>
          <p className="mt-1 text-sm text-purple-200/75">Acceso privado y seguro para adultos</p>
        </div>
        <h2 className="mb-4 text-lg font-bold">{title}</h2>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm">Correo electrónico
            <input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-purple-400/30 bg-black/30 px-3 py-3 outline-none focus:border-pink-400" />
          </label>
          {mode !== 'reset' && <label className="block text-sm">Contraseña
            <input required minLength={8} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-purple-400/30 bg-black/30 px-3 py-3 outline-none focus:border-pink-400" />
          </label>}
          {error && <p role="alert" className="rounded-lg bg-red-950/60 p-3 text-sm text-red-200">{error}</p>}
          {message && <p role="status" className="rounded-lg bg-purple-950/60 p-3 text-sm text-purple-100">{message}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-3 font-bold disabled:opacity-60">{busy ? 'Procesando…' : title}</button>
        </form>
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-purple-200">
          {mode !== 'signin' && <button onClick={() => {setMode('signin');setError('');setMessage('');}}>Iniciar sesión</button>}
          {mode !== 'signup' && <button onClick={() => {setMode('signup');setError('');setMessage('');}}>Crear cuenta</button>}
          {mode !== 'reset' && <button onClick={() => {setMode('reset');setError('');setMessage('');}}>Olvidé mi contraseña</button>}
        </div>
      </section>
    </main>;
  }

  return <>{children({ user: session.user, isAdmin, signOut: async () => { await supabase.auth.signOut({ scope: 'local' }); } })}</>;
}
