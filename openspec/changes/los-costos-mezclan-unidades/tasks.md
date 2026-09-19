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
- [ ] 2.2 Revisar `Papel de aluminio` ($14.400 × 65) y `Cereales` ($200/g =
      $200.000 el kilo). Ninguno de los dos está en una receta, así que no
      afectan el costo de ningún producto: quedan para cuando se usen.

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

## Cómo retomarlo

**Parado el 2026-09-18 esperando los precios reales.** Lo único que falta para
arrancar son tres números: cuánto costaron de verdad el morrón, los cereales y
la papa.

**El orden importa, y es la trampa de este cambio.** Los dos errores se
cancelan: el costo del morrón está ~1000 veces inflado y la cuenta lo divide por
mil. Si se arregla solo el código, PIZZA ESPECIAL pasa de $9.126 a ~$15.100
contra un precio de $16.500. Si se arregla solo el dato, pasa lo inverso. Van en
el mismo commit.

**Lo que ya no hay que investigar:**

- `cost_per_unit` significa el costo de **una unidad de la unidad del insumo**:
  por gramo para el morrón, por kilo para la muzzarella, por unidad para el
  huevo. El código lo usa así en todos lados y la mayoría de la carga lo
  respeta.
- Los sospechosos son tres, y están cruzados contra lo que se compró:
  Morrón ($200/g → $40.000 por 200 g), Cereales ($200/g → $600.000) y Papa
  ($17.000/kg → $340.000 por 20 kg). Más `Papel de aluminio`, $14.400 × 65.
- **El orégano NO está mal**: $22/g son $660 el paquete de 30 g, que es un
  precio real de orégano seco.
- Los cuatro cálculos con el error están listados en `proposal.md` — Why, con
  archivo y línea.

**Lo que cambió desde que se escribió esto:** el recorrido de recetas se
unificó (`una-sola-cuenta-de-stock`, archivado). Las cuatro cuentas de costo
siguen separadas, pero ahora se apoyan en una sola base, así que el arreglo es
más corto de lo que era cuando se anotó.

**Después de corregir:** recalcular el costo de todos los productos y mirar el
margen de las tres pizzas antes y después. Si alguno queda por debajo del 40%,
el dato sigue mal.
