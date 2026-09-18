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

### Solo se saca la línea de pago

Se propuso un encabezado `CUENTA` y un pie distinto, para que el papel se
anuncie y nadie lo guarde como comprobante. **David vio los dos y eligió lo
mínimo.**

Es la decisión correcta de quien conoce el mostrador: el papel de antes de
cobrar se lo lleva alguien que está parado ahí, no viaja solo. El riesgo que
resolvía el encabezado —que se confunda con un comprobante— es hipotético; el
cambio que evita es real.

Queda como algo a agregar si alguna vez se confunden. Cambiar una palabra del
encabezado después es barato; lo que no se puede deshacer es imprimir "Efectivo"
en un pedido que nadie pagó.

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
