# AppSwinger — SPEI/CEP y seguridad de comunidad

## Estado
Este documento define el flujo requerido. La imagen `public/deposit-demo-mx.svg` es una maqueta, no un comprobante bancario ni datos para depositar. No se deben aceptar capturas como prueba definitiva ni activar membresías por una referencia sin validación independiente.

## Flujo SPEI México
1. Un backend autenticado crea una orden única con importe, moneda MXN, destino bancario aprobado, concepto único y fecha de expiración. El destino se obtiene exclusivamente de configuración privada/administrativa, nunca de valores enviados por el cliente.
2. La pantalla muestra **Destino**, **Concepto** y **REFERENCIA** de la orden. La referencia de la transferencia la captura el usuario; no se obliga a pegar una URL.
3. El usuario aporta la referencia y los datos que el comprobador requiera: fecha, importe, banco emisor/receptor y clave de rastreo u otros campos de CEP. Validar únicamente una referencia no prueba que el dinero haya llegado.
4. Un servicio backend consulta o un operador autorizado comprueba el CEP oficial de Banxico: https://www.banxico.org.mx/cep/. No automatizar scraping del portal ni declarar verificación automática hasta disponer de una interfaz autorizada y probada. Si no hay API fiable/autorizada o falta un campo, la orden queda `pending_review`.
5. La comprobación debe cotejar importe exacto, destino/beneficiario, concepto, fecha, clave de rastreo y estado del CEP; detectar referencias duplicadas y órdenes vencidas. No confiar en valores calculados en el navegador ni en capturas editables.
6. Cualquier discrepancia, CEP no encontrado, timeout, referencia duplicada o destino distinto mantiene el estado pendiente y crea una alerta para administración. La membresía solo se activa después de un resultado verificado del backend o una revisión manual auditada.
7. El backend guarda eventos de auditoría append-only: actor, hora, orden, transición anterior/nueva, motivo y referencia no sensible. No guardar claves bancarias ni documentos personales en logs.
8. Reintentos: cada 120 segundos durante un máximo de 2 horas, solo si existe una fuente de verificación aprobada. Después, pasa a revisión manual. No crear bucles infinitos.
9. La membresía y el libro fiscal se actualizan en una única operación backend idempotente. Reembolsos, cancelaciones, IVA y CFDI requieren revisión contable/fiscal en México.

## Privacidad y seguridad
- Nunca incluir API keys de Didit, Firebase Admin, FCM ni credenciales bancarias en el frontend o en este repositorio.
- Firestore Security Rules y Cloud Functions deben ser la autoridad para roles, pagos, membresías, reportes y bloqueos.
- Admin se basa en custom claims emitidos por Admin SDK en un entorno confiable; el cliente no puede asignarse el rol.
- Recoger solo los datos necesarios. Limitar el acceso a documentos de identidad y datos biométricos; configurar retención y borrado de acuerdo con el aviso de privacidad y asesoría legal.
- No publicar datos de la cuenta receptora hasta que el propietario la confirme y se configure de forma privada. La imagen demo utiliza marcadores intencionalmente.

## Moderación y controles del usuario
- Reportar y bloquear deben ser acciones persistentes en backend, no solo quitar una tarjeta localmente.
- Registrar categorías de conducta (acoso, amenazas, insultos, fraude, contenido no consentido), evidencia mínima, fecha, estado, moderador y apelación.
- Aplicar medidas proporcionales: advertencia, límites temporales, suspensión y revisión humana. Amenazas creíbles o riesgo inminente se escalan conforme a políticas y legislación aplicable. No sancionar automáticamente solo por palabras clave fuera de contexto.
- Preferencias individuales: sonido activado/desactivado, silenciar conversación, notificaciones push, borrado automático de chat con período elegible y confirmación. Explicar que el borrado de la vista local no necesariamente borra copias legales/de seguridad; definir retención del servidor.
- Notificaciones push reales requieren un proveedor configurado (p. ej. Firebase Cloud Messaging), permisos Android, tokens registrados de forma segura y pruebas en dispositivo.
- Los permisos de cámara, micrófono, ubicación y notificaciones se solicitan en contexto y con consentimiento; la app debe funcionar con permisos opcionales denegados cuando sea posible.

## Criterios de aceptación
- Ninguna membresía se activa con una captura, referencia no coincidente o respuesta manipulada por el cliente.
- Reintentos, webhooks y revisión manual son idempotentes.
- Usuario bloqueado no puede enviar nuevos mensajes al bloqueador ni ver información privada que deba quedar restringida.
- Reportes, decisiones administrativas y apelaciones dejan rastro auditable.
- Los controles de sonido, silencio y borrado automático persisten entre web y Android al usar el mismo usuario.
- Se prueban en sandbox/test antes de habilitar cobros reales.
