# AppSwinger: web, Android y acceso compartido

## Alcance de esta rama

Esta rama añade una base instalable para la web y un panel visual de instalación/permisos, sin reemplazar las pantallas existentes:
- Manifest PWA y service worker conservador.
- Fallback de conexión limitada.
- Panel con instalación web, permisos de ubicación/notificaciones y punto de descarga APK condicionado a una URL HTTPS real.
- El APK no se considera publicado hasta que exista un binario de release firmado y se configure `VITE_ANDROID_APK_URL`.

## Identidad compartida

La aplicación web ya usa Firebase Authentication y Cloud Firestore. La versión Android debe usar el mismo proyecto Firebase y el mismo UID de usuario, no crear una base de usuarios paralela. Si se empaqueta como Capacitor/WebView, se debe verificar el flujo de inicio de sesión Google en Android; si se usa autenticación nativa, intercambiar el token de proveedor por una credencial Firebase válida. No copiar tokens entre aplicaciones ni guardar contraseñas en localStorage.

## Administración

El acceso administrativo del cliente se ha cambiado para usar Firebase Authentication y comprobar el custom claim `admin === true`. No se acepta un correo/PIN local ni credenciales predeterminadas. El custom claim debe asignarse exclusivamente desde un entorno de servidor con Firebase Admin SDK; nunca desde el cliente. Las operaciones sensibles también deben estar protegidas por reglas de Firestore o backend, no solo por ocultar el panel.

Antes de producción:
1. Asignar el claim administrativo desde un entorno seguro a la cuenta correcta.
2. Auditar cada operación de AdminModal y garantizar que las reglas del backend exijan el claim.
3. Probar acceso y denegación en web y Android, y registrar las acciones administrativas.
4. Eliminar cualquier dato administrativo de demostración o métricas simuladas antes de usar el panel como contabilidad real.

## Verificación de identidad compartida

La verificación debe ser una sola fuente de verdad ligada al UID Firebase: web y Android inician el mismo flujo del proveedor, y el resultado se actualiza mediante webhook autenticado. No confiar en un resultado enviado por el cliente. La integración Didit y sus secretos siguen sujetos a su rama/PR y configuración segura; no incluir API keys en este repositorio ni en el APK.

## Permisos

- Ubicación: pedirla cuando el usuario active recomendaciones por distancia.
- Notificaciones: pedir permiso con una acción explícita; el permiso por sí solo no configura el servicio push.
- Cámara/micrófono: pedirlos solo al comenzar la función que los necesita, como la verificación. No pedirlos todos durante la instalación.
- En navegador, las solicitudes requieren HTTPS y dependen de las capacidades del navegador.
- En APK nativo se deben declarar los permisos mínimos en AndroidManifest.xml y solicitar los permisos runtime al momento de uso. Esta rama no contiene todavía un proyecto Android nativo generado ni un APK firmado.

## Publicación de APK

1. Generar el proyecto Android con la herramienta elegida (por ejemplo, Capacitor) y validar login, verificación, permisos, enlaces y navegación.
2. Compilar un APK release, firmarlo y comprobar que la clave de firma se conserva de forma segura.
3. Publicar el archivo bajo una URL HTTPS estable y configurar `VITE_ANDROID_APK_URL` en el entorno de compilación.
4. Verificar el archivo descargado, la firma, versión, SHA-256 y el flujo de instalación en un Android limpio.
5. Mantener la web disponible por separado; instalar la PWA no debe sustituir ni borrar la aplicación nativa.

## Límites conocidos

Esta rama no activa cobros reales ni constituye por sí sola el APK. El panel muestra “Pendiente” hasta que la URL del instalador esté configurada. La validación de pagos SPEI, la verificación Didit y las operaciones administrativas reales requieren sus respectivos servicios, reglas, secretos y pruebas de integración.
