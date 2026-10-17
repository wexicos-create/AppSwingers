import React, { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "../firebase";
import { ShieldCheck, X, LoaderCircle, ExternalLink } from "lucide-react";

type SessionResult = { sessionId: string; url: string; status: string };

export function IdentityVerificationPanel() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sessionUrl, setSessionUrl] = useState("");

  const startVerification = async () => {
    if (!auth.currentUser) {
      setMessage("Inicia sesión primero para verificar tu identidad.");
      return;
    }
    setBusy(true);
    setMessage("");
    setSessionUrl("");
    try {
      const functions = getFunctions(auth.app);
      const createSession = httpsCallable<Record<string, never>, SessionResult>(functions, "createDiditVerificationSession");
      const result = await createSession({});
      if (!result.data.url || !result.data.url.startsWith("https://")) {
        throw new Error("La sesión de verificación no devolvió una dirección segura.");
      }
      setSessionUrl(result.data.url);
      setMessage("Sesión creada. Completa el proceso en Didit; la cuenta solo cambiará a verificada después de validar el webhook firmado.");
    } catch (error) {
      const code = error && typeof error === "object" && "message" in error ? String(error.message) : "";
      setMessage(code || "No fue posible iniciar la verificación. Comprueba la configuración del servidor.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full border border-purple-300/30 bg-[#28104e] px-4 py-3 text-sm font-bold text-white shadow-xl hover:bg-purple-900" aria-label="Verificar identidad">
        <ShieldCheck className="h-5 w-5" /> Verificar identidad
      </button>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="didit-panel-title">
          <section className="w-full max-w-md space-y-4 rounded-3xl border border-purple-300/20 bg-[#10091a] p-5 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="didit-panel-title" className="text-lg font-black">Verificación de identidad</h2>
                <p className="mt-1 text-sm text-purple-100/70">El mismo proceso seguro se inicia desde web y Android usando tu cuenta Firebase.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Cerrar"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-white/80">Didit procesa la verificación. No envíes tu INE por chat ni compartas códigos de acceso. La aprobación final depende del resultado recibido y validado en el servidor.</p>
            <button type="button" disabled={busy} onClick={startVerification} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-3 font-bold disabled:opacity-60">
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {busy ? "Preparando verificación…" : "Iniciar verificación"}
            </button>
            {message && <p role="status" className="rounded-xl border border-purple-300/20 bg-purple-950/30 p-3 text-sm text-purple-100">{message}</p>}
            {sessionUrl && <a href={sessionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-purple-200 underline underline-offset-4">Abrir verificación Didit <ExternalLink className="h-4 w-4" /></a>}
          </section>
        </div>
      )}
    </>
  );
}
