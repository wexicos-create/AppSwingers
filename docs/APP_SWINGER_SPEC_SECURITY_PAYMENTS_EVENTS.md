# AppSwinger — especificación de seguridad, pagos y eventos (México)

**Estado:** documento de diseño, no prueba de implementación ni dictamen jurídico/fiscal. No anunciar como funcional una capacidad hasta construirla, probarla y contratar los proveedores necesarios.

## 1. Producto y diseño
AppSwinger será una comunidad 18+ para citas, perfiles individuales y de parejas, creadoras de contenido y eventos presenciales. Diseño: negro carbón, degradados lila/morado neón y texto blanco, accesible y adaptable a Android 10–15. Sin precios sorpresa, patrones oscuros ni promesas de encuentros garantizados. Seguridad, bloqueo, reporte y soporte nunca se condicionan a una suscripción.

## 2. Roles y permisos
- Miembro individual mujer/hombre; perfil, intereses, conexiones y chat sujeto a consentimiento.
- Pareja: cada integrante verifica su propia identidad y edad y da consentimiento independiente.
- Creador/a o pareja creadora: contenido, precios, donaciones y funciones pagadas opcionales.
- Organizador/agencia: alta comercial, documentos fiscales/bancarios y aprobación humana.
- Moderación, soporte, finanzas, seguridad y superadministración con permisos separados.
Aplicar mínimo privilegio, MFA fuerte, sesiones administrativas limitadas, auditoría inmutable y doble aprobación para operaciones de riesgo. Finanzas no necesita ver INE; moderación no puede alterar pagos.

## 3. Verificación +18 e identidad
1. Registro con confirmación de correo/teléfono y términos/privacidad versionados.
2. Proveedor especializado que admita INE mexicana, detección de vida (liveness) y captura guiada desde cámara activa.
3. Flujo guiado para frente y reverso de INE física y selfie en vivo sosteniendo la INE. No aceptar archivos de galería en este flujo. Mostrar imagen de ejemplo con rótulo “ilustración, no documento válido”.
4. Comprobar coherencia documental/OCR, vigencia, indicios de pantalla o impresión, liveness, duplicidad y comparación facial. Metadatos/EXIF son solo una señal secundaria: pueden borrarse o falsificarse y no prueban autenticidad.
5. Estados: aprobado, reintento, revisión manual o rechazo. Discrepancias, baja confianza y posibles falsificaciones van a cola humana. No prometer detección infalible ni suspender solo por una puntuación de IA.
6. Guardar preferentemente el token/resultado del proveedor, no imágenes de INE. Si conservarlas fuera imprescindible, cifrar, restringir acceso, definir retención y borrado automático, registrar cada consulta y excluirlas de logs, analítica, CDN y repositorios.
7. INE, rostros y plantillas biométricas son datos de alto riesgo. Antes de activar el flujo, asesoría jurídica mexicana debe revisar base legal, consentimiento expreso cuando proceda, aviso integral/simplificado, proveedores/transferencias, derechos ARCO, retención, seguridad, incidentes y evaluación de impacto. Separar consentimiento de identidad y marketing. El perfil público nunca muestra nombre legal ni INE.

No construir un “enjambre de bots” como garantía de autenticidad. Usar un pipeline versionado de señales independientes, controles de falsos positivos, proveedor especializado y revisión humana. No identificar a terceros ni rastrear rostros por toda la plataforma.

## 4. Protección reforzada y convivencia
- Perfil/medios privados por defecto; ubicación aproximada opcional, nunca domicilio o coordenadas en vivo por defecto.
- Bloqueo bilateral inmediato: impedir mensajes, llamadas, invitaciones y aparición en búsquedas, preservando solo evidencia mínima necesaria para seguridad.
- Reportar desde perfil, mensaje, llamada, contenido, evento o pago: acoso, amenaza, extorsión, suplantación, difusión íntima no consentida, fraude, violencia, menores y spam.
- Límites de mensajes sin match, invitaciones, enlaces y acciones repetitivas; detección de spam y reincidencia.
- Revisión contextual, sanción proporcional y apelación. No sancionar automáticamente a quien reporta ni tomar el número de reportes como prueba definitiva.
- Consejos para primera cita, check-in voluntario y compartir plan con persona de confianza; aclarar que no es servicio de emergencia.
- Prohibir amenazas, chantaje, doxxing, acoso persistente, contenido íntimo no consentido, explotación, trata y contenido/interacciones sexuales con menores; suspender y escalar según protocolo legal.
- La verificación no garantiza sinceridad ni seguridad física de otros usuarios.

## 5. Onboarding práctico
Tarjetas de selección rápida y omisibles: tipo de conexión, intereses, actividades, disponibilidad, distancia aproximada, comunicación preferida, individual/pareja, límites y cosas que desea evitar. Todo editable/eliminable. No pedir datos sensibles innecesarios ni inferir consentimiento por gustos.

## 6. Creadoras, contenido y funciones de pago
Cada mujer o pareja creadora puede configurar tema, perfil, tarjeta virtual, bio y límites. Máximo dos elementos gratuitos visibles; el resto puede ser Premium/Ultra Premium a elección del creador. Herramientas para publicar, previsualizar, editar, archivar y borrar. Solo contenido propio o autorizado expresamente por todas las personas identificables; marca de agua opcional y aviso de que no se pueden impedir todas las capturas externas.

Donaciones, contenido premium, chat pagado y videollamada pagada son funciones separadas, opt-in y apagadas por defecto. Antes de activar, mostrar precio, duración, qué incluye, límites, cancelación y posibles cargos. Llamadas: consentimiento mutuo, terminar/bloquear/reportar siempre visible, no grabar por defecto ni redistribuir contenido sin permiso.

El panel muestra ventas brutas, IVA aplicable, comisión, retenciones configuradas por asesor fiscal, devoluciones, saldo pendiente/disponible, historial y solicitudes de retiro. Publicar contenido y recibir donaciones no requiere suscripción adicional; se cobra la comisión informada. No prometer “solo ISR”: tratamiento depende de operación, RFC, régimen y legislación aplicable. Solicitar RFC/datos fiscales mínimos con aviso de privacidad; restringir documentos a finanzas.

Comisión comercial propuesta: 10% del subtotal de la venta; IVA sobre la comisión se presenta por separado cuando proceda. Mostrar siempre precio base, IVA aplicable, total del comprador, comisión, retenciones configuradas, devoluciones y neto estimado. Ejemplo ilustrativo: servicio base $100; IVA de 16% si aplica = $16; total = $116; comisión del 10% sobre base = $10, más el tratamiento fiscal aplicable a la comisión. Las donaciones no deben considerarse automáticamente exentas.

## 7. Planes, descuentos y monedas
Precios sugeridos en MXN; no están conectados al cobro hasta implementar backend. El servidor es la única fuente de verdad.

| Plan | Precio propuesto | Vigencia |
|---|---:|---|
| Gratis | $0 | Permanente |
| Lila | $149 | 15 días |
| Lila Plus | $249 | 30 días |
| Aura | $399 | 30 días |
| Élite | $599 | 30 días |

Beneficios premium: filtros de compatibilidad, herramientas de organización, preferencias ampliadas y opciones de visibilidad moderadas; nunca bloquear seguridad, reportes o ayuda. Propuesta de lanzamiento: 30% de descuento en planes elegibles para mujeres durante primeros 60 días o cupo publicado. Reglas de elegibilidad deben ser públicas y revisadas legalmente. Mostrar precio normal, descuento, total, impuestos y fecha de vencimiento; validar el descuento en servidor.

Propuesta de créditos: 5 monedas por $400. Cada moneda cubre una postulación a evento, no necesariamente la entrada; cada evento puede cobrar una entrada independiente. Antes de gastar moneda, explicar ambas tarifas, vigencia y política de cancelación. El monto es una hipótesis comercial, no un precio activo.

## 8. Checkout SPEI y conciliación
1. Al elegir plan, abrir checkout con producto, vigencia, subtotal, IVA aplicable, total, condiciones, política de devolución, receptor y datos de depósito confirmados por finanzas.
2. El servidor genera ID de orden aleatorio único, importe, moneda MXN, concepto exacto, vencimiento, usuario, producto y estado inicial. Mostrar concepto/ID debajo de los datos de depósito.
3. Pedir solo campos necesarios para consulta CEP/servicio bancario: bancos, fecha, clave de rastreo/referencia, monto y cuentas/datos que el flujo oficial requiera. Nunca pedir NIP, contraseña, token, CVV o credenciales.
4. Antes de procesar, dos casillas separadas no premarcadas: aceptación de condiciones de cobro/reembolso y reconocimiento del aviso de privacidad. Aviso visible: comprobante no confirma pago.
5. Validar formato, monto, moneda, referencia, fecha, receptor y duplicidad. Si es coherente, crear estado pendiente de verificación; si falla, indicar qué corregir sin revelar controles antifraude.
6. Integrar CEP/servicio oficial de Banxico o proveedor bancario autorizado. No asumir que una web pública permite validar automáticamente cualquier SPEI por scraping ni que el formulario prueba que el dinero llegó. Conciliar receptor, monto, estado y rastreo con cuenta receptora.
7. Si el servicio no está disponible o hay discrepancia, enviar a revisión manual. Nunca activar premium por una captura o recibo no conciliado.
8. Panel de finanzas: orden, usuario, monto esperado/observado, bancos, clave de rastreo, fecha/hora, concepto/ID, resultado CEP, alertas y auditoría. Acciones: Aceptar, Rechazar, Solicitar aclaración. Aceptar solo después de conciliar; doble aprobación para alertas de riesgo.
9. Al aceptar, activar plan en servidor. Al rechazar/aclarar, notificar y mostrar botón “Contactar administración” hacia chat de soporte. No acusar fraude cuando solo falten datos.
10. Idempotencia por orden y clave de rastreo para impedir doble aplicación. Registrar actor, hora y motivo.

No presentar “sin reembolsos” como absoluto. Excluir de una renuncia general los derechos irrenunciables, cobros duplicados/incorrectos, servicios no prestados por causa imputable a plataforma y obligaciones legales. Mostrar casos, plazo y proceso; revisión jurídica antes de producción.

## 9. Calculadora IVA
Si precio es antes de IVA: IVA = subtotal × tasa; total = subtotal + IVA. Si ya incluye IVA: IVA incluido = total × tasa / (1 + tasa); base = total − IVA. La tasa general 16% es una referencia frecuente, no una regla universal para todas las operaciones. El motor fiscal del servidor define tasa y comprobante; no añadir 16% ciegamente a donaciones, ventas o entradas. Mostrar desglose antes de autorizar.

## 10. Eventos, organizadores y QR
Alta de organizador: identidad y +18 del representante, revisión de agencia, RFC/documentación fiscal, domicilio, titularidad bancaria, videollamada y aprobación humana. Pedir solo lo necesario y limitar retención/acceso.

Tarifas propuestas: $500 por evento con máximo 15 asistentes; $1,500 por evento con máximo 40. Son tarifas de publicación, no incluyen entradas/impuestos salvo que se indique. Cada anuncio debe especificar propuesta verificable, nombre, fecha/hora, zona general, aforo, anfitrión, actividades, reglas, accesibilidad, precio de entrada, modalidad de pago, cancelación, cuándo se comparte ubicación y soporte.

Antes de comprar, mostrar entrada, impuestos, comisiones, hora, política de no asistencia y reembolso. Para cobro presencial, aclarar que AppSwinger no cobra esa entrada. Para pagos online, usar proveedor legal/contractualmente habilitado para marketplace y liquidación diferida; no retener dinero de terceros en cuenta ordinaria ni afirmar que existe escrow si no lo hay.

Emitir QR firmado, único, ligado a evento/reserva y expiración, sin datos personales embebidos. La organizadora abre cámara dentro de la app; servidor verifica firma, evento, reserva, estado y hora. Cambio atómico de emitido a registrado invalida el QR inmediatamente; rechazar duplicados, capturas reutilizadas y QR de otro evento. En cobro presencial, registrar pago y check-in por separado.

Los fondos de entradas online quedan pendientes hasta el fin del evento, revisión de check-ins, incidentes y disputas. Liberar después de la evidencia mínima definida. Prometer depósito máximo en 12 horas solo si banco/proveedor/operación pueden cumplirlo; detallar horario hábil y contingencias. Si no, publicar plazo realista. No asistencia aplica la política mostrada antes de pagar, respetando derechos legales; cancelación/cambio sustancial del organizador habilita reclamación.

## 11. Chat, soporte y administración
Chat de soporte separado del social con categorías de queja, sugerencia, reporte, aclaración, reembolso, evento y cuenta; ticket, estado, historial, SLA y notificaciones. Nunca pedir claves bancarias. Chat y video de pago solo se activan voluntariamente por el creador; tarifa, duración y condiciones antes de empezar.

Panel admin con gráficos y detalle auditado: altas/activos/retención; verificaciones por estado y tiempo; reportes por categoría, reincidencia, bloqueos, apelaciones y resolución; fraude/duplicados; órdenes SPEI y conciliación; ventas, IVA, comisión, retenciones configuradas y retiros; eventos, entradas, check-ins, QR duplicados, cancelaciones y disputas. Datos personales solo por necesidad y rol; métricas agregadas sin INE/RFC/bancos expuestos. No usar cantidad de reportes como culpabilidad automática.

## 12. Arquitectura y controles técnicos
- React/Vite/Capacitor actual; variables CSS centralizadas para lila/morado.
- Backend autoritativo Firebase Auth/Cloud Functions o API de servidor, reglas Firestore deny-by-default. Cliente no decide pagos ni saldos.
- Entidades separadas: usuarios, verificación, consentimientos, perfiles, bloqueos, reportes, moderación, creadores, contenido, órdenes, intentos de pago, conciliaciones, ledger, retiros, eventos, tickets, check-ins, soporte y auditoría.
- Ledger inmutable/doble entrada; transacciones e idempotencia. Nunca saldo editable desde cliente.
- Archivos privados, URLs firmadas cortas, cifrado en tránsito/reposo, gestión de claves, análisis de malware, límites de tipo/tamaño y entornos separados.
- Rate limiting, validación, gestión de secretos, análisis de dependencias/código, backups cifrados y pruebas de restauración. Logs sin datos sensibles.
- Android 10–15: Edge-to-Edge/WindowInsets, permisos contextuales de cámara, no tapar notch/status/navigation bar; pruebas reales en tamaños y navegación por gestos.
- CI: lint, typecheck, unit/integration tests, build web, reglas de seguridad, QR concurrente, pagos idempotentes, expiración, accesibilidad y APK firmado.

## 13. Avisos visibles en contexto
- **Identidad:** “La verificación confirma señales de identidad y mayoría de edad; no garantiza conducta ni seguridad física.”
- **Contenido:** “Publica solo contenido propio o autorizado por todas las personas identificables. Prohibidas imágenes íntimas no consentidas, suplantación y contenido de menores.”
- **SPEI:** “Enviar comprobante no confirma el pago. Conciliamos la transferencia antes de activar el plan.”
- **Creador:** “Verás precio, IVA aplicable, comisión y condiciones. El neto puede variar por impuestos, retenciones y devoluciones.”
- **Eventos:** “La moneda cubre la postulación, no necesariamente la entrada. La entrada y modalidad se muestran por separado.”
- **QR:** “El QR es de un solo uso y se invalida al validarse con la cámara de la app.”
- **Reembolsos:** “Las solicitudes se revisan según la política visible y la legislación aplicable.”
- **Privacidad:** “Nunca envíes contraseñas, NIP, tokens ni códigos bancarios al soporte.”

## 14. Aceptación antes de lanzar
- [ ] Revisión legal mexicana: privacidad/biométricos, consumidor, intermediación, contenido, pagos, fiscalidad, retiros y eventos.
- [ ] Proveedor de identidad contratado; liveness/INE, borrado y apelación probados.
- [ ] Avisos/consentimientos versionados y descargables.
- [ ] Cuenta receptora y conciliación CEP/proveedor autorizada probadas.
- [ ] Precios, impuestos, descuentos y comisión coinciden con backend y cobro.
- [ ] Ledger, doble aprobación, retiros y prevención de duplicados probados.
- [ ] QR concurrente, check-in, fondos, cancelaciones y disputas probados.
- [ ] Moderación, bloqueo, reportes y soporte operativos.
- [ ] Reglas de backend y privacidad de archivos verificadas.
- [ ] Lint, typecheck, build web, tests y APK firmado ejecutados.
- [ ] Android 10–15, cámara, Edge-to-Edge, accesibilidad y seguridad probados.
- [ ] Sin datos demo ni funciones anunciadas que no estén activas.

## 15. Fuentes oficiales para revisión
- Ley Federal de Protección de Datos Personales en Posesión de los Particulares: https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf
- Ley del IVA, artículo 1, SAT: https://wwwmat.sat.gob.mx/articulo/19848/articulo-1
- Régimen de plataformas tecnológicas, SAT: https://wwwmatnp.sat.gob.mx/articulo/05058/articulo-113-a
- Preguntas frecuentes SAT sobre plataformas: https://www.sat.gob.mx/minisitio/PlataformasTecnologicas/PersonasFisicas/documentos/PreguntasFrecuentes_pf_con_act_emp.pdf
- Banco de México, portal oficial CEP: https://www.banxico.org.mx/cep/

Verificar normativa y capacidades de proveedores antes de producción. Este documento no sustituye abogado mexicano, contador fiscalista ni especialista de identidad.
