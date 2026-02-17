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

  const status = data ? getStatusColor(data.rate) : { bg: '', text: '', border: 'border-[#2a2f3a]' }
  const isHealthy = data ? data.rate < 3 : true

  return (
    <div className={cn('bg-[#1a1d24] border rounded-xl p-6 hover:border-opacity-50 transition-all duration-200 flex-1 flex flex-col', status.border)}>
      {period && onPeriodChange && (
        <div className="flex justify-end mb-3">
          <PeriodSelector value={period} onChange={onPeriodChange} />
        </div>
      )}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[#f0f2f5]">
            Tasa de Cancelación
          </h3>
          {data && (
            <p className="text-sm text-[#8b9ab0] mt-0.5">
              {data.totalOrders} pedidos totales
            </p>
          )}
        </div>
        {data && (
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform hover:scale-110', status.bg)}>
            {isHealthy ? (
              <CheckCircle className={cn('h-5 w-5', status.text)} />
            ) : (
              <AlertTriangle className={cn('h-5 w-5', status.text)} />
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-12 w-24 bg-[#252a35] rounded animate-pulse" />
        </div>
      ) : !data ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#8b9ab0] text-sm">No hay datos de cancelación</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-baseline gap-2">
            <span className={cn('text-4xl font-bold', status.text)}>
              {data.rate}%
            </span>
            {data.cancelledOrders > 0 && (
              <span className="text-sm text-[#8b9ab0]">
                ({data.cancelledOrders} cancelados)
              </span>
            )}
          </div>

          {data.trend && (
            <div className="mt-3 flex items-center gap-1 text-sm bg-[#252a35] rounded-lg px-3 py-1.5 w-fit">
              <span className={data.trend.isPositive ? 'text-red-500' : 'text-green-500'}>
                {data.trend.isPositive ? '↑' : '↓'} {data.trend.value}%
              </span>
              <span className="text-[#8b9ab0]">vs. período anterior</span>
            </div>
          )}

          <div className={cn('mt-4 text-xs rounded-lg p-2', status.bg)}>
            <p className={status.text}>
              {isHealthy
                ? 'Excelente: tu tasa de cancelación está por debajo del 3%'
                : data.rate <= 5
                  ? 'Atención: la tasa de cancelación está entre 3% y 5%'
                  : 'Alerta: la tasa de cancelación supera el 5%. Revisemos las causas.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
