# AppSwingers: verificación progresiva de cuenta e identidad (v1)

## Estado real
Este documento define los controles necesarios; por sí solo no implementa captura de cámara, OCR, detección de documentos, prueba de vida ni comparación facial. No marcar una identidad como verificada hasta integrar y comprobar un proveedor real o una revisión administrativa autenticada.

## Objetivo
Permitir una cuenta básica con teléfono verificado y reservar la verificación de identidad para acciones de mayor riesgo. Controlar un número de WhatsApp o leer un QR no demuestra identidad legal ni mayoría de edad.

## Backend actual
El repositorio principal usa Firebase Authentication y Firestore. No introducir Supabase en paralelo sin una migración explícita y revisada.

## Estados de identidad
- `phone_pending`: teléfono sin verificar; sin acceso a funciones restringidas.
- `basic`: teléfono verificado y aceptación de términos/aviso de privacidad; acceso sujeto a las reglas de mayoría de edad y moderación.
- `identity_pending`: el proceso de identidad se inició; funciones restringidas bloqueadas.
- `identity_review`: requiere revisión administrativa.
- `identity_verified`: revisión completada mediante un procedimiento real y documentado.
- `identity_rejected`: verificación no aprobada; informar un canal de apelación sin exponer públicamente motivos sensibles.
- `suspended`: cuenta suspendida por moderación o seguridad.

El servidor debe ser la autoridad para cambiar estados y permisos. Nunca confiar en un estado de verificación enviado por el cliente.

## Flujo requerido de captura
1. Mostrar consentimiento expreso y explicar finalidad, responsable, conservación, acceso y derechos antes de capturar documentos o biometría.
2. Capturar mediante cámara, en orden estricto: frente de INE, reverso de INE y selfie con rostro e INE visibles.
3. No ofrecer galería ni botón de disparo manual; permitir enfoque automático y repetir la captura si la calidad no es suficiente.
4. Rechazar imágenes oscuras, borrosas, recortadas o que no cumplan los controles de calidad. Los controles visuales locales son filtros de calidad, no una autenticación oficial del INE.
5. Enviar el expediente por canal autenticado a un backend/proveedor real. Si no hay proveedor de verificación/liveness configurado, mantener el caso pendiente para revisión manual; no simular una aprobación.
6. Guardar el estado, marcas de tiempo, resultado de controles y referencia privada del expediente. No guardar imágenes como blobs en Firestore ni exponerlas en rutas públicas.
7. Solo un backend con autorización verificable puede cambiar a `identity_verified` o `identity_rejected`; registrar auditoría y permitir apelación.

## Límites de verificación
- Leer o decodificar un QR no demuestra autenticidad, vigencia ni titularidad.
- No automatizar ni reutilizar la aplicación oficial del INE como si fuera una API.
- No afirmar OCR, detección de documento físico, prueba de vida o comparación biométrica hasta integrar un proveedor compatible y superar pruebas controladas.
- Una captura desde cámara no impide por sí sola todos los ataques de presentación o suplantación.

## Seguridad y privacidad
- Aplicar reglas de Firestore y Storage de mínimo privilegio, validación del lado servidor y registros de cambios.
- Usar almacenamiento privado, URLs temporales y acceso limitado al personal autorizado.
- Definir retención mínima y borrado de imágenes tras la revisión cuando sea legal y operativamente procedente.
- No guardar OTP, tokens ni secretos en frontend, APK, repositorio o logs.
- Exigir mayoría de edad antes de habilitar áreas para adultos; un OTP telefónico no prueba la edad.
- Incorporar reportes, bloqueo, moderación, límites de intentos, protección contra abuso y un proceso de incidentes.
- Publicar aviso de privacidad y términos ajustados al tratamiento real, con revisión legal mexicana antes del lanzamiento.

## OTP por WhatsApp
Usar únicamente WhatsApp Business Platform/Cloud API oficial o proveedor autorizado. La aplicación WhatsApp Business gratuita no proporciona por sí sola una API gratuita de OTP. Si el proveedor no está configurado, no simular el envío ni mostrar éxito falso; ofrecer una alternativa real como correo verificado si está implementada.

## Criterios de aceptación
- Ningún OTP, token o clave en cliente o repositorio.
- Ninguna pantalla anuncia envío si el proveedor no lo confirmó.
- Ningún usuario puede modificar su propio estado de identidad desde el cliente.
- Las funciones restringidas permanecen bloqueadas mientras el caso está pendiente o rechazado.
- La persona puede apelar una decisión.
- La aplicación nunca declara verificación por QR o teléfono solamente.
- El lanzamiento no se considera listo hasta verificar el flujo completo con proveedor y credenciales de entorno configuradas.
