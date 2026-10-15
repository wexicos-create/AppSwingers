import React, { useState } from 'react';
import { X, ChevronRight, Shield, Lock, Scale, HeartHandshake } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: string | null;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTopic = null,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(initialTopic);

  if (!isOpen) return null;

  const topics = [
    {
      id: 'reglas',
      title: 'Reglas de la Comunidad',
      icon: HeartHandshake,
      intro: 'AppSwinguer es un espacio exclusivo para adultos que buscan encuentros liberales, casuales y consensuados. Todo se vale entre adultos que dicen sí; nada se vale sin consentimiento.',
      sections: [
        {
          title: 'Permitido',
          items: [
            'Perfiles de parejas, singles y grupos mayores de 18 años.',
            'Hablar abiertamente de tus gustos pasionales, fantasías y límites.',
            'Proponer encuentros swinger, tríos, gangbang, intercambios y fiestas privadas.',
            'Publicar contenido erótico propio en la sección de creadoras con consentimiento de todas las personas involucradas.',
          ]
        },
        {
          title: 'Estrictamente Prohibido',
          items: [
            'Cualquier persona menor de 18 años o material que lo aparente (reporte inmediato a autoridades).',
            'Difundir fotos, videos o datos íntimos de terceros sin su autorización.',
            'Acoso, insistencia tras una negativa o chantaje.',
            'Ofrecer o solicitar servicios sexuales remunerados fuera de las herramientas autorizadas de la app.',
            'Suplantación de identidad o perfiles falsos.',
          ]
        }
      ]
    },
    {
      id: 'terminos',
      title: 'Términos y Condiciones',
      icon: Scale,
      intro: 'Al utilizar AppSwinguer aceptas estos términos y condiciones. Si no estás de acuerdo, debes abandonar la aplicación.',
      sections: [
        {
          title: 'Naturaleza de la Plataforma',
          items: [
            'AppSwinguer es una plataforma tecnológica de contacto y comunidad. No organizamos ni participamos en los encuentros personales privados de los usuarios.',
            'No verificamos antecedentes penales ni estado de salud física. La insignia de verificación solo acredita identidad y mayoría de edad.',
          ]
        },
        {
          title: 'Pagos y Suscripciones',
          items: [
            'Todos los precios están expresados en pesos mexicanos con IVA incluido.',
            'Membresía Premium: $400 MXN cada 15 días con renovación voluntaria y cancelación instantánea.',
            'Suscripciones a creadoras: La creadora fija su precio y recibe el 85% neto del valor base.',
          ]
        }
      ]
    },
    {
      id: 'privacidad',
      title: 'Aviso de Privacidad y Derechos ARCO',
      icon: Lock,
      intro: 'Tus datos personales y sensibles son tratados bajo la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.',
      sections: [
        {
          title: 'Datos Sensibles y Finalidad',
          items: [
            'Tus gustos pasionales y preferencias sexuales se tratan únicamente con tu consentimiento expreso para conectarte con perfiles afines.',
            'Tu ubicación exacta nunca se revela a otros usuarios; solo se calcula una distancia aproximada.',
            'Tus fotos privadas o exclusivas para Match quedan bloqueadas hasta que ambas partes conectan.',
          ]
        },
        {
          title: 'Ejercicio de Derechos ARCO',
          items: [
            'Puedes solicitar acceso, rectificación, cancelación o supresión de tu cuenta y datos en cualquier momento desde tu Perfil o escribiendo al soporte de la plataforma.',
          ]
        }
      ]
    },
    {
      id: 'seguridad',
      title: 'Seguridad y Deslinde de Responsabilidad',
      icon: Shield,
      intro: 'Disfruta con libertad y responsabilidad. La seguridad de cada persona es lo más importante.',
      sections: [
        {
          title: 'Recomendaciones Prácticas',
          items: [
            'Acuerda siempre las reglas, límites y expectativas dentro del chat de la app antes de reunirte.',
            'Primera cita siempre en un lugar público concurrido.',
            'En perfiles de pareja, ambas personas deben manifestar su consentimiento activo.',
            'Usa protección y cuida tu salud en todo momento.',
          ]
        },
        {
          title: 'Deslinde de Responsabilidad',
          items: [
            'Cualquier acuerdo o situación ocurrida fuera de los canales oficiales de la plataforma es responsabilidad exclusiva de las partes participantes.',
          ]
        }
      ]
    }
  ];

  const activeTopicData = topics.find(t => t.id === selectedTopic);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl">
      <div className="w-full max-w-md h-[88vh] rounded-[36px] bg-[#120822] border border-purple-500/40 flex flex-col overflow-hidden shadow-2xl text-white">
        
        {/* Header */}
        <div className="p-4 border-b border-purple-500/20 flex items-center justify-between bg-neutral-950/70">
          <div>
            <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider block">Marco Legal y de Confianza</span>
            <h3 className="text-lg font-black text-white">
              {activeTopicData ? activeTopicData.title : 'Legal, Privacidad y Seguridad'}
            </h3>
          </div>
          <button
            onClick={() => {
              if (selectedTopic) setSelectedTopic(null);
              else onClose();
            }}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTopicData ? (
            <div className="space-y-4">
              <p className="text-xs text-purple-200/90 leading-relaxed bg-white/5 p-3.5 rounded-2xl border border-white/5">
                {activeTopicData.intro}
              </p>

              {activeTopicData.sections.map((sec, i) => (
                <div key={i} className="space-y-2">
                  <h4 className="text-xs font-bold text-pink-300 uppercase tracking-wider">
                    {sec.title}
                  </h4>
                  <ul className="space-y-1.5 pl-3 border-l border-purple-500/30">
                    {sec.items.map((item, j) => (
                      <li key={j} className="text-xs text-neutral-300 leading-relaxed list-disc list-inside">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <button
                onClick={() => setSelectedTopic(null)}
                className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold text-purple-200 mt-4 transition"
              >
                &larr; Volver a todos los documentos
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {topics.map((t) => {
                const Icon = t.icon;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTopic(t.id)}
                    className="p-4 rounded-2xl bg-neutral-900/70 border border-purple-500/20 hover:bg-purple-950/40 flex items-center justify-between cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-950 flex items-center justify-center text-pink-400 group-hover:scale-105 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{t.title}</h4>
                        <p className="text-[10px] text-white/50 truncate max-w-[220px]">{t.intro}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-pink-400 group-hover:translate-x-0.5 transition" />
                  </div>
                );
              })}

              <div className="text-center pt-4">
                <span className="text-[10px] text-white/40">
                  Última actualización: 14 de octubre de 2026 &bull; México
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
