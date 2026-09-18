# Tasks

- [x] 1.1 Migración: `registrar_compra_de_stock(p_items, p_motivo)`, invoker,
      otorgada solo a `authenticated`.
- [x] 1.2 `registerPurchase` la usa y recalcula costos solo para los insumos
      que la función marca como cambiados.
- [x] 1.3 **Verificada la atomicidad:** una compra de dos líneas donde la
      segunda apunta a un insumo inexistente **no aplica ninguna**. El medallón
      quedó en 40 y no se escribió ningún movimiento. Antes hubiera quedado en
      50, con su movimiento, y media compra cargada.
- [x] 1.4 **Verificado el camino feliz en el navegador:** compra de 2 líneas
      —medallón +10 a $2400 y pan +20 a $800—; los dos stocks suben, el costo
      del medallón queda en 2400, se escriben 2 movimientos con su
      previous/new correctos, y el costo de la hamburguesa se recalcula a
      3578,95.
- [x] 1.5 `npm run lint` y `npm run build` sin errores nuevos.
- [x] 1.6 **Migración aplicada en producción.** La función existe y está
      otorgada solo a `authenticated` y `service_role`.

## 2. El descuento de la venta, en lote

- [x] 2.1 `deductStockForOrder` trae todo de una: los productos del pedido, los
      componentes de los combos, los productos de esos componentes, y las
      recetas con sus insumos. De ~60 consultas en serie para un pedido de tres
      productos a **6**, sea cual sea el tamaño.
- [x] 2.2 Borradas `acumularProducto`, `collectElaboradoStock` y
      `collectIngredientCascade`, que quedaron sin uso.
- [x] 2.3 Repuesto el respaldo de unidad que se había perdido al unificar el
      recorrido: una línea de receta sin unidad se entiende en la del insumo.
      La columna lo permite; sin eso ese insumo se dejaba de descontar en
      silencio. Hoy no hay ninguna así en producción (0 de 136).
- [x] 2.4 **Verificado con un pedido mixto** —combo + hamburguesa suelta +
      papas—: la caja del combo baja 1, el medallón 2 (el del combo y el
      suelto), el pan 2, las gaseosas 2, y las mermas siguen exactas: cheddar
      `2 × 0,04/0,95` y papa `0,25/0,85`. 6 movimientos escritos.
