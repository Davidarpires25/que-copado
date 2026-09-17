# Tasks

> Todo en `que-copado`. Se verifica contra la base local (`npm run db:start`).

## 1. Ver el daño antes de tocar

- [ ] 1.1 Contar en **producción, solo leyendo**, cuántos ingredientes y
      productos tienen hoy stock negativo, y cuáles. Verificación: la lista
      pegada acá. Si es larga, se avisa antes de aplicar: al soltar el cambio
      esos productos van a aparecer agotados de golpe.

## 2. Que el rojo agote

- [ ] 2.1 En el barrido de disponibilidad —uno solo desde el refactor anterior—,
      pasar la condición de "igual a cero" a "menor o igual a cero".
      Verificación: en local, dejar un ingrediente en -5 y ver que su elaborado y
      el combo que lo incluye quedan agotados.
- [ ] 2.2 Comprobar que el camino de vuelta sigue igual: al superar el cero,
      vuelven a estar disponibles. Verificación: comprar y ver los dos volver.
- [ ] 2.3 Comprobar que un producto apagado a mano sigue apagado. Verificación:
      la misma prueba que ya se hizo en el refactor, para no perderla.

## 3. Que el rojo se vea

- [ ] 3.1 Agregar el estado "en rojo" a la tabla de stock, distinto de "bajo", y
      que la cantidad negativa se lea tal cual. Verificación: un ingrediente en
      -5 se ve distinto de uno con 2 y mínimo 5.
- [ ] 3.2 Que se pueda filtrar u ordenar por ese estado, como con los demás.
      Verificación: en la pantalla, los que están en rojo se encuentran sin
      buscarlos uno por uno.

## 4. Que la venta en rojo avise

- [ ] 4.1 Llevar el reporte de `negativos` que ya devuelve
      `aplicar_movimientos_de_stock` hasta la respuesta del cobro, en vez de
      dejarlo en `console.error`. Verificación: vender más de lo que hay y ver
      que la respuesta trae qué quedó en rojo.
- [ ] 4.2 Mostrarlo en la caja después de cobrar, sin bloquear el cobro.
      Verificación: en local, cobrar un pedido que deja stock en negativo y ver
      el aviso con el nombre del ítem.

## 5. Cerrar

- [ ] 5.1 `npm run lint` y `npm run build` sin errores nuevos.
