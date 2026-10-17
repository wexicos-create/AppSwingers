import React, { useEffect, useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { auth } from '../firebase';
import { AdminModal } from './AdminModal';
import { SecurityCasesPanel } from './SecurityCasesPanel';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isEs: boolean;
}

export function AdminModalWithSecurity({ isOpen, onClose, isEs }: Props) {
  const [canManageCases, setCanManageCases] = useState(false);
  const [casesOpen, setCasesOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setCanManageCases(false);
    if (isOpen && auth.currentUser) {
      auth.currentUser.getIdTokenResult(true).then(token => {
        if (active) setCanManageCases(token.claims.admin === true);
      }).catch(() => {
        if (active) setCanManageCases(false);
      });
    }
    if (!isOpen) setCasesOpen(false);
    return () => { active = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  return <>
    <AdminModal isOpen={isOpen} onClose={onClose} isEs={isEs} />
    {canManageCases && !casesOpen && <button
      type="button"
      onClick={() => setCasesOpen(true)}
      className="fixed right-4 top-20 z-[60] flex items-center gap-2 rounded-xl border border-purple-300/40 bg-zinc-950 px-3 py-2 text-xs font-bold text-white shadow-xl"
    ><ShieldCheck size={15}/>{isEs ? 'Casos de seguridad' : 'Security cases'}</button>}
    {casesOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/95 p-3">
      <div className="my-auto w-full max-w-2xl space-y-3 rounded-2xl border border-purple-400/30 bg-zinc-950 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-white">{isEs ? 'Expedientes de seguridad AppSwinger' : 'AppSwinger security cases'}</h2>
          <button type="button" onClick={() => setCasesOpen(false)} aria-label="Close security cases" className="rounded-full bg-white/10 p-2 text-white"><X size={18}/></button>
        </div>
        <SecurityCasesPanel isEs={isEs}/>
      </div>
    </div>}
  </>;
}
