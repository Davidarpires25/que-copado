/**
 * Rangos de fecha para filtrar pedidos.
 *
 * El dia de un pedido se define en hora Argentina, igual que el numero
 * correlativo (ver 021_numero_de_pedido_por_dia). Si el calculo se hiciera con
 * la zona del navegador, alguien con la maquina en otro huso veria el pedido
 * de las 22:00 como del dia siguiente y no cuadraria con su "#N".
 *
 * Argentina no aplica horario de verano desde 2009, asi que el offset es fijo y
 * se puede escribir directo en el ISO sin arrastrar una libreria de zonas.
 */

const AR_TZ = 'America/Argentina/Buenos_Aires'
const AR_OFFSET = '-03:00'

export type DateFilter = 'today' | 'yesterday' | 'week' | 'all'

export const DATE_FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: 'week', label: 'Últimos 7 días' },
  { value: 'all', label: 'Todos' },
]

/** YYYY-MM-DD de una fecha en hora Argentina. 'en-CA' es el locale que da ese formato. */
export function ymdInAR(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: AR_TZ }).format(date)
}

/** Suma (o resta) dias a un YYYY-MM-DD sin pasar por la zona local. */
function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

export interface OrderDateRange {
  /** Limites en YYYY-MM-DD, para comparar contra `ymdInAR` en el cliente. */
  fromYMD: string
  toYMD: string
  /** Los mismos limites como timestamp, para `getOrders`. */
  dateFrom: string
  dateTo: string
}

/**
 * Devuelve el rango del filtro, o null para 'Todos' (sin acotar).
 * `specificDate` (YYYY-MM-DD) tiene prioridad sobre el preset.
 */
export function orderDateRange(
  filter: DateFilter,
  specificDate?: string
): OrderDateRange | null {
  if (specificDate) return bounds(specificDate, specificDate)
  if (filter === 'all') return null

  const today = ymdInAR()
  if (filter === 'today') return bounds(today, today)
  if (filter === 'yesterday') {
    const yesterday = addDays(today, -1)
    return bounds(yesterday, yesterday)
  }
  return bounds(addDays(today, -6), today)
}

function bounds(fromYMD: string, toYMD: string): OrderDateRange {
  return {
    fromYMD,
    toYMD,
    dateFrom: `${fromYMD}T00:00:00.000${AR_OFFSET}`,
    dateTo: `${toYMD}T23:59:59.999${AR_OFFSET}`,
  }
}
