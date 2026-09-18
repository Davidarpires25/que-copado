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
- [ ] 1.6 **Aplicar la migración antes de desplegar:** `supabase db push`.
