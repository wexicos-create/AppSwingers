import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const APK_URL = 'https://github.com/wexicos-create/AppSwingers/releases/latest/download/AppSwinger-Mexico-debug.apk';

export function ApkInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem('appswinger-apk-banner-dismissed') === '1';
    } catch {
      // Storage may be unavailable in private browsing; keep the banner usable.
    }
    setVisible(!standalone && !dismissed);
  }, []);

  const close = () => {
    setVisible(false);
    try {
      window.sessionStorage.setItem('appswinger-apk-banner-dismissed', '1');
    } catch {
      // Closing remains effective for the current render.
    }
  };

  if (!visible) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed bottom-3 inset-x-3 z-[10000] mx-auto max-w-xl rounded-2xl border border-purple-400/60 bg-[#171321]/95 p-3 text-white shadow-2xl backdrop-blur-xl"
    >
      <button
        type="button"
        aria-label="Cerrar aviso de instalación"
        onClick={close}
        className="absolute right-2 top-2 rounded-full p-1 text-zinc-300 hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-3 pr-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-400">
          <Download className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Instala AppSwinger</p>
          <p className="mt-0.5 text-xs text-zinc-300">Descarga la versión Android publicada en GitHub.</p>
        </div>
        <a
          href={APK_URL}
          className="shrink-0 rounded-xl bg-purple-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-purple-500"
          rel="noopener noreferrer"
        >
          Instalar
        </a>
      </div>
    </aside>
  );
}
