import React, { useState } from 'react';
import { X, ShieldAlert, Key, Lock, Check, Mail, ShieldCheck } from 'lucide-react';

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

  // Stored admin credentials in localStorage or defaults
  const [storedPass, setStoredPass] = useState(localStorage.getItem('admin_pass') || 'Cervantes99');
  const [storedPin, setStoredPin] = useState(localStorage.getItem('admin_pin') || '300799');
  const [isChangingCreds, setIsChangingCreds] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [newPin, setNewPin] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (email.trim().toLowerCase() !== 'jocervantes99@gmail.com') {
      setError(isEs ? 'Correo de administrador no autorizado.' : 'Unauthorized admin email.');
      return;
    }
    if (password !== storedPass) {
      setError(isEs ? 'Contraseña incorrecta (Por defecto: Cervantes99).' : 'Incorrect password (Default: Cervantes99).');
      return;
    }
    if (pin !== storedPin) {
      setError(isEs ? 'PIN de segunda verificación incorrecto (Por defecto: 300799).' : 'Incorrect secondary verification PIN (Default: 300799).');
      return;
    }
    setIsLoggedIn(true);
  };

  const handleUpdateCreds = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass) {
      localStorage.setItem('admin_pass', newPass);
      setStoredPass(newPass);
    }
    if (newPin) {
      localStorage.setItem('admin_pin', newPin);
      setStoredPin(newPin);
    }
    setIsChangingCreds(false);
    alert(isEs ? 'Credenciales de administrador actualizadas con éxito.' : 'Admin credentials successfully updated.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-950 border border-rose-500/30 shadow-2xl flex flex-col gap-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-500 flex items-center justify-center mx-auto mb-3 border border-rose-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            {isEs ? 'Panel de Administración' : 'Admin Dashboard'}
          </h2>
          <p className="text-xs text-white/60 mt-1">
            {isEs ? 'Acceso restringido para jocervantes99@gmail.com' : 'Restricted access for jocervantes99@gmail.com'}
          </p>
        </div>

        {!isLoggedIn ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold text-center">
                {error}
              </div>
            )}
            <div>
              <label className="text-xs text-white/60 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-rose-400" />
                {isEs ? 'Correo Electrónico Admin' : 'Admin Email'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jocervantes99@gmail.com"
                className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-sm focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-rose-400" />
                {isEs ? 'Contraseña' : 'Password'}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Cervantes99"
                className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-sm focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                {isEs ? 'NIP de Segunda Verificación (6 dígitos)' : 'Secondary PIN (6 digits)'}
              </label>
              <input
                type="password"
                maxLength={6}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="300799"
                className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-sm focus:outline-none focus:border-rose-500 tracking-widest text-center"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 hover:opacity-95 transition mt-2"
            >
              {isEs ? 'Verificar e Ingresar' : 'Verify & Enter'}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <h4 className="font-bold text-white text-sm">{isEs ? 'Acceso Autorizado' : 'Authorized Access'}</h4>
                <p className="text-xs text-emerald-200">jocervantes99@gmail.com</p>
              </div>
            </div>

            {isChangingCreds ? (
              <form onSubmit={handleUpdateCreds} className="flex flex-col gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">{isEs ? 'Cambiar Credenciales' : 'Change Credentials'}</h4>
                <div>
                  <label className="text-[10px] text-white/60 block mb-1">{isEs ? 'Nueva Contraseña' : 'New Password'}</label>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Nueva contraseña"
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs"
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
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs tracking-widest text-center"
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
                className="py-2.5 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition"
              >
                {isEs ? 'Modificar Contraseña o NIP' : 'Modify Password or PIN'}
              </button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                <span className="text-2xl font-bold text-white">1,428</span>
                <span className="block text-xs text-white/60 mt-1">{isEs ? 'Usuarios Registrados' : 'Registered Users'}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                <span className="text-2xl font-bold text-emerald-400">$24,850</span>
                <span className="block text-xs text-white/60 mt-1">{isEs ? 'Ingresos Totales (IVA incl.)' : 'Total Revenue'}</span>
              </div>
            </div>

            <button
              onClick={() => setIsLoggedIn(false)}
              className="py-2.5 rounded-xl bg-rose-600/20 text-rose-300 text-xs font-semibold hover:bg-rose-600/30 transition border border-rose-500/30"
            >
              {isEs ? 'Cerrar Sesión Admin' : 'Logout Admin'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
