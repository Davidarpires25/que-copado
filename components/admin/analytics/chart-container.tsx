'use client'

import { cn } from '@/lib/utils'
import { PeriodSelector } from './period-selector'
import type { AnalyticsPeriod } from '@/app/actions/analytics'

interface ChartContainerProps {
  title: string
  subtitle?: string
  period?: AnalyticsPeriod
  onPeriodChange?: (period: AnalyticsPeriod) => void
  periodOptions?: AnalyticsPeriod[]
  className?: string
  children: React.ReactNode
}

export function ChartContainer({
  title,
  subtitle,
  period,
  onPeriodChange,
  periodOptions,
  className,
  children,
}: ChartContainerProps) {
  return (
    <div className={cn('bg-[#1a1d24] border border-[#2a2f3a] rounded-xl p-6 hover:border-[#3a4150] transition-colors duration-200', className)}>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-[#f0f2f5]">{title}</h3>
          {subtitle && (
            <p className="text-sm text-[#a8b5c9] mt-0.5">{subtitle}</p>
          )}
        </div>
        {period && onPeriodChange && (
          <div className="shrink-0">
            <PeriodSelector
              value={period}
              onChange={onPeriodChange}
              options={periodOptions}
            />
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
