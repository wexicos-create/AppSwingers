# AppSwinger — Auditoría técnica inicial
**Fecha:** 21 de octubre de 2026  
**Alcance:** inspección del repositorio privado `wexicos-create/AppSwingers` (rama `main`) y del proyecto Supabase `Swingers App` (`plsnlwskttnskhsacina`). El dominio EdgeOne no pudo recuperarse mediante la herramienta de lectura HTTP; por tanto, no se certifica que el artefacto publicado corresponda exactamente a este commit.

## Resumen ejecutivo
El backend Supabase existe y tiene un esquema considerable para perfiles, verificación, matches, chat, reportes, membresías, SPEI e impuestos. Sin embargo, el frontend que se pudo inspeccionar no está conectado a ese backend: el repositorio sigue usando Firebase Auth/Firestore y datos de demostración locales. La arquitectura publicada y la arquitectura Supabase no deben considerarse integradas hasta comprobar el build desplegado.

## Hallazgos críticos
1. **Autenticación de frontend inconsistente.** `package.json` y `src/firebase.ts` usan Firebase Auth/Firestore; no existía cliente de Supabase en el frontend.
2. **Panel administrativo inseguro.** `AdminModal.tsx` contenía contraseña y PIN por defecto en el cliente, email administrativo fijo y guardado de credenciales en `localStorage`. Cualquier usuario con acceso al bundle podía extraerlas o modificar el estado.
3. **Pago simulado.** `PaymentModal.tsx` prellenaba número de tarjeta/CVV y mostraba pago aprobado después de un temporizador, sin procesador ni confirmación del servidor.
4. **Match falso.** `App.tsx` puede crear un match con un solo like/superlike basándose en datos mock; el backend Supabase tiene trigger de match mutuo, pero el frontend no lo consume.
5. **Datos de demostración.** `INITIAL_PROFILES`, eventos, propuestas, creadoras, lives y reportes se inicializan en memoria. Las reservas y aplicaciones a propuestas también se guardan localmente; no son registros persistentes de negocio.
6. **Precios legales desactualizados.** `LegalModal.tsx` anunciaba $400 MXN por 15 días y reparto de 85% a creadoras, incompatibles con la configuración Prime $350 + IVA / $406 total y Gold $500 + IVA / $580 total.
7. **Geolocalización engañosa.** La detección por coordenadas trata cualquier punto dentro de México como San Luis Potosí; la ubicación no se obtiene por geocodificación y el filtrado usa distancias mock.

## Estado observado de Supabase
- Proyecto `Swingers App`: activo y saludable.
- Tablas de perfiles, swipes, matches, conversaciones, mensajes, roles administrativos, denuncias, propuestas, creadores, membresías y órdenes SPEI presentes.
- Bucket `profile-photos`: privado, con límite de 5 MiB y MIME JPEG/PNG/WebP.
- Edge Functions de verificación, fotos, revisión administrativa, SPEI y Stripe desplegadas. El checkout Stripe contiene un guard `CHECKOUT_ENABLED`; la estrategia comercial vigente indicada por el propietario descarta Stripe y debe priorizar el flujo SPEI.
- La función SPEI observada calcula órdenes de $350/$500 como si fueran totales con IVA incluido, mientras la lógica de checkout y precios definida en el proyecto considera $406/$580 totales con IVA incluido. Debe corregirse antes de cobrar.
- Los códigos de plan no son consistentes entre algunas rutas: aparecen `prime` y `premium`. Debe usarse un catálogo único.

## Hallazgos de los asesores de Supabase
- Advertencia sobre las RPC `discover_verified_profiles` y `my_verified_matches` por ser funciones SECURITY DEFINER ejecutables por usuarios autenticados. El cuerpo observado restringe el resultado al usuario autenticado, perfiles activos/verificados y controles de bloqueo; conservar solo después de una revisión de grants y pruebas de autorización.
- Tabla `spei_account_config` con RLS habilitado y sin políticas: informativo si solo se accede mediante servicio privilegiado; confirmar que ningún cliente necesita leerla.
- Índices duplicados en `sales_tax_ledger`.
- Advertencias de rendimiento por políticas RLS que reevalúan `auth.uid()` por fila.

## Cambios propuestos en esta rama
- Añadir un cliente de Supabase con variables de entorno públicas explícitas; nunca exponer service-role.
- Sustituir las credenciales locales del panel por Supabase Auth, comprobación del rol `admin` en `admin_roles` y verificación TOTP cuando el nivel de sesión lo requiera.
- Retirar el cobro simulado y la captura de datos de tarjeta hasta integrar una pasarela aprobada y una confirmación server-side.
- Corregir el texto de precios y eliminar promesas de reparto no configuradas.

## Bloqueos para considerar producción
1. Migrar frontend completo de Firebase a Supabase y retirar datos mock de los flujos de negocio.
2. Configurar y validar OAuth/redirect URLs y variables de entorno de EdgeOne.
3. Conectar registro/perfil a Supabase y probar edad/identidad/foto verificada desde el servidor.
4. Conectar matches mutuos, chat, reportes, bloqueos, creadoras, eventos, soporte y panel administrativo a tablas/RPC/Edge Functions reales.
5. Corregir SPEI: catálogo de planes único, totales/IVA, CEP, expiración, revisión manual y activación idempotente tras confirmación.
6. Ejecutar build, pruebas de permisos/RLS, pruebas móviles y smoke tests en el dominio publicado.
7. Revisar aviso de privacidad, términos, política de reembolso y obligaciones legales con asesoría mexicana antes del lanzamiento.

## Criterio de verificación
Esta auditoría no afirma que el dominio publicado haya sido reparado ni que las funciones estén activas en producción. El cambio se entrega en una rama de revisión; debe compilarse, probarse y desplegarse desde el flujo autorizado antes de sustituir el sitio actual.
