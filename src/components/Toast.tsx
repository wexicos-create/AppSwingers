import { useEffect, useState } from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export type ToastKind = 'success' | 'info' | 'error';

interface AppToast {
  id: number;
  message: string;
  kind: ToastKind;
}

type ToastListener = (toast: AppToast) => void;

const listeners = new Set<ToastListener>();
let toastCounter = 0;

/**
 * Displays a styled in-app toast notification instead of a native browser alert().
 * kind: 'success' (default) | 'info' | 'error'
 */
export function showToast(message: string, kind: ToastKind = 'success') {
  const toast: AppToast = { id: ++toastCounter, message, kind };
  listeners.forEach((fn) => fn(toast));
}

/** Rendered once by App so every module can raise toasts via showToast(). */
export function ToastHost() {
  const [toasts, setToasts] = useState<AppToast[]>([]);

  useEffect(() => {
    const listener: ToastListener = (toast) => {
      setToasts((prev) => [...prev.slice(-2), toast]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4500);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div className="fixed bottom-24 inset-x-4 max-w-sm mx-auto z-[9998] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const isError = toast.kind === 'error';
        const isInfo = toast.kind === 'info';
        const shellClass = isError
          ? 'bg-[#2a0a14]/95 border-rose-500/60'
          : isInfo
          ? 'bg-[#160b2e]/95 border-purple-500/60'
          : 'bg-[#0d2417]/95 border-emerald-500/60';
        const iconClass = isError ? 'bg-rose-600' : isInfo ? 'bg-purple-600' : 'bg-emerald-600';
        return (
          <div
            key={toast.id}
            className={'pointer-events-auto p-3.5 rounded-2xl backdrop-blur-2xl border shadow-[0_0_35px_rgba(255,45,120,0.35)] text-white flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300 ' + shellClass}
            role="status"
          >
            <div className={'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ' + iconClass}>
              {isError ? (
                <AlertTriangle className="w-5 h-5 text-white" />
              ) : isInfo ? (
                <Info className="w-5 h-5 text-white" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-white" />
              )}
            </div>
            <p className="flex-1 min-w-0 text-xs leading-relaxed text-white/95 whitespace-pre-line">
              {toast.message}
            </p>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="p-1 rounded-full text-white/50 hover:text-white transition"
              aria-label="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
