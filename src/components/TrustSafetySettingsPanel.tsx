import React, { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "../firebase";
import { BellRing, ShieldCheck, X, Volume2, VolumeX, Clock3 } from "lucide-react";

type TrustPrefs = { soundEnabled: boolean; autoDeleteDays: number; mutedUserIds: string[] };

export function TrustSafetySettingsPanel() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<TrustPrefs>({ soundEnabled: true, autoDeleteDays: 0, mutedUserIds: [] });
  const [muteId, setMuteId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const call = <T, R>(name: string) => httpsCallable<T, R>(getFunctions(auth.app), name);

  useEffect(() => {
    if (!open || !auth.currentUser) return;
    let cancelled = false;
    call<Record<string, never>, TrustPrefs>("getTrustPreferences")({}).then(({ data }) => {
      if (!cancelled) setPrefs({
        soundEnabled: data.soundEnabled !== false,
        autoDeleteDays: [0, 7, 30, 90].includes(data.autoDeleteDays) ? data.autoDeleteDays : 0,
        mutedUserIds: Array.isArray(data.mutedUserIds) ? data.mutedUserIds : [],
      });
    }).catch(() => { if (!cancelled) setMessage("No se pudieron cargar las preferencias del servidor."); });
    return () => { cancelled = true; };
  }, [open]);

  const save = async (next: TrustPrefs) => {
    if (!auth.currentUser) { setMessage("Inicia sesión para guardar preferencias sincronizadas."); return; }
    setBusy(true); setMessage("");
    try {
      await call<TrustPrefs, { saved: boolean }>("updateTrustPreferences")(next);
      setPrefs(next);
      setMessage("Preferencias guardadas en tu cuenta.");
    } catch {
      setMessage("No se guardaron los cambios. Comprueba que las funciones de Firebase estén desplegadas.");
    } finally { setBusy(false); }
  };

  const addMuted = () => {
    const id = muteId.trim();
    if (!id || prefs.mutedUserIds.includes(id)) return;
    const next = { ...prefs, mutedUserIds: [...prefs.mutedUserIds, id].slice(-100) };
    setMuteId("");
    void save(next);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-24 left-4 z-40 flex items-center gap-2 rounded-full border border-purple-300/30 bg-[#211037] px-4 py-3 text-sm font-bold text-white shadow-xl hover:bg-purple-900" aria-label="Preferencias de seguridad y notificaciones">
        <ShieldCheck className="h-5 w-5" /> Seguridad
      </button>
      {open && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="trust-settings-title">
        <section className="w-full max-w-md space-y-4 rounded-3xl border border-purple-300/20 bg-[#10091a] p-5 text-white shadow-2xl">
          <div className="flex items-start justify-between">
            <div><h2 id="trust-settings-title" className="text-lg font-black">Seguridad y notificaciones</h2><p className="mt-1 text-sm text-purple-100/70">Preferencias asociadas a tu cuenta.</p></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
          </div>
          <button type="button" disabled={busy} onClick={() => void save({ ...prefs, soundEnabled: !prefs.soundEnabled })} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-left disabled:opacity-60">
            <span className="flex items-center gap-2">{prefs.soundEnabled ? <Volume2 className="h-5 w-5 text-purple-200" /> : <VolumeX className="h-5 w-5 text-purple-200" />} Sonido de notificaciones</span><strong>{prefs.soundEnabled ? "Activado" : "Silenciado"}</strong>
          </button>
          <label className="block rounded-xl border border-white/10 bg-white/5 p-3">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold"><Clock3 className="h-4 w-4 text-purple-200" /> Borrado automático de chats</span>
            <select value={prefs.autoDeleteDays} disabled={busy} onChange={(e) => void save({ ...prefs, autoDeleteDays: Number(e.target.value) })} className="w-full rounded-lg border border-white/10 bg-[#21172d] p-2 text-white">
              <option value={0}>Desactivado</option><option value={7}>Después de 7 días</option><option value={30}>Después de 30 días</option><option value={90}>Después de 90 días</option>
            </select>
            <span className="mt-2 block text-xs text-white/60">La preferencia se sincroniza; la eliminación automática en el servidor requiere activar la tarea programada de retención antes de producción.</span>
          </label>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><BellRing className="h-4 w-4 text-purple-200" /> Silenciar conversación</h3>
            <div className="flex gap-2"><input value={muteId} onChange={(e) => setMuteId(e.target.value)} placeholder="ID de usuario" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#21172d] p-2 text-sm" /><button type="button" disabled={busy || !muteId.trim()} onClick={addMuted} className="rounded-lg bg-purple-700 px-3 text-sm font-bold disabled:opacity-50">Silenciar</button></div>
            {prefs.mutedUserIds.length > 0 && <ul className="mt-3 space-y-2 text-xs">{prefs.mutedUserIds.map(id => <li key={id} className="flex items-center justify-between rounded-lg bg-black/20 p-2"><span className="truncate">{id}</span><button type="button" disabled={busy} onClick={() => void save({ ...prefs, mutedUserIds: prefs.mutedUserIds.filter(value => value !== id) })} className="text-purple-200 underline">Desilenciar</button></li>)}</ul>}
          </div>
          {message && <p role="status" className="rounded-xl border border-purple-300/20 bg-purple-950/30 p-3 text-sm text-purple-100">{message}</p>}
        </section>
      </div>}
    </>
  );
}
