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
    },
    {
      id: 'datos',
      title: 'Uso de Datos Personales',
      icon: Lock,
      intro: 'Solicitamos solo los datos necesarios para operar la cuenta, ofrecer funciones elegidas por la persona usuaria, prevenir abusos y cumplir obligaciones legales.',
      sections: [
        { title: 'Qué datos y para qué', items: [
          'Datos de cuenta y contacto para iniciar sesión, mantener la cuenta y enviar avisos transaccionales.',
          'Preferencias, afinidades, reportes y ubicación aproximada para las funciones que decidas utilizar. Los datos sobre vida sexual pueden ser sensibles y requieren protección reforzada.',
          'Datos técnicos y registros de seguridad para detectar accesos indebidos, fraude, spam o abuso. No se debe interpretar la dirección IP como prueba única de identidad.',
        ] },
        { title: 'Control y conservación', items: [
          'No publiques contraseñas, documentos oficiales ni información bancaria en perfiles, chats públicos o reportes abiertos.',
          'El acceso a datos personales se limita por función y necesidad. Los documentos de identidad y archivos fiscales, cuando se integren, deberán almacenarse en sistemas privados.',
          'Puedes solicitar acceso, rectificación, cancelación u oposición y preguntar por conservación y eliminación desde soporte. Algunas constancias pueden conservarse cuando lo exija la ley.',
          'No prometemos que un dato jamás será compartido: cualquier transferencia necesaria deberá explicarse en el aviso de privacidad aplicable.',
        ] }
      ]
    },
    {
      id: 'recomendaciones',
      title: 'Avisos y Recomendaciones de Seguridad',
      icon: Shield,
      intro: 'Estas medidas reducen riesgos, pero no garantizan que otro usuario, una agencia o un evento sean seguros.',
      sections: [
        { title: 'Antes de reunirte', items: [
          'Habla de límites y consentimiento antes del encuentro; cualquier persona puede cambiar de opinión y detener la actividad.',
          'Para la primera reunión, elige un lugar público y avisa a alguien de confianza. Organiza tu propio transporte y evita compartir tu domicilio al principio.',
          'No envíes dinero, códigos de acceso, documentos de identidad ni contenido íntimo a alguien que ejerza presión o prometa verificaciones fuera de la app.',
          'Comprueba los detalles del evento y las condiciones de reembolso directamente con el organizador.',
        ] },
        { title: 'Si algo sale mal', items: [
          'Usa reportar y bloquear, conserva evidencia relevante sin redistribuir contenido íntimo y contacta a las autoridades si existe peligro inmediato.',
          'La insignia de verificación no garantiza antecedentes, comportamiento, consentimiento futuro ni seguridad presencial.',
        ] }
      ]
    },
    {
      id: 'estafas',
      title: 'Reportar Estafas y Bloquear Usuarios',
      icon: Shield,
      intro: 'Los reportes deben revisarse con discreción y sin represalias. Nunca compartas contraseñas o códigos de verificación con otro usuario ni con alguien que se haga pasar por soporte.',
      sections: [
        { title: 'Señales de posible estafa', items: [
          'Petición urgente de dinero, depósitos fuera de los canales anunciados, comprobantes alterados o promesas de beneficios pagados sin confirmación bancaria.',
          'Perfiles que piden salir de la plataforma de inmediato, envían enlaces extraños, amenazan con publicar imágenes o solicitan códigos de un solo uso.',
          'Suplantación, fotografías que se atribuyen falsamente a otra persona, extorsión, coacción o intento de contactar a menores.',
        ] },
        { title: 'Cómo actuar', items: [
          'Abre el perfil o conversación y usa la función Reportar cuando esté disponible; indica el motivo y adjunta solo evidencia necesaria.',
          'Bloquear limita el contacto desde la cuenta bloqueada cuando el servicio está conectado y la función está disponible. No impide que esa persona cree otra cuenta o contacte por otros medios.',
          'Un reporte no significa que exista una infracción confirmada. La plataforma puede revisar, limitar o suspender cuentas conforme a sus reglas y los resultados de la investigación.',
        ] }
      ]
    },
    {
      id: 'creadoras',
      title: 'Políticas para Creadoras de Contenido',
      icon: HeartHandshake,
      intro: 'La monetización está sujeta a verificación de mayoría de edad e identidad, consentimiento, derechos de autor, políticas de proveedores y habilitación real de los pagos.',
      sections: [
        { title: 'Requisitos de publicación', items: [
          'Solo personas adultas pueden crear y monetizar contenido. Toda persona identificable que aparezca debe ser adulta y haber otorgado consentimiento informado para la creación y publicación.',
          'No se permite contenido íntimo no consentido, explotación, coacción, suplantación, menores o contenido que represente o parezca involucrar menores.',
          'Solo sube material propio o que tengas derecho documentado a distribuir. No uses imágenes falsas para suplantar a otra persona ni presentes contenido generado o alterado por IA como una captura real de una persona sin informar de ello.',
          'La plataforma puede retirar publicaciones denunciadas, pedir información adicional y suspender temporalmente pagos mientras investiga señales razonables de fraude.',
        ] },
        { title: 'Pagos y obligaciones', items: [
          'Los ingresos deben proceder de ventas y transacciones reales registradas por el servidor. No se aceptan saldos creados por capturas, autodeclaraciones o modificaciones del cliente.',
          'Retiros sujetos a revisión de identidad, titularidad de cuenta y documentación fiscal/bancaria estrictamente necesaria y protegida.',
          'Las comisiones, impuestos, retenciones, plazos, reembolsos y requisitos fiscales deberán mostrarse con claridad antes de operar y se determinarán conforme al contrato y la normativa aplicable.',
          'No se garantiza un ingreso mínimo ni una aprobación automática de cualquier publicación o retiro.',
        ] }
      ]
    },
    {
      id: 'agencias',
      title: 'Políticas para Agencias, Eventos y Promoción',
      icon: Scale,
      intro: 'Las agencias, anfitriones y anunciantes responden por la veracidad de sus ofertas, permisos y condiciones comerciales.',
      sections: [
        { title: 'Registro y transparencia', items: [
          'Proporciona datos reales de contacto y acredita autorización para representar al negocio, recinto o evento cuando se solicite.',
          'Describe lugar, fecha, precio total, aforo, restricciones, reglas de cancelación y si el cobro es individual o por pareja antes de aceptar una reserva.',
          'No prometas asistentes, resultados, verificaciones o protección absoluta; etiqueta el contenido patrocinado y revela comisiones o cargos relevantes.',
        ] },
        { title: 'Seguridad y cumplimiento', items: [
          'Todos los participantes deben ser mayores de edad y consentir libremente. No se permite trata, coacción, explotación, discriminación ilícita ni actividad ilegal.',
          'No publiques fotos, videos o datos de asistentes sin autorización específica; no reutilices listas de invitados para publicidad sin base válida y aviso.',
          'La promoción pagada no equivale a respaldo oficial ni a garantía de seguridad. La plataforma puede pausar anuncios o eventos ante denuncias creíbles, datos falsos o incumplimiento de la ley.',
          'Los pagos y reembolsos se tramitan según las condiciones visibles y el estado real de la transacción; un comprobante enviado por el usuario no demuestra por sí solo que los fondos se hayan abonado.',
        ] }
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
