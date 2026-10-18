import React, { useState } from 'react';
import { AppRegion, CollaborationProposal, ProfileKind } from '../types';
import { 
  X, 
  ShieldCheck, 
  Upload, 
  Check, 
  AlertCircle, 
  Flame, 
  FileText,
  DollarSign,
  Camera,
  CheckCircle2,
  Lock,
  Sparkles,
  Heart,
  Users,
  Eye,
  FileCheck2,
  Calendar,
  MapPin
} from 'lucide-react';

interface CollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userKind: ProfileKind;
  userName: string;
  region: AppRegion;
  onSwitchProfileKind?: (kind: ProfileKind) => void;
  onSubmitProposal: (proposal: Omit<CollaborationProposal, 'id' | 'createdAt' | 'status' | 'paid'>) => void | Promise<void>;
}

export const CollaborationModal: React.FC<CollaborationModalProps> = ({
  isOpen,
  onClose,
  userKind,
  userName,
  region,
  onSwitchProfileKind,
  onSubmitProposal,
}) => {
  // Requirement: Postulante must be a Woman ('Dama') or Couple ('Pareja')
  const isEligible = userKind === 'Dama' || userKind === 'Pareja';

  const feeAmount = 500;
  const currencyString = '$500 MXN';

  // Stepper state
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form state according to points scheme
  const [eventType, setEventType] = useState<'Swinger' | 'GangBang' | 'Trío MHM' | 'Fiesta Privada VIP'>('Swinger');
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('San Luis Potosí');
  const [stateName, setStateName] = useState('San Luis Potosí');
  const mexicanStates = ['Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua','Ciudad de México','Coahuila','Colima','Durango','Estado de México','Guanajuato','Guerrero','Hidalgo','Jalisco','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro','Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala','Veracruz','Yucatán','Zacatecas'];
  const [date, setDate] = useState('Próximo sábado');
  const [time, setTime] = useState('21:00 hrs');
  
  // Ratio & Capacity
  const [capacity, setCapacity] = useState(14);
  const [attendeeRatio, setAttendeeRatio] = useState('4 Parejas MF, 2 Damas solas, 2 Caballeros selectos con entrevista');
  const [dressCode, setDressCode] = useState('Elegante / Lencería fina & Antifaz temático');

  // Consent & Rules
  const [consentRules, setConsentRules] = useState(
    'Regla de Oro: "No es No" en el primer segundo. Consentimiento verbal y explícito. Cero tolerancia al acoso o insistencia.'
  );
  const [venueZones, setVenueZones] = useState(
    'Área social con coctelería de bienvenida, 2 Playrooms temáticos equipados y Zona Chillout de descanso libre de contacto.'
  );

  // Health & Safety
  const [healthProtocols, setHealthProtocols] = useState(
    'Uso de preservativos 100% obligatorio. Pruebas de salud recientes (máx 3 meses). Toallas sanitizadas y gel antibacterial en cada estación.'
  );
  const [admissionFilter, setAdmissionFilter] = useState(
    'Videollamada previa obligatoria de 10 minutos con la anfitriona para validar química, identidad y aceptación del reglamento.'
  );

  // Hostess & ID Verification data
  const [hostessFullName, setHostessFullName] = useState(userName || '');
  const [hostessContact, setHostessContact] = useState('');
  const [ineFrontPreview, setIneFrontPreview] = useState<string | null>(null);
  const [ineBackPreview, setIneBackPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successSubmitted, setSuccessSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEligible || !title.trim() || !city.trim() || !acceptedTerms) return;
    setIsSubmitting(true);
    try {
      await onSubmitProposal({
        title: title.trim(),
        eventType,
        organizerType: userKind === 'Pareja' ? 'Pareja' : 'Mujer',
        organizerName: hostessFullName || userName || 'Anfitriona',
        region: 'MX',
        state: stateName,
        feeAmount,
        city: city.trim(),
        consentRules: consentRules + ' | Ambientes: ' + venueZones,
        attendeeRatio: attendeeRatio + ' | Vestimenta: ' + dressCode,
        capacity,
        healthProtocols: healthProtocols.trim(),
        admissionFilter: admissionFilter + ' | Contacto: ' + hostessContact,
      });
      setSuccessSubmitted(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo enviar la propuesta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-2xl overflow-y-auto">
      <div className="w-full max-w-lg my-auto max-h-[92vh] overflow-y-auto rounded-[36px] bg-[#10061e] border border-purple-500/40 p-5 sm:p-6 shadow-[0_0_60px_rgba(177,76,255,0.3)] text-white space-y-4 scrollbar-none relative">
        
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-purple-500/20 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-pink-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-300">
                Colaboración Swinger / GangBang · México
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              Propuesta Oficial de Evento
            </h2>
            <p className="text-xs text-purple-200/70 mt-0.5">
              Esquema ordenado con reglas claras, consentimiento y auditoría de seguridad
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Requisito Estricto: Postulante debe ser Mujer o Pareja */}
        {!isEligible ? (
          <div className="p-4 rounded-3xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 space-y-3">
            <div className="flex items-center gap-2 font-bold text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Requisito Indispensable: Mujer o Pareja</span>
            </div>
            <p className="leading-relaxed">
              Por políticas estrictas de seguridad, equilibrio y consentimiento en AppSwinguer Ultra Plus, 
              las propuestas de eventos Swinger o GangBang <strong>únicamente pueden ser postuladas por mujeres o parejas</strong> que actúan como anfitrionas responsables del evento.
            </p>
            <p className="text-[11px] text-white/70">
              Tu perfil actual está configurado como &ldquo;{userKind}&rdquo;. Si eres una pareja o una dama anfitriona, puedes alternar tu perfil aquí para continuar:
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => onSwitchProfileKind?.('Pareja')}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md"
              >
                <Users className="w-4 h-4" />
                Cambiar a Perfil Pareja
              </button>
              <button
                type="button"
                onClick={() => onSwitchProfileKind?.('Dama')}
                className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md"
              >
                <Heart className="w-4 h-4" />
                Cambiar a Perfil Dama
              </button>
            </div>
          </div>
        ) : successSubmitted ? (
          /* Confirmation Screen after submitting */
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white">¡Propuesta enviada con éxito!</h3>
            <p className="text-xs text-purple-200/80 max-w-sm mx-auto leading-relaxed">
              Tu propuesta &ldquo;{title}&rdquo; ha sido registrada con el folio <strong className="text-pink-400">PROP-{region === 'MX' ? 'SLP' : 'USA'}-{Math.floor(1000 + Math.random() * 9000)}</strong>.
              El equipo de auditoría legal en {region === 'MX' ? 'San Luis Potosí' : 'USA'} revisará los documentos INE y los protocolos de consentimiento.
            </p>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/70 max-w-xs mx-auto">
              Tarifa de revisión cubierta: <strong className="text-emerald-400">{currencyString}</strong>
            </div>
            <button
              onClick={onClose}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-xs shadow-lg active:scale-95 transition"
            >
              Entendido y Volver
            </button>
          </div>
        ) : (
          /* Structured Form with Clear Schema Points */
          <form onSubmit={handleCompleteSubmission} className="space-y-4 text-xs">
            
            {/* Banner de Precio de Revisión Dinámico ($350 MXN o $80 USD) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/80 via-pink-950/80 to-purple-950/80 border border-pink-500/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-pink-300 block">
                  Tarifa de Revisión y Validación Oficial
                </span>
                <span className="text-xs text-white/80">
                  {region === 'MX' ? 'Revisión por comité en San Luis Potosí, SLP' : 'Compliance & safety review fee in the US'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-pink-400">
                  {currencyString}
                </span>
                <span className="text-[10px] text-white/50 block">Auditoría obligatoria</span>
              </div>
            </div>

            {/* Stepper Navigation Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { step: 1, label: '1. Formato' },
                { step: 2, label: '2. Aforo & Ratio' },
                { step: 3, label: '3. Reglas & Consentimiento' },
                { step: 4, label: '4. Salud & Filtro' },
                { step: 5, label: '5. Verificación INE' },
              ].map((s) => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setCurrentStep(s.step)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition text-[11px] ${
                    currentStep === s.step
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* STEP 1: TIPO Y LOGÍSTICA DEL EVENTO */}
            {currentStep === 1 && (
              <div className="space-y-3.5 p-4 rounded-3xl bg-neutral-900/60 border border-purple-500/25">
                <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
                  <Flame className="w-4 h-4" />
                  <span>Punto 1: Tipo y Logística del Evento</span>
                </div>

                <div>
                  <label className="text-white/80 font-semibold block mb-1">Tipo de Evento:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'Swinger', name: 'Swinger Parejas', desc: 'Intercambio consensuado' },
                      { id: 'GangBang', name: 'GangBang Selectivo', desc: 'Atención exclusiva & filtro' },
                      { id: 'Trío MHM', name: 'Trío MHM / MFM', desc: 'Encuentro íntimo' },
                      { id: 'Fiesta Privada VIP', name: 'Mansión Party VIP', desc: 'Aforo amplio & social' },
                    ].map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setEventType(t.id as any)}
                        className={`p-2.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                          eventType === t.id
                            ? 'bg-purple-900/50 border-pink-500 text-white shadow-md'
                            : 'bg-neutral-950/60 border-white/10 text-white/70 hover:border-white/20'
                        }`}
                      >
                        <span className="font-bold text-xs text-white">{t.name}</span>
                        <span className="text-[10px] text-purple-200/60 mt-0.5">{t.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-white/80 font-semibold block mb-1">Título de la Propuesta:</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Noche Secreta de Antifaz & Cóctel VIP en SLP"
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-purple-500/30 text-white text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-white/80 font-semibold block mb-1">Ciudad o Zona:</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={region === 'MX' ? 'San Luis Potosí, SLP' : 'Miami / Houston'}
                      className="w-full p-2.5 rounded-xl bg-neutral-950 border border-purple-500/30 text-white text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-white/80 font-semibold block mb-1">Fecha tentativa:</label>
                    <input
                      type="text"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      placeholder="Próximo fin de semana"
                      className="w-full p-2.5 rounded-xl bg-neutral-950 border border-purple-500/30 text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs"
                  >
                    Siguiente: Aforo & Ratio &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: AFORO Y PROPORCIÓN (RATIO) */}
            {currentStep === 2 && (
              <div className="space-y-3.5 p-4 rounded-3xl bg-neutral-900/60 border border-purple-500/25">
                <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
                  <Users className="w-4 h-4" />
                  <span>Punto 2: Aforo, Ratio & Código de Vestimenta</span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-white/80 font-semibold">Aforo Máximo Permitido:</label>
                    <span className="font-bold text-pink-400">{capacity} personas</span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="40"
                    step="2"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-white/50">
                    Mantener aforos reducidos garantiza mayor confort, privacidad y control de accesos.
                  </span>
                </div>

                <div>
                  <label className="text-white/80 font-semibold block mb-1">Proporción de Asistentes (Ratio):</label>
                  <input
                    type="text"
                    value={attendeeRatio}
                    onChange={(e) => setAttendeeRatio(e.target.value)}
                    placeholder="Ej. 4 Parejas MF, 2 Damas solas, cupo limitado a 2 Caballeros selectos"
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-purple-500/30 text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/80 font-semibold block mb-1">Código de Vestimenta (Dress Code):</label>
                  <input
                    type="text"
                    value={dressCode}
                    onChange={(e) => setDressCode(e.target.value)}
                    placeholder="Ej. Elegante, Antifaz veneciano, Lencería o Fetish chic"
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-purple-500/30 text-white text-xs focus:outline-none"
                  />
                </div>

                <div className="flex justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-3 py-2 rounded-xl bg-white/10 text-white/80 font-semibold text-xs"
                  >
                    &larr; Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs"
                  >
                    Siguiente: Consentimiento &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PROTOCOLO DE CONSENTIMIENTO Y REGLAS */}
            {currentStep === 3 && (
              <div className="space-y-3.5 p-4 rounded-3xl bg-neutral-900/60 border border-purple-500/25">
                <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Punto 3: Reglas Claras & Consentimiento Activo</span>
                </div>

                <div>
                  <label className="text-white/80 font-semibold block mb-1">
                    Regla de Oro y Protocolo de Consentimiento:
                  </label>
                  <textarea
                    rows={3}
                    value={consentRules}
                    onChange={(e) => setConsentRules(e.target.value)}
                    placeholder="Describe las normas de respeto mutuo, no insistencia y consentimiento explícito..."
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-purple-500/30 text-white text-xs focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-white/80 font-semibold block mb-1">
                    División de Zonas del Inmueble / Venue:
                  </label>
                  <textarea
                    rows={2}
                    value={venueZones}
                    onChange={(e) => setVenueZones(e.target.value)}
                    placeholder="Ej. Zona Social de cóctel, Playrooms privados y Zona Chillout libre de contacto sexual..."
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-purple-500/30 text-white text-xs focus:outline-none resize-none"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-[11px] text-purple-200">
                  <p><strong>Seguridad y Monitoreo:</strong> Habrá una anfitriona responsable y monitoreo femenino para auxiliar inmediatamente si alguien se siente incómodo.</p>
                </div>

                <div className="flex justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-3 py-2 rounded-xl bg-white/10 text-white/80 font-semibold text-xs"
                  >
                    &larr; Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs"
                  >
                    Siguiente: Salud & Filtro &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: SALUD E HIGIENE & FILTRO DE ADMISIÓN */}
            {currentStep === 4 && (
              <div className="space-y-3.5 p-4 rounded-3xl bg-neutral-900/60 border border-purple-500/25">
                <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
                  <FileText className="w-4 h-4" />
                  <span>Punto 4: Protocolos de Salud & Filtro de Admisión</span>
                </div>

                <div>
                  <label className="text-white/80 font-semibold block mb-1">Protocolos de Salud e Higiene:</label>
                  <textarea
                    rows={2}
                    value={healthProtocols}
                    onChange={(e) => setHealthProtocols(e.target.value)}
                    placeholder="Preservativos obligatorios, pruebas ETS recientes, toallas desinfectadas..."
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-purple-500/30 text-white text-xs focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-white/80 font-semibold block mb-1">Filtro de Admisión de Asistentes:</label>
                  <textarea
                    rows={2}
                    value={admissionFilter}
                    onChange={(e) => setAdmissionFilter(e.target.value)}
                    placeholder="Videollamada previa de 10 minutos con la anfitriona para validar química y respeto a las reglas..."
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-purple-500/30 text-white text-xs focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-white/80 font-semibold block mb-1">Contacto seguro de la Anfitriona (WhatsApp o Telegram):</label>
                  <input
                    type="text"
                    value={hostessContact}
                    onChange={(e) => setHostessContact(e.target.value)}
                    placeholder="@telegram o WhatsApp para coordinación confidencial"
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-purple-500/30 text-white text-xs focus:outline-none"
                  />
                </div>

                <div className="flex justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-3 py-2 rounded-xl bg-white/10 text-white/80 font-semibold text-xs"
                  >
                    &larr; Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(5)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs"
                  >
                    Siguiente: Verificación INE &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: VERIFICACIÓN INE Y FOTO OBLIGATORIA */}
            {currentStep === 5 && (
              <div className="space-y-3.5 p-4 rounded-3xl bg-neutral-900/60 border border-purple-500/25">
                <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
                  <Camera className="w-4 h-4" />
                  <span>Punto 5: Verificación de Identidad Oficial (INE y Selfie)</span>
                </div>

                <div>
                  <label className="text-white/80 font-semibold block mb-1">Nombre completo de la Anfitriona Responsable:</label>
                  <input
                    type="text"
                    required
                    value={hostessFullName}
                    onChange={(e) => setHostessFullName(e.target.value)}
                    placeholder="Tal como figura en el documento oficial"
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-purple-500/30 text-white text-xs focus:outline-none"
                  />
                </div>

                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs leading-relaxed text-purple-100">
                  No vuelvas a subir tu INE aquí. Primero verifica tu identidad desde Perfil con Didit (INE/documento mexicano, prueba de vida y comparación facial). El servidor no aceptará propuestas sin estado verificado.
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className="text-xs text-white/75">Estado<select required value={stateName} onChange={e => setStateName(e.target.value)} className="mt-1 w-full rounded-xl bg-neutral-950 border border-purple-500/30 p-2.5 text-white">{mexicanStates.map(state => <option key={state} value={state}>{state}</option>)}</select></label>
                  <label className="text-xs text-white/75">Ciudad o municipio<input required value={city} onChange={e => setCity(e.target.value)} placeholder="Ciudad o municipio" className="mt-1 w-full rounded-xl bg-neutral-950 border border-purple-500/30 p-2.5 text-white" /></label>
                </div>
                {/* Terminos y condiciones de auditoria */}
                <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-neutral-950/60 border border-purple-500/20 cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 rounded accent-pink-500"
                  />
                  <span className="text-[11px] text-white/80 leading-snug">
                    Confirmo que soy mujer o parte de una pareja responsable, que los datos son verídicos y acepto la auditoría legal de {currencyString} para la revisión y publicación oficial del evento en San Luis Potosí o USA.
                  </span>
                </label>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="px-3 py-2 rounded-xl bg-white/10 text-white/80 font-semibold text-xs"
                  >
                    &larr; Anterior
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim() || !acceptedTerms}
                    className="py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-extrabold text-xs shadow-xl shadow-purple-600/40 hover:brightness-110 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    {isSubmitting ? 'Procesando propuesta...' : `Enviar propuesta y pagar revisión ${currencyString}`}
                  </button>
                </div>
              </div>
            )}

          </form>
        )}

      </div>
    </div>
  );
};
