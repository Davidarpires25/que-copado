'use client'

import { useState, useMemo } from 'react'
import { Search, Plus, Trash2, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Label } from '@/components/ui/label'
import { cn, formatPrice } from '@/lib/utils'
import { PRODUCT_TYPE_LABELS, type ProductType } from '@/lib/types/database'

/** Un producto que puede ser componente de un combo. */
export interface ComponentCandidate {
  id: string
  name: string
  price: number
  cost: number | null
  product_type: string | null
  station: string | null
}

/** Lo elegido: qué producto entra al combo y cuántas veces. */
export interface ProductComponentItem {
  component_id: string
  quantity: number
}

interface ComponentSelectorProps {
  /** Productos del catálogo que pueden ser componentes. Sin combos ni el producto que se edita. */
  candidates: ComponentCandidate[]
  selected: ProductComponentItem[]
  onChange: (items: ProductComponentItem[]) => void
}

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Los componentes de un combo.
 *
 * Mismo gesto que la carga de una compra: se busca por nombre y se agrega, en vez
 * de un desplegable por linea. El catalogo de productos crece igual que el de
 * ingredientes.
 *
 * Un componente es un producto del catalogo —el mismo que se vende suelto—, que
 * es lo que hace que la bebida del combo descuente del stock real en vez de un
 * inventario paralelo.
 */
export function ComponentSelector({ candidates, selected, onChange }: ComponentSelectorProps) {
  const [busqueda, setBusqueda] = useState('')

  const porId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates])

  const coincidencias = useMemo(() => {
    const q = normalizar(busqueda.trim())
    if (!q) return candidates
    return candidates.filter((c) => normalizar(c.name).includes(q))
  }, [candidates, busqueda])

  const agregar = (id: string) => {
    if (selected.some((s) => s.component_id === id)) return
    onChange([...selected, { component_id: id, quantity: 1 }])
    setBusqueda('')
  }

  const quitar = (id: string) => onChange(selected.filter((s) => s.component_id !== id))

  const cambiarCantidad = (id: string, cantidad: number) =>
    onChange(selected.map((s) => (s.component_id === id ? { ...s, quantity: cantidad } : s)))

  // El costo del combo es la suma de lo que cuesta cada componente. Es el dato
  // que hasta ahora no existia: un combo armado como receta no sabia cuanto le
  // costaba la bebida.
  const costoTotal = selected.reduce((sum, s) => {
    const p = porId.get(s.component_id)
    return sum + Number(p?.cost ?? 0) * s.quantity
  }, 0)

  const precioSuelto = selected.reduce((sum, s) => {
    const p = porId.get(s.component_id)
    return sum + Number(p?.price ?? 0) * s.quantity
  }, 0)

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-[var(--admin-text-muted)]">
          Qué incluye el combo
        </Label>
        <p className="text-xs text-[var(--admin-text-muted)] mt-1">
          Cada componente es un producto del catálogo. Al vender el combo se descuenta del
          mismo stock que si se vendiera suelto.
        </p>
      </div>

      {/* Lo elegido */}
      {selected.length > 0 && (
        <div className="rounded-lg border border-[var(--admin-border)] overflow-hidden divide-y divide-[var(--admin-border)]">
          {selected.map((item) => {
            const p = porId.get(item.component_id)
            return (
              <div key={item.component_id} className="flex items-center gap-3 px-3 py-2.5 bg-[var(--admin-bg)]">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--admin-text)] truncate">
                    {p?.name ?? 'Producto'}
                  </p>
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    {p ? PRODUCT_TYPE_LABELS[p.product_type as ProductType] ?? p.product_type : ''}
                    {p?.station ? ` · ${p.station}` : ''}
                    {p?.cost ? ` · costo ${formatPrice(Number(p.cost))}` : ''}
                  </p>
                </div>
                <NumberInput
                  min="1"
                  step="1"
                  integer
                  value={item.quantity}
                  onValueChange={(n) => cambiarCantidad(item.component_id, n)}
                  className="w-20 h-9 bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm"
                  aria-label={`Cantidad de ${p?.name ?? 'componente'}`}
                />
                <button
                  type="button"
                  onClick={() => quitar(item.component_id)}
                  title={`Quitar ${p?.name ?? 'componente'}`}
                  className="p-2 text-[var(--admin-text-muted)] hover:text-red-700 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Buscador */}
      <div className="rounded-lg border border-[var(--admin-border)] overflow-hidden">
        <div className="p-2.5 border-b border-[var(--admin-border)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const primero = coincidencias.find((c) => !selected.some((s) => s.component_id === c.id))
                  if (primero) agregar(primero.id)
                }
              }}
              placeholder="Buscar producto para agregar..."
              className="pl-9 h-10 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm"
            />
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto divide-y divide-[var(--admin-border)]">
          {coincidencias.length === 0 ? (
            <p className="p-4 text-sm text-[var(--admin-text-muted)] text-center">
              Ningún producto coincide con &quot;{busqueda}&quot;.
            </p>
          ) : (
            coincidencias.map((c) => {
              const yaEsta = selected.some((s) => s.component_id === c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => agregar(c.id)}
                  disabled={yaEsta}
                  className={cn(
                    'w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition-colors',
                    'hover:bg-[var(--admin-surface-2)]',
                    yaEsta && 'opacity-50 cursor-default'
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-sm text-[var(--admin-text)] truncate">{c.name}</span>
                    <span className="block text-xs text-[var(--admin-text-muted)]">
                      {PRODUCT_TYPE_LABELS[c.product_type as ProductType] ?? c.product_type} · {formatPrice(Number(c.price))}
                    </span>
                  </span>
                  {yaEsta ? (
                    <span className="shrink-0 text-xs text-[var(--admin-text-muted)]">agregado</span>
                  ) : (
                    <Plus className="shrink-0 h-4 w-4 text-[var(--admin-text-muted)]" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {selected.length === 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-400/80 text-center py-1">
          Sin componentes, el combo solo descuenta sus recetas. Si además entrega
          un producto terminado —una bebida, por ejemplo— agregalo acá para que
          salga del mismo stock que si se vendiera suelto.
        </p>
      ) : (
        <div className="flex items-start gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2.5">
          <Info className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 dark:text-blue-300">
            Costo del combo: <strong>{formatPrice(costoTotal)}</strong>, sumando sus componentes.
            Vendidos por separado saldrían {formatPrice(precioSuelto)}.
          </p>
        </div>
      )}
    </div>
  )
}
