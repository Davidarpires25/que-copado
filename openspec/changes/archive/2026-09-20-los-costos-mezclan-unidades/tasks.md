# Tasks

## 1. Que el error no vuelva

- [x] 1.1 El formulario de compra muestra el total de cada línea y el de la
      compra. **Verificado en el navegador** con el caso real: 200 g a $200 la
      unidad ahora muestra **$40.000** en la línea y en el total. Antes no había
      ningún número que delatara la carga.

## 2. Los datos — **desbloqueado por David**

- [x] 2.1 Corregir `cost_per_unit`. **David corrigió el morrón a $2,50/g**
      ($2.500 el kilo), que era el que hacía saltar el costo. El orégano ya
      estaba bien: $22/g son $660 el paquete de 30 g.
- [x] 2.2 Revisar `Papel de aluminio` ($14.400 × 65) y `Cereales` ($200/g =
      $200.000 el kilo). **Revisados otra vez contra producción el 2026-09-20**
      y siguen igual: ninguno de los dos aparece en ninguna receta ni como hijo
      de un insumo compuesto, así que no afectan el costo de ningún producto.

      `Papel de aluminio` puede estar bien: es por unidad, y $14.400 el rollo
      es un precio creíble. `Cereales` casi seguro no: a $200 el gramo son
      **$200.000 el kilo**, que tiene la forma exacta del error que motivó este
      cambio —el precio del paquete cargado como precio por gramo—.

      Queda así a propósito: son datos del negocio y los carga David. El día
      que alguno entre en una receta, el número va a saltar a la vista en el
      formulario, que es justo lo que arregló la tarea 1.1.

## 3. Las cuentas

- [x] 3.1 `_costoDeRecetasDe` convierte a la unidad del insumo antes de
      multiplicar por su precio. Ya era una sola función —las dos copias se
      unificaron en `una-sola-cuenta-de-stock`—, así que fue un solo arreglo.
- [x] 3.2 Lo mismo en el costo de un insumo compuesto.
- [x] 3.3 La ficha técnica guarda las cantidades en la unidad del insumo y no
      en la base. Arregla **tres cosas de una**: la cantidad impresa (decía
      "0,03 g" donde son 30 g), el costo, y el faltante —que comparaba una
      cantidad en kilos contra un stock en gramos—. La vista no se enteró.
- [x] 3.4 **Verificado en el navegador** con un insumo en gramos: 2 g de
      orégano a $22/g ahora aportan **$44** al costo del producto, no $0,04.
      La cuenta completa da `1200 + 450 + (0,04/0,95 × 9000) + 44 = 2072,95`,
      que es exactamente lo que queda guardado. Y la ficha imprime "2 g · $44".
- [x] 3.5 Recalculados en producción: PIZZA ESPECIAL $8.786,60 → **$8.883,50**
      y Pizza Copada $9.003,57 → **$9.078,50**. Son los únicos dos con insumos
      en gramos.

## 5. Y había tres copias más, en el navegador

David, creando un combo: *"el costo es de 763.510 pero en la receta el costo es
mucho mayor"*. El número es exacto y sale de una receta con **500 g de papa a
$1.500 el kilo**: el formulario multiplicaba `500 × 1500` = $750.000, sin
convertir a 0,5 kg. La receta entera daba $763.510 donde cuesta $14.260.

Eran tres cuentas más, y ninguna convertía unidades ni aplicaba merma:

| dónde | |
|---|---|
| `recipe-builder.tsx` | el armador de recetas |
| `recipe-selector.tsx` | el selector de recetas del producto |
| `product-form-page.tsx` | el costo que muestra el formulario |

- [x] 5.1 `lib/utils/recipe-cost.ts`: la cuenta, una sola vez, en `lib/utils`
      porque la usan el servidor y el navegador. Las **siete** copias quedan en
      una.
- [x] 5.2 Los cinco lugares que quedaban la usan.
- [x] 5.3 **El formulario no calculaba el costo de un combo.** `calculatedCost`
      preguntaba por `elaborado` y nada más, así que un combo se creaba sin
      costo. Ahora suma sus recetas propias más lo que cuestan sus componentes.
- [x] 5.4 **Verificado en el navegador** con 500 g de papa a $1.500 el kilo: la
      pantalla de Recetas muestra **$750**, y al guardar el producto el servidor
      guarda **750**. Antes: 750.000 en los dos lados.

## 4. Y de paso, uno que apareció al mirarlo

- [x] 4.1 **Un combo recién creado se quedaba sin costo.** `recalculateProductCost`
      calculaba solo las recetas y, si el combo no tenía recetas propias —el
      caso normal—, `_costoDeRecetasDe` devolvía `null` y la función le ponía el
      costo en `null`, borrando lo que sus componentes ya habían calculado. Y
      con recetas propias le pisaba el costo ignorando los componentes. Ahora
      deriva a `recalcularCostoDeCombo`, que suma las dos partes.

## Cómo quedó

**Cerrado el 2026-09-20.** La sección que había acá decía *"parado el 2026-09-18
esperando los precios reales"*; los precios llegaron, se arreglaron las cuentas
y se verificó contra producción antes de archivar:

| | costo | precio | margen |
|---|---|---|---|
| Pizza especial | $8.883,50 | $16.500 | **46,2 %** |
| Pizza Copada | $9.078,50 | $19.000 | **52,2 %** |

El propio cambio había fijado el umbral: *"si alguno queda por debajo del 40%,
el dato sigue mal"*. Los dos pasan.

**La trampa que tenía, y por qué importaba el orden.** Los dos errores se
cancelaban: el costo del morrón estaba ~1000 veces inflado y la cuenta lo
dividía por mil, así que el total parecía razonable. Arreglar solo el código
—o solo el dato— habría empeorado el número. Fueron juntos.

**Lo que quedó de aprendizaje**, más allá del arreglo: eran **siete** copias de
la misma cuenta —dos en el servidor, una en la ficha técnica, tres en el
navegador y una de insumos compuestos— y las del navegador ni convertían
unidades ni aplicaban merma. Una receta con 500 g de papa a $1.500 el kilo
mostraba **$763.510** donde cuesta **$14.260**. Hoy la cuenta vive una sola vez,
en `lib/utils/recipe-cost.ts`.

**Lo único que se dejó sin tocar** es `Cereales` a $200/g —$200.000 el kilo—,
que tiene la forma exacta de este mismo error pero no está en ninguna receta,
así que no afecta ningún costo. Ver la tarea 2.2.
