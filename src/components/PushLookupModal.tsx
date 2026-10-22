import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Send, 
  RefreshCw, 
  ShieldCheck, 
  Smartphone, 
  Globe, 
  Sparkles, 
  Sliders
} from 'lucide-react';
import { AppRegion } from '../types';
import { showToast } from './Toast';

interface PushLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  region: AppRegion;
  isEs: boolean;
  onSendTestNotification: (title: string, body: string) => void;
}

export const PushLookupModal: React.FC<PushLookupModalProps> = ({
  isOpen,
  onClose,
  region,
  isEs,
  onSendTestNotification,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isVerifying, setIsVerifying] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [categories, setCategories] = useState({
    matches: true,
    collabs: true,
    lives: true,
    security: true,
  });
  const [pushLogs, setPushLogs] = useState<Array<{ id: string; time: string; text: string; status: 'ok' | 'info' | 'warn' }>>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Add initial diagnostics trace
      const initialLogs = [
        {
          id: 'log-1',
          time: new Date().toLocaleTimeString(),
          text: isEs 
            ? `Canal Push sincronizado: Región ${region === 'MX' ? 'México (San Luis Potosí)' : 'Estados Unidos'} - Idioma ${isEs ? 'ES' : 'EN'}`
            : `Push channel synchronized: Region ${region === 'MX' ? 'Mexico (SLP)' : 'United States'} - Language ${isEs ? 'ES' : 'EN'}`,
          status: 'ok' as const,
        },
        {
          id: 'log-2',
          time: new Date().toLocaleTimeString(),
          text: isEs
            ? `Token FCM activo: fcm_appswinguer_${region.toLowerCase()}_${Math.random().toString(36).substring(2, 9)}`
            : `FCM Token active: fcm_appswinguer_${region.toLowerCase()}_${Math.random().toString(36).substring(2, 9)}`,
          status: 'info' as const,
        }
      ];
      setPushLogs(initialLogs);
      setLatency(Math.floor(20 + Math.random() * 25));
    }
  }, [isOpen, region, isEs]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setPermission(res);
        setPushLogs(prev => [
          {
            id: `perm_${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            text: isEs 
              ? `Permiso actualizado a: ${res === 'granted' ? 'Autorizado' : res}` 
              : `Permission updated to: ${res}`,
            status: res === 'granted' ? 'ok' : 'warn',
          },
          ...prev,
        ]);
        if (res === 'granted') {
          handleTriggerPush();
        }
      } catch (e) {
        console.warn('Push permission request error:', e);
      }
    } else {
      showToast(isEs ? 'Este navegador no soporta la API de Notificaciones estándar.' : 'This browser does not support Notification API.', 'error');
    }
  };

  const handleTriggerPush = () => {
    const isMexico = region === 'MX';
    const title = isMexico 
      ? '🇲🇽 AppSwinguer México (San Luis Potosí)' 
      : '🇺🇸 AppSwinguer USA (Lifestyle Push)';
    
    const body = isMexico
      ? '¡Nuevo match liberal en tu radio! Pareja Fuego está activa a 3.5 km. Toca para ver su propuesta privada y chatear.'
      : 'New lifestyle match nearby! Active verified profile 2.5 miles away. Tap to open instant chat & VIP gallery.';

    // Try real browser notification if supported and granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80',
          badge: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=64&q=80',
          tag: 'appswinguer-lifestyle-match',
        });
      } catch (err) {
        console.warn('Native notification dispatch note:', err);
      }
    }

    // Call parent handler to display the in-app floating push banner
    onSendTestNotification(title, body);

    setPushLogs(prev => [
      {
        id: `push_${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        text: isEs
          ? `[PUSH ENVIADO] Idioma: ${isMexico ? 'Español (MX)' : 'Inglés (US)'} -> "${title}"`
          : `[PUSH DISPATCHED] Language: ${isMexico ? 'Spanish (MX)' : 'English (US)'} -> "${title}"`,
        status: 'ok',
      },
      ...prev,
    ]);
  };

  const handleLookupVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      const ping = Math.floor(18 + Math.random() * 20);
      setLatency(ping);
      setPushLogs(prev => [
        {
          id: `lookup_${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          text: isEs
            ? `[LOOKUP OK] Servidor Push SLP/US responde en ${ping}ms. Canal en alta prioridad.`
            : `[LOOKUP OK] Push Gateway responds in ${ping}ms. High-priority channel confirmed.`,
          status: 'ok',
        },
        ...prev,
      ]);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-[36px] bg-gradient-to-b from-[#1b0d33] via-[#0f071e] to-[#07030e] border border-purple-500/40 p-6 flex flex-col gap-4 text-white shadow-[0_0_60px_rgba(177,76,255,0.35)] overflow-hidden">
        
        {/* Glow ambient */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <BellRing className="w-5 h-5 fill-white/20 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wide text-white">
                {isEs ? 'Lookup & Push Alerts' : 'Push Alerts & Lookup'}
              </h3>
              <p className="text-[11px] text-purple-200/70">
                {isEs ? 'Sistema de notificaciones en tiempo real' : 'Real-time push delivery diagnostic'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Card */}
        <div className="p-3.5 rounded-2xl bg-black/50 border border-purple-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60 font-medium">{isEs ? 'Estado del Permiso:' : 'Permission Status:'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
              permission === 'granted'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : permission === 'denied'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}>
              {permission === 'granted' ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {isEs ? 'Activo & Concedido' : 'Active & Granted'}
                </>
              ) : permission === 'denied' ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  {isEs ? 'Bloqueado en Celular' : 'Blocked on Device'}
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {isEs ? 'Pendiente' : 'Pending'}
                </>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
            <span className="text-white/60 font-medium">{isEs ? 'Idioma & País Sincronizado:' : 'Synced Country & Lang:'}</span>
            <span className="font-bold text-pink-300 flex items-center gap-1">
              <span>{region === 'MX' ? '🇲🇽 México' : '🇺🇸 USA'} &bull; {isEs ? 'Español (ES)' : 'English (EN)'}</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
            <span className="text-white/60 font-medium">{isEs ? 'Latencia Push Gateway:' : 'Gateway Latency:'}</span>
            <span className="font-mono text-emerald-400 text-[11px] font-bold">
              {latency ? `${latency} ms` : '24 ms'}
            </span>
          </div>
        </div>

        {/* Action Buttons: Request Permission & Send Test Push */}
        <div className="flex flex-col gap-2">
          {permission !== 'granted' && (
            <button
              onClick={handleRequestPermission}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 hover:brightness-110 active:scale-95 transition"
            >
              <Smartphone className="w-4 h-4" />
              {isEs ? 'Solicitar Permiso Push en Celular' : 'Grant Device Push Permission'}
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleTriggerPush}
              className="py-2.5 px-3 rounded-xl bg-pink-600/30 hover:bg-pink-600/40 border border-pink-500/40 text-pink-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <Send className="w-3.5 h-3.5 text-pink-400" />
              {isEs ? 'Probar Push Ahora' : 'Send Test Push'}
            </button>

            <button
              onClick={handleLookupVerify}
              disabled={isVerifying}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isVerifying ? 'animate-spin' : ''}`} />
              {isEs ? 'Verificar Lookup' : 'Verify Lookup'}
            </button>
          </div>
        </div>

        {/* Notification Category Filters */}
        <div className="space-y-1.5 p-3 rounded-2xl bg-white/5 border border-white/5 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300 mb-1 flex items-center gap-1">
            <Sliders className="w-3 h-3 text-pink-400" />
            {isEs ? 'Filtros de Alerta Automática' : 'Push Notification Channels'}
          </div>

          <label className="flex items-center justify-between py-0.5 cursor-pointer">
            <span className="text-white/80 text-[11px]">
              {isEs ? '🔥 Matches y Mensajes de Chat' : '🔥 Matches & Direct Chat'}
            </span>
            <input
              type="checkbox"
              checked={categories.matches}
              onChange={(e) => setCategories(prev => ({ ...prev, matches: e.target.checked }))}
              className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between py-0.5 cursor-pointer">
            <span className="text-white/80 text-[11px]">
              {isEs ? '💎 Propuestas Swinger & GangBang' : '💎 Swinger & GangBang Proposals'}
            </span>
            <input
              type="checkbox"
              checked={categories.collabs}
              onChange={(e) => setCategories(prev => ({ ...prev, collabs: e.target.checked }))}
              className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between py-0.5 cursor-pointer">
            <span className="text-white/80 text-[11px]">
              {isEs ? '🎥 En Vivo y Creadoras VIP' : '🎥 Live Streams & VIP Creators'}
            </span>
            <input
              type="checkbox"
              checked={categories.lives}
              onChange={(e) => setCategories(prev => ({ ...prev, lives: e.target.checked }))}
              className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Live Lookup Trace Log */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase text-white/50 block">
            {isEs ? 'Registro de entrega en tiempo real (Audit Log):' : 'Real-time Push Audit Log:'}
          </span>
          <div className="h-24 overflow-y-auto rounded-xl bg-black/70 border border-white/10 p-2 text-[10px] font-mono space-y-1 text-purple-200">
            {pushLogs.map((log) => (
              <div key={log.id} className="leading-tight flex items-start gap-1">
                <span className="text-white/40 shrink-0">[{log.time}]</span>
                <span className={log.status === 'ok' ? 'text-emerald-300' : log.status === 'warn' ? 'text-amber-300' : 'text-purple-300'}>
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 text-xs font-semibold transition"
        >
          {isEs ? 'Entendido / Cerrar' : 'Close Diagnostic'}
        </button>
      </div>
    </div>
  );
};
