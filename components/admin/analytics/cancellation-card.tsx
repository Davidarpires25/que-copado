'use client'

import { AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PeriodSelector } from './period-selector'
import type { CancellationData, AnalyticsPeriod } from '@/app/actions/analytics'

interface CancellationCardProps {
  data: CancellationData | null
  loading?: boolean
  period?: AnalyticsPeriod
  onPeriodChange?: (period: AnalyticsPeriod) => void
}

export function CancellationCard({ data, loading, period, onPeriodChange }: CancellationCardProps) {
  // Color thresholds: green <3%, yellow 3-5%, red >5%
  const getStatusColor = (rate: number) => {
    if (rate < 3) return { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' }
    if (rate <= 5) return { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' }
    return { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' }
  }

  const status = data ? getStatusColor(data.rate) : { bg: '', text: '', border: 'border-[var(--admin-border)]' }
  const isHealthy = data ? data.rate < 3 : true

  return (
    <div className={cn('bg-[var(--admin-surface)] border rounded-xl p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] transition-all duration-200 flex-1', status.border)}>
      {period && onPeriodChange && (
        <div className="flex justify-end mb-2">
          <PeriodSelector value={period} onChange={onPeriodChange} />
        </div>
      )}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--admin-text)]">
            Tasa de Cancelación
          </h3>
          {data && (
            <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
              {data.totalOrders} pedidos totales
            </p>
          )}
        </div>
        {data && (
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', status.bg)}>
            {isHealthy ? (
              <CheckCircle className={cn('h-4 w-4', status.text)} />
            ) : (
              <AlertTriangle className={cn('h-4 w-4', status.text)} />
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="h-10 w-20 bg-[var(--admin-surface-2)] rounded animate-pulse" />
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center py-4">
          <p className="text-[var(--admin-text-muted)] text-sm">No hay datos de cancelación</p>
        </div>
      ) : (
        <div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-3xl font-bold', status.text)}>
              {data.rate}%
            </span>
            {data.cancelledOrders > 0 && (
              <span className="text-sm text-[var(--admin-text-muted)]">
                ({data.cancelledOrders} cancelados)
              </span>
            )}
          </div>

          {data.trend && (
            <div className="mt-2 flex items-center gap-1 text-xs bg-[var(--admin-surface-2)] rounded-lg px-2.5 py-1 w-fit">
              <span className={data.trend.isPositive ? 'text-red-500' : 'text-green-500'}>
                {data.trend.isPositive ? '↑' : '↓'} {data.trend.value}%
              </span>
              <span className="text-[var(--admin-text-muted)]">vs. período anterior</span>
            </div>
          )}

          <div className={cn('mt-3 text-xs rounded-lg p-2', status.bg)}>
            <p className={status.text}>
              {isHealthy
                ? 'Excelente: tasa por debajo del 3%'
                : data.rate <= 5
                  ? 'Atención: tasa entre 3% y 5%'
                  : 'Alerta: tasa supera el 5%'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
