# Proposal

## Why

David: *"si le da a imprimir antes de darle al botón cobrar, marca el efectivo,
lo cual no debería ser así"*.

El pedido nace diciendo que se paga en efectivo. Está escrito así a propósito,
con el comentario al lado:

```ts
payment_method: 'cash', // default, will be set on payment
```

Y lo mismo en la RPC de mostrador, que inserta `'cash'` al crear el pedido.

El ticket no pregunta si eso pasó: imprime siempre la línea de pago.

```tsx
<span>{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</span>
<span>{cashReceived ? formatPrice(cashReceived) : formatPrice(displayTotal)}</span>
```

Con lo cual, el papel que se imprime **antes de cobrar** dice "Efectivo
$15.000" de un pedido que nadie pagó, y de un cliente que capaz paga con
tarjeta. Hoy hay un pedido `abierto` en producción con `payment_method = 'cash'`
sin haber sido cobrado.

Y el botón que lo imprime está justo ahí: en el panel de cobro, arriba a la
derecha, al lado del de la comanda.

## Lo que falta no es solo esa línea

Son dos papeles distintos y hoy hay uno solo:

- **La cuenta**, antes de pagar: lo que se debe. Ítems y total. Es lo que se le
  lleva a la mesa para que decida cómo paga.
- **El ticket**, después de pagar: lo que se pagó. Ítems, total, con qué se pagó
  y el vuelto.

Se propuso además que el papel se anunciara —un encabezado `CUENTA` y un pie
distinto— para que nadie lo confunda con un comprobante. **David lo miró y eligió
lo mínimo: sacar la línea de pago y nada más.** Es su papel y su mostrador; el
encabezado queda como algo a agregar si alguna vez se confunden.

## El ticket se arma en dos repos, no en uno

Esto apareció al preguntar David si había que tocar el programa de la impresora.
**Sí, y es donde importa.**

El papel real no sale del HTML. `printClientTicketAction` encola una fila en
`print_jobs` con los datos del ticket, y el bridge —C#, repo aparte
`print-bridge`— la lee de Supabase y arma el ESC/POS. El layout HTML es lo que
se ve en pantalla y lo que sale si se imprime desde el navegador.

Así que el mismo ticket está formateado en tres lugares:

| dónde | qué es |
|---|---|
| `components/admin/caja/ticket-print-layout.tsx` | lo que se ve en pantalla |
| `app/actions/print.ts` | lo que se encola para la impresora |
| `print-bridge` → `src/PrintBridge/Impresora.cs:112` | lo que sale por la térmica |

Los tres imprimían el medio de pago sin condición. Arreglar solo el primero
—que fue el primer intento— deja el bug vivo en el papel.

## What Changes

- **Antes de cobrar, la línea de pago no se imprime.** Queda el total, que es lo
  único cierto en ese momento. En los tres lugares.
- **`print.ts` no manda el medio de pago** mientras el pedido no esté cobrado, y
  el bridge no imprime esa línea si no le llega.
- **El pie pasa a "¡Felicidades por su compra!"**, pedido del cliente. Solo en el
  ticket cobrado: antes de cobrar no hay compra que felicitar, y ahí sigue
  diciendo "Gracias!".

## Capabilities

### Modified Capabilities

`caja` — no existe todavía como capability. Se crea con este cambio, cubriendo
qué dice cada papel que sale de la caja.

## Impact

**Repos:** solo `que-copado`. Sin migración.

**A decidir en el diseño:** si además se deja de escribir `'cash'` al crear el
pedido. Es la misma clase de mentira que costó el bug de `auto_disabled` hoy
—un dato que dice algo que nadie decidió—, pero hay que revisar qué lee
`payment_method` de un pedido abierto antes de tocarlo.

## Fuera de alcance

- **El pago dividido.** `cobrar_pedido_de_mostrador` recibe `p_splits`, pero el
  pedido guarda un solo `payment_method` —el principal—. Un pedido cobrado mitad
  en efectivo y mitad con tarjeta imprime un solo método. Es un problema de la
  misma línea del ticket, pero con su propia decisión de datos.
