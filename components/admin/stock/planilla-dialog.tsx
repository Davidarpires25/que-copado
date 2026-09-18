'use client'

import { useState } from 'react'
import { ClipboardList, Loader2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getCategoriasParaPlanilla, type CategoriaParaPlanilla } from '@/app/actions/stock'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/**
 * Elegir qué entra en la planilla antes de imprimirla.
 *
 * Son 120 insumos activos: sin elegir, la hoja del freezer sale con las cajas
 * de pizza y los palillos adentro. Se filtra por categoría, que es lo que hay
 * cargado hoy —CARNES, PANIFICACION, DESCARTABLE…—.
 *
 * El número de filas va a la vista mientras se marca, para no llevarse tres
 * páginas sin querer.
 *
 * Nota: la categoría dice *qué es* un insumo, no *dónde está guardado*. CARNES
 * está en el freezer y UTENSILIO no, así que se acerca; si alguna vez hace
 * falta "freezer / heladera / seco" eso es un campo nuevo.
 */
export function PlanillaDialog() {
  const [abierto, setAbierto] = useState(false)
  const [categorias, setCategorias] = useState<CategoriaParaPlanilla[]>([])
  const [elegidas, setElegidas] = useState<Set<string>>(new Set())
  const [cargando, setCargando] = useState(false)

  /**
   * Las categorias se piden al abrir, no en un efecto.
   *
   * Es el mismo movimiento que hizo falta en el minimo de stock: cambiar
   * estado adentro de un `useEffect` dispara renders en cascada y el lint lo
   * marca. Y aca es mas natural igual: abrir el dialogo es el evento.
   */
  const abrir = async () => {
    setAbierto(true)
    if (categorias.length > 0) return

    setCargando(true)
    const { data, error } = await getCategoriasParaPlanilla()
    setCargando(false)

    if (error) toast.error(error)
    else setCategorias(data ?? [])
  }

  const alternar = (id: string) =>
    setElegidas((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })

  const total = categorias
    .filter((c) => elegidas.size === 0 || elegidas.has(c.id))
    .reduce((s, c) => s + c.insumos, 0)

  const imprimir = () => {
    const query = elegidas.size > 0 ? `?categorias=${[...elegidas].join(',')}` : ''
    window.open(`/admin/stock/planilla/print${query}`, '_blank')
    setAbierto(false)
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={abrir}
        className="border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]"
      >
        <ClipboardList className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Planilla de conteo</span>
        <span className="sm:hidden">Planilla</span>
      </Button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Planilla de conteo</DialogTitle>
            <DialogDescription className="text-[var(--admin-text-muted)]">
              Para llevar al freezer y anotar a mano. Elegí qué sectores contás;
              sin elegir nada sale todo.
            </DialogDescription>
          </DialogHeader>

          {cargando ? (
            <p className="flex items-center gap-2 py-6 text-sm text-[var(--admin-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando las categorías…
            </p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {categorias.map((c) => {
                const marcada = elegidas.has(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => alternar(c.id)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                      marcada
                        ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/10'
                        : 'border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)]'
                    )}
                  >
                    <span className="text-sm">{c.nombre}</span>
                    <span className="text-xs text-[var(--admin-text-muted)]">
                      {c.insumos} {c.insumos === 1 ? 'insumo' : 'insumos'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-[var(--admin-border)] pt-4">
            <p className="text-sm text-[var(--admin-text-muted)]">
              {elegidas.size === 0 ? 'Todo: ' : 'Van a salir '}
              <strong className="text-[var(--admin-text)]">{total}</strong>{' '}
              {total === 1 ? 'insumo' : 'insumos'}
            </p>
            <Button
              onClick={imprimir}
              disabled={cargando || categorias.length === 0}
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
