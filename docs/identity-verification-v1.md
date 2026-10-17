# AppSwingers: verificación progresiva de cuenta e identidad (v1)

## Objetivo
Permitir una cuenta básica con teléfono verificado y reservar la verificación de identidad para acciones de mayor riesgo. Esta implementación no debe afirmar que una persona está identificada legalmente solo porque controla un número de WhatsApp o porque una imagen contiene un QR.

## Backend detectado
El repositorio usa Firebase Authentication y Firestore. La primera versión debe respetar ese backend y no introducir Supabase en paralelo sin una migración explícita.

## Niveles de acceso
- `phone_pending`: el teléfono aún no se ha verificado; sin acceso a funciones de la comunidad.
- `basic`: teléfono verificado y aceptación de términos/aviso de privacidad. Acceso solo a funciones permitidas para adultos y sujetas a moderación.
- `identity_pending`: se inició el proceso de identidad; las funciones restringidas siguen bloqueadas.
- `identity_review`: revisión manual requerida.
- `identity_verified`: revisión de identidad completada conforme al procedimiento documentado.
- `identity_rejected`: verificación no aprobada; indicar un canal de apelación y no exponer motivos sensibles públicamente.
- `suspended`: cuenta suspendida por moderación o seguridad.

El servidor debe ser la autoridad para cambiar estados y permisos. No confiar en valores de verificación enviados desde el cliente.

## Registro por WhatsApp
1. Usar únicamente WhatsApp Business Platform/Cloud API oficial o un proveedor autorizado.
2. La aplicación WhatsApp Business gratuita es para atención manual; no proporciona por sí sola una API gratuita de OTP.
3. Los mensajes de autenticación pueden generar cargos por mensaje entregado. Confirmar tarifas vigentes para México antes de producción.
4. No automatizar WhatsApp Web ni pedir al usuario que comparta códigos recibidos para otro servicio.
5. Guardar tokens de Meta/proveedor únicamente en secretos del servidor o funciones cloud; nunca en el frontend, repositorio, APK ni logs.
6. Implementar expiración corta del código, límite de intentos, límite de reenvíos, rate limiting por teléfono/IP/dispositivo, protección contra enumeración y registro de auditoría sin almacenar el OTP en texto plano.
7. Si el proveedor/API todavía no está configurado, ofrecer correo verificado como alternativa; no simular el envío ni mostrar éxito falso.

## Captura de identidad
- Pedir consentimiento expreso e informar finalidad, responsable, conservación, acceso y derechos de la persona antes de capturar documentos o biometría.
- La captura de INE y selfie debe hacerse mediante cámara; la UI no debe ofrecer selector de galería. Esto no impide todas las falsificaciones y no constituye prueba de vida.
- No almacenar imágenes en Firestore como blobs ni en rutas públicas. Usar almacenamiento privado, reglas restrictivas y URLs temporales cuando sean necesarias.
- Registrar solo el estado, marcas de tiempo, resultado del control y referencia privada al expediente cuando sea indispensable.
- El QR solo se procesa si el formato es compatible. Leer o decodificar un QR no equivale automáticamente a validar autenticidad, vigencia o titularidad. No automatizar ni reutilizar la app oficial del INE como si fuera una API.
- Sin un proveedor de verificación/liveness aprobado, los casos se mantienen pendientes para revisión manual. No declarar que existe comparación biométrica automática si no está implementada y probada.
- Definir retención mínima y borrado de imágenes tras la revisión cuando legal y operativamente proceda; conservar evidencia solo con finalidad y plazo justificados.

## Seguridad y cumplimiento
- Aplicar reglas de Firestore y Storage de mínimo privilegio, validación del lado servidor y registros de cambios de estado.
- Exigir mayoría de edad antes de cualquier área o contenido para adultos. Un OTP telefónico no demuestra edad.
- Incorporar reportes, bloqueo, moderación, procedimiento de incidentes y un proceso para preservar/entregar evidencia ante solicitudes legales válidas.
- No prometer que un número telefónico permite identificar al responsable de un delito; puede ser compartido, reasignado o comprometido.
- Publicar aviso de privacidad y términos adecuados al tratamiento real; obtener revisión legal mexicana antes del lanzamiento, especialmente para datos biométricos y contenido sensible.
- Añadir controles de abuso: límites de creación de cuentas, detección de intentos repetidos, revisión de reportes y suspensión apelable.

## Configuración necesaria antes de habilitar OTP real
- Meta Business Portfolio y WhatsApp Business Account habilitados.
- Número apto para WhatsApp Business Platform, plantilla de autenticación aprobada, método de pago y credenciales.
- Webhook/verificación del webhook configurados y función de servidor desplegada.
- Secretos configurados en el entorno de producción, pruebas de entrega, expiración, límites, reintentos y errores.
- Confirmación de costos actuales y pruebas controladas antes de activar el flujo público.

## Criterios de aceptación
- Ningún código OTP, token o clave se incluye en el cliente o repositorio.
- Ninguna pantalla afirma que se envió un código si el proveedor no confirmó el envío.
- Los estados de identidad no se pueden modificar desde el cliente.
- Las funciones restringidas permanecen bloqueadas mientras la identidad esté pendiente o rechazada.
- Los usuarios pueden continuar con la cuenta básica donde sea apropiado y pueden apelar una decisión.
- La aplicación no etiqueta una cuenta como verificada solo por QR o teléfono.
