'use client'

import { MapPin } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { ZoneSalesData } from '@/app/actions/analytics'

interface ZoneSalesTableProps {
  data: ZoneSalesData[]
}

export function ZoneSalesTable({ data }: ZoneSalesTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-[#8b9ab0] gap-2">
        <MapPin className="h-8 w-8 opacity-50" />
        <p className="text-sm">No hay datos de ventas por zona</p>
      </div>
    )
  }

  const maxRevenue = Math.max(...data.map((z) => z.revenue))

  return (
    <div className="space-y-4">
      {data.map((zone) => {
        const barWidth = maxRevenue > 0 ? (zone.revenue / maxRevenue) * 100 : 0

        return (
          <div
            key={zone.zoneId || 'no-zone'}
            className="space-y-2 group p-2 -mx-2 rounded-lg hover:bg-[#252a35] transition-colors duration-200"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-3 h-3 rounded-full shrink-0 ring-2 ring-transparent group-hover:ring-offset-2 group-hover:ring-offset-[#252a35] transition-all"
                  style={{ backgroundColor: zone.zoneColor }}
                />
                <span className="text-[#f0f2f5] text-sm font-medium truncate">
                  {zone.zoneName}
                </span>
                <span className="text-[#8b9ab0] text-xs">
                  ({zone.orders} pedidos)
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs shrink-0">
                <span className="text-[#8b9ab0]">{zone.percentage}%</span>
                <span className="text-[#FEC501] font-semibold min-w-[72px] text-right">
                  {formatPrice(zone.revenue)}
                </span>
              </div>
            </div>

            <div className="h-2 bg-[#1a1d24] rounded-full overflow-hidden ml-5">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: zone.zoneColor,
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 ml-5 text-xs text-[#8b9ab0]">
              <span>Ticket prom: <span className="text-[#f0f2f5]">{formatPrice(zone.avgTicket)}</span></span>
              <span>Envío: <span className="text-[#f0f2f5]">{formatPrice(zone.shippingRevenue)}</span></span>
              <span>
                Gratis: <span className="text-green-500">{zone.freeShippingOrders}</span> | Pago: <span className="text-blue-500">{zone.paidShippingOrders}</span>
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
