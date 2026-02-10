'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatPrice } from '@/lib/utils'
import type { SalesChartData } from '@/lib/types/orders'

interface SalesChartProps {
  data: SalesChartData[]
}

export function SalesChart({ data }: SalesChartProps) {
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

  return (
    <div className="bg-[#1a1d24] border border-[#2a2f3a] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[#f0f2f5]">
            Ventas - Últimos 7 días
          </h3>
          <p className="text-sm text-[#8b9ab0] mt-0.5">
            {totalOrders} pedidos • {formatPrice(totalRevenue)}
          </p>
        </div>
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FEC501" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FEC501" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
            <XAxis
              dataKey="dateLabel"
              stroke="#8b9ab0"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#8b9ab0"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1d24',
                border: '1px solid #2a2f3a',
                borderRadius: '8px',
                color: '#f0f2f5',
              }}
              formatter={(value) => [formatPrice(Number(value) || 0), 'Ingresos']}
              labelFormatter={(label) => label}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#FEC501"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
