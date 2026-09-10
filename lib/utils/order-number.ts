/**
 * Etiqueta visible de un pedido.
 *
 * Antes cada pantalla cortaba el UUID por su cuenta y a distinto largo: -4 en
 * caja, -6 en la comanda de cocina, -8 en el ticket del cliente. El mismo
 * pedido se llamaba #5322, #9A5322 y #E49A5322 al mismo tiempo, con lo cual
 * cocina y caja no podian cruzarlo. Ahora hay una sola funcion y un solo
 * numero, correlativo por dia.
 *
 * El fallback al UUID existe para no dejar la pantalla en blanco si un pedido
 * quedara sin numerar; el trigger de la base lo asigna al insertar.
 */
export function orderLabel(order: { order_number?: number | null; id: string }): string {
  return order.order_number != null
    ? `#${order.order_number}`
    : `#${order.id.slice(-4).toUpperCase()}`
}
