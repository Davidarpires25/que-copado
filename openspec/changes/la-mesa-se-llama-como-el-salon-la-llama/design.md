# Design

## Context

Ver `proposal.md` — Why. Lo que importa: `restaurant_tables` ya tiene `label`,
opcional, y nueve lugares escriben `Mesa {number}` a mano en vez de usarlo.

Dos de esos nueve están del lado del servidor —`print.ts`, que arma la comanda y
el ticket— y no reciben la mesa entera: reciben `order.table_number`, que es un
número suelto en `orders`. Ahí no hay `label` a mano.

## Goals / Non-Goals

**Goals**

- Que el nombre de la mesa sea uno solo, en pantalla, en cocina y en el ticket.
- Que la regla esté escrita una vez.

**Non-Goals**

- Cambiar el modelo de mesas.
- Rediseñar las pantallas donde aparece.

## Decisions

### Un helper, como se hizo con el número de pedido

`etiquetaDeMesa({ number, label })` devuelve el nombre si lo hay y `Mesa N` si
no. Es el mismo movimiento que se hizo con `orderLabel()`: ese número también
estaba escrito distinto en cada pantalla —`-4` en caja, `-6` en la comanda, `-8`
en el ticket— y el mismo pedido se llamaba de tres formas a la vez.

### El lado del servidor necesita el nombre en la mano

`print.ts` arma la comanda y el ticket desde `order.table_number`. Para poner el
nombre hay que traerlo: una lectura de `restaurant_tables` por número, junto a lo
que ya consulta.

**Alternativa considerada:** guardar el nombre en la orden al abrirla, como se
guarda `table_number`. Evita la consulta, pero congela el nombre: si mañana la
mesa se renombra, los tickets viejos siguen diciendo el anterior. Para un ticket
impreso eso hasta puede ser deseable; para la comanda de una mesa abierta, no.
Se resuelve al implementar, midiendo si esa lectura molesta.

**Riesgo asumido:** un viaje más al imprimir. Es una consulta por número sobre
una tabla de pocas filas, y la impresión no está en el camino crítico del cobro.

## Risks / Trade-offs

**Alguien puede llamar "Mesa 4" a la mesa 7** → El nombre es libre y nadie valida
que no contradiga al número. Es un problema de quien lo carga, no del sistema, y
no vale la pena inventarle reglas.

**Las mesas sin nombre no cambian nada** → Correcto y deliberado: hoy casi todas
son números y así se quedan.

## Migration Plan

Nada que migrar. El campo existe y se carga.
