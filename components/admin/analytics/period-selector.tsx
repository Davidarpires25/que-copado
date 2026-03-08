'use client'

import { cn } from '@/lib/utils'
import type { AnalyticsPeriod } from '@/app/actions/analytics'

interface PeriodSelectorProps {
  value: AnalyticsPeriod
  onChange: (period: AnalyticsPeriod) => void
  options?: AnalyticsPeriod[]
}

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  '7d': '7 días',
  '30d': '30 días',
  '90d': '90 días',
}

export function PeriodSelector({
  value,
  onChange,
  options = ['7d', '30d', '90d'],
}: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-[var(--admin-surface-2)] rounded-lg p-1 shadow-sm">
      {options.map((period) => (
        <button
          key={period}
          onClick={() => onChange(period)}
          aria-label={`Seleccionar período de ${PERIOD_LABELS[period]}`}
          aria-pressed={value === period}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 min-w-[60px] touch-manipulation',
            value === period
              ? 'bg-[var(--admin-accent)] text-[var(--admin-surface)] shadow-md'
              : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)] active:scale-95'
          )}
        >
          {PERIOD_LABELS[period]}
        </button>
      ))}
    </div>
  )
}
