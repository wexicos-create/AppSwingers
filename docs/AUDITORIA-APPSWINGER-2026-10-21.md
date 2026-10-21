# AppSwinger — Auditoría técnica inicial
**Fecha:** 21 de octubre de 2026  
**Alcance:** inspección del repositorio privado `wexicos-create/AppSwingers` (rama `main`) y del proyecto Supabase `Swingers App` (`plsnlwskttnskhsacina`). El dominio EdgeOne no pudo recuperarse mediante la herramienta de lectura HTTP; por tanto, no se certifica que el artefacto publicado corresponda exactamente a este commit.

## Resumen ejecutivo
El backend Supabase existe y tiene un esquema considerable para perfiles, verificación, matches, chat, reportes, membresías, SPEI e impuestos. La rama de corrección conecta el flujo principal de autenticación, descubrimiento de perfiles verificados y matches mutuos a Supabase. Las secciones secundarias (eventos, propuestas, creadoras, lives, reportes y reservas) todavía contienen datos simulados y necesitan integración antes de producción. El dominio publicado no se certifica como actualizado hasta desplegar y probar esta rama.

## Hallazgos críticos
1. **Autenticación de frontend inconsistente en `main`.** La rama de corrección añade cliente Supabase y sustituye el adaptador de autenticación, perfiles, descubrimiento y matches; la configuración de despliegue y el build aún deben validarse.
2. **Panel administrativo inseguro.** `AdminModal.tsx` contenía contraseña y PIN por defecto en el cliente, email administrativo fijo y guardado de credenciales en `localStorage`. Cualquier usuario con acceso al bundle podía extraerlas o modificar el estado.
3. **Pago simulado.** `PaymentModal.tsx` prellenaba número de tarjeta/CVV y mostraba pago aprobado después de un temporizador, sin procesador ni confirmación del servidor.
4. **Match falso en `main`.** La rama de corrección elimina el match sintético y consulta la RPC de matches mutuos después de guardar el swipe; la validación real requiere dos cuentas verificadas.
5. **Datos de demostración.** `INITIAL_PROFILES`, eventos, propuestas, creadoras, lives y reportes se inicializan en memoria. Las reservas y aplicaciones a propuestas también se guardan localmente; no son registros persistentes de negocio.
6. **Precios legales desactualizados.** `LegalModal.tsx` anunciaba $400 MXN por 15 días y reparto de 85% a creadoras, incompatibles con la configuración Prime $350 + IVA / $406 total y Gold $500 + IVA / $580 total.
7. **Geolocalización engañosa.** La detección por coordenadas trata cualquier punto dentro de México como San Luis Potosí; la ubicación no se obtiene por geocodificación y el filtrado usa distancias mock.

## Estado observado de Supabase
- Proyecto `Swingers App`: activo y saludable.
- Tablas de perfiles, swipes, matches, conversaciones, mensajes, roles administrativos, denuncias, propuestas, creadores, membresías y órdenes SPEI presentes.
- Bucket `profile-photos`: privado, con límite de 5 MiB y MIME JPEG/PNG/WebP.
- Edge Functions de verificación, fotos, revisión administrativa, SPEI y Stripe desplegadas. El checkout Stripe contiene un guard `CHECKOUT_ENABLED`; la estrategia comercial vigente indicada por el propietario descarta Stripe y debe priorizar el flujo SPEI.
- La función SPEI fue actualizada a versión 2: Prime $350 + IVA $56 = $406; Gold $500 + IVA $80 = $580. Ahora exige perfil activo, mayoría de edad e identidad verificadas, foto aprobada, referencia única reutilizable en reintentos y expiración de 24 horas. La configuración bancaria y el flujo CEP/activación todavía requieren prueba end-to-end autenticada antes de cobrar.
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
1. Completar la migración de las secciones secundarias y retirar datos mock de eventos, propuestas, creadoras, lives, reportes y reservas.
2. Configurar y validar OAuth/redirect URLs y variables de entorno de EdgeOne.
3. Conectar registro/perfil a Supabase y probar edad/identidad/foto verificada desde el servidor.
4. Conectar matches mutuos, chat, reportes, bloqueos, creadoras, eventos, soporte y panel administrativo a tablas/RPC/Edge Functions reales.
5. Probar SPEI end-to-end: catálogo de planes, totales/IVA, CEP, expiración, revisión manual y activación idempotente tras confirmación.
6. Ejecutar build, pruebas de permisos/RLS, pruebas móviles y smoke tests en el dominio publicado.
7. Revisar aviso de privacidad, términos, política de reembolso y obligaciones legales con asesoría mexicana antes del lanzamiento.

## Criterio de verificación
Esta auditoría no afirma que el dominio publicado haya sido reparado ni que las funciones estén activas en producción. El cambio se entrega en una rama de revisión; debe compilarse, probarse y desplegarse desde el flujo autorizado antes de sustituir el sitio actual.


## Actualizaciones de reparación — 21 de octubre de 2026

La rama de reparación ahora también incluye:
- **Centro de seguridad visual** accesible desde la barra superior, con recomendaciones de consentimiento, privacidad de ubicación, reportes, bloqueos y acceso a reglas legales.
- **Reportes y bloqueos persistentes** desde Mensajes, conectados a `safety_reports` y `user_blocks`; la interfaz distingue errores de confirmación.
- **Chat con Supabase**: carga las conversaciones activas y mensajes de `chat_conversations` / `chat_messages`, usa Realtime cuando está disponible y guarda mensajes de texto en el servidor. Se retiraron las respuestas falsas del bot y los mensajes locales simulados. Audio/fotos siguen sin envío real y se informa al usuario.
- **Propuestas de experiencia**: creación y postulaciones usan `experience_proposals` y `experience_interests`, sujetas a las políticas RLS de perfil activo, edad, identidad y foto verificadas. El catálogo público carga propuestas activas; las pendientes no se publican automáticamente.
- **Se eliminaron datos iniciales de demostración** en eventos, propuestas, creadoras, transmisiones y reportes; ya no se muestran perfiles ficticios como si fueran miembros reales.
- **Se retiraron confirmaciones simuladas** de reservas, accesos virtuales, suscripciones de creadoras, recompensas y activación de membresías. Estas funciones permanecen bloqueadas hasta integrar sus flujos de servidor y pagos reales.
- **Ubicación**: el GPS ya no convierte todas las coordenadas mexicanas en San Luis Potosí ni inventa ciudad/distancias cuando se deniega el permiso.
- **Android**: se añadió configuración de Capacitor y un workflow de GitHub Actions para compilar un APK debug y publicarlo como artefacto de CI. El APK todavía no está generado ni probado en dispositivo; el artefacto aparecerá cuando el workflow se ejecute correctamente.

## Validación actualizada y límites
- La base de datos confirma políticas RLS para mensajes, bloqueos, reportes, propuestas e intereses. La creación de propuestas/intereses depende de verificación de edad, identidad y foto aprobada.
- El estado de Vercel en la rama reportó `build-rate-limit`; no es una prueba de compilación exitosa ni un diagnóstico de error de código. La conexión Vercel del equipo `chattoj` no autoriza inspeccionar los logs completos, por lo que no se puede certificar el despliegue.
- No se ejecutó un test end-to-end con dos cuentas verificadas; no se probó una transferencia SPEI/CEP real; no se confirmó el flujo Didit; no se obtuvo un APK instalable en este turno.
- Antes de producción siguen pendientes: conectar eventos/reservas, creadoras/contenido/lives y notificaciones al backend; finalizar verificación de identidad; revisar el flujo SPEI completo y activación idempotente; validar la compilación Vite/TypeScript y el APK en Android real; confirmar dominios/variables Supabase; revisar privacidad, términos y soporte legal.
