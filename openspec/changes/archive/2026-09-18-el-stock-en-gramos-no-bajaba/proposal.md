# Proposal

## Why

David, mirando el panel de insumos: *"¿es correcto redondear para abajo en el
caso del orégano?"*. Redondear estaba bien. El número que estaba mirando, no.

El orégano decía **29,997 g**. Ese `,997` no era redondeo: era la huella de un
error. Los movimientos reales lo muestran:

| insumo | la receta pide | se descontó | stock |
|---|---|---|---|
| Morrón | 30 g | **0,03** | 200,00 → 199,97 → 199,94 → 199,91 → 199,88 |
| Orégano | 1 g | **0,001** | 30,000 → 29,999 → 29,998 → 29,997 |

Cuatro pizzas se comieron **0,12 g de morrón en vez de 120 g**.

La cuenta convierte a unidad base para poder comparar entre recetas —30 g pasan
a 0,03 kg— y después resta ese número tal cual a `ingredients.current_stock`,
que está guardado **en la unidad del insumo**. Faltaba la vuelta.

El mismo error, por el otro lado, en la comparación: el stock se dividía crudo
contra un requerimiento ya convertido. El morrón alcanzaba para 6.662 pizzas en
vez de 6.

**Quiénes se ven afectados:** solo los insumos cuya propia unidad es `g` o `ml`.
Uno cargado en kg con una receta en gramos estaba bien, porque la base de los
dos es el kilo. En producción son dos: `Morron` y `oregano`.

**Qué produjo:** esos insumos prácticamente no bajaban nunca, así que nunca
avisaron que se estaban acabando ni escondieron un producto. El error va para el
lado permisivo: no perdió ventas, ocultó consumo.

## What Changes

- **El descuento vuelve a la unidad del insumo** antes de restarse.
- **La comparación convierte las dos puntas**, no una sola.
- `convertFromBaseUnit()`, que faltaba desde el principio.

## Capabilities

### Modified Capabilities

`seguimiento-de-stock` — la spec dice que se descuenta lo que la receta indica.
Faltaba decir que eso vale sea cual sea la unidad en que esté cargado el insumo.

## Impact

**Repos:** solo `que-copado`. Sin migración.

**Los números viejos quedan mal y el código no los puede arreglar.** El morrón
dice 199,88 g y consumió unos 120: le sobran ~120 g de mentira. Hace falta un
conteo físico de los insumos cargados en gramos o mililitros. Queda para David.

**Después de esto esos insumos empiezan a limitar de verdad**, que es el
objetivo, pero es un cambio de comportamiento: el morrón pasa de "alcanza para
6.662" a "alcanza para 6".

## Fuera de alcance

- **Las tres copias del recorrido de recetas.** El mismo error estaba escrito
  tres veces —`stock-deduction.ts`, `elaborado-stock.ts` y `app/actions/stock.ts`—
  y se arreglaron las tres, pero unificarlas es otro trabajo.
