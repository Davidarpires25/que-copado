# Proposal

## Why

David, 17/09: cargaron dos pizzas y no aparecían.

El historial de movimientos cuenta lo que pasó con la salsa de tomate:

```
14/09 23:57  compra +3   →  3
15/09 01:00  venta  -1   →  2
16/09 00:55  venta  -1   →  1
16/09 01:00  venta  -1   →  0   ← acá desaparecieron las tres pizzas
18/09 00:55  venta  -1   →  -1
18/09 01:11  compra +2   →  1
```

Tres pizzas vendidas vaciaron la salsa porque **la receta descuenta un pote
entero por pizza, y un pote hace tres**. El dato miente, el barrido hace lo que
debe, y en la cocina hay salsa de sobra.

Hasta ahí es un problema de datos. Lo que lo volvió un problema del sistema es
que **no se pudo corregir a mano**. Quien atiende prendía la pizza y el barrido
se la volvía a apagar al siguiente movimiento de stock —cualquier venta, de
cualquier cosa—, porque la rama que apaga no mira si alguien decidió lo
contrario:

```ts
if (stockTeorico <= 0 && !producto.is_out_of_stock) { apagar }
```

`auto_disabled` ya distinguía lo que apagó el sistema de lo que apagó una
persona, pero **solo servía para no volver a encender**. Faltaba el otro lado.

Y se encontró la huella: los tres productos quedaron en
`is_out_of_stock: false` con `auto_disabled: true`, una combinación que el
barrido no produce nunca —siempre escribe las dos juntas—. Sale de la pantalla
de Productos, cuyo interruptor escribía una sola de las dos marcas.

## What Changes

- **Cuando una persona dice que hay, hay.** El barrido no apaga un producto que
  alguien marcó disponible.
- **La excepción se suelta sola** cuando el stock se recupera: el motivo para
  forzarlo ya no existe y el producto vuelve a seguir al stock, sin que nadie
  tenga que acordarse de apagarla.
- **Las dos pantallas escriben lo mismo.** Productos y Stock tenían cada una su
  interruptor y no hacían lo mismo.
- **Un solo barrido de reventa.** `_syncReventaProduct` estaba escrito dos
  veces, con el mismo nombre, en dos archivos.
- **El sistema dice qué escondió y por qué.** Esconder un producto es una
  decisión comercial y se tomaba en silencio: las tres pizzas desaparecieron del
  catálogo y el único rastro era un "Salsa de tomate: 0" en otra lista, sin nada
  que conectara una cosa con la otra. David se enteró por la calle.

## Capabilities

### Modified Capabilities

`seguimiento-de-stock` — hoy la spec dice cuándo el sistema marca algo agotado.
Falta el requisito de qué pasa cuando una persona no está de acuerdo.

## Impact

**Repos:** solo `que-copado`.

**Migración:** `products.forzado_disponible`, en false. Ningún producto arranca
forzado, así que el comportamiento no cambia hasta que alguien use el
interruptor.

**Lo que NO se toca:** la receta de la salsa. Es dato de producción y la
corrección la decide David. Lo recomendado es poner `0.33 unidad` por pizza y
que la unidad siga siendo el pote, para que el conteo físico se siga haciendo
contando potes.

## Fuera de alcance

- **Corregir los insumos mal modelados.** La salsa no es el único candidato:
  cualquier insumo medido en "unidad" que rinda más de una porción tiene el
  mismo problema. Revisarlos es otro trabajo.
- **Mostrar en pantalla que un producto está forzado.** Se evaluó y se dejó
  afuera: la excepción se suelta sola al recuperarse el stock, así que no queda
  prendida sin que nadie lo note.
