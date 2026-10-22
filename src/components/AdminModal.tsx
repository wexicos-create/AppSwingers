import React, { useState } from 'react';
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
import { showToast } from './Toast';

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

  // Security: no default credentials exist in source code. The owner configures them at first use.
  const [storedEmail, setStoredEmail] = useState(localStorage.getItem('admin_email') || '');
  const [storedPass, setStoredPass] = useState(localStorage.getItem('admin_pass') || '');
  const [storedPin, setStoredPin] = useState(localStorage.getItem('admin_pin') || '');
  const isAdminConfigured = Boolean(storedEmail && storedPass && storedPin);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(() => {
    try { return Number(sessionStorage.getItem('admin_lockout_until') || 0); } catch { return 0; }
  });
  const [isChangingCreds, setIsChangingCreds] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [newPin, setNewPin] = useState('');

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

  const registerFailedAttempt = () => {
    const next = failedAttempts + 1;
    setFailedAttempts(next);
    if (next >= 5) {
      const until = Date.now() + 60000;
      setLockoutUntil(until);
      try { sessionStorage.setItem('admin_lockout_until', String(until)); } catch { /* ignore */ }
      setFailedAttempts(0);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const now = Date.now();
    if (lockoutUntil > now) {
      const secs = Math.ceil((lockoutUntil - now) / 1000);
      setError(isEs ? `Demasiados intentos fallidos. Intenta de nuevo en ${secs} segundos.` : `Too many failed attempts. Try again in ${secs} seconds.`);
      return;
    }
    if (email.trim().toLowerCase() !== storedEmail || !password || password !== storedPass || !pin || pin !== storedPin) {
      registerFailedAttempt();
      setError(isEs ? 'Credenciales de administrador no válidas.' : 'Invalid admin credentials.');
      return;
    }
    setFailedAttempts(0);
    setIsLoggedIn(true);
  };

  const handleFirstSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const em = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(em)) {
      setError(isEs ? 'Correo de administrador no válido.' : 'Invalid admin email.');
      return;
    }
    if (password.length < 8) {
      setError(isEs ? 'La contraseña debe tener al menos 8 caracteres.' : 'Password must be at least 8 characters long.');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setError(isEs ? 'El NIP debe ser exactamente 6 dígitos.' : 'PIN must be exactly 6 digits.');
      return;
    }
    try {
      localStorage.setItem('admin_email', em);
      localStorage.setItem('admin_pass', password);
      localStorage.setItem('admin_pin', pin);
    } catch {
      setError(isEs ? 'No se pudieron guardar las credenciales en este dispositivo.' : 'Could not store credentials on this device.');
      return;
    }
    setStoredEmail(em);
    setStoredPass(password);
    setStoredPin(pin);
    setIsLoggedIn(true);
    showToast(isEs ? 'Panel administrativo configurado con éxito. Guarda tus credenciales en un lugar seguro.' : 'Admin panel configured successfully. Store your credentials safely.');
  };

  const handleUpdateCreds = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass && newPass.length < 8) {
      showToast(isEs ? 'La nueva contraseña debe tener al menos 8 caracteres.' : 'New password must be at least 8 characters long.', 'error');
      return;
    }
    if (newPin && !/^\d{6}$/.test(newPin)) {
      showToast(isEs ? 'El nuevo NIP debe ser exactamente 6 dígitos.' : 'New PIN must be exactly 6 digits.', 'error');
      return;
    }
    if (newPass) {
      localStorage.setItem('admin_pass', newPass);
      setStoredPass(newPass);
    }
    if (newPin) {
      localStorage.setItem('admin_pin', newPin);
      setStoredPin(newPin);
    }
    setIsChangingCreds(false);
    showToast(isEs ? 'Credenciales de administrador actualizadas con éxito.' : 'Admin credentials successfully updated.');
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
        showToast(isEs ? 'Cookies y almacenamiento local purgados al 100%. El APK está limpio en 0.' : 'Cookies & local storage purged 100%. APK is pristine at 0.');
        window.setTimeout(() => window.location.reload(), 1500);
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
            {isEs ? 'Acceso exclusivo del propietario' : 'Owner-only access'}
          </p>
          <p className="text-[10px] text-amber-300/80 mt-1">
            {isEs ? 'Métricas de demostración: backend comercial en desarrollo' : 'Demo metrics: commercial backend in development'}
          </p>
        </div>

        {!isLoggedIn ? (
          <form onSubmit={isAdminConfigured ? handleLogin : handleFirstSetup} className="flex flex-col gap-3.5">
            {!isAdminConfigured && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-semibold text-center">
                {isEs ? 'Primer uso: define tu correo, contraseña (mín. 8 caracteres) y NIP de 6 dígitos. Se guardan solo en este dispositivo.' : 'First use: set your email, password (min. 8 chars) and 6-digit PIN. Stored on this device only.'}
              </div>
            )}
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
                placeholder="tucorreo@dominio.com"
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
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/70 mb-1 flex items-center gap-1.5 font-medium">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                {isEs ? 'NIP de Segunda Verificación (6 dígitos)' : 'Secondary PIN (6 digits)'}
              </label>
              <input
                type="password"
                maxLength={6}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-500 tracking-widest text-center"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 text-white font-bold text-xs shadow-lg shadow-rose-600/30 hover:opacity-95 transition mt-1 active:scale-95"
            >
              {isAdminConfigured ? (isEs ? 'Verificar e Ingresar al Sistema' : 'Verify & Enter System') : (isEs ? 'Configurar y Entrar' : 'Configure & Enter')}
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
                  <p className="text-[10px] text-emerald-200">{storedEmail}</p>
                </div>
              </div>
              <button
                onClick={() => setIsLoggedIn(false)}
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
                      {isEs ? 'Alerta simulada registrada. La difusión real requiere el backend de notificaciones.' : 'Simulated broadcast registered. Real delivery requires the notifications backend.'}
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
                    <div>
                      <label className="text-[10px] text-white/60 block mb-1">{isEs ? 'Nuevo NIP (6 dígitos)' : 'New PIN (6 digits)'}</label>
                      <input
                        type="password"
                        maxLength={6}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="Nuevo NIP"
                        className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs tracking-widest text-center"
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
