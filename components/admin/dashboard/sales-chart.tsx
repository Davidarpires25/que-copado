'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { formatPrice } from '@/lib/utils'
import { useThemeStore } from '@/lib/store/theme-store'
import type { SalesChartData } from '@/lib/types/orders'

interface SalesChartProps {
  data: SalesChartData[]
}

export function SalesChart({ data }: SalesChartProps) {
  const { theme } = useThemeStore()
  const isDark = theme === 'dark'

  const formattedData = useMemo(() => {
    return data.map((item) => {
      const date = new Date(item.date)
      return {
        ...item,
        dateLabel: date.toLocaleDateString('es-AR', {
          weekday: 'short',
          day: 'numeric',
        }),
      }
    })
  }, [data])

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0)
  const totalOrders = data.reduce((sum, item) => sum + item.orders, 0)

  const gridColor  = isDark ? '#2D3448' : '#E2E8F0'
  const axisColor  = isDark ? '#8B9BB4' : '#94A3B8'

  return (
    <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-6 shadow-[var(--shadow-card)] w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--admin-text)]">
            Ventas - Últimos 7 días
          </h3>
          <p className="text-sm text-[var(--admin-text-muted)] mt-0.5">
            {totalOrders} pedidos • {formatPrice(totalRevenue)}
          </p>
        </div>
      </div>

      <div className="h-[250px] flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="dateLabel"
              stroke={axisColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={axisColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`
              }
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const d = payload[0].payload as SalesChartData & { dateLabel: string }
                const avgTicket = d.orders > 0 ? d.revenue / d.orders : 0

                return (
                  <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg p-3 shadow-[var(--shadow-card-lg)]">
                    <p className="text-xs text-[var(--admin-text-muted)] mb-1">{d.dateLabel}</p>
                    <p className="text-lg font-bold text-[var(--admin-accent-text)]">
                      {formatPrice(d.revenue)}
                    </p>
                    <div className="text-xs text-[var(--admin-text-muted)] mt-2 space-y-0.5">
                      <p>{d.orders} {d.orders === 1 ? 'pedido' : 'pedidos'}</p>
                      {d.orders > 0 && (
                        <p>Ticket promedio: {formatPrice(avgTicket)}</p>
                      )}
                    </div>
                  </div>
                )
              }}
              cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
            />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
              {formattedData.map((_, index) => (
                <Cell key={index} fill="#FEC501" fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
