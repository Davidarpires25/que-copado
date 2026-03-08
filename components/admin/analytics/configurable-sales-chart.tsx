'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { ConfigurableSalesData } from '@/app/actions/analytics'

interface ConfigurableSalesChartProps {
  data: ConfigurableSalesData[]
}

export function ConfigurableSalesChart({ data }: ConfigurableSalesChartProps) {
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0)
  const totalOrders = data.reduce((sum, item) => sum + item.orders, 0)
  const hasData = data.some((d) => d.orders > 0)

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-[var(--admin-text-muted)] gap-2">
        <TrendingUp className="h-8 w-8 opacity-50" />
        <p className="text-sm">No hay datos de ventas en este período</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 text-sm bg-[var(--admin-surface-2)] rounded-lg px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[var(--admin-text-muted)]">Total:</span>
          <span className="text-[var(--admin-accent-text)] font-semibold">{formatPrice(totalRevenue)}</span>
        </div>
        <div className="h-4 w-px bg-[var(--admin-border)]" />
        <div className="flex items-center gap-2">
          <span className="text-[var(--admin-text-muted)]">Pedidos:</span>
          <span className="text-[var(--admin-text)] font-semibold">{totalOrders}</span>
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenueAnalytics" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FEC501" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FEC501" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
            <XAxis
              dataKey="label"
              stroke="#a8b5c9"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#a8b5c9"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) =>
                v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1d24',
                border: '1px solid #2a2f3a',
                borderRadius: '8px',
                color: '#f0f2f5',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
              }}
              formatter={(value, name) => {
                const v = Number(value) || 0
                if (name === 'revenue') return [formatPrice(v), 'Ingresos']
                if (name === 'orders') return [v, 'Pedidos']
                return [v, String(name)]
              }}
              cursor={{ strokeDasharray: '3 3', stroke: '#FEC501', strokeOpacity: 0.3 }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#FEC501"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenueAnalytics)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
