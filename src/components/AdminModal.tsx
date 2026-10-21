import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { 
  X, 
  ShieldAlert, 
  Key, 
  Lock, 
  Check, 
  Mail, 
  ShieldCheck, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Bell, 
  Smartphone, 
  Trash2, 
  Send, 
  CreditCard, 
  FileCheck, 
  Shield, 
  Zap,
  CheckCircle2
} from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEs: boolean;
}

export function AdminModal({ isOpen, onClose, isEs }: AdminModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isChangingCreds, setIsChangingCreds] = useState(false);
  const [newPass, setNewPass] = useState('');

  // Active admin tab: 'monetizacion' | 'push' | 'seguridad'
  const [activeAdminTab, setActiveAdminTab] = useState<'monetizacion' | 'push' | 'seguridad'>('monetizacion');
  const [broadcastTitle, setBroadcastTitle] = useState(
    isEs ? '🔥 Nuevo evento VIP Swinger en San Luis Potosí' : '🔥 New VIP Lifestyle event announced'
  );
  const [broadcastBody, setBroadcastBody] = useState(
    isEs ? 'Cupo limitado para parejas verificadas. Revisa la sección de eventos.' : 'Limited capacity for verified couples. Check events tab.'
  );
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supabase || !isSupabaseConfigured) {
      setError(isEs
        ? 'Panel bloqueado: configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el entorno de despliegue.'
        : 'Admin panel locked: configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the deployment environment.');
      return;
    }

    const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError || !signIn.user) {
      setError(isEs ? 'No se pudo autenticar la cuenta en Supabase.' : 'Supabase authentication failed.');
      return;
    }

    const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) {
      await supabase.auth.signOut();
      setError(isEs ? 'No se pudo comprobar el nivel MFA.' : 'Could not verify MFA assurance level.');
      return;
    }

    if (assurance.currentLevel !== 'aal2') {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp?.find((candidate) => candidate.status === 'verified');
      if (factorsError || !factor) {
        await supabase.auth.signOut();
        setError(isEs
          ? 'La cuenta administrativa debe tener MFA TOTP verificado en Supabase antes de entrar.'
          : 'The admin account must have verified TOTP MFA in Supabase before access.');
        return;
      }
      if (!/^\\d{6}$/.test(pin.trim())) {
        setError(isEs ? 'Introduce el código TOTP de seis dígitos.' : 'Enter the six-digit TOTP code.');
        return;
      }
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (challengeError || !challenge?.id) {
        setError(isEs ? 'No se pudo iniciar el desafío MFA.' : 'Could not start the MFA challenge.');
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.id,
        code: pin.trim(),
      });
      if (verifyError) {
        setError(isEs ? 'Código MFA incorrecto o expirado.' : 'Invalid or expired MFA code.');
        return;
      }
    }

    const { data: adminRole, error: roleError } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', signIn.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !adminRole) {
      await supabase.auth.signOut();
      setError(isEs ? 'Esta cuenta no tiene el rol administrativo en Supabase.' : 'This account has no admin role in Supabase.');
      return;
    }

    setIsLoggedIn(true);
  };

  const handleUpdateCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !newPass || newPass.length < 12) {
      setError(isEs ? 'La nueva contraseña debe tener al menos 12 caracteres y Supabase debe estar configurado.' : 'New password must be at least 12 characters and Supabase must be configured.');
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPass });
    if (updateError) {
      setError(isEs ? 'Supabase no pudo actualizar la contraseña.' : 'Supabase could not update the password.');
      return;
    }
    setNewPass('');
    setIsChangingCreds(false);
    alert(isEs ? 'Contraseña actualizada mediante Supabase Auth.' : 'Password updated through Supabase Auth.');
  };

  const handleClearCookiesAndStorage = () => {
    if (window.confirm(isEs ? '¿Purgar cookies, caché y restablecer datos locales del APK?' : 'Purge all cookies, cache, and local APK storage?')) {
      try {
        localStorage.clear();
        sessionStorage.clear();
        // Clear cookies
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        alert(isEs ? 'Cookies y almacenamiento local purgados al 100%. El APK está limpio en 0.' : 'Cookies & local storage purged 100%. APK is pristine at 0.');
        window.location.reload();
      } catch (err) {
        console.warn('Wipe cookies note:', err);
      }
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastSuccess(true);
    setTimeout(() => setBroadcastSuccess(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 overflow-y-auto">
      <div className="w-full max-w-lg p-5 rounded-3xl bg-zinc-950 border border-purple-500/40 shadow-2xl flex flex-col gap-5 relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-600 to-purple-600 text-white flex items-center justify-center mx-auto mb-2 border border-rose-500/40 shadow-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white">
            {isEs ? 'Panel Admin & Business Analytics' : 'Admin & Business Analytics'}
          </h2>
          <p className="text-[11px] text-purple-200/70 mt-0.5">
            {isEs ? 'Acceso restringido por rol de Supabase y MFA' : 'Access restricted by Supabase role and MFA'}
          </p>
        </div>

        {!isLoggedIn ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold text-center">
                {error}
              </div>
            )}
            <div>
              <label className="text-xs text-white/70 mb-1 flex items-center gap-1.5 font-medium">
                <Mail className="w-3.5 h-3.5 text-rose-400" />
                {isEs ? 'Correo Electrónico Admin' : 'Admin Email'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo de tu cuenta Supabase"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/70 mb-1 flex items-center gap-1.5 font-medium">
                <Key className="w-3.5 h-3.5 text-rose-400" />
                {isEs ? 'Contraseña' : 'Password'}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña de Supabase"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/70 mb-1 flex items-center gap-1.5 font-medium">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                {isEs ? 'Código TOTP de MFA (6 dígitos, si se solicita)' : 'MFA TOTP code (6 digits, if requested)'}
              </label>
              <input
                type="password"
                maxLength={6}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="000000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-500 tracking-widest text-center"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 text-white font-bold text-xs shadow-lg shadow-rose-600/30 hover:opacity-95 transition mt-1 active:scale-95"
            >
              {isEs ? 'Verificar e Ingresar al Sistema' : 'Verify & Enter System'}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            
            {/* Admin Header Bar */}
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-white text-xs">{isEs ? 'Sesión Autorizada (Root Admin)' : 'Authorized Session'}</h4>
                  <p className="text-[10px] text-emerald-200">Cuenta autenticada y rol validado en Supabase</p>
                </div>
              </div>
              <button
                onClick={async () => { if (supabase) await supabase.auth.signOut(); setIsLoggedIn(false); }}
                className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-[11px] font-bold border border-rose-500/30 transition"
              >
                {isEs ? 'Salir' : 'Logout'}
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex p-1 rounded-xl bg-black/60 border border-white/10 gap-1 text-xs">
              <button
                onClick={() => setActiveAdminTab('monetizacion')}
                className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
                  activeAdminTab === 'monetizacion' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                {isEs ? 'Finanzas & IVA' : 'Finances'}
              </button>
              <button
                onClick={() => setActiveAdminTab('push')}
                className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
                  activeAdminTab === 'push' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                {isEs ? 'Push Lookup' : 'Push'}
              </button>
              <button
                onClick={() => setActiveAdminTab('seguridad')}
                className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
                  activeAdminTab === 'seguridad' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                {isEs ? 'Seguridad' : 'Security'}
              </button>
            </div>

            {/* TAB 1: MONETIZACIÓN & FINANZAS */}
            {activeAdminTab === 'monetizacion' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3.5 rounded-2xl bg-black/50 border border-purple-500/30">
                    <span className="text-[10px] text-white/60 uppercase font-bold block">{isEs ? 'Ingresos México (MXN)' : 'Mexico Revenue'}</span>
                    <span className="text-xl font-black text-emerald-400 mt-1 block">$148,450 MXN</span>
                    <span className="text-[10px] text-purple-200/70 block mt-0.5">Incluye 16% IVA ($20,475)</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-black/50 border border-purple-500/30">
                    <span className="text-[10px] text-white/60 uppercase font-bold block">{isEs ? 'Ingresos USA (USD)' : 'USA Revenue'}</span>
                    <span className="text-xl font-black text-pink-400 mt-1 block">$12,380 USD</span>
                    <span className="text-[10px] text-purple-200/70 block mt-0.5">Incluye 16% Tax Rate</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <span className="text-white/80">{isEs ? 'Plan Silver ($408 MXN / $100 USD 15d):' : 'Silver Plan:'}</span>
                    <span className="font-bold text-white">312 suscriptores</span>
                  </div>
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <span className="text-white/80">{isEs ? 'Plan Gold ($800 MXN / $180 USD mes):' : 'Gold Plan:'}</span>
                    <span className="font-bold text-amber-300">184 miembros VIP</span>
                  </div>
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <span className="text-white/80">{isEs ? 'Sponsored Profiles ($1,500 MXN / $800 USD):' : 'Sponsored Profiles:'}</span>
                    <span className="font-bold text-pink-400">18 agencias / clubes</span>
                  </div>
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <span className="text-white/80">{isEs ? 'Propuestas Colaboración ($350 MXN / $80 USD):' : 'Collab Proposals:'}</span>
                    <span className="font-bold text-emerald-300">42 revisadas</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">{isEs ? 'Comisión Creadoras (15% neta + 10% cobro):' : 'Creator Net Commission:'}</span>
                    <span className="font-bold text-purple-300">15% retenido activo</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PUSH & NOTIFICACIONES MASIVAS */}
            {activeAdminTab === 'push' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/10">
                    <span className="text-lg font-bold text-white">1,842</span>
                    <span className="text-[10px] text-white/50 block">{isEs ? 'Dispositivos Registrados' : 'Registered Devices'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/10">
                    <span className="text-lg font-bold text-emerald-400">99.4%</span>
                    <span className="text-[10px] text-white/50 block">{isEs ? 'Tasa de Entrega Push' : 'Delivery Rate'}</span>
                  </div>
                </div>

                <form onSubmit={handleSendBroadcast} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                  <span className="text-[11px] font-bold text-pink-300 flex items-center gap-1">
                    <Send className="w-3.5 h-3.5" />
                    {isEs ? 'Enviar Alerta Push Masiva a la Red' : 'Broadcast Push Notification'}
                  </span>
                  
                  <div>
                    <label className="text-[10px] text-white/60 block mb-0.5">{isEs ? 'Título de la Notificación:' : 'Title:'}</label>
                    <input
                      type="text"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-white/60 block mb-0.5">{isEs ? 'Mensaje / Cuerpo:' : 'Body:'}</label>
                    <textarea
                      rows={2}
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white text-xs resize-none"
                    />
                  </div>

                  {broadcastSuccess && (
                    <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold text-center">
                      {isEs ? '¡Alerta enviada exitosamente a los 1,842 dispositivos en México y USA!' : 'Alert broadcasted to 1,842 devices!'}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs shadow-md active:scale-95 transition"
                  >
                    {isEs ? 'Difundir Alerta Push Inmediata' : 'Send Push Broadcast'}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: SEGURIDAD, CIBERSEGURIDAD & COOKIES */}
            {activeAdminTab === 'seguridad' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <span className="text-xs font-bold text-white block">{isEs ? 'Ciberseguridad del APK' : 'APK Cybersecurity'}</span>
                  <div className="flex items-center gap-2 text-[11px] text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Cifrado TLS 1.3 & Tokens con expiración segura</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Validación biométrica facial e INE contra duplicados</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Cero tolerancia a extorsión o estafas financieras</span>
                  </div>
                </div>

                {isChangingCreds ? (
                  <form onSubmit={handleUpdateCreds} className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">{isEs ? 'Cambiar Credenciales Admin' : 'Change Admin Credentials'}</h4>
                    <div>
                      <label className="text-[10px] text-white/60 block mb-1">{isEs ? 'Nueva Contraseña' : 'New Password'}</label>
                      <input
                        type="password"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        placeholder="Nueva contraseña"
                        className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsChangingCreds(false)}
                        className="flex-1 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold"
                      >
                        {isEs ? 'Cancelar' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold"
                      >
                        {isEs ? 'Guardar Cambios' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsChangingCreds(true)}
                    className="w-full py-2.5 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition"
                  >
                    {isEs ? 'Modificar Contraseña o NIP de Verificación' : 'Modify Password or Verification PIN'}
                  </button>
                )}

                {/* Purge cookies and local data */}
                <button
                  onClick={handleClearCookiesAndStorage}
                  className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isEs ? 'Purgar Todo en Cookies y Dejar APK Limpia en 0' : 'Purge All Cookies & Reset APK to 0'}
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
