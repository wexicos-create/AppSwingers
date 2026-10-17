# Distribución del APK

Esta carpeta está preparada para publicar el instalador Android firmado.

Antes de anunciar una descarga:
1. Generar y probar el APK de release desde el proyecto Android/Capacitor.
2. Firmarlo con la clave de lanzamiento custodiada por el propietario.
3. Subir el binario final como `AppSwinger.apk` a esta carpeta o a un hosting de descargas controlado.
4. Configurar `VITE_ANDROID_APK_URL` con la URL HTTPS final.
5. Verificar checksum SHA-256, versión, firma y que la URL descarga el archivo real.

No colocar keystores, contraseñas de firma ni secretos dentro de esta carpeta o del repositorio.
