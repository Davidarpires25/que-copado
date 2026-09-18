/**
 * Como se llama una mesa.
 *
 * Una mesa puede tener nombre —"Vereda 1", "Barra 2"— y ese nombre es el que usa
 * el salon cuando habla. Catorce lugares escribian `Mesa {numero}` a mano y el
 * nombre solo aparecia en la pantalla donde alguien lo habia cargado: la caja, la
 * comanda de cocina y el ticket decian "Mesa 4" para una mesa que todos llaman
 * "Vereda 1".
 *
 * Lo que mas pesaba era la comanda: cocina prepara para una mesa que en el salon
 * se llama de otra forma, y el plato sale a buscar un lugar que no existe.
 *
 * Es el mismo movimiento que `orderLabel()`: ese numero tambien estaba escrito
 * distinto en cada pantalla y el mismo pedido se llamaba de tres formas a la vez.
 *
 * Sin nombre —que es el caso de casi todas— devuelve `Mesa N`, como siempre.
 */
export function etiquetaDeMesa(mesa: { number: number | null | undefined; label?: string | null }): string {
  const nombre = mesa.label?.trim()
  if (nombre) return nombre
  return `Mesa ${mesa.number ?? '?'}`
}
