'use client'

import { useState, useEffect } from 'react'
import { ArrowUp, ArrowDown, ArrowRightLeft, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { getStockMovements } from '@/app/actions/stock'
import { toast } from 'sonner'
import { STOCK_MOVEMENT_TYPE_LABELS, type StockMovementType, type StockMovementWithDetails } from '@/lib/types/stock'
import { INGREDIENT_UNIT_ABBR, type IngredientUnit } from '@/lib/types/database'

interface MovementsTabProps {
  initialMovements: StockMovementWithDetails[]
}

const MOVEMENT_ICON: Record<StockMovementType, React.ReactNode> = {
  purchase: <ArrowUp className="h-3.5 w-3.5 text-green-400" />,
  initial: <ArrowUp className="h-3.5 w-3.5 text-blue-400" />,
  return: <ArrowUp className="h-3.5 w-3.5 text-green-400" />,
  adjustment: <ArrowRightLeft className="h-3.5 w-3.5 text-yellow-400" />,
  waste: <ArrowDown className="h-3.5 w-3.5 text-red-400" />,
  sale: <ArrowDown className="h-3.5 w-3.5 text-orange-400" />,
  sale_reversal: <ArrowUp className="h-3.5 w-3.5 text-cyan-400" />,
}

const MOVEMENT_BADGE_CLASS: Record<StockMovementType, string> = {
  purchase: 'bg-green-500/15 text-green-400 border-green-500/30',
  initial: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  return: 'bg-green-500/15 text-green-400 border-green-500/30',
  adjustment: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  waste: 'bg-red-500/15 text-red-400 border-red-500/30',
  sale: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  sale_reversal: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
}

export function MovementsTab({ initialMovements }: MovementsTabProps) {
  const [movements, setMovements] = useState(initialMovements)
  const [filterType, setFilterType] = useState<StockMovementType | 'all'>('all')
  const [filterTarget, setFilterTarget] = useState<'all' | 'ingredient' | 'product'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(initialMovements.length === 0)

  // Lazy load on first render — movements are not shown on initial page load
  useEffect(() => {
    if (initialMovements.length > 0) return
    let cancelled = false
    getStockMovements({ limit: 50 }).then((result) => {
      if (!cancelled) {
        setMovements(result.data ?? [])
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  const applyFilters = async () => {
    setLoading(true)
    const result = await getStockMovements({
      movement_type: filterType === 'all' ? undefined : filterType,
      target_type: filterTarget === 'all' ? undefined : filterTarget,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      limit: 100,
    })
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }
    setMovements(result.data ?? [])
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatQuantity = (movement: StockMovementWithDetails) => {
    const unit = movement.ingredients?.unit
      ? INGREDIENT_UNIT_ABBR[movement.ingredients.unit as IngredientUnit] ?? movement.ingredients.unit
      : 'u'
    const sign = movement.quantity >= 0 ? '+' : ''
    const abs = Math.abs(movement.quantity)
    return `${sign}${Number.isInteger(abs) ? abs : abs.toFixed(2)} ${unit}`
  }

  const getItemName = (movement: StockMovementWithDetails) => {
    return movement.ingredients?.name ?? movement.products?.name ?? '—'
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border)]">
        <Select value={filterType} onValueChange={(v) => setFilterType(v as StockMovementType | 'all')}>
          <SelectTrigger className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] w-44 h-9 text-sm focus:border-[var(--admin-accent)]/50">
            <Filter className="h-3.5 w-3.5 text-[var(--admin-text-muted)] mr-1" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)]">
            <SelectItem value="all" className="text-[var(--admin-text)] focus:bg-[var(--admin-border)]">Todos los tipos</SelectItem>
            {Object.entries(STOCK_MOVEMENT_TYPE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key} className="text-[var(--admin-text)] focus:bg-[var(--admin-border)]">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTarget} onValueChange={(v) => setFilterTarget(v as 'all' | 'ingredient' | 'product')}>
          <SelectTrigger className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] w-40 h-9 text-sm focus:border-[var(--admin-accent)]/50">
            <SelectValue placeholder="Item" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)]">
            <SelectItem value="all" className="text-[var(--admin-text)] focus:bg-[var(--admin-border)]">Todos</SelectItem>
            <SelectItem value="ingredient" className="text-[var(--admin-text)] focus:bg-[var(--admin-border)]">Ingredientes</SelectItem>
            <SelectItem value="product" className="text-[var(--admin-text)] focus:bg-[var(--admin-border)]">Productos</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] h-9 text-sm w-40 focus:border-[var(--admin-accent)]/50 [color-scheme:dark]"
          placeholder="Desde"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] h-9 text-sm w-40 focus:border-[var(--admin-accent)]/50 [color-scheme:dark]"
          placeholder="Hasta"
        />

        <Button
          onClick={applyFilters}
          disabled={loading}
          size="sm"
          className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold h-9 px-4"
        >
          Filtrar
        </Button>
      </div>

      {/* Skeleton while lazy loading */}
      {loading && (
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[var(--admin-border)]/50 last:border-0">
              <div className="h-3 w-24 bg-[var(--admin-border)] rounded animate-pulse" />
              <div className="h-3 w-32 bg-[var(--admin-border)] rounded animate-pulse" />
              <div className="h-5 w-20 bg-[var(--admin-border)] rounded-full animate-pulse" />
              <div className="h-3 w-16 bg-[var(--admin-border)] rounded animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {!loading && movements.length === 0 ? (
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] p-16 text-center">
          <ArrowRightLeft className="h-10 w-10 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--admin-text)] mb-1">Sin movimientos</h3>
          <p className="text-[var(--admin-text-muted)] text-sm">
            Los movimientos aparecen cuando ajustás stock o registrás compras.
          </p>
        </div>
      ) : !loading && (
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-bg)]">
                <tr>
                  <th className="text-left text-[var(--admin-text-muted)] font-semibold px-4 py-3 whitespace-nowrap">Fecha</th>
                  <th className="text-left text-[var(--admin-text-muted)] font-semibold px-4 py-3">Item</th>
                  <th className="text-left text-[var(--admin-text-muted)] font-semibold px-4 py-3">Tipo</th>
                  <th className="text-right text-[var(--admin-text-muted)] font-semibold px-4 py-3">Cantidad</th>
                  <th className="text-right text-[var(--admin-text-muted)] font-semibold px-4 py-3 hidden md:table-cell">Anterior → Nuevo</th>
                  <th className="text-left text-[var(--admin-text-muted)] font-semibold px-4 py-3 hidden lg:table-cell">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((mov) => (
                  <tr key={mov.id} className="border-b border-[var(--admin-border)]/50 hover:bg-[var(--admin-surface-2)] transition-colors">
                    <td className="px-4 py-3 text-[var(--admin-text-muted)] whitespace-nowrap">
                      {formatDate(mov.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[var(--admin-text)]">{getItemName(mov)}</span>
                        <span className="text-[var(--admin-text-muted)] text-xs">
                          {mov.ingredients ? 'Ingrediente' : 'Producto'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={`border font-medium text-xs gap-1.5 hover:opacity-90 ${MOVEMENT_BADGE_CLASS[mov.movement_type]}`}
                      >
                        {MOVEMENT_ICON[mov.movement_type]}
                        {STOCK_MOVEMENT_TYPE_LABELS[mov.movement_type]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${mov.quantity >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatQuantity(mov)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell text-[var(--admin-text-muted)]">
                      {mov.previous_stock} → {mov.new_stock}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-[var(--admin-text-muted)] max-w-xs truncate">
                      {mov.reason ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[var(--admin-border)] text-xs text-[var(--admin-text-muted)]">
            {movements.length} movimiento{movements.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
