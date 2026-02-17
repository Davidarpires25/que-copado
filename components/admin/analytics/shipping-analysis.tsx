'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Truck, PackageCheck } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { ShippingAnalysisData } from '@/app/actions/analytics'

interface ShippingAnalysisProps {
  data: ShippingAnalysisData
}

const COLORS = ['#22C55E', '#3B82F6']

export function ShippingAnalysis({ data }: ShippingAnalysisProps) {
  const totalOrders = data.freeShippingOrders.count + data.paidShippingOrders.count

  if (totalOrders === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-[#8b9ab0] gap-2">
        <Truck className="h-8 w-8 opacity-50" />
        <p className="text-sm">No hay datos de envío en este período</p>
      </div>
    )
  }

  const pieData = [
    {
      name: 'Envio gratis',
      value: data.freeShippingOrders.count,
    },
    {
      name: 'Envio pago',
      value: data.paidShippingOrders.count,
    },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Pie Chart + Revenue Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pie */}
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

        {/* Revenue summary */}
        <div className="flex flex-col justify-center space-y-3">
          <div className="bg-[#252a35] rounded-lg p-3 hover:bg-[#2a2f3a] transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="h-4 w-4 text-[#3B82F6]" />
              <span className="text-xs text-[#8b9ab0]">Ingresos de envío</span>
            </div>
            <p className="text-lg font-bold text-[#f0f2f5]">
              {formatPrice(data.totalShippingRevenue)}
            </p>
            <p className="text-xs text-[#8b9ab0] mt-0.5">
              Promedio: {formatPrice(data.avgShippingCost)}/pedido
            </p>
          </div>

          {data.ticketLiftPercentage !== 0 && (
            <div className="bg-[#252a35] rounded-lg p-3 hover:bg-[#2a2f3a] transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <PackageCheck className="h-4 w-4 text-[#22C55E]" />
                <span className="text-xs text-[#8b9ab0]">Efecto envío gratis</span>
              </div>
              <p className="text-sm text-[#f0f2f5]">
                {data.ticketLiftPercentage > 0 ? (
                  <>
                    Clientes con envío gratis gastan{' '}
                    <span className="text-[#22C55E] font-semibold">
                      {data.ticketLiftPercentage}% más
                    </span>
                  </>
                ) : (
                  <>
                    Clientes con envío pago gastan{' '}
                    <span className="text-[#3B82F6] font-semibold">
                      {Math.abs(data.ticketLiftPercentage)}% más
                    </span>
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detail cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#252a35] rounded-lg p-3 border-l-2 border-[#22C55E] hover:bg-[#2a2f3a] transition-colors">
          <p className="text-xs text-[#8b9ab0] mb-1">Envío gratis</p>
          <p className="text-lg font-bold text-[#f0f2f5]">
            {data.freeShippingOrders.count}
          </p>
          <p className="text-xs text-[#8b9ab0]">
            Ticket prom: <span className="text-[#f0f2f5]">{formatPrice(data.freeShippingOrders.avgTicket)}</span>
          </p>
        </div>
        <div className="bg-[#252a35] rounded-lg p-3 border-l-2 border-[#3B82F6] hover:bg-[#2a2f3a] transition-colors">
          <p className="text-xs text-[#8b9ab0] mb-1">Envío pago</p>
          <p className="text-lg font-bold text-[#f0f2f5]">
            {data.paidShippingOrders.count}
          </p>
          <p className="text-xs text-[#8b9ab0]">
            Ticket prom: <span className="text-[#f0f2f5]">{formatPrice(data.paidShippingOrders.avgTicket)}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
