# Proposal

## Why

Auditoría del stock, después de encontrar que el descuento en gramos restaba mil
veces menos de lo que la receta pide. **El mismo error está en los costos**, en
cuatro lugares más:

| dónde | qué calcula |
|---|---|
| `app/actions/recipes.ts:289` — `recalculateProductCost` | el costo de un producto |
| `app/actions/recipes.ts:377` — `_costoDeRecetasDe` | lo mismo, escrito de nuevo |
| `app/actions/ingredient-sub-recipes.ts:165` | el costo de un insumo compuesto |
| `components/admin/stock/ficha-tecnica-view.tsx:139` | el costo en la ficha técnica |

Todos multiplican una cantidad ya convertida a unidad base por un
`cost_per_unit` que está expresado **en la unidad del insumo**. Para un insumo en
gramos, 30 g entran a la cuenta como 0,03.

Y la ficha técnica además **muestra la cantidad mal**: `app/actions/stock.ts:1089`
guarda `net_qty_per_unit` en unidad base pero lo etiqueta con la unidad del
insumo, así que imprime "0,03 g" donde debería decir "30 g". Es el papel que usa
la cocina.

## Y hay datos mal cargados que lo tapan

Cruzando cada costo contra lo comprado, tres entradas parecen el **total pagado**
y no el precio unitario:

| insumo | compró | cargó | total que implica |
|---|---|---|---|
| Morrón | 200 g | $200 /g | $40.000 |
| Cereales | 3.000 g | $200 /g | $600.000 |
| Papa | 20 kg | $17.000 /kg | $340.000 |

(El orégano, en cambio, está bien: $22/g son $660 el paquete de 30 g.)

**Los dos errores se cancelaban**, y por eso el costo de la pizza parecía sano.
Arreglar solo el código haría saltar PIZZA ESPECIAL de $9.126 a ~$15.100 contra
un precio de $16.500. Van juntos o no van.

## What Changes

- **Las cuatro cuentas de costo** comparan en la misma unidad.
- **La ficha técnica** muestra la cantidad en la unidad del insumo.
- **Los tres costos mal cargados** se corrigen con los precios reales.
- **El formulario de compra muestra el total** de cada línea y de la compra.
  *(Ya hecho: es lo que impide que el error vuelva.)*

## Capabilities

### Modified Capabilities

`registro-de-compras` — falta el requisito de que la carga muestre lo que se
está declarando.

## Impact

**Repos:** solo `que-copado`. Sin migración.

**Bloqueado:** los precios reales de morrón, cereales y papa. David se los pidió
al cliente.

**Revisar también:** `Papel de aluminio`, $14.400 por unidad × 65 unidades.

## Fuera de alcance

- **Unificar las copias.** El recorrido de recetas está escrito 3 veces y el
  costo de receta 2. Cada bug de esta clase salió de extender una copia y no las
  otras, pero unificarlas es su propio trabajo.
