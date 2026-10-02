# Design

## Context

- `createAdminClient()` usa la clave pública con la sesión del usuario: para
  un cliente de la tienda, sin sesión, es `anon`. Por eso la regla de inserción
  y el `execute` de la función estaban abiertos a `anon`.
- La caja inserta pedidos con la sesión del cajero: directo en
  `pos-orders.ts` y `tables.ts`, y en funciones SECURITY INVOKER
  (`crear_pedido_de_mostrador`, `pagar_pedido_de_mesa`, …). Esa vía queda,
  ahora exigiendo `puede_operar()`.
- `updateOrderStatus` escribe el historial con la sesión del personal.

## Decisions

1. **La clave de servicio solo después de validar.** `createOrder` ya
   recalcula todo; el cambio es con qué cliente escribe al final.
2. **El personal, por `puede_operar()`**, el mismo criterio que la regla de
   UPDATE de `orders`: quien puede tocar un pedido puede crearlo.
3. **Primero el código, después la migración**, y entre medio, nada se rompe:
   el código nuevo funciona con las reglas viejas.
