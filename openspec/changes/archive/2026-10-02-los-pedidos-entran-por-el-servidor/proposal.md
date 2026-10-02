# Proposal

## Why

Revisando las advertencias de seguridad de Supabase (2026-10-02) apareció que
**cualquiera, sin iniciar sesión**, con la clave pública que está en el
navegador, podía:

- insertar un pedido en `orders` con lo que quisiera —total, estado (también
  "pagado"), turno de caja— por la regla `web crea pedidos` (anon, `with check
  true`);
- llamar a `crear_pedido_remoto` (SECURITY DEFINER) directo por la API, con
  el total y los productos que quisiera;
- escribir en `order_status_history` por la regla `web escribe historial
  estado`.

Todo eso se saltea lo que valida `createOrder` en el servidor: precios
recalculados, zona de envío, horario, límite de pedidos y stock. Un pedido
falso aparece en la caja como un pedido web pendiente; uno "pagado" entra en
los reportes.

## What Changes

- `createOrder` llama a `crear_pedido_remoto` y escribe el primer estado del
  historial **con la clave de servicio**, después de todas sus validaciones.
  La tienda y el agente de WhatsApp (que pasa por `createOrder`) no cambian.
- Migración:
  - `orders`: se borra `web crea pedidos`; nueva `operacion crea pedidos`
    (authenticated, `puede_operar()`), para la caja.
  - `order_status_history`: lo mismo (`operacion escribe historial estado`).
  - `crear_pedido_remoto`: sin `execute` para anon ni authenticated; solo
    `service_role`.
- **Orden de despliegue:** primero el código (Vercel), después la migración.
  Al revés, la tienda no podría crear pedidos hasta el despliegue.

## Capabilities

### New Capabilities

- `pedidos-seguros`: un pedido solo entra por el servidor o por el personal.

## Toca AgentePOS

No: crea pedidos por la API de la app, que usa `createOrder`.
