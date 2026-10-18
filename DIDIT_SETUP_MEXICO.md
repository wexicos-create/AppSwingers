# AppSwinger México — Didit

## Configuración obligatoria antes de desplegar
1. En Didit, crea/publica un workflow que compruebe el documento mexicano admitido por el proveedor, prueba de vida y comparación facial.
2. En el entorno seguro de Supabase, configura `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID` y `DIDIT_WEBHOOK_SECRET`. No las guardes en GitHub ni en variables `VITE_*`.
3. El endpoint público de webhook será `https://plsnlwskttnskhsacina.supabase.co/functions/v1/didit-webhook`. Regístralo en Didit y configura su secreto de firma.
4. Aplica la migración `20261017120000_mexico_locality_and_didit_identity.sql`.
5. Despliega `didit-session` con verificación JWT habilitada y `didit-webhook` con verificación JWT deshabilitada; el webhook valida HMAC-SHA256 en `X-Signature-V2`.
6. Prueba sesión pendiente, aprobado, rechazado, firma inválida, webhook duplicado y discrepancia entre sesión y usuario.
7. Verifica que Match, propuestas y eventos solo muestren contenido del mismo estado/ciudad y que el usuario no pueda modificar por API los campos de identidad/edad.

La UI solicita consentimiento explícito para la verificación biométrica y términos. Las funciones no guardan imágenes de INE/selfie en las tablas de AppSwinger; solo guardan el estado y los hitos de verificación.

**Estado actual:** el código está preparado en una rama/PR de revisión. No está activo en producción hasta configurar los secretos/workflow, aplicar la migración, desplegar funciones y pasar pruebas end-to-end. El proyecto aún conserva una Edge Function antigua de Stripe Identity desplegada; la UI de esta rama usa Didit, pero no se debe borrar el endpoint antiguo hasta validar el reemplazo.
