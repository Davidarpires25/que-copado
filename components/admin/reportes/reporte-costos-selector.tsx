'use client'

import { useMemo, useState } from 'react'
import { Printer, Check } from 'lucide-react'
import { AdminLayout } from '@/components/admin/layout'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { OpcionDeCategoria } from '@/app/actions/reporte-costos'
import {
  GRUPOS_DE_COSTO,
  seleccionAQuery,
  type GrupoDeCosto,
  type SeleccionDeCostos,
} from '@/lib/constants/reporte-costos'

const GRUPO: Record<GrupoDeCosto, { nombre: string; detalle: string }> = {
  elaborado: { nombre: 'Elaborados', detalle: 'Costo, precio y margen' },
  combo: { nombre: 'Combos', detalle: 'Costo, precio y margen' },
  reventa: { nombre: 'Reventa', detalle: 'Costo, precio y margen' },
  insumo: { nombre: 'Insumos', detalle: 'Costo por unidad' },
}

interface Props {
  opciones: Record<GrupoDeCosto, OpcionDeCategoria[]> | null
  error: string | null
}

/**
 * Armar el reporte de costos: que grupos, y dentro de cada uno que categorias.
 *
 * Es una pagina y no un dialogo porque la eleccion crecio: cuatro grupos con
 * sus categorias adentro --los insumos tienen una docena-- no entran comodos
 * en una ventanita.
 *
 * Tocar el nombre de un grupo lo marca entero; tocar una categoria marca solo
 * esa. Sin marcar nada se imprime todo, como la planilla de conteo.
 */
export function ReporteCostosSelector({ opciones, error }: Props) {
  // Por grupo, las categorias elegidas.
  const [elegidas, setElegidas] = useState<Record<GrupoDeCosto, Set<string>>>({
    elaborado: new Set(), combo: new Set(), reventa: new Set(), insumo: new Set(),
  })

  const todasDe = (g: GrupoDeCosto) => (opciones?.[g] ?? []).map((c) => c.id)

  const grupoEntero = (g: GrupoDeCosto) =>
    todasDe(g).length > 0 && todasDe(g).every((id) => elegidas[g].has(id))

  const alternarGrupo = (g: GrupoDeCosto) =>
    setElegidas((prev) => ({
      ...prev,
      [g]: grupoEntero(g) ? new Set() : new Set(todasDe(g)),
    }))

  const alternarCategoria = (g: GrupoDeCosto, id: string) =>
    setElegidas((prev) => {
      const s = new Set(prev[g])
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return { ...prev, [g]: s }
    })

  const nadaElegido = GRUPOS_DE_COSTO.every((g) => elegidas[g].size === 0)

  const renglones = useMemo(() => {
    if (!opciones) return 0
    return GRUPOS_DE_COSTO.reduce(
      (total, g) =>
        total +
        opciones[g]
          .filter((c) => nadaElegido || elegidas[g].has(c.id))
          .reduce((s, c) => s + c.cantidad, 0),
      0
    )
  }, [opciones, elegidas, nadaElegido])

  const imprimir = () => {
    const sel: SeleccionDeCostos = {}
    for (const g of GRUPOS_DE_COSTO) {
      if (elegidas[g].size === 0) continue
      // Si estan todas, viaja '*': la URL sigue valiendo si mañana se crea una
      // categoria nueva en ese grupo.
      sel[g] = grupoEntero(g) ? '*' : [...elegidas[g]]
    }
    window.open(`/admin/reportes/costos/print${seleccionAQuery(sel)}`, '_blank')
  }

  return (
    <AdminLayout title="Reporte de costos" contentWidth="max-w-4xl">
      {error && <p className="mb-4 text-sm text-red-700 dark:text-red-400">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {GRUPOS_DE_COSTO.map((g) => {
          const categorias = opciones?.[g] ?? []
          const entero = grupoEntero(g)
          const total = categorias.reduce((s, c) => s + c.cantidad, 0)

          return (
            <section
              key={g}
              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4"
            >
              <button
                type="button"
                onClick={() => alternarGrupo(g)}
                disabled={categorias.length === 0}
                aria-pressed={entero}
                className="flex w-full items-center gap-3 text-left disabled:opacity-50"
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                    entero
                      ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)] text-black'
                      : 'border-[var(--admin-border)]'
                  )}
                >
                  {entero && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-[var(--admin-text)]">{GRUPO[g].nombre}</span>
                  <span className="block text-xs text-[var(--admin-text-muted)]">{GRUPO[g].detalle}</span>
                </span>
                <span className="text-sm text-[var(--admin-text-muted)]">{total}</span>
              </button>

              {categorias.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--admin-border)] pt-3">
                  {categorias.map((c) => {
                    const marcada = elegidas[g].has(c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => alternarCategoria(g, c.id)}
                        aria-pressed={marcada}
                        className={cn(
                          'rounded-md border px-2.5 py-1 text-xs transition-colors',
                          marcada
                            ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/10 text-[var(--admin-text)]'
                            : 'border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
                        )}
                      >
                        {c.nombre} <span className="opacity-60">{c.cantidad}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>

      <div className="mt-6 flex items-center gap-3 border-t border-[var(--admin-border)] pt-4">
        <p className="text-sm text-[var(--admin-text-muted)]">
          {nadaElegido ? 'Sin elegir nada sale todo: ' : 'Van a salir '}
          <strong className="text-[var(--admin-text)]">{renglones}</strong>{' '}
          {renglones === 1 ? 'renglón' : 'renglones'}
        </p>
        <Button
          onClick={imprimir}
          disabled={!opciones}
          className="ml-auto bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold"
        >
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>
    </AdminLayout>
  )
}
