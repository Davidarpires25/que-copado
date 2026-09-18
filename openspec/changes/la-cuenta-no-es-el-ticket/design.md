# Design

## Context

- El ticket del cliente y la comanda de cocina son el mismo componente,
  `ticket-print-layout.tsx`, con una bifurcación por `isKitchen`.
- El mismo componente sirve a cuatro botones: el panel de cobro pendiente, el de
  mesa, el historial y el mostrador.
- `orders.payment_method` es nullable y **no tiene default en la base**: el
  `'cash'` lo ponen el código y la RPC al crear.

## Decisions

### El papel se decide por si está cobrado, no por desde dónde se imprime

`order.status === 'pagado'` es la señal. No hay columna `paid_at`, y el estado
ya distingue lo que hace falta: `abierto`, `recibido` y `cuenta_pedida` son
antes; `pagado` es después.

**Por qué no un parámetro en cada botón:** son cuatro lugares y el próximo que
se agregue se olvida. Es el mismo olvido que hizo que el combo saliera sin tope
en tres caminos y que el pedido de WhatsApp no apareciera en caja. El papel se
mira a sí mismo.

### La cuenta dice que es una cuenta

Encabezado distinto —`CUENTA` en vez de nada— y sin la línea de pago. Con eso,
quien lo recibe sabe que no es un comprobante y quien lo imprime ve enseguida
si se equivocó de botón.

**Alternativa considerada: dejar solo el total, sin encabezado.** Es lo que
propuso David y resuelve la mentira. Se le agrega el encabezado porque un ticket
al que le falta la línea de pago no se lee como "otro documento", se lee como un
ticket incompleto — y el papel sale de una impresora térmica, sin más contexto
que lo que dice.

### El `'cash'` al crear queda para después

Se evalúa y se deja fuera. Sacarlo es lo correcto —un pedido abierto no se pagó
de ninguna forma— pero `payment_method` lo leen la apertura de caja, los totales
por método y el cobro. Tocarlo sin revisar esos caminos cambia un bug visible
por uno silencioso, que es exactamente lo que este cambio viene a corregir.

Con el ticket arreglado, el dato ya no se muestra donde no corresponde. Queda
anotado en el proposal.

## Risks

**Un ticket ya impreso antes de cobrar no se reimprime solo.** Si alguien guardó
uno de esos papeles como comprobante, sigue diciendo "Efectivo". Nada que el
código pueda hacer; vale saberlo.
