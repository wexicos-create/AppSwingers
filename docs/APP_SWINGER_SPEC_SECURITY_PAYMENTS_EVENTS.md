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

### Secuencia obligatoria de tres capturas automáticas

El registro de identidad exige exactamente tres capturas, en este orden, usando la cámara activa del dispositivo. No se permite elegir archivos de galería, subir imágenes guardadas ni saltar pasos:

1. **INE física — frente.** La cámara guía al usuario para colocar el frente completo dentro del marco. Solo captura automáticamente cuando el detector reconoce un documento compatible con INE y la imagen supera controles mínimos de enfoque, iluminación, reflejos, encuadre y legibilidad. Si no se detecta una INE física compatible, no se captura.
2. **INE física — reverso.** Solo se habilita después de aceptar una captura frontal válida. Aplica los mismos controles de detección, enfoque, luz, encuadre y legibilidad al reverso.
3. **Selfie en vivo con INE.** Solo se habilita después de aceptar ambas caras del documento. Se utiliza la **cámara frontal**. Instrucción visible y literal: **“Sostén tu INE con una mano y toma una selfie donde salgan tu rostro y la INE visibles.”** La captura es automática cuando el sistema detecta simultáneamente un rostro en vivo y el documento en la misma escena, ambos suficientemente visibles, enfocados e iluminados. No basta con detectar solo un rostro o solo una tarjeta.

### Reglas de captura y mensajes

- La persona no pulsa un botón para tomar la fotografía. El sistema captura automáticamente cuando las comprobaciones de calidad y detección se mantienen estables durante el umbral definido en la implementación.
- Se permite tocar la vista previa para enfocar, pero tocar no dispara la captura.
- Si la imagen está oscura: **“Hay poca luz. Ajusta la iluminación del lugar y vuelve a colocar el documento.”**
- Si está borrosa: **“La captura salió borrosa. Enfoca la cámara y mantén el documento quieto.”**
- Si el frente o reverso no es legible: **“La captura de la INE no salió clara. Inténtalo de nuevo en un lugar con buena luz y enfoca tu cámara.”**
- Si no se reconoce el documento: **“Coloca tu INE física dentro del marco. No uses una pantalla, impresión ni fotografía de otra pantalla.”** La detección visual por sí sola no demuestra autenticidad; los indicios de falsificación deben pasar a revisión del proveedor y/o de una persona administradora.
- Si falta rostro o INE en la selfie: **“Sostén tu INE con una mano y toma una selfie donde salgan tu rostro y la INE visibles.”**
- Si se detectan reflejos, partes cortadas, movimiento excesivo o calidad insuficiente, no se acepta la captura. Se explica el problema y se permite reintentar el paso actual sin repetir los anteriores ya validados, salvo que el análisis posterior los invalide.
- Mostrar progreso inequívoco: **1 de 3 — Frente de INE**, **2 de 3 — Reverso de INE**, **3 de 3 — Selfie con INE**. No marcar el registro como verificado solo por haber capturado tres imágenes.
- El resultado de cada captura y la verificación final se deciden en el servidor/proveedor confiable. La interfaz no puede aprobarse a sí misma ni permitir que el cliente envíe un estado “verificado”.

### Verificación posterior y protección de datos

1. Antes de abrir la cámara, mostrar el aviso de privacidad y obtener el consentimiento específico requerido. Explicar finalidad, acceso, conservación, revisión manual, derechos y contacto responsable.
2. Capturar frente, reverso y selfie desde cámara activa; no aceptar archivos de galería. La validación de calidad/detección en el dispositivo sirve para guiar la captura, no para garantizar que la INE sea auténtica.
3. Un proveedor de verificación o proceso backend confiable debe comprobar, cuando esté contratado y configurado, coherencia documental/OCR, vigencia, señales de pantalla o impresión, liveness, duplicidad y comparación facial. La selfie con documento no es por sí sola una prueba infalible de vida ni de autenticidad.
4. Si hay baja confianza, contradicciones, posible manipulación o fallos reiterados, detener la aprobación automática y enviar el caso a revisión manual. No rechazar definitivamente solo por una puntuación automatizada.
5. Estados posibles: no iniciado, capturando, pendiente de revisión, requiere reintento, aprobado o rechazado con vía de aclaración.
6. Guardar preferentemente el identificador y resultado de verificación, no las imágenes originales. Si es imprescindible conservarlas, cifrar, restringir acceso, fijar retención y borrado automático, registrar cada acceso y excluirlas de logs, analítica, CDN y repositorios.
7. INE, rostros y plantillas biométricas son datos de alto riesgo. Antes de activar producción, asesoría jurídica mexicana debe revisar base legal, consentimiento expreso cuando proceda, avisos, proveedores/transferencias, derechos ARCO, retención, seguridad, incidentes y evaluación de impacto. Separar consentimiento de identidad y marketing. El perfil público nunca muestra nombre legal ni INE.

**Estado técnico actual:** el componente `IdentityVerificationModal.tsx` que existe en esta rama redirige a una URL de proveedor mediante `/api/identity-verification/session`; no implementa todavía la cámara, la captura automática de las tres imágenes ni los detectores de enfoque, iluminación, INE y rostro. El contrato de sesión/estado tampoco demuestra que exista un proveedor conectado. Estos requisitos son criterios obligatorios de implementación y prueba, no funciones que deban anunciarse como terminadas.

No construir un “enjambre de bots” como garantía de autenticidad. Usar un pipeline versionado de señales independientes, controles de falsos positivos, proveedor especializado y revisión humana. No identificar a terceros ni rastrear rostros por toda la plataforma.

## 3.1. Orden obligatorio del onboarding

1. **Cuenta:** solicitar correo y contraseña; verificar el correo antes de habilitar funciones sensibles. La declaración de mayoría de edad no sustituye la verificación documental.
2. **Identidad:** iniciar la secuencia de captura 1) frente de INE, 2) reverso de INE, 3) selfie con cámara frontal sosteniendo la INE. La cuenta permanece en estado pendiente; no se presenta como verificada hasta una decisión administrativa registrada.
3. **Datos del perfil:** precargar el nombre y apellidos solo si se extraen de forma fiable de la INE y el usuario los confirma. Mostrar igualmente campos editables de nombre(s) y apellidos; no inferir datos ilegibles ni aprobar por OCR.
4. **Privacidad pública:** permitir un interruptor “Mostrar alias en todo el sitio”. Activado, mostrar el alias en tarjetas, búsquedas, chats y eventos; desactivado, mostrar únicamente el nombre de perfil que la persona haya elegido, nunca exponer por defecto el nombre legal completo. En Ajustes, permitir ocultar también los apellidos. Los datos legales solo son visibles para roles autorizados con necesidad justificada.
5. **Encuesta breve:** selección múltiple por chips, sin texto libre obligatorio:
   - Intereses: Swinger, tríos, Hotwife, encuentros informales, amistad con intimidad entre adultos, encuentros recurrentes sin compromiso, fiestas privadas y otras preferencias adultas permitidas por las políticas.
   - Qué busca: mujeres, hombres, parejas, personas individuales o grupos adultos.
   - Edad: campo numérico validado como 18+; la edad declarada no sustituye la comprobación documental.
   - Estado y ciudad: selección/búsqueda; solicitar ubicación precisa solo si es necesaria y con permiso separado.
   - Opcionales: límites personales, preferencias de contacto y qué desea evitar. No hacer obligatorios los datos sensibles que no sean necesarios.
6. **Consentimientos claros:** mostrar por separado términos, aviso de privacidad y consentimiento explícito para tratar datos sensibles cuando corresponda. El usuario puede leer el aviso completo antes de aceptar. No condicionar el consentimiento de marketing al registro.
7. **Acceso gradual:** mientras la identidad esté pendiente, limitar las funciones para adultos y las interacciones de riesgo. Permitir consultar estado y contactar soporte. Rechazos deben incluir motivo general, reintento o vía de aclaración.
8. **Datos y transparencia:** explicar en lenguaje sencillo que los datos se usan para seguridad, prevención de suplantación, moderación, gestión de denuncias y cumplimiento de obligaciones legales. Ante reportes o requerimientos válidos, conservar y entregar únicamente la información pertinente a las autoridades competentes conforme a la ley. No prometer divulgación indiscriminada ni retención ilimitada.
9. **Convivencia:** prohibir menores y cualquier material sexual que involucre o represente menores, coerción, violencia sexual, explotación, trata, difusión íntima sin consentimiento, acoso, amenazas, extorsión, suplantación y contenido ilegal. Los reportes se investigan con medidas proporcionales; las sospechas de explotación sexual infantil se escalan de inmediato conforme al protocolo legal aplicable, preservando evidencia de forma segura y reportando a las autoridades competentes cuando corresponda.
10. **Marco jurídico:** antes del lanzamiento en México, revisión legal de términos, privacidad, tratamiento de datos personales y sensibles bajo la legislación aplicable, derechos ARCO, reglas de consumo y comercio electrónico, obligaciones fiscales, contenido de terceros y protocolo de respuesta a requerimientos oficiales. El texto de la interfaz es informativo y no sustituye asesoría legal.

**Estado de implementación:** los campos de nombre legal, apellidos, alias público, edad y ubicación se han añadido al formulario y al objeto de perfil; aún se debe verificar su persistencia real en Firestore, aplicar la preferencia de alias/apellidos en todos los componentes públicos y conectar la secuencia de identidad para que el cuestionario no se interprete como una verificación completada. La precarga desde OCR, la captura automática de INE y el flujo de aprobación manual no se consideran funcionales hasta implementarse y probarse.

## 3A. Registro de baja fricción: orden, campos y avisos

El flujo de onboarding debe ser corto y secuencial:
1. Crear cuenta con correo y contraseña; solicitar verificación del correo. No pedir intereses antes de crear la cuenta.
2. Iniciar la verificación de identidad con tres capturas estrictamente ordenadas: frente de INE, reverso de INE y selfie con cámara frontal sosteniendo la INE junto al rostro. El registro no se considera verificado al terminar las capturas; el estado inicial es pendiente de revisión manual.
3. Capturar los campos legales por separado: nombre(s) y apellidos como aparecen en la INE, edad declarada y estado/ciudad. La lectura automática de la INE puede ayudar a prellenar el formulario, pero el usuario debe revisar y confirmar los campos. No dar por hecha la extracción OCR hasta implementarla y probarla.
4. Solicitar un nombre público/alias. Incluir un interruptor accesible “Mostrar mi nombre de usuario en todo el sitio”; activado significa mostrar alias y no nombre legal. En Ajustes debe existir una opción independiente para ocultar el apellido público, con valor predeterminado oculto. Nombre legal, INE y documentos no se exponen en perfiles, chats, búsquedas ni eventos.
5. Mostrar una encuesta compacta de etiquetas seleccionables: intereses; qué busca; rangos de edad (solo categorías 18+); estado/ciudad. La ubicación precisa es opcional y requiere permiso separado. La selección de preferencias no constituye consentimiento para actos sexuales ni garantiza compatibilidad.
6. Antes de finalizar, pedir aceptación explícita del aviso de privacidad y reglas de comunidad; registrar versión, fecha y consentimiento. Evitar una pantalla saturada: mostrar progreso de pasos, permitir guardar y continuar, y explicar brevemente por qué se solicita cada dato.

### Texto de cumplimiento visible en el registro

“AppSwinger es exclusivamente para personas adultas de 18 años o más. Solicitamos datos mínimos para administrar la cuenta, verificar la edad e identidad, proteger a la comunidad, prevenir fraude e investigar reportes. Los documentos de identidad son privados y solo personal autorizado puede acceder a ellos. No publicamos tu nombre legal ni tu INE. Si recibimos una denuncia o detectamos indicios de delito, revisaremos el caso y colaboraremos con las autoridades competentes cuando exista obligación o fundamento legal. Usa la plataforma con respeto: no se permite violencia, amenazas, acoso, explotación, trata, contenido íntimo no consentido ni contenido sexual que involucre a menores. El contenido sexual de menores está prohibido; se bloqueará el material, se restringirá la cuenta y se dará aviso a las autoridades cuando corresponda conforme a la ley. Puedes bloquear y reportar desde la aplicación.”

No prometer que todos los datos se entregarán automáticamente ante cualquier denuncia. El acceso y la divulgación deben tener base legal, alcance proporcional, controles de acceso y registro de auditoría. La política pública debe identificar al responsable, finalidades, transferencias, conservación, medios ARCO y contacto para privacidad; revisión jurídica mexicana es requisito previo a producción. El consentimiento de privacidad debe distinguirse de la aceptación de términos y de comunicaciones promocionales.

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
