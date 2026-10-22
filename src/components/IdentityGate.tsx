import React, { useState } from 'react';
import { ShieldX, Ban, AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { AppNotification } from '../types';

interface IdentityGateProps {
  mode: 'rechazada' | 'baneada';
  isEs: boolean;
  alias: string;
  notifications: AppNotification[];
  deleting: boolean;
  onDeleteAccount: () => void;
  onSignOut: () => void;
}

/**
 * Blocking gate shown when the administrator rejected the identity or banned
 * the account. On reject, the owner is notified that we could not validate who
 * they claim to be and the account with its credentials is deleted from this
 * screen (Firebase Auth account + Firestore user document). On ban, the
 * credentials remain retained for one year for legal purposes before purge.
 */
export function IdentityGate({ mode, isEs, alias, notifications, deleting, onDeleteAccount, onSignOut }: IdentityGateProps) {
  const [confirming, setConfirming] = useState(false);
  const rejected = mode === 'rechazada';

  const identityNotes = notifications.filter(n => n.kind === 'identidad');
  const note = identityNotes.length > 0 ? identityNotes[0].body : null;

  return (
    <div className="min-h-screen w-full max-w-[430px] mx-auto bg-[#08040f] flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-sm rounded-[32px] bg-gradient-to-b from-[#1b0f34] via-[#100720] to-[#080310] border border-rose-500/30 p-6 text-center space-y-4 shadow-2xl">
        <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center border border-rose-400/40 bg-rose-500/15">
          {rejected ? <ShieldX className="w-7 h-7 text-rose-300" /> : <Ban className="w-7 h-7 text-rose-300" />}
        </div>

        <h2 className="text-xl font-black leading-snug">
          {rejected
            ? (isEs ? 'No pudimos validar tu identidad' : 'We could not validate your identity')
            : (isEs ? 'Cuenta suspendida' : 'Account suspended')}
        </h2>

        <p className="text-xs text-white/70 leading-relaxed">
          {rejected
            ? (isEs
              ? `Hola ${alias}: no pudimos validar que eres quien dices ser tras revisar tu identificación y tu prueba de vida. Tu cuenta y las credenciales resguardadas serán eliminadas. Podrás registrarte nuevamente completando la verificación con éxito.`
              : `Hello ${alias}: we could not validate you are who you claim to be after reviewing your ID and liveness test. Your account and stored credentials will be deleted. You may register again by completing verification successfully.`)
            : (isEs
              ? `Hola ${alias}: tu cuenta fue suspendida por decisión del administrador. Conforme a nuestro aviso de privacidad, tus credenciales se retienen durante un año por cualquier tema legal posterior y después se elimina todo dato existente.`
              : `Hello ${alias}: your account was suspended by administrator decision. Under our privacy notice, your credentials are retained for one year for any later legal matter, after which all data is permanently deleted.`)}
        </p>

        {note && (
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-[10px] text-white/60 text-left leading-relaxed">
            {note}
          </div>
        )}

        {rejected ? (
          confirming ? (
            <div className="space-y-3 pt-1">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-400/30 text-[10px] text-rose-200 leading-relaxed flex items-start gap-2 text-left">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {isEs
                    ? 'Se eliminará tu cuenta de acceso y todos tus datos de usuario de forma permanente. Esta acción no se puede deshacer.'
                    : 'Your access account and all your user data will be permanently deleted. This action cannot be undone.'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-2xl bg-white/10 text-white text-xs font-bold disabled:opacity-50"
                >
                  {isEs ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={onDeleteAccount}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                  {deleting ? (isEs ? 'Eliminando...' : 'Deleting...') : (isEs ? 'Confirmar eliminación' : 'Confirm deletion')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 text-white text-sm font-bold shadow-lg shadow-rose-900/40"
            >
              {isEs ? 'Eliminar mi cuenta y credenciales' : 'Delete my account and credentials'}
            </button>
          )
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] text-white/40 leading-relaxed">
              {isEs
                ? 'Si consideras que esto es un error, puedes contactar al administrador desde el correo registrado en tu cuenta.'
                : 'If you believe this is a mistake, you can contact the administrator from the email registered in your account.'}
            </p>
            <button
              type="button"
              onClick={onSignOut}
              className="w-full py-3 rounded-2xl bg-white/10 text-white text-xs font-bold"
            >
              {isEs ? 'Cerrar sesión' : 'Sign out'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
