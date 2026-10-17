# AppSwinger — decisión de métodos de pago

## Decisión de producto
- No integrar Stripe en el flujo de membresías de AppSwinger.
- Métodos contemplados para evaluar e implementar: SPEI para transferencias nacionales y SWIFT para transferencias bancarias internacionales.
- No habilitar cobros reales hasta que el titular confirme la cuenta receptora, se valide la conciliación y se revise el cumplimiento fiscal y legal.
- PayPal y Google Pay quedan fuera del alcance inicial; no anunciarlos como métodos disponibles hasta verificar por escrito que el proveedor acepta el modelo concreto de AppSwinger, su contenido y sus operaciones en México.

## SPEI
1. Crear una orden pendiente en el servidor con ID de referencia único, usuario, plan, importe, moneda y vencimiento.
2. Mostrar los datos bancarios y la referencia exacta de la orden.
3. Confirmar el pago mediante una fuente bancaria o proveedor de conciliación fiable. Un comprobante o captura enviado por el usuario no basta para activar una membresía.
4. Evitar duplicados mediante una clave de operación y restricciones únicas en la base de datos.
5. Activar el plan solo después de confirmar importe, cuenta receptora, referencia y estado de la transferencia.
6. Gestionar pendientes, expiración, reembolsos, contracargos no aplicables a SPEI, discrepancias y revisión manual.

## SWIFT
1. Mostrar únicamente instrucciones internacionales verificadas: nombre legal del beneficiario, banco, dirección si se requiere, SWIFT/BIC, cuenta/IBAN si corresponde, moneda y referencia.
2. Informar antes del pago que bancos intermediarios pueden cobrar comisiones y que el tiempo de abono varía.
3. No activar la membresía a partir de un recibo; esperar la confirmación del banco receptor y conciliar importe, moneda, remitente y referencia.
4. Definir cómo tratar importes netos inferiores por comisiones, transferencias sin referencia, devoluciones y tipo de cambio.
5. No solicitar al usuario información bancaria sensible que no sea necesaria.

## Separación técnica y seguridad
- Las órdenes y la activación de membresías se gestionan en backend; nunca confiar en importes ni estados enviados por el navegador.
- Mantener un registro auditable de órdenes, pagos confirmados, activaciones, cancelaciones y devoluciones.
- No guardar datos completos de tarjetas ni credenciales bancarias.
- No incluir secretos en el frontend ni en el repositorio.
- La maqueta actual es demostrativa: no crea órdenes bancarias ni procesa transferencias.

## Antes de producción
- Confirmar el banco receptor y si ofrece API/avisos de abono o conciliación automatizada.
- Definir moneda de precios, conversión para SWIFT, comisiones, IVA, facturación y política de devoluciones con asesoría fiscal/legal mexicana.
- Revisar las condiciones de aceptación de cada proveedor para una comunidad de citas y contenido adulto.
- Ejecutar pruebas de duplicados, referencias incorrectas, pagos parciales, retrasos, devoluciones y conciliación antes de habilitar membresías de pago.
