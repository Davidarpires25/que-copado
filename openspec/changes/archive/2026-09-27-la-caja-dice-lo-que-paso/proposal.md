# Proposal

## Why

La spec `caja` se apoya en una idea: **un papel dice lo que ya pasó, no lo que
el sistema supone**. Se cumplió para el ticket impreso, pero en pantalla sigue
sin cumplirse. La auditoría de diseño de la caja del 2026-09-26 se hizo con un
menú realista en la base local y encontró cuatro lugares donde la caja muestra
plata que no existe, o esconde la que sí existe. En uno de ellos, además, se
cierra el turno cuando no debería poder cerrarse.

## Qué se rompe hoy en el local

- **El Historial cuenta como cobrado lo que no se cobró.** Con 2 pedidos de
  mostrador pendientes y 2 mesas abiertas, sin cobrar nada, el Historial listó
  las 4 ventas como "Pagado · Efectivo" y "Total sesión $152.900". La barra de
  arriba decía "Vendido $0" y el cierre, "Total ventas $0". Es la misma falla
  que ya se arregló en el ticket: el pedido nace con `payment_method = cash`
  como valor de arranque, y `pos-historial-tab.tsx:170` marca como `pagado`
  todo lo que no está cancelado.
- **El vuelto no aparece mientras se tipea.** El cajero pone $100.000 en
  Efectivo para un total de $65.900 y no ve nada hasta tocar afuera o apretar
  Enter. El monto recién se aplica en `onBlur`. La renovación del Cobro
  (f6012e9) hizo del vuelto el número más grande de la pantalla, pero justo
  mientras se lo necesita no está.
- **Enter cierra la caja con mesas abiertas.** Con la Mesa 1 abierta,
  "Confirmar Cierre" está deshabilitado. Pero el campo "Efectivo contado" tiene
  `autoFocus` y cierra con Enter, y `handleClose` no mira las mesas. El
  servidor (`closeSession`) tampoco: se reprodujo y la sesión quedó `closed`
  con la mesa colgando de un turno cerrado. Tipear el conteo y apretar Enter es
  el gesto natural en esa pantalla.
- **El cierre no ve los pedidos de mostrador sin cobrar.** Avisa "2 mesas
  abiertas" pero nada de los pendientes de mostrador ($82.900 en la prueba), y
  deja cerrar con ellos adentro. El aviso de mesas está arriba de todo, lejos
  del botón que deshabilita: quien no puede cerrar no ve por qué (lección 19).
- **El efectivo esperado no se puede chequear.** El cierre muestra "Efectivo
  esperado $46.000" sin su origen (apertura + ventas en efectivo + ingresos −
  retiros). Si hay faltante, no hay forma de ver de dónde sale sin hacer la
  cuenta aparte. Es la misma regla que la renovación aplicó al vuelto: "un
  vuelto sin su origen no se puede chequear".

## What Changes

- **Historial:** un pedido abierto, recibido o con la cuenta pedida se muestra
  "Sin cobrar", sin medio de pago, y no suma en el total de la sesión ni en los
  totales por medio. El total del Historial coincide siempre con el "Vendido"
  de la barra de turno. Se agrega el filtro "Sin cobrar" junto a "Pagadas" y
  "Anuladas".
- **Cobro:** el resto, el vuelto y el "Recibís" se calculan con lo que se está
  tipeando, con la misma regla (`applyPaymentAmount`) que se aplica al
  confirmar. Lo que se ve mientras se tipea es lo que queda al confirmar.
- **Cierre:** no se puede cerrar con mesas abiertas ni con pedidos de
  mostrador de ese turno sin cobrar. Se valida en el servidor, que es la
  garantía, y en la pantalla, que es la explicación. Enter respeta la misma
  regla que el botón. Lo que impide cerrar se lista junto al botón, con cada
  mesa o pedido y su monto.
- **Cierre:** el efectivo esperado se muestra con su desglose.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `caja`: se agregan requisitos para lo que la pantalla muestra como cobrado,
  para el vuelto mientras se tipea y para cuándo se puede cerrar el turno. El
  propósito ya cubre esto ("un papel dice lo que ya pasó"). Se amplía de
  "papel" a "lo que la caja muestra".

## Fuera de alcance

- **Diseño y ley de Hick** (orden de la grilla, categorías, avisos al agregar,
  chips de pendientes, carrito que no entra, tokens semánticos). Van en un
  cambio aparte, que requiere decisiones de diseño. Este cambio es de números.
- **Efectivo marcado por defecto en el cobro.** David eligió que el medio se
  elija siempre. El cobro por comensal, que hoy sí marca Efectivo, no se toca
  acá.
- **Pedidos web o de WhatsApp sin cobrar al cierre.** No bloquean. Nacen sin
  turno y entran al de quien los cobra, así que no son de este turno. Uno
  viejo sin atender dejaría la caja sin poder cerrarse nunca. Se muestran como
  aviso, sin bloquear.
- **Arqueos (`/admin/caja/arqueos`).** Leen sesiones ya cerradas, con los
  totales que calcula la base. No se vio el problema ahí.

## Toca AgentePOS

No. Los pedidos del agente entran como `recibido` y se cobran en la caja como
cualquier otro. Este cambio solo cambia cómo se muestran y el cierre del turno,
y el contrato HTTP no cambia.

## Impact

- `components/admin/caja/pos-historial-tab.tsx`: estado, medio y totales.
- `lib/hooks/use-payment-split.ts`: lo que se muestra mientras se edita un
  monto.
- `components/admin/caja/session-close-screen.tsx` y
  `app/admin/caja/caja-dashboard.tsx`: qué impide cerrar, dónde se dice, y el
  desglose del esperado.
- `app/actions/cash-register.ts` (`closeSession`): validación antes de cerrar.
- Tests: `e2e/` (Playwright contra la base local) y `npm run check:pagos`.
