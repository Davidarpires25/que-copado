/**
 * El dia de hoy **para el local**, en formato `YYYY-MM-DD`.
 *
 * No es lo mismo que la fecha UTC, y confundirlas rompe justo de noche. El
 * numero correlativo de un pedido se reinicia cada jornada, y quien decide
 * cuando empieza una jornada es el trigger `assign_order_number`, que calcula:
 *
 * ```sql
 * (coalesce(new.created_at, now()) at time zone 'America/Argentina/Buenos_Aires')::date
 * ```
 *
 * Entre las 21:00 y la medianoche de Argentina, UTC ya esta en el dia
 * siguiente. Un endpoint que filtrara por la fecha UTC buscaria los pedidos de
 * manana y no encontraria ninguno: el local en plena cena, y el agente
 * diciendo que ese pedido no existe.
 *
 * `en-CA` porque su formato corto es exactamente `YYYY-MM-DD`.
 */
export const ZONA_DEL_LOCAL = 'America/Argentina/Buenos_Aires'

export function diaDelLocal(momento: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_DEL_LOCAL }).format(momento)
}
