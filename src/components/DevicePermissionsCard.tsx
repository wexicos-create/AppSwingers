import React, { useCallback, useEffect, useState } from 'react';
import { Bell, Camera, Mic, MapPin, ShieldCheck } from 'lucide-react';
import { showToast } from './Toast';
import {
  type PermState,
  queryPermissionState,
  requestCameraPermission,
  requestMicrophonePermission,
  requestGeolocationPermission,
} from '../permissions';
import { enablePushNotifications, getNotificationPermission } from '../push';

// Permisos del dispositivo: notificaciones push del servidor (alarma "hoy es
// tu evento"), camara (verificacion de identidad / videollamadas), microfono
// (videollamadas / notas de voz) y ubicacion (radio de busqueda). El usuario
// concede o revisa cada permiso desde su perfil.

interface DevicePermissionsCardProps {
  isEs?: boolean;
}

type NotifState = PermState;

const STATE_LABEL_ES: Record<PermState, string> = {
  granted: 'Concedido',
  denied: 'Bloqueado',
  prompt: 'Pendiente',
  unsupported: 'No disponible',
};

const STATE_LABEL_EN: Record<PermState, string> = {
  granted: 'Granted',
  denied: 'Blocked',
  prompt: 'Pending',
  unsupported: 'Unavailable',
};

function stateColors(state: PermState): string {
  if (state === 'granted') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40';
  if (state === 'denied') return 'bg-rose-500/15 text-rose-300 border border-rose-500/40';
  if (state === 'prompt') return 'bg-amber-500/15 text-amber-300 border border-amber-500/40';
  return 'bg-white/5 text-white/40 border border-white/10';
}

function notifToPermState(p: NotificationPermission | 'unsupported'): NotifState {
  if (p === 'unsupported') return 'unsupported';
  return p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt';
}

export const DevicePermissionsCard: React.FC<DevicePermissionsCardProps> = ({ isEs = true }) => {
  const [notif, setNotif] = useState<PermState>('unsupported');
  const [camera, setCamera] = useState<PermState>('unsupported');
  const [microphone, setMicrophone] = useState<PermState>('unsupported');
  const [geolocation, setGeolocation] = useState<PermState>('unsupported');
  const [busy, setBusy] = useState<string | null>(null);

  const labels = isEs ? STATE_LABEL_ES : STATE_LABEL_EN;

  const refresh = useCallback(() => {
    setNotif(notifToPermState(getNotificationPermission()));
    void (async () => {
      setCamera(await queryPermissionState('camera'));
      setMicrophone(await queryPermissionState('microphone'));
      setGeolocation(await queryPermissionState('geolocation'));
    })();
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const askNotifications = async () => {
    setBusy('notifications');
    try {
      const result = await enablePushNotifications();
      const state = notifToPermState(result);
      setNotif(state);
      if (state === 'granted') {
        showToast(isEs
          ? 'Notificaciones activadas: recibiras la alarma "hoy es tu evento" aunque la app este cerrada.'
          : 'Notifications enabled: you will receive the "today is your event" alarm even with the app closed.');
      } else if (state === 'denied') {
        showToast(isEs
          ? 'El navegador bloqueo las notificaciones. Habilitalas en la configuracion del sitio.'
          : 'The browser blocked notifications. Enable them in the site settings.', 'error');
      }
    } finally {
      setBusy(null);
    }
  };

  const askMedia = async (kind: 'camera' | 'microphone' | 'geolocation') => {
    setBusy(kind);
    try {
      const result = kind === 'camera'
        ? await requestCameraPermission()
        : kind === 'microphone'
          ? await requestMicrophonePermission()
          : await requestGeolocationPermission();
      if (kind === 'camera') setCamera(result);
      if (kind === 'microphone') setMicrophone(result);
      if (kind === 'geolocation') setGeolocation(result);
      if (result === 'granted') {
        showToast(isEs ? 'Permiso concedido.' : 'Permission granted.');
      } else if (result === 'denied') {
        showToast(isEs
          ? 'Permiso bloqueado por el navegador. Habilitalo en la configuracion del sitio.'
          : 'Permission blocked by the browser. Enable it in the site settings.', 'error');
      }
    } finally {
      setBusy(null);
    }
  };

  const rows: {
    key: string;
    icon: React.ReactNode;
    name: string;
    reason: string;
    state: PermState;
    onAsk: () => void;
  }[] = [
    {
      key: 'notifications',
      icon: <Bell className="w-4 h-4 text-pink-400" />,
      name: isEs ? 'Notificaciones push' : 'Push notifications',
      reason: isEs ? 'Alarma "hoy es tu evento" enviada por el servidor' : 'Server-sent "today is your event" alarm',
      state: notif,
      onAsk: () => void askNotifications(),
    },
    {
      key: 'camera',
      icon: <Camera className="w-4 h-4 text-pink-400" />,
      name: isEs ? 'Camara' : 'Camera',
      reason: isEs ? 'Verificacion de identidad (INE) y videollamadas' : 'Identity verification (ID) and video calls',
      state: camera,
      onAsk: () => void askMedia('camera'),
    },
    {
      key: 'microphone',
      icon: <Mic className="w-4 h-4 text-pink-400" />,
      name: isEs ? 'Microfono' : 'Microphone',
      reason: isEs ? 'Videollamadas y notas de voz' : 'Video calls and voice notes',
      state: microphone,
      onAsk: () => void askMedia('microphone'),
    },
    {
      key: 'geolocation',
      icon: <MapPin className="w-4 h-4 text-pink-400" />,
      name: isEs ? 'Ubicacion' : 'Location',
      reason: isEs ? 'Radio de busqueda y eventos cercanos' : 'Search radius and nearby events',
      state: geolocation,
      onAsk: () => void askMedia('geolocation'),
    },
  ];

  return (
    <div className="p-5 rounded-3xl bg-neutral-900/70 border border-purple-500/20 mb-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300">
            {isEs ? 'Permisos del dispositivo' : 'Device permissions'}
          </h3>
        </div>
        <span className="text-[9px] text-white/40 uppercase font-bold tracking-wider">
          {isEs ? 'Tus datos, tu control' : 'Your data, your control'}
        </span>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-3 py-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center shrink-0">
                {row.icon}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">{row.name}</span>
                <span className="text-[10px] text-white/50 block truncate">{row.reason}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${stateColors(row.state)}`}>
                {labels[row.state]}
              </span>
              {row.state !== 'granted' && row.state !== 'unsupported' && (
                <button
                  type="button"
                  onClick={row.onAsk}
                  disabled={busy === row.key}
                  className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[9px] font-bold uppercase tracking-wider active:scale-95 transition disabled:opacity-50"
                >
                  {busy === row.key ? '...' : (isEs ? 'Permitir' : 'Allow')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-white/40 leading-relaxed">
        {isEs
          ? 'Las notificaciones push provienen del servidor de la plataforma (Firebase Cloud Messaging). La camara y el microfono solo se activan cuando usas verificacion de identidad o videollamadas; nunca se graba nada sin tu conocimiento.'
          : 'Push notifications come from the platform server (Firebase Cloud Messaging). Camera and microphone are only activated when you use identity verification or video calls; nothing is ever recorded without your knowledge.'}
      </p>
    </div>
  );
};
