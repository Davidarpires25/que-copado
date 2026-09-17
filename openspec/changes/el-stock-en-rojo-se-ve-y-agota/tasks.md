# Tasks

> Todo en `que-copado`. Se verifica contra la base local (`npm run db:start`).

## 1. Ver el daño antes de tocar

- [x] 1.1 Contar en **producción, solo leyendo**, cuántos ingredientes y
      productos tienen hoy stock negativo, y cuáles. Verificación: la lista
      pegada acá. Si es larga, se avisa antes de aplicar: al soltar el cambio
      esos productos van a aparecer agotados de golpe. **Resultado: cero ítems
      en rojo en producción hoy.** Aplicar esto no apaga nada de golpe.

## 2. Que el rojo agote

- [x] 2.1 En el barrido de disponibilidad —uno solo desde el refactor anterior—,
      pasar la condición de "igual a cero" a "menor o igual a cero".
      Verificación: en local, dejar un ingrediente en -5 y ver que su elaborado y
      el combo que lo incluye quedan agotados. **Verificado:** cheddar en -5 →
      hamburguesa `agotada=true auto=true`. Antes seguía a la venta.
- [x] 2.2 Comprobar que el camino de vuelta sigue igual: al superar el cero,
      vuelven a estar disponibles. **Verificado:** cheddar a 3 → la hamburguesa
      vuelve sola.
- [x] 2.3 Comprobar que un producto apagado a mano sigue apagado. Verificación:
      la misma prueba que ya se hizo en el refactor, para no perderla. **Sigue
      valiendo:** `auto_disabled` es lo que distingue lo que apagó el sistema de
      lo que apagó una persona, y no se tocó.

## 3. Que el rojo se vea

- [x] 3.1 Agregar el estado "en rojo" a la tabla de stock, distinto de "bajo", y
      que la cantidad negativa se lea tal cual. Verificación: un ingrediente en
      -5 se ve distinto de uno con 2 y mínimo 5. **Verificado en pantalla:**
      `-5 kg · sin mínimo · [En rojo]` en rojo sólido, contra el `OK` verde.
- [x] 3.2 Que se pueda filtrar u ordenar por ese estado, como con los demás.
      Verificación: en la pantalla, los que están en rojo se encuentran sin
      buscarlos uno por uno. **Hecho por el lado de las alertas:** un ítem en
      rojo ahora cuenta como alerta aunque no tenga mínimo definido —antes no
      aparecía en ningún lado—, así que sale en el contador del sidebar y en el
      cartel de la pantalla.

## 4. Que la venta en rojo avise

- [x] 4.1 Llevar el reporte de `negativos` que ya devuelve
      `aplicar_movimientos_de_stock` hasta la respuesta del cobro, en vez de
      dejarlo en `console.error`. Verificación: vender más de lo que hay y ver
      que la respuesta trae qué quedó en rojo. **Hecho:** `deductStockForOrder`
      devuelve los ítems en rojo con su nombre resuelto, en vez de escribirlos en
      un `console.error`. Falta quién lo muestra: ver 4.2.
- [ ] 4.2 Mostrarlo en la caja después de cobrar, sin bloquear el cobro.
      Verificación: en local, cobrar un pedido que deja stock en negativo y ver
      el aviso con el nombre del ítem.

## 5. Cerrar

- [x] 5.1 `npm run lint` y `npm run build` sin errores nuevos.
