'use client'

import { Trophy, Package } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { TopProductRevenue } from '@/app/actions/analytics'

interface TopProductsRevenueProps {
  data: TopProductRevenue[]
}

export function TopProductsRevenue({ data }: TopProductsRevenueProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-[#a8b5c9] gap-2">
        <Package className="h-8 w-8 opacity-50" />
        <p className="text-sm">No hay datos de productos en este período</p>
      </div>
    )
  }

  const maxRevenue = Math.max(...data.map((p) => p.revenue))

  return (
    <div className="space-y-3">
      {data.map((product, index) => {
        const barWidth = maxRevenue > 0 ? (product.revenue / maxRevenue) * 100 : 0

        return (
          <div
            key={product.id}
            className="space-y-1.5 group p-2 -mx-2 rounded-lg hover:bg-[#252a35] transition-colors duration-200"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[#a8b5c9] text-xs w-5 shrink-0 text-right">
                  {index === 0 ? (
                    <Trophy className="h-4 w-4 text-[#FEC501] inline" />
                  ) : (
                    `${index + 1}.`
                  )}
                </span>
                <span className="text-[#f0f2f5] text-sm font-medium truncate group-hover:text-[#FEC501] transition-colors">
                  {product.name}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs shrink-0">
                <span className="text-[#a8b5c9]">
                  {product.quantity} uds
                </span>
                <span className="text-[#a8b5c9]">
                  {product.percentage}%
                </span>
                <span className="text-[#FEC501] font-semibold min-w-[72px] text-right">
                  {formatPrice(product.revenue)}
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-[#252a35] rounded-full overflow-hidden ml-7">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: index === 0 ? '#FEC501' : index < 3 ? '#3B82F6' : '#6B7280',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
