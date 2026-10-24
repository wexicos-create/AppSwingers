import React, { useState } from 'react';
import { X, Car, Clock, ShieldCheck, Navigation, MapPin } from 'lucide-react';

interface UberSafeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEs: boolean;
  onRequest: (origin: string, destination: string, uberFare: number) => void;
}

export function UberSafeModal({ isOpen, onClose, isEs, onRequest }: UberSafeModalProps) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [fare, setFare] = useState('');

  if (!isOpen) return null;

  const base = Number(fare) || 0;
  const serviceFee = Math.round(base * 0.2 * 100) / 100;
  const tax = Math.round((base + serviceFee) * 0.16 * 100) / 100;
  const total = Math.round((base + serviceFee + tax) * 100) / 100;
  const valid = origin.trim().length > 2 && destination.trim().length > 2 && base > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-[32px] bg-[#0d0618] border border-amber-400/40 p-5 shadow-[0_0_50px_rgba(245,158,11,0.3)] text-white space-y-4">

        <div className="flex items-start justify-between border-b border-amber-400/20 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                {isEs ? 'Uber Privado de Seguridad' : 'Private Safety Uber'}
              </span>
            </div>
            <h2 className="text-lg font-black text-white mt-1">
              {isEs ? 'Traslado Protegido a Nombre de la Empresa' : 'Company-Dispatched Protected Ride'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-[11px] text-amber-200 leading-relaxed flex items-start gap-2">
          <Clock className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {isEs
              ? 'Horario: de 9:00 PM a 12:00 AM. Escribe al perfil de Admin para coordinar; despachamos el Uber desde la cuenta de la empresa. Tú pagas el viaje a la plataforma y nosotros pagamos el Uber.'
              : 'Schedule: 9:00 PM to 12:00 AM. Message the Admin profile to coordinate; we dispatch the Uber from the company account. You pay the ride to the platform and we pay the Uber.'}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-white/70 font-bold block mb-1 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              {isEs ? '¿Dónde estás?' : 'Where are you?'}
            </label>
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder={isEs ? 'Calle, colonia o punto de referencia' : 'Street, neighborhood or landmark'}
              className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-purple-500/30 text-white text-sm focus:outline-none focus:border-amber-400"
            />
          </div>
          <div>
            <label className="text-[11px] text-white/70 font-bold block mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-pink-400" />
              {isEs ? '¿A dónde vas?' : 'Where are you going?'}
            </label>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={isEs ? 'Destino final' : 'Final destination'}
              className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-purple-500/30 text-white text-sm focus:outline-none focus:border-amber-400"
            />
          </div>
          <div>
            <label className="text-[11px] text-white/70 font-bold block mb-1">
              {isEs ? 'Tarifa estimada de Uber (MXN)' : 'Estimated Uber fare (MXN)'}
            </label>
            <input
              type="number"
              min="0"
              value={fare}
              onChange={(e) => setFare(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-purple-500/30 text-white text-sm focus:outline-none focus:border-amber-400"
            />
            <span className="text-[10px] text-white/40 block mt-1">
              {isEs ? 'Consulta la tarifa en tu app de Uber y captúrala aquí; calculamos el total con honorarios e IVA.' : 'Check the fare in your Uber app and enter it here; we compute the total with fees and tax.'}
            </span>
          </div>
        </div>

        {base > 0 && (
          <div className="p-3.5 rounded-2xl bg-black/50 border border-amber-400/25 space-y-1.5 text-xs">
            <div className="flex justify-between text-white/70"><span>{isEs ? 'Tarifa Uber' : 'Uber fare'}</span><span className="text-white font-bold">{'$' + base.toLocaleString()}</span></div>
            <div className="flex justify-between text-white/70"><span>{isEs ? 'Honorarios y servicio (20%)' : 'Service fee (20%)'}</span><span className="text-white font-bold">{'$' + serviceFee.toLocaleString()}</span></div>
            <div className="flex justify-between text-white/70"><span>IVA 16%</span><span className="text-white font-bold">{'$' + tax.toLocaleString()}</span></div>
            <div className="flex justify-between pt-1.5 border-t border-amber-400/20">
              <span className="font-black text-amber-300">{isEs ? 'Total a pagar a la plataforma' : 'Total payable to the platform'}</span>
              <span className="font-black text-amber-300">{'$' + total.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition">
            {isEs ? 'Cancelar' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={() => { onRequest(origin.trim(), destination.trim(), base); setOrigin(''); setDestination(''); setFare(''); }}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-pink-500 text-black text-xs font-black shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            {isEs ? 'Solicitar Uber Privado' : 'Request Private Uber'}
          </button>
        </div>

        <p className="text-[10px] text-white/40 leading-relaxed">
          {isEs
            ? 'La plataforma cobra el total (tarifa + 20% de honorarios + IVA) y paga el Uber desde la cuenta empresarial. Un administrador confirmará tu pago y despachará el viaje.'
            : 'The platform charges the total (fare + 20% service fee + tax) and pays the Uber from the company account. An administrator will confirm your payment and dispatch the ride.'}
        </p>
      </div>
    </div>
  );
}
