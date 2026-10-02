/**
 * El calendario del local: el día, la hora y la semana **en hora de
 * Argentina**, sin importar la zona del proceso (spec reportes-en-hora-argentina).
 *
 * Analytics y el Dashboard usaban `setHours(0)`, `getHours()`, `getDay()` y
 * `toISOString().split('T')`, que dependen de la zona del servidor. Vercel
 * corre en UTC, tres horas adelante: el 25 % de los pedidos —los de 21:00 a
 * medianoche, la hora pico de la cena— se contaban en el día siguiente, y el
 * gráfico de horas mostraba todo corrido. En local no se nota: la máquina
 * está en hora argentina.
 *
 * Nada de acá usa la zona del proceso: `Intl` con `timeZone` explícito, o
 * aritmética UTC sobre días sueltos (`YYYY-MM-DD`). Argentina no tiene horario
 * de verano desde 2009, así que el desfase es fijo, como ya asume
 * `order-date-range.ts`.
 */

const ZONA = 'America/Argentina/Buenos_Aires'
const DESFASE = '-03:00'

/** `YYYY-MM-DD` de ese momento en Argentina ('en-CA' da justo ese formato). */
export function diaDelLocal(momento: Date | string = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date(momento))
}

/** La hora (0–23) de ese momento en Argentina. */
export function horaDelLocal(momento: Date | string): number {
  const hora = new Intl.DateTimeFormat('en-US', { timeZone: ZONA, hour: 'numeric', hourCycle: 'h23' }).format(
    new Date(momento)
  )
  return Number(hora)
}

/** Un día suelto como fecha UTC, para hacer cuentas sin que la zona se meta. */
function comoUtc(dia: string): Date {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}

const aDia = (fecha: Date) => fecha.toISOString().slice(0, 10)

export function sumarDias(dia: string, dias: number): string {
  const f = comoUtc(dia)
  f.setUTCDate(f.getUTCDate() + dias)
  return aDia(f)
}

/** 0 = domingo … 6 = sábado, como `getDay()`. */
export function diaDeLaSemana(dia: string): number {
  return comoUtc(dia).getUTCDay()
}

/** El lunes de la semana de ese día. */
export function lunesDe(dia: string): string {
  const dow = diaDeLaSemana(dia)
  return sumarDias(dia, dow === 0 ? -6 : 1 - dow)
}

/** El primero del mes de ese día, o de `mesesAtras` meses antes. */
export function primeroDelMes(dia: string, mesesAtras = 0): string {
  const f = comoUtc(dia)
  return aDia(new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() - mesesAtras, 1)))
}

/** El instante en que empieza ese día en Argentina: para `created_at >=`. */
export function inicioDelDia(dia: string): Date {
  return new Date(`${dia}T00:00:00${DESFASE}`)
}

/** "2 oct", "jue 2": formatea el día suelto en UTC para que no se corra a la víspera. */
export function etiquetaDelDia(dia: string, opciones: Intl.DateTimeFormatOptions): string {
  return comoUtc(dia).toLocaleDateString('es-AR', { ...opciones, timeZone: 'UTC' })
}
