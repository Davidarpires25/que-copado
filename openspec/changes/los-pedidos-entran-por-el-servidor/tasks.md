# Tasks

- [x] 1.1 Test: sin sesión no se puede insertar en `orders` ni en
      `order_status_history`, ni llamar a `crear_pedido_remoto`; un cajero sí
      puede crear un pedido de mostrador. Verifica: falla con las reglas de hoy.
- [x] 1.2 `createOrder` con la clave de servicio para la función y el
      historial. Verifica: los tests del agente y de pedidos.
- [x] 1.3 Migración. Verifica: 1.1 pasa en local; tienda, agente y caja en
      verde.
      Hecho (1.1 a 1.3): `e2e/pedidos-seguros.spec.ts`, 4 tests; con las
      reglas de hoy fallan los tres "sin sesión" (verificado). Con la
      migración en local pasan; agente, caja, mesas, pedidos y facturas 51/51.
- [ ] 1.4 Producción: desplegar el código, aplicar la migración, y comprobar
      con una llamada sin sesión que la base la rechaza (403) y que la tienda
      sigue creando pedidos.
