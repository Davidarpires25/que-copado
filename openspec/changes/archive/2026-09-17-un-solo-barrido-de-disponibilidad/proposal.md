# Proposal

## Why

La rutina que decide qué productos quedan marcados como agotados está escrita dos
veces, en dos archivos, y ninguna de las dos copias sabe que la otra existe:

| copia | archivo | corre cuando |
|---|---|---|
| A | `lib/server/stock-deduction.ts:363` | se vende o se cancela una venta |
| B | `app/actions/stock.ts:839` | se compra, se ajusta stock, o se dispara a mano |

Y con ella viene duplicado el cálculo del stock teórico de un elaborado:
`_calcTheoreticalStock` (63 líneas) y `_calculateTheoreticalStock` (71). Dos
implementaciones de la misma cuenta —recorrer las recetas, aplicar mermas y
sub-recetas— que pueden divergir sin que nadie se entere.

**Esto ya costó un bug, esta semana.** Al agregar los combos se extendió la copia
A. Probando por el lado de las ventas funcionaba; el combo se apagaba solo. Pero
registrando una compra no, porque ese camino pasa por la copia B. En la práctica:
agotar una bebida vendiéndola apagaba el combo, y agotarla con un ajuste lo
dejaba encendido para que alguien lo pidiera.

Se tapó llamando a la parte de combos desde las dos, pero la duplicación de fondo
sigue ahí, y es una trampa para el próximo cambio que toque disponibilidad.

## What Changes

- **Un solo barrido de disponibilidad**, en un solo lugar, que llaman los cinco
  caminos que hoy llaman a una de las dos copias: vender, cancelar, comprar,
  ajustar y el disparo manual.
- **Un solo cálculo de stock teórico**, por el mismo motivo.
- **Se corrige una diferencia de orden** que quedó del arreglo anterior: en la
  copia A los combos se evalúan **después** de los elaborados —así un combo ve
  que su hamburguesa se acaba de agotar en la misma pasada— y en la copia B
  quedaron **antes**, o sea que en ese camino el combo se entera una pasada
  tarde.
- **Se unifica cómo se revalida**: la copia A difiere la revalidación con un
  `setTimeout` para no llamarla durante el render; la B la llama derecho. Hay que
  quedarse con una y saber por qué.

## Capabilities

Ninguna nueva ni modificada. El comportamiento observable no cambia: lo que hoy
se apaga y se prende tiene que seguir apagándose y prendiéndose igual. Se marca
`skip_specs: true`.

La única diferencia visible es la corrección del orden, que hace que un camino
empiece a comportarse como el otro ya se comportaba.

## Impact

**Repos:** solo `que-copado`.

**Modificado:** `lib/server/stock-deduction.ts` y `app/actions/stock.ts`. Los
cinco llamadores pasan a usar la función compartida.

**Sin cambios:** la base, las migraciones y la interfaz.

**Verificación:** contra la base local, recorriendo los cinco caminos y
comprobando que un elaborado y un combo se apagan y se prenden igual en todos.

## Fuera de alcance

- **Unificar el resto de `stock.ts` y `stock-deduction.ts`.** Hay más cosas
  parecidas entre los dos archivos; acá se tocan solo el barrido y el cálculo de
  stock teórico, que son los que ya causaron un problema.
- **Cambiar la regla de disponibilidad.** Se mueve código, no se decide distinto.
- **El rendimiento del barrido.** Recorre los elaborados con una consulta por
  producto, en serie; ya está anotado en `tasks/todo.md` y es otro trabajo.
