# AppSwinger — seguridad y preparación de lanzamiento

## Estado de esta rama

Esta rama endurece varias partes del prototipo, pero **no significa que la aplicación esté lista para cobrar o publicarse**. El cliente actual usa React/Vite y Firebase Authentication/Firestore. Algunas funciones de creadores, chat, eventos, perfiles y moderación siguen siendo locales o de demostración; no deben anunciarse como flujos persistentes en servidor hasta integrarlas y probarlas.

## Cambios de seguridad

- Los privilegios de administración se validan mediante la custom claim `admin: true` del token de Firebase Authentication. No se confía en contraseñas, PIN, `localStorage`, UID literal ni un campo `isAdmin` editable por el cliente.
- Las reglas de Firestore limitan los documentos de usuario a su propietario y administradores autorizados, restringen campos de privilegio y deniegan acceso por defecto.
- Los perfiles de muestra no muestran estado de verificación concedido. En desarrollo aparece un aviso de demostración; la compilación de producción inicia sin perfiles ficticios.
- Las funciones de pago no crean transacciones confirmadas ni conceden acceso simulado.
- Se redujeron los datos personales que se escriben en mensajes de error de Firestore.
- CI ejecuta el chequeo TypeScript y la compilación de producción.

## Administrador: configuración obligatoria

1. Inicia sesión en Firebase Authentication con la cuenta administrativa real.
2. Desde un entorno de servidor confiable con Firebase Admin SDK, asigna la custom claim `admin: true` al UID correcto. Nunca incluyas credenciales de service account, claves privadas ni lógica de asignación de roles en el frontend.
3. Fuerza una renovación de token o cierra y vuelve a abrir sesión para que la claim se refleje.
4. Prueba con cuentas separadas: administrador, usuario normal y usuario no autenticado. La cuenta normal no debe poder leer datos privados de otras personas ni cambiar verificación, rol, estado o membresía.
5. Revisa las reglas en el emulador de Firebase antes de desplegarlas. Las reglas nuevas son intencionalmente más restrictivas y pueden requerir adaptar consultas actuales.

## Monetización acordada

- Prime: **$350 MXN al mes antes de IVA**; total ilustrativo con IVA del 16%: **$406 MXN**.
- Gold: **$500 MXN al mes antes de IVA**; total ilustrativo con IVA del 16%: **$580 MXN**.
- Comisión objetivo de creadores: **10%**, pendiente de implementar en un flujo de liquidación y reportes validado.
- Los eventos se mantienen como concepto separado de la membresía. No debe calcularse ni reportarse un impuesto sobre ingresos de eventos que la plataforma no recauda.
- SPEI/CEP, Google Pay y Stripe no se deben habilitar hasta que exista verificación del lado servidor, control de duplicados, conciliación, reembolsos, webhooks autenticados y pruebas de impuestos.
- El frontend no es una fuente válida para confirmar pagos, membresías, comisión de creadores, ventas ni IVA. Esos estados deben ser calculados y escritos por backend confiable.

## Puertas de salida antes de producción

- [ ] Ejecutar CI y corregir cada error de tipo o compilación.
- [ ] Validar reglas con Firebase Emulator Suite y confirmar el identificador exacto de la base Firestore usada por la aplicación.
- [ ] Separar datos públicos de perfil de información privada de cuenta, identidad, reportes y pagos.
- [ ] Implementar almacenamiento privado con reglas de acceso para fotos, INE/selfie y contenido de creadores; no guardar documentos de identidad en colecciones públicas.
- [ ] Implementar revisión de identidad y consentimiento real. No mostrar una insignia verificada hasta que un proceso de revisión confiable la conceda.
- [ ] Implementar backend para reportes, bloqueos, moderación, chat, eventos, membresías, contenido y registros fiscales.
- [ ] Integrar proveedor de pagos en servidor y verificar firmas de webhook, idempotencia, estados de pago, cancelaciones y reembolsos.
- [ ] Validar tratamiento de IVA/CFDI y obligaciones fiscales con especialista mexicano.
- [ ] Configurar hosting y dominio, política de privacidad, términos, eliminación de cuenta y exportación de datos.
- [ ] Compilar y probar el APK en dispositivos Android reales; este repositorio por sí solo no contiene todavía un proyecto Android nativo verificado.

**Regla de operación:** los cobros permanecen deshabilitados hasta terminar las pruebas técnicas y recibir autorización expresa para activarlos.
