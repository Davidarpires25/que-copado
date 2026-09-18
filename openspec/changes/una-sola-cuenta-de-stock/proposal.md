# Proposal

## Why

Todos los bugs de stock que aparecieron hoy salieron de lo mismo: **la misma
cuenta escrita varias veces, y alguien extendió una copia y no las otras.**

- Los **dos barridos de disponibilidad** divergieron al agregar los combos: un
  combo se apagaba al vender y no al comprar.
- El **descuento de stock** y el **cálculo de cuántas salen** tenían el mismo
  error de unidades, y hubo que arreglarlo por separado en cada copia.
- `_syncReventaProduct` estaba escrito **dos veces, con el mismo nombre**, en dos
  archivos.
- El literal `'elaborado'` estaba preguntado en tres lados, y el combo no entró
  en ninguno.

Y hay una divergencia que todavía no explotó: `getMaxElaboradoQuantity`
—la que usa el checkout y el menú del agente— **no bajaba por las sub-recetas**,
y la de la pantalla de stock sí. Un producto con un insumo compuesto daba un
número en el checkout y otro en la pantalla. No se notó porque todavía no hay
insumos compuestos cargados.

El recorrido de recetas estaba escrito **tres veces** y el costo de receta
**dos**.

## What Changes

- **Un solo recorrido de insumos**, en `lib/server/recipe-walk.ts`. Lo que cambia
  entre los tres usos —de dónde salen los datos y qué se hace al llegar al
  fondo— son dos parámetros.
- **Un solo cálculo del costo de una receta**, compartido por el producto y el
  combo.
- **Sin cambios de comportamiento.** Es refactor: los números tienen que dar
  exactamente lo mismo, y se verificó que dan.

## Capabilities

Ninguna. No cambia lo que el sistema hace. Se marca `skip_specs: true`.

## Impact

**Repos:** solo `que-copado`. Sin migración.

**Neto:** −180 líneas.

**Lo que sí cambia sin quererlo**, y es la corrección de la divergencia: un
producto con insumos compuestos ahora da el mismo número en el checkout que en
la pantalla de stock. Hoy no hay ninguno cargado, así que no se nota.

**De paso:** se sacó un `console.info` que medía el tiempo del cálculo por
producto y corría en producción en cada cobro. Ya no medía nada: la cuenta no
toca la base.

## Fuera de alcance

- **Los cuatro cálculos de costo que mezclan unidades.** Ver
  `los-costos-mezclan-unidades`, bloqueado esperando los precios reales.
