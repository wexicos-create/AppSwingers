import React, { useCallback, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { Search, RefreshCw, FileDown, ShieldAlert, CheckCircle2, Ban, MessageSquare } from 'lucide-react';

type SecurityCase = {
  id: string;
  caseId?: string;
  userId?: string;
  email?: string;
  plan?: string;
  reason?: string;
  reasonCode?: string;
  status?: string;
  createdAt?: { seconds?: number } | string;
  notification?: { status?: string; failureReason?: string };
  appeal?: { message?: string; status?: string };
  observations?: Array<{ note: string; adminUid: string; at: string }>;
  resolution?: string;
};

const STATUS_LABELS: Record<string, string> = {
  suspended_pending_review: 'Suspendido · revisión pendiente',
  appeal_pending: 'Aclaración pendiente',
  resolved_lifted: 'Suspensión levantada',
  resolved_confirmed: 'Baneo confirmado'
};

export function SecurityCasesPanel({ isEs }: { isEs: boolean }) {
  const [cases, setCases] = useState<SecurityCase[]>([]);
  const [queryText, setQueryText] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<SecurityCase | null>(null);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const request = useCallback(async (method: 'GET' | 'PATCH' = 'GET', body?: unknown, query = '') => {
    const user = auth.currentUser;
    if (!user) throw new Error(isEs ? 'Inicia sesión con una cuenta administradora autorizada.' : 'Sign in with an authorized administrator account.');
    const token = await user.getIdToken(true);
    const response = await fetch('/api/security/cases' + query, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    return payload;
  }, [isEs]);

  const loadCases = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const params = new URLSearchParams();
      if (queryText.trim()) params.set('q', queryText.trim());
      if (status) params.set('status', status);
      const data = await request('GET', undefined, params.toString() ? `?${params.toString()}` : '');
      setCases(data.cases || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible cargar los casos.');
    } finally { setBusy(false); }
  }, [queryText, status, request]);

  useEffect(() => { void loadCases(); }, [loadCases]);

  const act = async (action: 'add_observation' | 'lift_suspension' | 'confirm_ban') => {
    if (!selected) return;
    setBusy(true); setError('');
    try {
      await request('PATCH', { caseId: selected.id, action, ...(action === 'add_observation' ? { note } : {}) });
      setNote('');
      await loadCases();
      const refreshed = await request('GET', undefined, `?q=${encodeURIComponent(selected.id)}`);
      setSelected((refreshed.cases || [])[0] || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible actualizar el caso.');
    } finally { setBusy(false); }
  };

  const exportCsv = () => {
    const fields = ['id','userId','email','plan','reasonCode','reason','status','resolution'];
    const quote = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const csv = [fields.join(','), ...cases.map(item => fields.map(key => quote((item as any)[key])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'appswinger-security-cases.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return <section className="space-y-3 rounded-2xl border border-purple-400/25 bg-black/30 p-3">
    <div className="flex items-center justify-between gap-2">
      <div><h3 className="text-sm font-bold text-white">{isEs ? 'Casos de seguridad y baneos' : 'Security and ban cases'}</h3><p className="text-[10px] text-white/55">{isEs ? 'Folio, evidencia, aclaraciones, notas y resolución auditada.' : 'Case ID, evidence, appeals, notes and audited resolution.'}</p></div>
      <button type="button" onClick={exportCsv} className="rounded-lg bg-white/10 p-2 text-white" title="Export CSV"><FileDown size={16}/></button>
    </div>
    <form onSubmit={e => { e.preventDefault(); void loadCases(); }} className="flex gap-2">
      <div className="relative min-w-0 flex-1"><Search size={14} className="absolute left-2.5 top-2.5 text-white/45"/><input value={queryText} onChange={e=>setQueryText(e.target.value)} placeholder={isEs ? 'Buscar correo, UID, folio o motivo' : 'Search email, UID, case ID or reason'} className="w-full rounded-lg border border-white/15 bg-zinc-900 py-2 pl-8 pr-2 text-xs text-white"/></div>
      <select value={status} onChange={e=>setStatus(e.target.value)} className="max-w-[46%] rounded-lg border border-white/15 bg-zinc-900 px-2 text-[10px] text-white">
        <option value="">{isEs ? 'Todos los estados' : 'All statuses'}</option>
        {Object.entries(STATUS_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}
      </select>
      <button type="submit" className="rounded-lg bg-purple-600 p-2 text-white" aria-label="Search"><RefreshCw size={15}/></button>
    </form>
    {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-200">{error}</p>}
    <div className="max-h-56 space-y-2 overflow-y-auto">
      {cases.map(item=><button key={item.id} type="button" onClick={()=>setSelected(item)} className={`w-full rounded-xl border p-2.5 text-left ${selected?.id===item.id?'border-purple-400 bg-purple-500/10':'border-white/10 bg-white/[0.03]'}`}>
        <div className="flex items-start justify-between gap-2"><span className="break-all text-[11px] font-bold text-white">{item.email || item.userId || item.id}</span><span className="shrink-0 text-[9px] text-purple-200">{STATUS_LABELS[item.status || ''] || item.status || '—'}</span></div>
        <p className="mt-1 line-clamp-2 text-[10px] text-white/65">{item.reason || item.reasonCode || '—'}</p>
        <p className="mt-1 text-[9px] text-white/40">Folio: {item.caseId || item.id} · {item.notification?.status === 'sent' ? 'Correo enviado' : 'Correo: ' + (item.notification?.status || 'pendiente')}</p>
      </button>)}
      {!busy && cases.length===0 && <p className="py-4 text-center text-[11px] text-white/45">{isEs ? 'No hay casos que coincidan.' : 'No matching cases.'}</p>}
    </div>
    {selected && <div className="space-y-2 rounded-xl border border-purple-400/25 bg-zinc-950 p-3">
      <div className="flex items-center gap-2"><ShieldAlert size={16} className="text-amber-300"/><h4 className="text-xs font-bold text-white">{isEs ? 'Detalle del caso' : 'Case details'}</h4></div>
      <p className="break-all text-[10px] text-white/70">UID: {selected.userId || '—'} · Plan: {selected.plan || '—'} · Código: {selected.reasonCode || '—'}</p>
      <p className="text-[11px] text-white">{selected.reason || '—'}</p>
      {selected.appeal?.message && <div className="rounded-lg bg-amber-500/10 p-2"><p className="mb-1 flex items-center gap-1 text-[10px] font-bold text-amber-200"><MessageSquare size={12}/> {isEs ? 'Aclaración del usuario' : 'User appeal'}</p><p className="whitespace-pre-wrap text-[11px] text-white/80">{selected.appeal.message}</p></div>}
      {selected.observations?.map((obs,i)=><p key={i} className="rounded bg-white/5 p-2 text-[10px] text-white/70">{obs.note} <span className="text-white/35">· {obs.adminUid}</span></p>)}
      <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder={isEs ? 'Agregar observación interna al expediente' : 'Add an internal case note'} className="w-full rounded-lg border border-white/15 bg-black p-2 text-xs text-white"/>
      <button type="button" disabled={busy || !note.trim()} onClick={()=>void act('add_observation')} className="w-full rounded-lg bg-white/10 py-2 text-[11px] font-semibold text-white disabled:opacity-40">{isEs ? 'Guardar observación' : 'Save note'}</button>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={busy || selected.status?.startsWith('resolved_')} onClick={()=>void act('lift_suspension')} className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600/80 py-2 text-[10px] font-bold text-white disabled:opacity-40"><CheckCircle2 size={13}/>{isEs ? 'Levantar suspensión' : 'Lift suspension'}</button>
        <button type="button" disabled={busy || selected.status?.startsWith('resolved_')} onClick={()=>void act('confirm_ban')} className="flex items-center justify-center gap-1 rounded-lg bg-rose-600/80 py-2 text-[10px] font-bold text-white disabled:opacity-40"><Ban size={13}/>{isEs ? 'Confirmar baneo' : 'Confirm ban'}</button>
      </div>
    </div>}
    {busy && <p className="text-[10px] text-purple-200">{isEs ? 'Procesando…' : 'Working…'}</p>}
  </section>;
}
