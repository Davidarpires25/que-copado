import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'
import {
  diaDelLocal, horaDelLocal, sumarDias, diaDeLaSemana, lunesDe, primeroDelMes, inicioDelDia, etiquetaDelDia,
} from '@/lib/utils/calendario-del-local'

/**
 * Los reportes cuentan el día del local (spec reportes-en-hora-argentina).
 *
 * Vercel corre en UTC: el proceso de este test también, para medir lo mismo
 * que pasa en producción. En la máquina de David (hora argentina) el error no
 * se veía.
 */
process.env.TZ = 'UTC'

// Jueves 1 de octubre, 22:30 en Argentina = viernes 2, 01:30 UTC.
const CENA_DEL_JUEVES = '2026-10-02T01:30:00Z'

test('un pedido de las 22:30 cuenta en su día, su hora y su día de la semana', () => {
  expect(diaDelLocal(CENA_DEL_JUEVES)).toBe('2026-10-01')
  expect(horaDelLocal(CENA_DEL_JUEVES)).toBe(22)
  expect(diaDeLaSemana(diaDelLocal(CENA_DEL_JUEVES))).toBe(4) // jueves
  // Lo que hacía el código viejo en UTC: viernes, a la 1.
  expect(CENA_DEL_JUEVES.split('T')[0]).toBe('2026-10-02')
  expect(new Date(CENA_DEL_JUEVES).getHours()).toBe(1)
})

test('los cortes de día, semana y mes empiezan a las 0:00 de Argentina', () => {
  expect(inicioDelDia('2026-10-01').toISOString()).toBe('2026-10-01T03:00:00.000Z')
  expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28')
  expect(lunesDe('2026-10-04')).toBe('2026-09-28') // domingo → lunes anterior
  expect(lunesDe('2026-09-28')).toBe('2026-09-28')
  expect(primeroDelMes('2026-10-15')).toBe('2026-10-01')
  expect(primeroDelMes('2026-01-15', 1)).toBe('2025-12-01')
  expect(etiquetaDelDia('2026-10-01', { day: 'numeric', month: 'short' })).toMatch(/^1\b/)
})

test('Analytics y el Dashboard no usan la zona del servidor', () => {
  const PROHIBIDO = /getHours\(|getDay\(|setHours\(|toISOString\(\)\.split|\.split\(['"]T['"]\)/
  const encontrados: string[] = []
  for (const archivo of ['app/actions/analytics.ts', 'app/actions/dashboard.ts']) {
    readFileSync(join(__dirname, '..', archivo), 'utf8').split('\n').forEach((linea, i) => {
      if (PROHIBIDO.test(linea) && !linea.trim().startsWith('//') && !linea.trim().startsWith('*')) {
        encontrados.push(`${archivo}:${i + 1} ${linea.trim()}`)
      }
    })
  }
  expect(encontrados).toEqual([])
})
