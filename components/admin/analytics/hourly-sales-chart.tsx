'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Clock } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { HourlySalesData } from '@/app/actions/analytics'

interface HourlySalesChartProps {
  data: HourlySalesData[]
}

export function HourlySalesChart({ data }: HourlySalesChartProps) {
  // Filter to show only hours with data or the operational range (18-02)
  const hasAnyData = data.some((d) => d.orders > 0)
  const displayData = hasAnyData
    ? data.filter((d) => d.orders > 0 || (d.hour >= 10 && d.hour <= 23))
    : data.filter((d) => d.hour >= 18 || d.hour <= 2)

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center h-[280px] text-[#a8b5c9] gap-2">
        <Clock className="h-8 w-8 opacity-50" />
        <p className="text-sm">No hay datos de ventas en este período</p>
      </div>
    )
  }

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={displayData} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
          <XAxis
            dataKey="label"
            stroke="#a8b5c9"
            fontSize={11}
            tickLine={false}
            axisLine={false}
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
              return [v, String(name)]
            }}
            labelFormatter={(label) => `Hora: ${label}`}
            cursor={{ fill: 'rgba(254, 197, 1, 0.05)' }}
          />
          <Bar
            dataKey="revenue"
            fill="#FEC501"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
