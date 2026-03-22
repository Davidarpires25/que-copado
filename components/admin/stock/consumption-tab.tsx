'use client'

import { useState, useMemo } from 'react'
import { TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getConsumptionReport } from '@/app/actions/stock'
import { toast } from 'sonner'
import { INGREDIENT_UNIT_ABBR, type IngredientUnit } from '@/lib/types/database'
import { formatPrice } from '@/lib/utils'
import type { ConsumptionReportItem } from '@/lib/types/stock'

type Period = '7d' | '30d' | '90d'

const PERIOD_LABELS: Record<Period, string> = {
  '7d': '7 días',
  '30d': '30 días',
  '90d': '90 días',
}

interface ConsumptionTabProps {
  initialData: ConsumptionReportItem[]
  initialPeriod?: Period
}

export function ConsumptionTab({ initialData, initialPeriod = '30d' }: ConsumptionTabProps) {
  const [data, setData] = useState<ConsumptionReportItem[]>(initialData)
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [isLoading, setIsLoading] = useState(false)

  const handlePeriodChange = async (newPeriod: Period) => {
    if (newPeriod === period || isLoading) return
    setPeriod(newPeriod)
    setIsLoading(true)
    try {
      const result = await getConsumptionReport(newPeriod)
      if (result.error) {
        toast.error(result.error)
      } else {
        setData(result.data ?? [])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const totalCost = useMemo(() => data.reduce((sum, item) => sum + item.total_cost, 0), [data])

  const formatQty = (value: number, unit: string) => {
    const abbr = INGREDIENT_UNIT_ABBR[unit as IngredientUnit] ?? unit
    const formatted = Number.isInteger(value) ? value : value.toFixed(2)
    return `${formatted} ${abbr}`
  }

  return (
    <div>
      {/* Period selector */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[var(--admin-text-muted)] text-sm font-medium">Período:</span>
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <Button
            key={p}
            variant="ghost"
            size="sm"
            disabled={isLoading}
            onClick={() => handlePeriodChange(p)}
            className={
              period === p
                ? 'bg-[var(--admin-accent)]/15 text-[var(--admin-accent-text)] border border-[var(--admin-accent)]/30 h-9 px-3 text-xs font-semibold'
                : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] h-9 px-3 text-xs'
            }
          >
            {PERIOD_LABELS[p]}
          </Button>
        ))}
        {isLoading && (
          <span className="text-xs text-[var(--admin-text-muted)] ml-2">Cargando...</span>
        )}
      </div>

      {data.length === 0 ? (
        <div className="border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-[var(--admin-surface-2)] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <TrendingDown className="h-10 w-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--admin-text)] mb-2">Sin datos de consumo</h3>
            <p className="text-[var(--admin-text-muted)] max-w-sm mx-auto">
              No hay movimientos de venta registrados para el período seleccionado.
              Los datos aparecen cuando se registran ventas con stock tracking activo.
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[var(--admin-bg)]">
                <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-bg)]">
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold">Ingrediente</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold text-right">Total consumido</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold text-right hidden sm:table-cell">Promedio/día</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold text-right hidden md:table-cell">Movimientos</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold text-right">Costo total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow
                    key={item.ingredient_id}
                    className="border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] transition-colors"
                  >
                    <TableCell>
                      <p className="font-semibold text-[var(--admin-text)] text-sm lg:text-base">
                        {item.name}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-[var(--admin-text)] text-sm font-medium">
                        {formatQty(item.total_consumed, item.unit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      <span className="text-[var(--admin-text-muted)] text-sm">
                        {formatQty(item.daily_avg, item.unit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      <span className="text-[var(--admin-text-muted)] text-sm">
                        {item.movements_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-semibold ${item.total_cost > 0 ? 'text-[var(--admin-accent-text)]' : 'text-[var(--admin-text-muted)]'}`}>
                        {item.total_cost > 0 ? formatPrice(item.total_cost) : '—'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Total footer */}
          {totalCost > 0 && (
            <div className="border-t border-[var(--admin-border)] px-4 py-3 flex items-center justify-between bg-[var(--admin-bg)]">
              <span className="text-sm font-semibold text-[var(--admin-text-muted)]">
                Costo total del período ({PERIOD_LABELS[period]})
              </span>
              <span className="text-lg font-bold text-[var(--admin-accent-text)]">
                {formatPrice(totalCost)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
