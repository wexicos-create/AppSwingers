# Notificaciones push reales (alarma "hoy es tu evento") y permisos del dispositivo

## Resumen de la implementacion

- `src/push.ts`: cliente FCM en la app. Pide el permiso de notificaciones, registra el token de cada dispositivo en `users/{uid}/fcm_tokens/{token}` y muestra las notificaciones en primer plano.
- `public/firebase-messaging-sw.js`: service worker de FCM. Muestra la alarma cuando la app esta cerrada o en segundo plano y enfoca la app al tocarla.
- `functions/index.js`: servidor real. Funcion programada (09:00, 14:00 y 19:00, hora de Mexico) que recorre los pases activos, detecta los asistentes con evento HOY y envia el push FCM; ademas escribe la notificacion en la coleccion `notifications` y avisa al organizador. Cada pase recibe la alarma una sola vez al dia (marca `pushNotifiedOn`).
- `src/permissions.ts` y `src/components/DevicePermissionsCard.tsx`: gestion centralizada de permisos de camara, microfono, ubicacion y notificaciones, con panel de control en la pestana Perfil.
- `public/manifest.webmanifest` + `public/icon.svg` + metadatos en `index.html`: instalacion como PWA.
- `vercel.json` + `firebase.json`: politica de permisos (Permissions-Policy: camera, microphone, geolocation) y configuracion de despliegue.

## Pasos de configuracion (una sola vez)

### 1. Clave publica Web Push (VAPID)

1. Firebase Console → Configuracion del proyecto → Cloud Messaging → pestana Web Push → Generar par de claves.
2. Copie la clave publica.
3. En Vercel: proyecto AppSwinger.live → Settings → Environment Variables → agregue `VITE_FIREBASE_VAPID_KEY` con esa clave (entornos Production, Preview y Development) y haga Redeploy.
4. Localmente: copie `.env.example` a `.env` y ponga la misma clave.

Sin esta clave el registro de token no se completa; con ella, el flujo queda automatico.

### 2. Desplegar las Cloud Functions (servidor)

Las funciones programadas requieren el plan Blaze (pay-as-you-go) del proyecto Firebase; el consumo de una funcion diaria con pocos cientos de pases es practicamente nulo (una ejecucion diaria x3 y llamadas FCM gratuitas dentro de los limites de Google).

```bash
npm install -g firebase-tools
firebase login
firebase use groovy-outcome-g8f9p
firebase deploy --only functions
```

La funcion apunta por defecto a la base de datos `ai-studio-bae18161-c5ba-4b69-99f2-4a83f48a6d69` (la misma de la app). Si cambia de base, defina `FIREBASE_DATABASE_ID` antes de desplegar:

```bash
firebase deploy --only functions --set-env-vars FIREBASE_DATABASE_ID=ai-studio-bae18161-c5ba-4b69-99f2-4a83f48a6d69
```

### 3. Verificar

1. Abra AppSwinger.live, inicie sesion y en Perfil → Permisos del dispositivo toque Permitir en Notificaciones push.
2. Prueba tecnica del circuito completo (opcional): en Firebase Console → Functions → pushHealthCheck → pestana Testing, llame la funcion autenticado; debe responder `devicesNotified >= 1` y el dispositivo debe mostrar el aviso de prueba.
3. Cree un pase de prueba con fecha de hoy (o espere a un evento real): a las 09:00, 14:00 o 19:00 el asistente recibira el "Hoy es tu evento" con titulo, hora, zona y codigo de acceso.

## Permisos del dispositivo

| Permiso | Uso en la app | Como se solicita |
| --- | --- | --- |
| Notificaciones | Alarma del dia del evento, avisos de pase, donacion y soporte | Panel Permisos del dispositivo; tambien al iniciar sesion si ya estaba concedido |
| Camara | Verificacion de identidad (INE/selfie) y videollamadas WebRTC | Al usar la funcion (getUserMedia) o pre-concederlo desde el panel |
| Microfono | Videollamadas y notas de voz | Al iniciar la videollamada o pre-concederlo desde el panel |
| Ubicacion | Radio de busqueda y eventos cercanos | Al usar el mapa o pre-concederla desde el panel |

Notas:

- En web, la camara, el microfono y la ubicacion se piden en el momento de uso mediante APIs del navegador; no existen en un manifiesto web (a diferencia de Android/iOS nativo). El encabezado Permissions-Policy en `vercel.json` declara que la app es consumidor legitimo de esas APIs.
- Si en el futuro empaqueta la PWA como APK con PWABuilder (TWA), el generador declara automaticamente `CAMERA`, `RECORD_AUDIO`, `POST_NOTIFICATIONS` y `ACCESS_FINE_LOCATION` porque el sitio los solicita; verifiquelos en la pestana Permissions del generador y agregue Digital Asset Links (`/.well-known/assetlinks.json`) si el permiso en pantalla completa es requerido.
- Si un permiso figura como Bloqueado, el usuario debe rehabilitarlo desde el candado de la barra de direcciones del navegador; la app no puede revertir un bloqueo por si misma.

## Seguridad

- Los tokens FCM se guardan en una subcoleccion propiedad del usuario (`users/{uid}/fcm_tokens`), ya cubierta por las reglas de Firestore vigentes; ningun otro usuario puede leerlos ni escribirlos.
- El envio desde el servidor usa el Admin SDK, que no depende de las reglas del cliente, y la funcion de prueba exige sesion iniciada.
- Los tokens invalidos se eliminan automaticamente cuando el navegador los descarta.
