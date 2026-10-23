# Notificaciones push reales (alarma "hoy es tu evento") - opcion 100% gratuita

## Resumen de la implementacion

- `src/push.ts`: cliente FCM en la app. Pide el permiso de notificaciones, registra el token de cada dispositivo en `users/{uid}/fcm_tokens/{token}` y muestra las notificaciones en primer plano.
- `public/firebase-messaging-sw.js`: service worker de FCM. Muestra la alarma cuando la app esta cerrada o en segundo plano y enfoca la app al tocarla.
- `api/event-day-alarm.js`: servidor de la alarma SIN COSTO. Es una funcion serverless de Vercel que Vercel Cron (incluido en el plan Hobby) invoca una vez al dia. Recorre los pases activos, detecta los asistentes con evento HOY (America/Mexico_City, mismo parser tolerante de fechas que la app), envia el push FCM real, escribe la notificacion dentro de la app (`notifications`) y avisa al organizador con el resumen de pases. Cada pase recibe la alarma una sola vez al dia (marca `pushNotifiedOn`).
- `functions/` (opcional): la misma logica como Cloud Function programada de Firebase, disponible si en el futuro se migra al plan Blaze; NO es necesaria para operar.
- `src/permissions.ts` y `src/components/DevicePermissionsCard.tsx`: gestion centralizada de permisos de camara, microfono, ubicacion y notificaciones, con panel en la pestana Perfil.
- `public/manifest.webmanifest` + `public/icon.svg` + metadatos en `index.html`: instalacion como PWA.
- `vercel.json` + `firebase.json`: politica de permisos (Permissions-Policy: camera, microphone, geolocation), tarea programada (`crons`) y configuracion de despliegue.

## Por que NO se necesita MySQL ni pagar Firebase

El unico elemento que exijia facturacion en Firebase eran las Cloud Functions programadas (plan Blaze). Esa responsabilidad se traslado al servidor gratuito de Vercel:

| Componente | Plan | Costo |
| --- | --- | --- |
| Hosting y dominio | Vercel Hobby + dominio propio | Gratis (dominio ya pagado) |
| Tarea programada de la alarma | Vercel Cron (1 vez al dia, plan Hobby) | Gratis |
| Envio de push | Firebase Cloud Messaging | Gratis |
| Base de datos | Firestore plan Spark: 50,000 lecturas, 20,000 escrituras y 20,000 eliminaciones por dia, 1 GiB de almacenamiento | Gratis |
| Autenticacion | Firebase Auth (50,000 usuarios activos mensuales) | Gratis |

MySQL no es necesario: la plataforma ya esta construida sobre Firestore, y la cuota gratuita de Spark cubre con holgura el volumen actual (la purga mensual de pases mantiene la coleccion pequena). Migrar a MySQL implicaria reescribir toda la capa de datos sin reducir el costo, que ya es cero.

Nota del plan Hobby: el cron se invoca una vez al dia, dentro de la hora programada (15:00 UTC = 09:00 en Mexico). Quien compre su pase despues de esa hora igual ve la alarma al abrir la app (la app siempre verifica "hoy es tu evento" al entrar) y recibe el push del dia siguiente a traves de la notificacion in-app.

## Pasos de configuracion (una sola vez, todo gratuito)

### 1. Clave publica Web Push (VAPID)

1. Firebase Console → Configuracion del proyecto → Cloud Messaging → pestana Web Push → Generar par de claves.
2. En Vercel: proyecto app-swingers → Settings → Environment Variables → agregue `VITE_FIREBASE_VAPID_KEY` con la clave publica (Production, Preview y Development) → Redeploy.
3. Localmente: copie `.env.example` a `.env` y ponga la misma clave.

### 2. Cuenta de servicio (credenciales del servidor de la alarma)

1. Firebase Console → Configuracion del proyecto → Cuentas de servicio → Generar nueva clave privada (descarga un JSON).
2. En Vercel → Settings → Environment Variables, agregue (Production, Preview y Development):
   - `FIREBASE_PROJECT_ID` → campo `project_id` del JSON (`groovy-outcome-g8f9p`).
   - `FIREBASE_CLIENT_EMAIL` → campo `client_email` del JSON.
   - `FIREBASE_PRIVATE_KEY` → campo `private_key` completo del JSON (con `-----BEGIN PRIVATE KEY-----` y sus saltos de linea; en el editor de Vercel peguelo en una sola linea tal como viene).

### 3. Secreto del cron

En la misma seccion agregue `CRON_SECRET` con una cadena aleatoria de al menos 16 caracteres (un generador de contrasenas sirve). Vercel la inyecta automaticamente como encabezado `Authorization: Bearer` en cada invocacion del cron, y el endpoint rechaza cualquier llamada sin ese secreto.

### 4. Verificar

- Prueba tecnica del circuito completo (reemplace VALORES):

```bash
curl "https://appswinger.live/api/event-day-alarm?mode=test&uid=SU_UID&key=CRON_SECRET"
```

Debe responder `{"ok":true,"devicesNotified":1,...}` y el dispositivo con sesion iniciada muestra "Prueba de notificaciones".

- Ejecucion manual de la alarma diaria:

```bash
curl "https://appswinger.live/api/event-day-alarm?key=CRON_SECRET"
```

Devuelve el resumen del dia: `{"ok":true,"today":"...","passesToday":N,"usersNotified":N,"organizersNotified":N}`.

- Automatica: a partir del dia siguiente, Vercel Cron ejecuta la alarma cada dia a las 09:00 (hora de Mexico). El historial de invocaciones queda en Vercel → proyecto app-swingers → Observability / Deployments → Cron Jobs.

## Permisos del dispositivo

| Permiso | Uso en la app | Como se solicita |
| --- | --- | --- |
| Notificaciones | Alarma del dia del evento, avisos de pase, donacion y soporte | Panel Permisos del dispositivo; tambien al iniciar sesion si ya estaba concedido |
| Camara | Verificacion de identidad (INE/selfie) y videollamadas WebRTC | Al usar la funcion (getUserMedia) o pre-concederlo desde el panel |
| Microfono | Videollamadas y notas de voz | Al iniciar la videollamada o pre-concederlo desde el panel |
| Ubicacion | Radio de busqueda y eventos cercanos | Al usar el mapa o pre-concederla desde el panel |

Notas:

- En web, la camara, el microfono y la ubicacion se piden en el momento de uso mediante APIs del navegador; no existen en un manifiesto web (a diferencia de Android/iOS nativo). El encabezado Permissions-Policy en `vercel.json` declara que la app es consumidor legitimo de esas APIs.
- Si en el futuro empaqueta la PWA como APK con PWABuilder (TWA), el generador declara automaticamente `CAMERA`, `RECORD_AUDIO`, `POST_NOTIFICATIONS` y `ACCESS_FINE_LOCATION` porque el sitio los solicita; verifiquelos en la pestana Permissions del generador.
- Si un permiso figura como Bloqueado, el usuario debe rehabilitarlo desde el candado de la barra de direcciones del navegador; la app no puede revertir un bloqueo por si misma.

## Seguridad

- Los tokens FCM se guardan en una subcoleccion propiedad del usuario (`users/{uid}/fcm_tokens`), ya cubierta por las reglas de Firestore vigentes; ningun otro usuario puede leerlos ni escribirlos.
- El endpoint de la alarma solo acepta llamadas con el secreto `CRON_SECRET` (encabezado Bearer de Vercel o parametro `key`); cualquier otra peticion recibe 401.
- Las credenciales del servidor viven solo como variables de entorno de Vercel, nunca en el repositorio.
- Los tokens invalidos se eliminan automaticamente cuando el navegador los descarta.
- La coleccion `notifications` ya esta reglamentada en firestore.rules: cada usuario lee y escribe solo sus propias notificaciones.
