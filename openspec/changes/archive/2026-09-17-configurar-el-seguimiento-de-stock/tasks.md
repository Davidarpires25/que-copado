# Tasks

> Todo en `que-copado`.
>
> Se verifica contra la base local (`npm run db:start`), que ya existe. **No se
> prueba contra producción:** esto escribe en `ingredients`, `products` y —si algo
> sale mal— en `stock_movements`.

## 1. El salto de scroll

- [x] 1.1 Sacar `revalidateStock()` de `toggleStockTracking()` en
      `app/actions/stock.ts`, dejando escrito por qué: la tabla ya aplica el
      cambio en su estado y revalidar la página donde está parado el usuario es
      lo que resetea el scroll. Verificación: en la base local, bajar hasta un
      producto de reventa al final de la tabla, activar su seguimiento, y que la
      pantalla siga mostrando lo mismo.
- [x] 1.2 Comprobar que el rollback sigue funcionando: si la acción falla, el
      interruptor vuelve solo. **Verificado en local** creando una sub-receta
      para el Cheddar: la acción se niega a seguirle el stock a un compuesto, el
      interruptor volvió solo a apagado y el ingrediente quedó con
      `stock_tracking_enabled=false`.

## 2. Editar el mínimo desde la fila

- [x] 2.1 Escribir la celda editable del mínimo, compartida por las dos
      pestañas: muestra el valor, se abre al hacer clic, guarda al salir del foco
      o con Enter, descarta con Escape, y vacío significa sin mínimo.
      Verificación: `npx tsc --noEmit` pasa y el componente lo usan las dos
      tablas.
- [x] 2.2 **Verificado contra la base local:** el mínimo del Cheddar pasó de 1 a
      99, `current_stock` quedó en 4,9578… y `stock_movements` siguió en 5 filas.
      Conectarla a `updateMinStock()` con actualización optimista y reversión
      si falla, sin registrar ningún movimiento. Verificación: cambiar el mínimo
      en la base local y comprobar con una consulta que `min_stock` cambió, que
      `current_stock` quedó igual y que **no** hay filas nuevas en
      `stock_movements`.
- [x] 2.3 Recalcular las alertas al cambiar el mínimo, como ya se hace al ajustar
      stock. Verificación: subir el mínimo por encima de la cantidad actual y ver
      que el ítem pasa a "Bajo" y aparece en el cartel de alertas sin recargar.
- [x] 2.4 Rechazar un mínimo negativo o no numérico sin guardarlo y dejando la
      celda como estaba. Verificación: escribir `-5` y una letra, y comprobar que
      `min_stock` no cambió en la base.
- [x] 2.5 Quitar el mínimo dejando la celda vacía. Verificación: `min_stock`
      queda en `null` y el ítem deja de figurar entre las alertas.
- [x] 2.6 Sacar `revalidateStock()` de `updateMinStock()` por el mismo motivo que
      1.1. Verificación: cambiar un mínimo estando abajo en la tabla y que la
      pantalla no se mueva.

## 3. Que no se rompa lo que ya andaba

- [x] 3.1 El diálogo de ajuste sigue pudiendo cambiar el mínimo mientras corrige
      stock. Verificación: corregir la cantidad y el mínimo a la vez desde el
      diálogo, y ver los dos cambios aplicados. **Verificado:** "Pan de papa"
      pasó de stock 39 a 30 y de mínimo 10 a 7, con un solo movimiento.
- [x] 3.2 Un ítem sin seguimiento no genera alertas aunque tenga mínimo.
      Verificación: apagar el seguimiento de un ítem en alerta y ver que
      desaparece del cartel.
- [x] 3.3 `npm run lint` y `npm run build` sin errores nuevos —la única
      advertencia esperada es la preexistente de `SupabaseClient` en
      `app/actions/orders.ts`.
