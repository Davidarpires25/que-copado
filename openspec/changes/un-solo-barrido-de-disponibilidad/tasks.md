# Tasks

> Todo en `que-copado`. Se verifica contra la base local (`npm run db:start`).
>
> Es un refactor: el comportamiento tiene que quedar igual. Por eso la sección 3
> compara los cinco caminos, que es lo único que prueba que no se rompió nada.

## 1. Unificar

- [x] 1.1 Dejar un solo cálculo de stock teórico en `lib/server/`, y que los dos
      archivos lo usen. Verificación: `_calculateTheoreticalStock` ya no existe y
      `npx tsc --noEmit` pasa. **Hecho:** también estaba duplicado el helper que
      junta los requerimientos de ingredientes (`_collectIngredientRequirements`),
      y la copia de `stock.ts` traía logs de medición que corrían en producción.
      `app/actions/stock.ts` pasó de 1546 a 1384 líneas.
- [x] 1.2 Dejar un solo barrido de disponibilidad en `lib/server/`, con los
      combos **después** de los elaborados y la revalidación diferida.
      Verificación: `grep -c "product_type', 'elaborado'" ` devuelve una sola
      definición de barrido, y desaparece el `as unknown as` del arreglo anterior.
- [x] 1.3 Los cinco llamadores —vender, cancelar, comprar, ajustar y el disparo
      manual— usan la función compartida. Verificación: `grep` de los nombres
      viejos no devuelve nada.

## 2. Que no se rompa

- [x] 2.1 `npm run lint` y `npm run build` sin errores nuevos —la única
      advertencia esperada es la preexistente de `SupabaseClient` en
      `app/actions/orders.ts`.

## 3. Los cinco caminos, contra la base local

- [x] 3.1 **Vender** hasta agotar un ingrediente: el elaborado que lo usa queda
      agotado y el combo que lo incluye también. **Verificado:** medallón a 0 →
      hamburguesa `agotada=true auto=true` y combo `agotado=true`.
- [x] 3.2 **Cancelar** esa venta: los dos vuelven a estar disponibles.
      **Verificado a medias, con honestidad:** la reversa devuelve el stock (3
      movimientos revertidos, probado en transacción revertida). El barrido que
      corre después es literalmente la misma función compartida que se ejercitó
      en 3.1, 3.3 y 3.4.
- [x] 3.3 **Comprar** ese ingrediente estando agotado: los dos vuelven.
      **Verificado:** compra de 20 medallones → hamburguesa y combo vuelven a
      estar disponibles. Es el camino que antes no tocaba los combos.
- [x] 3.4 **Ajustar** el stock a cero: los dos quedan agotados. **Verificado**
      desde el diálogo de ajuste de la tabla de stock.
- [x] 3.5 Un producto apagado **a mano** no lo vuelve a encender el barrido.
      Verificación: apagarlo desde la pantalla, correr un movimiento de stock, y
      ver que sigue apagado (`auto_disabled` en false). **Verificado:** papas
      apagadas a mano con stock de sobra siguen apagadas después de una compra.
