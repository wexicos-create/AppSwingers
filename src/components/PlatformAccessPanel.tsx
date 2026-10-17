import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, Download, ExternalLink, MapPin, Smartphone, ShieldCheck, X } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
};

type PlatformAccessPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  isEs: boolean;
  region: 'MX' | 'US';
};

export function PlatformAccessPanel({ isOpen, onClose, isEs, region }: PlatformAccessPanelProps) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<'install' | 'location' | 'notifications' | null>(null);
  const apkUrl = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_ANDROID_APK_URL || '').trim();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setInstalled(window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setNotice(isEs ? 'AppSwinger quedó instalada en este dispositivo.' : 'AppSwinger was installed on this device.');
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.warn('AppSwinger service worker registration failed:', error);
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [isEs]);

  if (!isOpen) return null;

  const requestInstall = async () => {
    setBusy('install');
    try {
      if (installPrompt) {
        await installPrompt.prompt();
        const result = await installPrompt.userChoice;
        setNotice(result.outcome === 'accepted'
          ? (isEs ? 'Se inició la instalación.' : 'Installation started.')
          : (isEs ? 'La instalación se canceló; puedes intentarlo después.' : 'Installation was cancelled; you can try again later.'));
        setInstallPrompt(null);
      } else if (installed) {
        setNotice(isEs ? 'La aplicación web ya está instalada.' : 'The web app is already installed.');
      } else {
        setNotice(isEs
          ? 'En Chrome para Android, abre el menú ⋮ y elige “Instalar aplicación” o “Agregar a pantalla principal”.'
          : 'In Chrome for Android, open the ⋮ menu and choose “Install app” or “Add to Home screen”.');
      }
    } catch {
      setNotice(isEs ? 'No fue posible iniciar la instalación desde este navegador.' : 'This browser could not start installation.');
    } finally {
      setBusy(null);
    }
  };

  const requestLocation = async () => {
    setBusy('location');
    setNotice('');
    if (!('geolocation' in navigator)) {
      setNotice(isEs ? 'Este navegador no admite geolocalización.' : 'This browser does not support geolocation.');
      setBusy(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNotice(isEs
          ? `Ubicación autorizada. Coordenadas obtenidas para calcular recomendaciones cercanas (${position.coords.accuracy.toFixed(0)} m de precisión aproximada).`
          : `Location allowed. Coordinates are available for nearby recommendations (approx. ${position.coords.accuracy.toFixed(0)} m accuracy).`);
        setBusy(null);
      },
      (error) => {
        const reason = error.code === error.PERMISSION_DENIED
          ? (isEs ? 'Permiso denegado. Puedes habilitarlo desde los ajustes del navegador.' : 'Permission denied. You can enable it in browser settings.')
          : (isEs ? 'No se pudo obtener la ubicación. Comprueba el GPS y vuelve a intentarlo.' : 'Could not get location. Check GPS and try again.');
        setNotice(reason);
        setBusy(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const requestNotifications = async () => {
    setBusy('notifications');
    setNotice('');
    try {
      if (!('Notification' in window)) {
        setNotice(isEs ? 'Este navegador no admite notificaciones web.' : 'This browser does not support web notifications.');
      } else {
        const permission = await Notification.requestPermission();
        setNotice(permission === 'granted'
          ? (isEs ? 'Permiso de notificaciones concedido. La entrega real requiere configurar el servicio push.' : 'Notification permission granted. Delivery still requires push-service configuration.')
          : (isEs ? 'No se concedió el permiso de notificaciones.' : 'Notification permission was not granted.'));
      }
    } catch {
      setNotice(isEs ? 'No se pudo solicitar el permiso de notificaciones.' : 'Could not request notification permission.');
    } finally {
      setBusy(null);
    }
  };

  const closeLabel = isEs ? 'Cerrar panel de instalación y permisos' : 'Close installation and permissions panel';

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="platform-access-title">
      <section className="max-h-[88dvh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl border border-purple-400/25 bg-[#0c0812] p-5 text-[#f5eeff] shadow-[0_0_50px_rgba(177,76,255,.22)] sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#d49cff]">
              <Smartphone className="h-4 w-4" /> {isEs ? 'App y navegador' : 'App and browser'}
            </div>
            <h2 id="platform-access-title" className="text-xl font-black">{isEs ? 'Acceso AppSwinger' : 'AppSwinger access'}</h2>
            <p className="mt-1 text-sm text-[#cbbee2]">{isEs ? 'Instala la versión web, prepara la descarga Android y controla permisos solo cuando los necesites.' : 'Install the web app, check Android download availability, and grant permissions only when needed.'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={closeLabel} className="rounded-xl border border-purple-400/20 p-2 text-purple-200 hover:bg-purple-900/30">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <button type="button" onClick={requestInstall} disabled={busy === 'install'} className="flex w-full items-center gap-3 rounded-2xl border border-purple-400/30 bg-gradient-to-r from-purple-700/30 to-fuchsia-700/20 p-4 text-left transition hover:border-purple-300/60 disabled:opacity-60">
            <span className="rounded-xl bg-purple-500/20 p-2 text-[#d49cff]"><Download className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{installed ? (isEs ? 'Versión web instalada' : 'Web app installed') : (isEs ? 'Instalar AppSwinger web' : 'Install AppSwinger web')}</span>
              <span className="mt-0.5 block text-xs text-[#cbbee2]">{isEs ? 'Instalable desde navegadores compatibles; no reemplaza la versión APK.' : 'Installable in supported browsers; it does not replace the APK.'}</span>
            </span>
            {installed ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <ExternalLink className="h-4 w-4 text-purple-200" />}
          </button>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <span className="rounded-xl bg-fuchsia-500/15 p-2 text-fuchsia-200"><Smartphone className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{isEs ? 'Descargar AppSwinger.apk' : 'Download AppSwinger.apk'}</span>
              <span className="mt-0.5 block text-xs text-[#cbbee2]">{apkUrl ? (isEs ? 'Descarga desde la URL oficial configurada.' : 'Download from the configured official URL.') : (isEs ? 'El APK firmado aún debe publicarse y configurarse.' : 'The signed APK still needs to be published and configured.')}</span>
            </span>
            {apkUrl ? (
              <a href={apkUrl} className="rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-3 py-2 text-xs font-extrabold text-white hover:brightness-110" rel="noopener noreferrer">
                {isEs ? 'Descargar' : 'Download'}
              </a>
            ) : (
              <span className="rounded-xl border border-amber-300/25 px-3 py-2 text-xs font-bold text-amber-200">{isEs ? 'Pendiente' : 'Pending'}</span>
            )}
          </div>

          <button type="button" onClick={requestLocation} disabled={busy === 'location'} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-left transition hover:border-purple-300/40 disabled:opacity-60">
            <span className="rounded-xl bg-purple-500/15 p-2 text-purple-200"><MapPin className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{isEs ? 'Permitir ubicación' : 'Allow location'}</span>
              <span className="mt-0.5 block text-xs text-[#cbbee2]">{isEs ? 'Solo para recomendaciones y distancias cercanas.' : 'Only for nearby recommendations and distance.'}</span>
            </span>
            <span className="text-xs font-bold text-purple-200">{busy === 'location' ? '…' : isEs ? 'Activar' : 'Enable'}</span>
          </button>

          <button type="button" onClick={requestNotifications} disabled={busy === 'notifications'} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-left transition hover:border-purple-300/40 disabled:opacity-60">
            <span className="rounded-xl bg-purple-500/15 p-2 text-purple-200"><Bell className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{isEs ? 'Permitir notificaciones' : 'Allow notifications'}</span>
              <span className="mt-0.5 block text-xs text-[#cbbee2]">{isEs ? 'El permiso del navegador no sustituye configurar el servicio push.' : 'Browser permission does not replace push-service setup.'}</span>
            </span>
            <span className="text-xs font-bold text-purple-200">{busy === 'notifications' ? '…' : isEs ? 'Activar' : 'Enable'}</span>
          </button>

          <div className="flex gap-2 rounded-xl border border-purple-400/15 bg-purple-950/20 p-3 text-xs leading-relaxed text-[#cbbee2]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#d49cff]" />
            <p>{isEs ? `Región seleccionada: ${region === 'MX' ? 'México' : 'Estados Unidos'}. Cámara y micrófono se pedirán al iniciar la función que los necesita, como una verificación; nunca se solicitan todos los permisos de golpe.` : `Selected region: ${region === 'MX' ? 'Mexico' : 'United States'}. Camera and microphone will be requested only when a feature needs them, such as verification.`}</p>
          </div>

          {notice && <div role="status" className="rounded-xl border border-purple-400/20 bg-purple-900/25 p-3 text-sm text-purple-100">{notice}</div>}
        </div>
      </section>
    </div>
  );
}
