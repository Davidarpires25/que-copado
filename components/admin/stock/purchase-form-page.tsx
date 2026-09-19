'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Loader2, PackagePlus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AyudaCampo } from '@/components/ui/ayuda-campo'
import { Textarea } from '@/components/ui/textarea'
import { registerPurchase } from '@/app/actions/stock'
import { toast } from 'sonner'
import { cn, formatPrice } from '@/lib/utils'
import { INGREDIENT_UNIT_ABBR, type IngredientUnit } from '@/lib/types/database'
import type { IngredientWithStock } from '@/lib/types/stock'

interface PurchaseFormPageProps {
  ingredients: IngredientWithStock[]
}

/** Una linea de la compra. El ingrediente ya esta elegido: se agrego buscandolo. */
interface PurchaseLine {
  ingredient_id: string
  quantity: string
  cost_per_unit: string
}

const inputBase =
  'bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 text-sm ' +
  'placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 ' +
  'focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all'

/** Sin acentos y en minuscula: quien busca "puré" escribe "pure". */
const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function PurchaseFormPage({ ingredients }: PurchaseFormPageProps) {
  const router = useRouter()
  const [lines, setLines] = useState<PurchaseLine[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [resaltado, setResaltado] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const cantidadRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const porId = useMemo(
    () => new Map(ingredients.map((i) => [i.id, i])),
    [ingredients]
  )

  const coincidencias = useMemo(() => {
    const q = normalizar(busqueda.trim())
    if (!q) return ingredients
    return ingredients.filter((i) => normalizar(i.name).includes(q))
  }, [ingredients, busqueda])

  const volver = () => router.push('/admin/stock')

  const agregar = (ingredientId: string) => {
    const yaEsta = lines.some((l) => l.ingredient_id === ingredientId)

    // Dos lineas del mismo ingrediente son una sola compra de la suma. En vez de
    // duplicar, se señala la que ya existe y se lleva el foco a su cantidad.
    if (yaEsta) {
      setResaltado(ingredientId)
      setTimeout(() => setResaltado(null), 1200)
      cantidadRefs.current[ingredientId]?.focus()
      return
    }

    setLines((prev) => [...prev, { ingredient_id: ingredientId, quantity: '', cost_per_unit: '' }])
    setBusqueda('')
    setTimeout(() => cantidadRefs.current[ingredientId]?.focus(), 0)
  }

  const quitar = (ingredientId: string) =>
    setLines((prev) => prev.filter((l) => l.ingredient_id !== ingredientId))

  /**
   * Lo que sale cada linea, y lo que sale la compra.
   *
   * El formulario pedia "costo por unidad" y no mostraba ningun total, asi que
   * no habia forma de darse cuenta de que el numero estaba mal. Se cargo el
   * morron como 200 g a $200 la unidad --una compra de $40.000 en morrones-- y
   * nada lo dijo. Con el total a la vista, ese error se ve al tipearlo.
   */
  const totalDeLinea = (l: PurchaseLine): number | null => {
    const cantidad = parseFloat(l.quantity)
    const costo = parseFloat(l.cost_per_unit)
    if (!Number.isFinite(cantidad) || !Number.isFinite(costo)) return null
    return cantidad * costo
  }

  const totalDeLaCompra = lines.reduce((suma, l) => suma + (totalDeLinea(l) ?? 0), 0)
  const lineasConCosto = lines.filter((l) => totalDeLinea(l) !== null).length

  const actualizar = (ingredientId: string, campo: 'quantity' | 'cost_per_unit', valor: string) =>
    setLines((prev) =>
      prev.map((l) => (l.ingredient_id === ingredientId ? { ...l, [campo]: valor } : l))
    )

  const isValid = () =>
    lines.length > 0 && lines.every((l) => l.quantity && parseFloat(l.quantity) > 0)

  const unidadDe = (ingredientId: string) => {
    const ing = porId.get(ingredientId)
    if (!ing) return ''
    return INGREDIENT_UNIT_ABBR[ing.unit as IngredientUnit] ?? ing.unit
  }

  const handleSubmit = async () => {
    if (!isValid()) {
      toast.error('Completá la cantidad de cada ingrediente')
      return
    }

    setLoading(true)
    const result = await registerPurchase({
      items: lines.map((l) => ({
        ingredient_id: l.ingredient_id,
        quantity: parseFloat(l.quantity),
        cost_per_unit: l.cost_per_unit ? parseFloat(l.cost_per_unit) : undefined,
      })),
      reason: reason.trim() || 'Compra de mercadería',
    })
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(
      `Compra registrada — ${lines.length} ítem${lines.length !== 1 ? 's' : ''} actualizados`
    )
    // Refresh antes del push para que stock se vuelva a render con lo nuevo.
    router.refresh()
    router.push('/admin/stock')
  }

  const breadcrumb = (
    <div className="flex items-center gap-2 text-sm text-[var(--admin-text-muted)] mb-6">
      <button
        onClick={volver}
        className="hover:text-[var(--admin-text)] transition-colors flex items-center gap-1.5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Stock
      </button>
      <span>/</span>
      <span className="text-[var(--admin-text)]">Nueva compra</span>
    </div>
  )

  // Sin ingredientes no hay compra posible: el dialogo se abria igual con un
  // selector vacio, se podian agregar lineas y no se podia elegir nada.
  if (ingredients.length === 0) {
    return (
      <div className="max-w-[1200px] mx-auto">
        {breadcrumb}
        <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl shadow-[var(--shadow-card)] p-10 text-center">
          <PackagePlus className="h-10 w-10 mx-auto text-[var(--admin-text-muted)]" />
          <h1 className="mt-4 text-xl font-bold text-[var(--admin-text)]">
            Todavía no hay ingredientes cargados
          </h1>
          <p className="mt-1.5 text-sm text-[var(--admin-text-muted)]">
            Una compra suma stock a un ingrediente, así que primero hay que tener al menos uno.
          </p>
          <Link href="/admin/ingredients/new" className="inline-block mt-6">
            <Button className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold gap-2">
              <Plus className="h-4 w-4" />
              Crear un ingrediente
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {breadcrumb}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--admin-text)]">Registrar compra</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={volver}
            disabled={loading}
            className="border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !isValid()}
            className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/20 gap-2 disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Registrando...</>
            ) : (
              <><PackagePlus className="h-4 w-4" />Registrar compra{lines.length > 0 ? ` (${lines.length})` : ''}</>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr] items-start">
        {/* Buscador + catalogo */}
        <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden">
          <div className="p-4 border-b border-[var(--admin-border)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => {
                  // Enter agrega la primera coincidencia: escribir, Enter,
                  // cantidad, y de vuelta a buscar sin tocar el mouse.
                  if (e.key === 'Enter' && coincidencias.length > 0) {
                    e.preventDefault()
                    agregar(coincidencias[0].id)
                  }
                }}
                placeholder="Buscar ingrediente..."
                className={`${inputBase} pl-9`}
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto divide-y divide-[var(--admin-border)]">
            {coincidencias.length === 0 ? (
              <p className="p-5 text-sm text-[var(--admin-text-muted)] text-center">
                Ningún ingrediente coincide con &quot;{busqueda}&quot;.
              </p>
            ) : (
              coincidencias.map((ing) => {
                const agregado = lines.some((l) => l.ingredient_id === ing.id)
                return (
                  <button
                    key={ing.id}
                    type="button"
                    onClick={() => agregar(ing.id)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors',
                      'hover:bg-[var(--admin-surface-2)]',
                      agregado && 'opacity-55'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm text-[var(--admin-text)] truncate">{ing.name}</span>
                      <span className="block text-xs text-[var(--admin-text-muted)] tabular-nums">
                        {Number(ing.current_stock)} {INGREDIENT_UNIT_ABBR[ing.unit as IngredientUnit] ?? ing.unit} en stock
                      </span>
                    </span>
                    {agregado ? (
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

        {/* La compra que se va armando */}
        <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden">
          {lines.length === 0 ? (
            <div className="p-10 text-center">
              <Search className="h-8 w-8 mx-auto text-[var(--admin-text-muted)]" />
              <p className="mt-3 text-sm text-[var(--admin-text)] font-medium">
                La compra está vacía
              </p>
              <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                Buscá un ingrediente y agregalo para empezar a cargarla.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-[1fr_9rem_9rem_7rem_2.5rem] gap-3 px-5 py-3 border-b border-[var(--admin-border)] text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
                <span>Ingrediente</span>
                <span>Cantidad</span>
                <span>Costo por unidad</span>
                <span className="text-right">Total</span>
                <span className="sr-only">Quitar</span>
              </div>

              <div className="divide-y divide-[var(--admin-border)]">
                {lines.map((line) => {
                  const ing = porId.get(line.ingredient_id)
                  return (
                    <div
                      key={line.ingredient_id}
                      className={cn(
                        'grid grid-cols-1 md:grid-cols-[1fr_9rem_9rem_7rem_2.5rem] gap-3 px-5 py-4 items-center transition-colors',
                        resaltado === line.ingredient_id && 'bg-[var(--admin-accent)]/15'
                      )}
                    >
                      <span className="text-sm font-medium text-[var(--admin-text)]">
                        {ing?.name ?? 'Ingrediente'}
                      </span>

                      <div>
                        <Label className="md:hidden text-[var(--admin-text-muted)] text-xs">Cantidad</Label>
                        <div className="relative">
                          <Input
                            ref={(el) => { cantidadRefs.current[line.ingredient_id] = el }}
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.quantity}
                            onChange={(e) => actualizar(line.ingredient_id, 'quantity', e.target.value)}
                            placeholder="Cantidad"
                            className={`${inputBase} pr-10`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--admin-text-muted)]">
                            {unidadDe(line.ingredient_id)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <Label className="md:hidden text-[var(--admin-text-muted)] text-xs">
                          Costo por unidad (opcional)
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--admin-text-muted)]">
                            $
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.cost_per_unit}
                            onChange={(e) => actualizar(line.ingredient_id, 'cost_per_unit', e.target.value)}
                            placeholder="Opcional"
                            className={`${inputBase} pl-6`}
                          />
                        </div>
                      </div>

                      <div className="md:text-right">
                        <Label className="md:hidden text-[var(--admin-text-muted)] text-xs">Total</Label>
                        {totalDeLinea(line) === null ? (
                          <span className="text-sm text-[var(--admin-text-muted)]">—</span>
                        ) : (
                          <span className="text-sm font-semibold text-[var(--admin-text)] tabular-nums">
                            {formatPrice(totalDeLinea(line)!)}
                          </span>
                        )}
                      </div>

                      <div className="flex md:justify-center">
                        <button
                          type="button"
                          onClick={() => quitar(line.ingredient_id)}
                          title={`Quitar ${ing?.name ?? 'ingrediente'}`}
                          className="p-2 text-[var(--admin-text-muted)] hover:text-red-700 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {lineasConCosto > 0 && (
                <div className="flex items-baseline justify-end gap-3 border-t border-[var(--admin-border)] px-5 py-4">
                  <span className="text-sm text-[var(--admin-text-muted)]">
                    Total de la compra
                    {lineasConCosto < lines.length && (
                      <span className="ml-1 text-xs">
                        ({lineasConCosto} de {lines.length} con costo)
                      </span>
                    )}
                  </span>
                  <span className="text-lg font-semibold text-[var(--admin-text)] tabular-nums">
                    {formatPrice(totalDeLaCompra)}
                  </span>
                </div>
              )}
            </>
          )}

          {/* La nota es un campo mas de la misma carga, no una pieza aparte:
              va en el mismo panel, separada por un hairline. */}
          <div className="border-t border-[var(--admin-border)] p-5 space-y-1.5">
            <Label
              htmlFor="purchase-reason"
              className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide inline-flex items-center gap-1.5"
            >
              Descripción / Nota (opcional)
              <AyudaCampo>
                Queda en el historial de movimientos. Sin nota se guarda como
                &quot;Compra de mercadería&quot;.
              </AyudaCampo>
            </Label>
            <Textarea
              id="purchase-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Compra semanal de mercadería"
              rows={2}
              className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] resize-none focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 placeholder:text-[var(--admin-text-muted)]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
