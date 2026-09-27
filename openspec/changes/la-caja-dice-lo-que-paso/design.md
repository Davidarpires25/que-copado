# Design

## Context

Estados de un pedido (`lib/types/database.ts:883`): `abierto`, `recibido`,
`cuenta_pedida`, `pagado`, `entregado`, `cancelado`. El cobro lo registran las
funciones SQL de la línea base, que ponen `status = 'pagado'` y suman en los
totales de la sesión (`total_sales`, `total_cash_sales`, …). `entregado` viene
después, desde Pedidos, sobre algo que ya se cobró.

Cómo está hoy cada pieza:

- **Historial** (`pos-historial-tab.tsx`) recibe todos los pedidos de la sesión
  (`getSessionOrders` no filtra por estado). Clasifica en dos: `cancelado` o
  "lo demás". "Lo demás" se muestra `pagado`, con `payment_method`, que para un
  pedido sin cobrar vale `cash` por defecto. Los totales por medio y el total
  de la sesión suman "lo demás".
- **Cobro** (`use-payment-split.ts`): `payments` es lo confirmado, y `draft` el
  texto del monto que se está editando. `covered`, `remaining`, `change` y
  `cashReceived` se calculan solo con `payments`. `commit` aplica el `draft` con
  `applyPaymentAmount`, la misma regla que valida el servidor, y se dispara en
  `onBlur`, en Enter, al tocar otro medio o al cobrar.
- **Cierre**: `closeSession` (`app/actions/cash-register.ts`) lee la sesión y
  la actualiza, sin mirar mesas ni pedidos. `SessionCloseScreen` recibe
  `openTablesCount` (un número) y deshabilita el botón. El `Input` del contado
  tiene `autoFocus` y `onKeyDown Enter → handleClose()`, y `handleClose` solo
  chequea que haya un número. `summary` (de `getSessionSummary`) ya trae
  `orders` y `movements` de la sesión, y `currentCash` = apertura + ventas en
  efectivo + ingresos − retiros.

## Goals / Non-Goals

**Goals:**

- Una sola definición de "cobrado", usada por el Historial para el estado, el
  medio y los totales.
- El vuelto sale de la misma cuenta mientras se tipea y al confirmar.
- El cierre se valida en el servidor. La pantalla explica lo que el servidor
  va a rechazar, sin reemplazarlo.

**Non-Goals:**

- Cambiar cómo se registra un cobro o cómo se calculan los totales de la
  sesión. Esos ya son correctos: el error es de lectura.
- Rediseñar la pantalla de cierre (orden de las secciones, formato de horas,
  contado sin separador de miles). Eso va en el cambio de diseño.

## Decisions

### 1. "Cobrado" = `pagado` o `entregado`, en un solo lugar

Se agrega `estaCobrado(order)` junto a `sendsToKitchen`/`esPedidoRemoto` en
`lib/types/database.ts`, y el Historial la usa en todos lados:

| | Cobrado | Sin cobrar (`abierto`, `recibido`, `cuenta_pedida`) | Anulado |
|---|---|---|---|
| Estado | "Pagado" | "Sin cobrar" | "Anulado" |
| Medio | el registrado | "—" | el registrado, atenuado como hoy |
| Suma en totales | sí | no | no |

Los filtros de estado pasan a ser Todas · Pagadas · Sin cobrar · Anuladas. El
filtro por medio solo considera pedidos cobrados: un pedido sin cobrar no
aparece bajo "Efectivo".

*Alternativa descartada:* filtrar los no cobrados en `getSessionOrders`.
Ocultarlos también es mentir: el cajero necesita ver que hay pedidos
pendientes en su turno.

*Alternativa descartada:* mostrar el estado real ("Abierto", "Cuenta pedida").
Es más preciso pero pide saber qué significa cada estado. La pregunta del
cajero en el Historial es binaria: ¿se cobró o no?

### 2. El cobro calcula sobre una vista, no sobre lo confirmado

En `usePaymentSplit`:

```ts
const vista = editing
  ? applyPaymentAmount(payments, editing, parseARS(draft) ?? 0, total)
  : payments
```

`covered`, `remaining`, `isComplete`, `cashReceived` y `change` pasan a
calcularse con `vista`. `commit` no cambia: aplica el mismo `applyPaymentAmount`
sobre el mismo `draft`, así que lo que se ve es exactamente lo que queda.
`PaymentMethods` sigue mostrando el `draft` en el campo que se edita.

Mientras se escribe un monto menor al total, "Falta $X" se actualiza con cada
tecla. Es lo esperado: es el mismo número que aparecería al salir del campo.

*Alternativa descartada:* commit en cada `onChange`. `applyPaymentAmount`
reacomoda los demás medios; hacerlo en cada tecla movería montos de otras
filas mientras el cajero escribe ("1", "10", "100"…).

### 3. El cierre se valida en `closeSession`, en la misma ola

Antes del `update`, junto con la lectura de la sesión y con `Promise.all` (el
costo es por ola, no por consulta):

- mesas con `status <> 'libre'`: nombre y total del pedido;
- pedidos de la sesión con `status in ('abierto','cuenta_pedida')` y
  `order_type = 'mostrador'`: número y total.

Si hay alguno, devuelve un error que los nombra ("No se puede cerrar: Mesa 1
($54.500), pedido #50 ($65.900) sin cobrar") y no cierra.

*Riesgo aceptado:* entre la consulta y el `update` alguien podría abrir una
mesa. Con una sola caja por local es improbable, y cerrarlo del todo pediría
mover el cierre a una función SQL con bloqueo. No se justifica hoy. Queda
anotado.

### 4. La pantalla usa la misma regla que el servidor, y la dice junto al botón

- `caja-dashboard` pasa a `SessionCloseScreen` las mesas abiertas (nombre y
  total), no solo cuántas son. Los pedidos de mostrador sin cobrar salen de
  `summary.orders`, que ya viene. Los remotos sin cobrar llegan desde el
  estado de pendientes del POS, en `handleCloseSession`.
- `const bloqueos = [...mesas, ...pendientesDeMostrador]` y
  `puedeCerrar = hayContado && bloqueos.length === 0 && !loading`. El botón y
  el Enter usan `puedeCerrar`: el Enter deja de tener su propio camino.
- La lista de bloqueos va inmediatamente encima de los botones, no en el
  encabezado: quien tiene el botón deshabilitado está mirando ahí (lección 19).
  El aviso de pedidos remotos va en el mismo lugar, en tono de aviso y no de
  bloqueo.
- Si el servidor rechaza igual (algo cambió después de abrir la pantalla), su
  mensaje se muestra en ese mismo lugar, no solo en un toast.

### 5. El desglose del esperado sale del `summary`

Apertura, ventas en efectivo, ingresos y retiros son columnas de la sesión que
el `summary` ya trae, y `currentCash` es su suma. Se muestran como filas
encima del "Efectivo esperado", omitiendo ingresos y retiros cuando valen 0. La
sección "Movimientos de caja" que hoy existe aparte se absorbe acá: era el
mismo dato en otro lugar.

## Risks / Trade-offs

- **Un turno que hoy se cierra con un pedido de mostrador colgado dejará de
  poder cerrarse.** Es lo pedido. La salida es cobrarlo o cancelarlo, cosa que
  ya se puede desde los chips de pendientes (611a9ab).
- **Pedidos cobrados y después pasados a `entregado`** siguen contando como
  cobrados. Un pedido que alguien pasara de `recibido` a `entregado` a mano,
  sin cobrarlo, también contaría. Hoy nada en la caja hace ese salto. Si pasa
  desde Pedidos, es un problema de ese flujo, y queda anotado para revisarlo.
- **El vuelto que cambia con cada tecla** puede verse "saltar" al escribir
  (100 → vuelto 0, 1000 → 0, 100000 → 34.100). Solo se muestra cuando el
  efectivo supera el total, así que no titila en los montos intermedios.
