'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Banknote } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { PaymentMethodData } from '@/app/actions/analytics'

interface PaymentMethodChartProps {
  data: PaymentMethodData[]
}

const COLORS: Record<string, string> = {
  cash: '#22C55E',
  transfer: '#3B82F6',
  mercadopago: '#00BCFF',
  card: '#A855F7',
}

const DEFAULT_COLOR = '#F59E0B'

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-[#a8b5c9] gap-2">
        <Banknote className="h-8 w-8 opacity-50" />
        <p className="text-sm">No hay datos de pagos en este periodo</p>
      </div>
    )
  }

  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0)

  const pieData = data.map((d) => ({
    name: d.label,
    value: d.orders,
    method: d.method,
  }))

  return (
    <div className="space-y-4">
      {/* Pie Chart */}
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              paddingAngle={4}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.method] || DEFAULT_COLOR}
                />
              ))}
            </Pie>
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
                return [
                  `${v} pedidos (${Math.round((v / totalOrders) * 100)}%)`,
                  String(name),
                ]
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Method cards */}
      <div className="space-y-2">
        {data.map((d) => (
          <div
            key={d.method}
            className="bg-[#252a35] rounded-lg p-3 border-l-2 hover:bg-[#2a2f3a] transition-colors"
            style={{ borderLeftColor: COLORS[d.method] || DEFAULT_COLOR }}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm font-medium text-[#f0f2f5]">
                {d.label}
              </span>
              <span className="text-xs font-semibold text-[#f0f2f5]">
                {d.percentage}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#a8b5c9]">
                {d.orders} pedidos
              </span>
              <span className="text-xs text-[#a8b5c9]">
                Ticket prom: <span className="text-[#f0f2f5]">{formatPrice(d.avgTicket)}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
