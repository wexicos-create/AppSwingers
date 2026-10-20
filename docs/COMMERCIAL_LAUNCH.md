# AppSwinger — plan comercial y de producto

## Posicionamiento

AppSwinger es una comunidad 18+ para citas, conexiones consensuadas, reuniones y eventos presenciales. Su propuesta es facilitar conexiones humanas reales mediante perfiles, compatibilidad, mensajería, anfitriones y eventos; no promete encuentros, respuestas, asistencia ni resultados. El producto no debe presentarse como sustituto garantizado de servicios, terapia o relaciones personales.

## Experiencia de producto

1. **Descubrir:** perfiles con preferencias, distancia opcional, intereses, disponibilidad y controles de privacidad.
2. **Conectar:** likes mutuos, coincidencias, chat sujeto a controles antiacoso, bloqueo y reporte.
3. **Organizar:** eventos con fecha, zona aproximada, aforo, precio, reglas de acceso, anfitrión y política de cancelación.
4. **Asistir con seguridad:** reserva con estado verificable, instrucciones compartidas solo con asistentes confirmados y canal de reporte.
5. **Comunidad:** publicaciones moderadas, propuestas y actividades sociales; no depender de contenido explícito para retener a los miembros.
6. **Privacidad:** edad mínima de 18 años, consentimiento explícito, eliminación de cuenta/datos, controles de visibilidad y minimización de datos sensibles.

## Modelo comercial propuesto para México

Precios de referencia en MXN, sujetos a validación fiscal, pasarela y configuración del servidor. La interfaz no debe activar beneficios por el mero envío de un comprobante.

| Nivel | Precio de lanzamiento propuesto | Precio de referencia | Beneficios previstos |
|---|---:|---:|---|
| Gratis | $0 | $0 | Perfil, descubrimiento básico, consulta de eventos, controles de seguridad y comunidad moderada |
| VIP Plus | $406 / 10 días | $479 / 10 días | Filtros avanzados, hasta 15 postulaciones semanales y prioridad de descubrimiento limitada |
| Ultra VIP | $754 / 20 días | $899 / 20 días | Postulaciones ilimitadas durante la vigencia, filtros ampliados y modo discreto |

**Promoción:** limitar la tarifa de lanzamiento a una ventana definida y/o a los primeros miembros elegibles. Configurar inicio, fin, cupos y precio final en el servidor; mostrar el precio total con impuestos antes de confirmar; evitar temporizadores falsos y no llamar “descuento activo” a una oferta que no esté configurada en backend. Los precios de USD son referencias comerciales y no deben tratarse como conversión en tiempo real.

### Ingresos complementarios

- Publicación de evento para anfitriones: $1,500 MXN + IVA, sujeto a aprobación.
- Campaña destacada: $2,500 MXN + IVA, etiquetada como publicidad.
- Impulso de perfil: $300 MXN + IVA por 15 días, sin promesa de coincidencias.
- Boletos de evento: precio definido por anfitrión, visible antes de reservar; separar tarifa individual y por pareja y detallar descuentos.
- Herramientas para anfitriones: venta solo cuando las funciones y controles de moderación estén operativos.

Los precios actuales que aparecen en la interfaz son una propuesta comercial, no prueba de que la pasarela, los impuestos o el backend estén desplegados.

## Seguridad y confianza — requisitos de lanzamiento

- Acceso solo para mayores de 18 años; definir verificación proporcional y proceso de apelación.
- Prohibición de explotación, coerción, suplantación, acoso, contenido íntimo no consentido y cualquier contenido que involucre menores.
- Consentimiento libre, informado, específico y revocable; la membresía no otorga consentimiento ni garantiza acceso a otra persona.
- Bloquear/reportar desde perfiles, chat, comunidad y eventos; cola de moderación con registro de decisiones.
- Ubicación aproximada por defecto; nunca exponer coordenadas precisas ni domicilios privados públicamente.
- Verificación de anfitriones, aforo, reglas del evento, cancelaciones, reembolsos y contacto de emergencia.
- Pagos: órdenes creadas en servidor, importes calculados en servidor, idempotencia, webhook/conciliación real, auditoría y activación únicamente después de confirmar el abono. Una clave de rastreo o captura no acredita por sí sola un pago.
- Aviso de privacidad, términos, reglas comunitarias, retención/borrado de datos y cumplimiento de la legislación aplicable en México y de las condiciones del proveedor de pagos.

## Estado técnico y criterios de aceptación

La rama de trabajo cambia el tema visual a gris carbón y verde neón y presenta precios promocionales. Esto **no certifica** el producto como listo para producción.

Antes de anunciar “totalmente funcional”, comprobar en entorno real:
1. Instalación limpia de dependencias, revisión TypeScript y build de producción sin errores.
2. Firebase Auth, reglas de Firestore y autorización de cada función del servidor.
3. Creación de orden SPEI, reporte de rastreo, conciliación del depósito y expiración/rechazo sin activar beneficios por error.
4. Vigencia automática de membresías en servidor, zona horaria y renovaciones/cancelaciones.
5. Reservas y cupos atómicos para evitar sobreventa; cancelaciones y reembolsos.
6. Bloqueo, reportes, moderación, eliminación de cuenta y privacidad de ubicación.
7. Pruebas móviles Android 10–15: Edge-to-Edge, WindowInsets, cámara/notch, barra de gestos, scroll y teclado.
8. Sin datos ficticios en producción; los perfiles de demostración deben quedar claramente identificados o deshabilitados.
9. Build Android reproducible, firma de release, prueba de instalación y descarga pública del APK sin exponer el repositorio privado.
10. Revisión legal, fiscal y del proveedor de pagos para el modelo 18+.

## Métricas iniciales

Medir activación de perfil, perfiles completados, conexiones mutuas, conversaciones recíprocas, reservas completadas, asistencia real, tasa de reportes, tiempo de moderación, conversión a pago, reembolsos y renovación. No optimizar ingresos a costa de seguridad, consentimiento o privacidad.
