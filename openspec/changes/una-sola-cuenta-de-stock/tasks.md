# Tasks

## 1. Un solo recorrido

- [x] 1.1 `lib/server/recipe-walk.ts`: el recorrido, parametrizado por la fuente
      de insumos y por qué hacer al llegar a una hoja. Incluye el acumulador de
      requerimientos y el mínimo, que también estaban repetidos.
- [x] 1.2 El descuento (`collectIngredientCascade`) lo usa.
- [x] 1.3 El cálculo por consulta (`_requerimientos`) lo usa.
- [x] 1.4 El cálculo en memoria de la pantalla de stock lo usa, con una fuente
      que lee de los Maps ya traídos. Sigue sin hacer una sola consulta extra.
- [x] 1.5 `getMaxElaboradoQuantity` delega en `calcularStockTeorico`. Era una
      consulta y una cuenta enteras duplicadas, **y la que no bajaba por las
      sub-recetas**. Lo único propio de esa capa es con qué permisos lee.

## 2. Un solo costo de receta

- [x] 2.1 `recalculateProductCost` usa `_costoDeRecetasDe`, que ahora devuelve
      `null` cuando el producto no tiene recetas —distinto de costar cero, que
      es lo que necesita el combo—.

## 3. Verificar que nada se movió

- [x] 3.1 **Los topes, idénticos** a los medidos antes del refactor:
      hamburguesa 40, papas 68, combo híbrido 5, gaseosa 24.
- [x] 3.2 **El descuento, idéntico:** un combo descontó su caja propia (5→4),
      el medallón y el pan de su hamburguesa (40→39) y 2 gaseosas (24→22).
- [x] 3.3 **El barrido, idéntico:** sin cajas, el combo se esconde
      (`oculto=true auto=true`).
- [x] 3.4 **Los costos, idénticos:** una compra del medallón a 2400 dejó la
      hamburguesa en **3228,95** —el mismo número registrado antes del
      refactor— y el combo en 6428,95, que es 3228,95 + 200 de caja + 3000 de
      dos gaseosas.
- [x] 3.5 `npm run lint` y `npm run build` sin errores nuevos.
