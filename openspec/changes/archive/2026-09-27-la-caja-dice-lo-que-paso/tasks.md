# Tasks

Todo corre contra el stack local de Supabase, nunca contra producción. La base
local puede tener datos de quien está probando la caja a mano, y nada de eso se
borra. El test respalda en disco la sesión abierta y las mesas ocupadas, las
estaciona (la sesión cerrada, las mesas libres), trabaja sobre una sesión
propia y al final las devuelve con sus valores exactos. Si al arrancar
encuentra un respaldo, es de una corrida cortada, y lo restaura primero. Solo
se borran los pedidos que creó el test.

## 1. Los tests primero

- [x] 1.1 Crear `e2e/caja-dice-lo-que-paso.spec.ts` con el marco de datos
      descrito arriba. Siembra por REST: un pedido de mostrador `abierto`, uno
      `pagado` en efectivo (con los totales de la sesión acordes), y una mesa
      abierta con pedido. Verifica: corre, limpia, y
      `cash_register_sessions?status=eq.open` queda igual que antes.
- [x] 1.2 Test "Historial": el pendiente y la mesa dicen "Sin cobrar" y no
      muestran medio. El total de la sesión es solo el cobrado y coincide con
      el "Vendido" de la barra. El filtro "Sin cobrar" deja solo los dos
      pendientes. Verifica: falla contra el código de hoy (muestra "Pagado").
- [x] 1.3 Test "vuelto": se abre el cobro de un pedido, se marca Efectivo, se
      tipea `100000` sin salir del campo y se esperan "Recibís" y "Vuelto" con
      los montos correctos. Verifica: falla hoy (el vuelto no aparece).
- [x] 1.4 Test "Enter con mesa abierta": en el cierre se tipea el contado, se
      aprieta Enter y la sesión sigue `open` en la base. Verifica: falla hoy
      (se reprodujo en la auditoría: la sesión queda `closed`).
- [x] 1.5 Test "pendiente de mostrador bloquea": sin mesas y con un pedido de
      mostrador `abierto`, el cierre no se puede confirmar y el pedido figura
      junto al botón con su número y monto. Verifica: falla hoy.
- [x] 1.6 Test "el servidor decide": se abre el cierre sin pendientes, se abre
      una mesa por REST (la pantalla no se entera), se confirma, y la sesión
      sigue `open` con el mensaje del servidor junto al botón. Verifica: falla
      hoy.
- [x] 1.7 Test "pedido web no bloquea": solo un pedido `recibido` de origen
      `whatsapp`. El cierre avisa que existe y se puede cerrar. Verifica: el
      aviso falta hoy. Después de cerrar, el test restaura la sesión como en 1.1.

## 2. Historial (Decisión 1)

- [x] 2.1 `estaCobrado(order)` en `lib/types/database.ts`: `pagado` o
      `entregado`. Verifica: `npm run lint` y el tipo exportado.
- [x] 2.2 `pos-historial-tab.tsx`: la fila muestra "Sin cobrar" y "—" en el
      medio para lo no cobrado. `paymentTotals`, `grandTotal` y
      `paymentCounts` suman solo lo cobrado. Filtros Todas · Pagadas · Sin
      cobrar · Anuladas. Verifica: pasa 1.2.

## 3. Vuelto (Decisión 2)

- [x] 3.1 `use-payment-split.ts`: los derivados se calculan sobre `vista`
      (`applyPaymentAmount` con el `draft` mientras hay un medio en edición).
      Verifica: pasa 1.3; `npm run check:pagos` sigue pasando.
- [x] 3.2 El pago registrado es el que se estaba viendo. Quedó como test ("se
      cobra lo que se estaba viendo"): cobra sin salir del campo y lee el
      pedido y la sesión por REST. Las dos pantallas de cobro mandan
      `aCobrar` (la vista) y no `payments`: `commit` es asíncrono, y leer
      `payments` justo después podía mandar el monto anterior.

## 4. Cierre (Decisiones 3, 4 y 5)

- [x] 4.1 `closeSession`: en la misma ola que la lectura de la sesión, mesas
      no libres y pedidos de mostrador de la sesión `abierto`/`cuenta_pedida`.
      Si hay alguno, devuelve un error que los nombra y no actualiza.
      Verifica: pasa 1.6.
- [x] 4.2 `SessionCloseScreen` recibe `quedaAbierto`: mesas abiertas con
      nombre y total, y la cantidad de pedidos remotos sin cobrar. Lo arma
      `pos-interface` al pedir el cierre, desde su propio estado (el que se
      está viendo), y no `caja-dashboard` como decía el diseño. Los de
      mostrador salen de `summary.orders`. Verifica: lint y tipos.
- [x] 4.3 `SessionCloseScreen`: `puedeCerrar` único para el botón y el Enter;
      la lista de bloqueos y el aviso de remotos, justo encima de los
      botones; el error del servidor en el mismo lugar (`role="alert"`).
      Verifica: pasan 1.4, 1.5 y 1.7.
- [x] 4.4 Desglose del esperado (apertura, ventas en efectivo, ingresos,
      retiros; los que valen 0 no se muestran), que absorbe la sección
      "Movimientos de caja". Verifica: el test "el efectivo esperado muestra
      de donde sale" (siembra un retiro y lee las filas).

## 5. Cierre del cambio

- [x] 5.1 Capturas del Historial, el cobro tipeando y el cierre con un
      bloqueo, mostradas a David. Verifica: su respuesta (2026-09-27, "me
      gustan las capturas").
- [x] 5.2 `npm run lint`, `npm run build`, `npm run check:pagos` y la suite
      e2e completa. Resultado: lint sin errores, build y `check:pagos` bien;
      la suite, 108 pasan y 9 fallan. Los 9 fallan igual con el código de
      `main` y los mismos datos (verificado): son bugs previos de otras
      pantallas que aparecen cuando la base tiene pedidos —la última suite en
      verde corrió con la base vacía—. Contraste del estado "Abierto" en
      Dashboard y Pedidos, hidratación en Arqueos, Dashboard y Pedidos, un
      botón de 28px y un encabezado vacío en Arqueos, desborde en Analytics.
      Quedan para un cambio aparte.
- [x] 5.3 En el local: el primer cierre de turno después de desplegar se mira
      con David. Verifica: su confirmación (2026-09-27, "el cierre de caja
      funciona bien").
- [x] 5.4 Lección en `tasks/lessons.md`: "Un valor por defecto de la base no
      es un hecho". Ya pasó dos veces con `payment_method`: en el ticket y en
      el Historial. Verifica: la entrada escrita.
