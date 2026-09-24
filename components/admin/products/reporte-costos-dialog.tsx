'use client'

import { useState } from 'react'
import { FileText, Loader2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getGruposDelReporte, type GrupoDeCosto } from '@/app/actions/reporte-costos'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const GRUPOS: { clave: GrupoDeCosto; nombre: string; detalle: string }[] = [
  { clave: 'elaborado', nombre: 'Elaborados', detalle: 'costo, precio y margen' },
  { clave: 'combo', nombre: 'Combos', detalle: 'costo, precio y margen' },
  { clave: 'reventa', nombre: 'Reventa', detalle: 'costo, precio y margen' },
  { clave: 'insumo', nombre: 'Insumos', detalle: 'costo por unidad' },
]

/**
 * Elegir que entra en el reporte de costos antes de imprimirlo.
 *
 * David: *"tiene que mostrar los costos y dar la opcion de elegir productos
 * tanto elaborados como de reventa e ingredientes"*. Cada grupo se revisa por
 * una razon distinta --la reventa contra la factura del proveedor, los
 * elaborados contra su receta, los insumos contra lo que se pago-- y los
 * insumos solos son mas de cien renglones.
 *
 * Mismo comportamiento que la planilla de conteo: sin elegir nada sale todo, y
 * el total de renglones esta a la vista mientras se marca.
 */
export function ReporteCostosDialog() {
  const [abierto, setAbierto] = useState(false)
  const [cuenta, setCuenta] = useState<Record<GrupoDeCosto, number> | null>(null)
  const [elegidos, setElegidos] = useState<Set<GrupoDeCosto>>(new Set())
  const [cargando, setCargando] = useState(false)

  // Se pide al abrir, no en un efecto: abrir el dialogo es el evento.
  const abrir = async () => {
    setAbierto(true)
    if (cuenta) return
    setCargando(true)
    const { data, error } = await getGruposDelReporte()
    setCargando(false)
    if (error) toast.error(error)
    else setCuenta(data)
  }

  const alternar = (clave: GrupoDeCosto) =>
    setElegidos((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(clave)) siguiente.delete(clave)
      else siguiente.add(clave)
      return siguiente
    })

  const total = cuenta
    ? GRUPOS.filter((g) => elegidos.size === 0 || elegidos.has(g.clave)).reduce(
        (s, g) => s + cuenta[g.clave],
        0
      )
    : 0

  const imprimir = () => {
    const query = elegidos.size > 0 ? `?grupos=${[...elegidos].join(',')}` : ''
    window.open(`/admin/products/costos/print${query}`, '_blank')
    setAbierto(false)
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={abrir}
        className="border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]"
      >
        <FileText className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Reporte de costos</span>
        <span className="sm:hidden">Costos</span>
      </Button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reporte de costos</DialogTitle>
            <DialogDescription className="text-[var(--admin-text-muted)]">
              Elegí qué entra. Sin elegir nada sale todo.
            </DialogDescription>
          </DialogHeader>

          {cargando ? (
            <p className="flex items-center gap-2 py-6 text-sm text-[var(--admin-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Contando…
            </p>
          ) : (
            <div className="space-y-1.5">
              {GRUPOS.map((g) => {
                const marcado = elegidos.has(g.clave)
                return (
                  <button
                    key={g.clave}
                    type="button"
                    onClick={() => alternar(g.clave)}
                    aria-pressed={marcado}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                      marcado
                        ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/10'
                        : 'border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)]'
                    )}
                  >
                    <span>
                      <span className="block text-sm">{g.nombre}</span>
                      <span className="block text-xs text-[var(--admin-text-muted)]">{g.detalle}</span>
                    </span>
                    <span className="text-xs text-[var(--admin-text-muted)]">{cuenta?.[g.clave] ?? '—'}</span>
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-[var(--admin-border)] pt-4">
            <p className="text-sm text-[var(--admin-text-muted)]">
              {elegidos.size === 0 ? 'Todo: ' : 'Van a salir '}
              <strong className="text-[var(--admin-text)]">{total}</strong>{' '}
              {total === 1 ? 'renglón' : 'renglones'}
            </p>
            <Button
              onClick={imprimir}
              disabled={cargando || !cuenta}
              className="ml-auto bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
