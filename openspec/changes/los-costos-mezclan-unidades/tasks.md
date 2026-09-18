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
