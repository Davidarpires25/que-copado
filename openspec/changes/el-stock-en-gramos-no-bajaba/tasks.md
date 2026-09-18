# Tasks

- [x] 1.1 `convertFromBaseUnit()` en `unit-conversion.ts`.
- [x] 1.2 El descuento convierte a la unidad del insumo antes de acumular el
      movimiento (`collectIngredientCascade`).
- [x] 1.3 La comparación convierte el stock a unidad base, en las **tres**
      copias del cálculo: `stock-deduction.ts`, `elaborado-stock.ts` y
      `app/actions/stock.ts`.
- [x] 1.4 **Verificado en el navegador** contra la base local, con un insumo
      "Oregano" en gramos y una receta que pide 1 g: cobrar una hamburguesa
      deja el orégano en **30 → 29**, y el medallón y el pan en 40 → 39. Antes
      el orégano hubiera quedado en 29,999.
- [x] 1.5 `npm run lint` y `npm run build` sin errores nuevos.
- [ ] 1.6 **Conteo físico de los insumos en gramos o mililitros.** Queda para
      David: en producción son `Morron` y `oregano`, y sus números arrastran
      todo lo que no se descontó.
