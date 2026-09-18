# Design

## Context

Dos marcas conviven en `products`:

- `is_out_of_stock` — si está oculto.
- `auto_disabled` — si lo apagó el sistema, para saber si puede volver a
  encenderlo solo.

Y cuatro lugares escribían esas marcas con la misma lógica copiada: la rama de
reventa en `stock-deduction.ts`, la de combos, la de elaborados, y **otra copia
entera de la de reventa** en `app/actions/stock.ts`, con el mismo nombre de
función.

## Decisions

### Una marca nueva, y no reusar `auto_disabled`

`forzado_disponible`: una persona dijo que hay, a pesar del stock.

**Por qué no alcanzaba con `auto_disabled: false`.** Ese es también el estado de
un producto recién creado que nadie tocó, y ése sí tiene que apagarse cuando su
insumo se acabe. "Nadie opinó" y "alguien opinó que sí hay" son cosas distintas
y necesitan marcas distintas.

### Se suelta sola cuando el stock se recupera

Si el stock vuelve, la excepción se limpia. El producto vuelve a seguir al
stock, y la próxima vez que el insumo se acabe se apaga normalmente.

**Por qué no dejarla puesta hasta que alguien la saque:** porque nadie la va a
sacar. Una excepción que sobrevive a su motivo es una que se descubre tres meses
después, cuando el producto se vende sin que haya con qué hacerlo.

### La decisión, en una sola función

`_aplicarDisponibilidad()` decide y escribe. Las cuatro ramas la llaman.

No es prolijidad: es el mismo error que este proyecto ya pagó dos veces. Los dos
barridos de disponibilidad divergieron al agregar los combos —un combo se apagaba
al vender y no al comprar— y los dos cálculos de stock teórico también. Agregar
una regla nueva a cuatro copias era garantizar la tercera.

Aprovechando, `syncReventaProduct` queda exportada desde `stock-deduction.ts` y
la copia de `app/actions/stock.ts` se borra.

## Risks

**Un producto forzado se puede vender sin insumo.** Es exactamente lo pedido:
quien atiende ve la cocina y el sistema no. El stock queda en negativo, que ya
se ve en rojo en la pantalla de stock.

**La causa de fondo sigue viva.** Mientras la receta de la salsa diga un pote por
pizza, las pizzas van a seguir desapareciendo cada tres ventas. Esto hace que se
puedan volver a prender; no arregla el dato.
