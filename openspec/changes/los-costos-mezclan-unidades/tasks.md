# Tasks

## 1. Que el error no vuelva

- [x] 1.1 El formulario de compra muestra el total de cada línea y el de la
      compra. **Verificado en el navegador** con el caso real: 200 g a $200 la
      unidad ahora muestra **$40.000** en la línea y en el total. Antes no había
      ningún número que delatara la carga.

## 2. Los datos (bloqueado)

- [ ] 2.1 Corregir `cost_per_unit` de Morrón, Cereales y Papa con los precios
      reales. **Esperando al cliente.**
- [ ] 2.2 Revisar `Papel de aluminio`: $14.400 × 65 unidades = $936.000.

## 3. Las cuentas (van junto con 2)

- [ ] 3.1 `recalculateProductCost` y `_costoDeRecetasDe` comparan en la misma
      unidad.
- [ ] 3.2 Lo mismo en `recalcularCostoDeInsumoCompuesto`.
- [ ] 3.3 La ficha técnica: la cantidad en la unidad del insumo, y el costo con
      las dos puntas en la misma unidad.
- [ ] 3.4 Recalcular el costo de todos los productos después de corregir.
      Verificación: el margen de las tres pizzas antes y después, a la vista.

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
