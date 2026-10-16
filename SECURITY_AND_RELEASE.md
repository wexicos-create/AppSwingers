# AppSwinger — seguridad, Supabase y preparación de lanzamiento

## Estado de esta rama

Esta rama migra la autenticación y la base de datos del cliente de Firebase a Supabase. No significa que AppSwinger esté lista para cobrar o publicarse. El proyecto Supabase existente se conserva y se amplía sin borrar datos.

## Cambios implementados

- Cliente `@supabase/supabase-js` con sesión persistente, renovación automática y OAuth PKCE.
- Inicio de sesión Google redirigido mediante Supabase Auth; Google debe estar habilitado en el panel de Supabase y las URL de retorno deben estar autorizadas.
- Perfiles mínimos creados como pendientes al iniciar sesión. La app no puede marcar cuentas como verificadas, activas o aprobadas.
- Migración aditiva de `profile_swipes` y `matches`, ambas con RLS.
- Un match persistente se crea únicamente por un trigger de base de datos tras likes recíprocos entre cuentas activas, con edad/identidad verificadas, foto comparada y sin bloqueos.
- Se mantiene el bucket privado `profile-photos`; no se hacen públicos los documentos de identidad ni las fotos privadas.
- Roles de administración consultados desde `admin_roles`; el cliente no puede asignarse a sí mismo roles.
- Los cobros siguen desactivados. No se conceden membresías ni se registran pagos confirmados desde el cliente.
- CI ejecuta chequeo TypeScript y build de producción.

## Configuración de Supabase pendiente en el panel

1. En Authentication → Providers, habilita Google y configura sus credenciales OAuth.
2. En Authentication → URL Configuration, añade los dominios reales de producción, previsualización y desarrollo a Site URL / Redirect URLs.
3. Asigna roles en `public.admin_roles` desde un contexto administrativo confiable. No insertes un rol desde la app ni expongas la service-role key.
4. Configura email de verificación, recuperación de cuenta y límites antiabuso antes del lanzamiento.
5. Revisa los avisos de seguridad y rendimiento de Supabase después de aplicar migraciones.

## Funcionalidad que aún no debe considerarse completa

- La lista de descubrimiento pública todavía no está conectada a un RPC que devuelva solo perfiles verificados y datos públicos mínimos.
- La consulta de tarjetas de matches aún no está conectada a una función de lectura segura; la tabla de matches sí registra los matches recíprocos.
- El chat visual y varios flujos de eventos, creadores, contenido, moderación y avisos aún requieren integración con sus tablas y pruebas RLS.
- Verificación de edad/identidad, revisión de foto y moderación requieren un proveedor y callbacks de servidor confiables. No se aceptan verificaciones enviadas por el cliente.
- Stripe, Google Pay y SPEI no procesan cobros reales en esta rama. Activarlos requiere pruebas end-to-end, webhooks firmados, idempotencia y aprobación expresa.
- El proyecto es actualmente una aplicación React/Vite; no es todavía un APK Android nativo compilado y firmado.

## Monetización acordada

- Prime: **$350 MXN al mes antes de IVA**; total ilustrativo con IVA del 16%: **$406 MXN**.
- Gold: **$500 MXN al mes antes de IVA**; total ilustrativo con IVA del 16%: **$580 MXN**.
- Comisión objetivo de creadores: **10%**, pendiente de implementar con liquidación y reportes verificables.
- Eventos separados de membresías; las aportaciones entre usuarios no se procesan ni custodian desde la plataforma.
- El registro fiscal y CFDI requieren validación contable y técnica antes de producción.

## Lista mínima antes de publicar

- [ ] Ejecutar pruebas RLS con usuarios no autenticados, usuarios normales, usuarios bloqueados y administradores.
- [ ] Confirmar que un usuario no puede cambiar estado, verificación, moderación, membresía o rol.
- [ ] Implementar y probar RPCs de descubrimiento, matches y chat con autorización de adultos verificados.
- [ ] Implementar flujos reales de reportes, bloqueo, moderación, eliminación y exportación de datos.
- [ ] Probar recuperación de cuenta, OAuth redirect y configuración de dominios.
- [ ] Validar pagos y fiscalidad en sandbox; mantener producción de cobros desactivada hasta aprobación expresa.
- [ ] Crear, compilar, firmar y probar el APK Android en dispositivos reales.
