# Pagos de prueba con Wompi

La integración funciona exclusivamente con credenciales sandbox. Los precios se determinan en el servidor y se usa el checkout alojado de Wompi. Una transacción solo se refleja como aprobada tras consultarla directamente en la API sandbox y comprobar referencia, importe y moneda. Las notificaciones recibidas se validan con el secreto de eventos.

La URL de eventos de sandbox es `https://studyflow.bid/api/pagos/wompi/eventos`. Configúrala en el panel de Wompi del entorno de pruebas. Los estados y pedidos se almacenan en H2 en memoria y desaparecen al reiniciar o suspender el servicio. Si el servidor se reinicia durante un pago, no podrá asociarlo con el pedido anterior.

El plan mensual corresponde a 30 días y el semestral a 180 días; son pagos únicos simulados, sin renovación automática. La página muestra un historial de pruebas, pero no limita ni desbloquea características por plan; tampoco implementa prueba gratuita, cancelaciones o reembolsos.

Antes de aceptar dinero real: diseñar las reglas comerciales y de acceso, implementar almacenamiento persistente y conciliación resistente a reinicios, manejo de reembolsos, vencimientos, renovaciones y cancelaciones, y revisión de seguridad. Las claves sandbox y producción deben permanecer separadas y los secretos jamás deben ir al frontend.

Documentación oficial: https://docs.wompi.co/docs/colombia/widget-checkout-web/ y https://docs.wompi.co/docs/colombia/eventos/.
