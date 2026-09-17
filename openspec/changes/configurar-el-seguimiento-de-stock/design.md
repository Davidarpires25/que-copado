# Design

## Context

Ver `proposal.md` — Why. Del estado actual importan tres cosas:

- La celda del mínimo hoy es texto: `{product.min_stock} u`, o `--` cuando no hay
  (`products-stock-tab.tsx:214`, y su equivalente en la pestaña de ingredientes).
- El interruptor de seguimiento ya actualiza el estado de forma optimista y
  revierte si el servidor falla (`products-stock-tab.tsx:67`).
- `updateMinStock()` ya existe en `app/actions/stock.ts`, con su validación de
  número mayor o igual a cero. No hay que escribirla: hay que darle un camino.

## Goals / Non-Goals

**Goals**

- Que cambiar el mínimo cueste un clic y no deje rastro en el historial.
- Que encender el seguimiento no mueva la pantalla.

**Non-Goals**

- Rediseñar la tabla de stock.
- Revisar las otras llamadas a `revalidateStock()` (ver proposal — Fuera de
  alcance).

## Decisions

### El mínimo se edita en su propia celda

La celda deja de ser texto y pasa a ser un campo que se guarda al salir del foco
o con Enter, y se descarta con Escape. Vacío significa "sin mínimo".

**Alternativa considerada:** un diálogo propio de "configurar alertas" por ítem.
Es una pantalla más para cambiar un número, y el problema que se está arreglando
es justamente que cambiar un número obliga a pasar por un diálogo que hace otra
cosa.

**Alternativa considerada:** editarlo desde la página del producto o del
ingrediente. Tiene sentido para el alta, pero quien está revisando alertas está
en la tabla de stock mirando varios ítems: mandarlo a otra pantalla por cada uno
es el mismo viaje que hoy hace el diálogo.

**Consecuencia:** el mínimo se guarda solo, sin botón de confirmar. Para que eso
no sea riesgoso, se guarda únicamente cuando el valor cambió y es válido; un
valor inválido no se guarda y la celda vuelve al anterior.

### La fila se actualiza sola y el servidor no revalida la página

Igual que el interruptor: la tabla aplica el cambio en su estado y revierte si el
servidor falla. `updateMinStock()` y `toggleStockTracking()` dejan de revalidar
`/admin/stock`.

Revalidar la página donde el usuario está parado es lo que causa el salto: Next
vuelve a renderizar el server component y la posición se pierde. Es el mismo
patrón que se corrigió en caja.

**Qué se pierde:** si otra persona cambia el stock al mismo tiempo desde otra
pantalla, esta tabla no se entera hasta que se recargue. Ya es así hoy para todo
lo demás de esta tabla, que trabaja sobre el estado que recibió al abrirse.

**Lo que sí hay que mantener:** las alertas se recalculan en el cliente cuando
cambia el mínimo, porque un mínimo nuevo puede poner al ítem en rojo sin que su
cantidad se haya movido. La tabla ya hace esto al ajustar stock
(`handleStockAdjusted`), así que es el mismo camino.

### Las dos pestañas comparten el comportamiento

Ingredientes y productos de reventa tienen tablas distintas pero el mismo
problema. La celda editable se escribe una vez y la usan las dos.

## Risks / Trade-offs

**Guardar al salir del foco puede sorprender** → Se mitiga guardando solo cuando
el valor cambió, mostrando el resultado en la fila al instante, y avisando si el
servidor rechaza. Un número que se puede volver a escribir no es una acción
destructiva.

**Un toque accidental en la celda** → Abrir el campo no cambia nada; salir sin
escribir tampoco.

**Quedan cinco `revalidateStock()` sin revisar** → Anotado en el proposal. Las que
corren después de una compra o un ajuste sí tienen motivo: ahí la tabla necesita
releer.

## Migration Plan

No hay migración: ni esquema ni datos. Se revierte con el commit.
