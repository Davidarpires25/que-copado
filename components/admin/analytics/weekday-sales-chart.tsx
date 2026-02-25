'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Calendar } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { WeekdaySalesData } from '@/app/actions/analytics'

interface WeekdaySalesChartProps {
  data: WeekdaySalesData[]
}

export function WeekdaySalesChart({ data }: WeekdaySalesChartProps) {
  const hasAnyData = data.some((d) => d.totalOrders > 0)

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center h-[280px] text-[#a8b5c9] gap-2">
        <Calendar className="h-8 w-8 opacity-50" />
        <p className="text-sm">No hay datos de ventas en este período</p>
      </div>
    )
  }

  // Short day names for mobile
  const chartData = data.map((d) => ({
    ...d,
    shortName: d.dayName.slice(0, 3),
  }))

  const avgRevenue = data.reduce((sum, d) => sum + d.totalRevenue, 0) / data.filter((d) => d.totalRevenue > 0).length || 0

  const bestDay = data.reduce((max, d) => (d.totalRevenue > max.totalRevenue ? d : max), data[0])

  return (
    <div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
            <XAxis
              dataKey="shortName"
              stroke="#a8b5c9"
              fontSize={12}
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
                if (name === 'totalRevenue') return [formatPrice(v), 'Ingresos']
                if (name === 'totalOrders') return [v, 'Pedidos']
                return [v, String(name)]
              }}
              labelFormatter={(_, payload) => {
                if (payload?.[0]?.payload?.dayName) return payload[0].payload.dayName
                return ''
              }}
              cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
            />
            {avgRevenue > 0 && (
              <ReferenceLine
                y={avgRevenue}
                stroke="#a8b5c9"
                strokeDasharray="3 3"
                label={{
                  value: 'Promedio',
                  position: 'right',
                  fill: '#a8b5c9',
                  fontSize: 11,
                }}
              />
            )}
            <Bar
              dataKey="totalRevenue"
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {bestDay && bestDay.totalRevenue > 0 && (
        <div className="mt-3 flex items-center gap-2 text-sm bg-[#252a35] rounded-lg px-3 py-2">
          <span className="text-[#a8b5c9]">Mejor día:</span>
          <span className="text-[#FEC501] font-semibold">{bestDay.dayName}</span>
          <span className="text-[#a8b5c9]">con {formatPrice(bestDay.totalRevenue)}</span>
        </div>
      )}
    </div>
  )
}
