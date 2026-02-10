'use client'

import { TrendingUp } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { TopProduct } from '@/lib/types/orders'

interface TopProductsTableProps {
  products: TopProduct[]
}

export function TopProductsTable({ products }: TopProductsTableProps) {
  if (products.length === 0) {
    return (
      <div className="bg-[#1a1d24] border border-[#2a2f3a] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#f0f2f5] mb-4">
          Productos Más Vendidos
        </h3>
        <p className="text-[#8b9ab0] text-center py-8">
          No hay datos de ventas este mes
        </p>
      </div>
    )
  }

  const maxQuantity = Math.max(...products.map((p) => p.quantity))

  return (
    <div className="bg-[#1a1d24] border border-[#2a2f3a] rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-[#FEC501]" />
        <h3 className="text-lg font-semibold text-[#f0f2f5]">
          Productos Más Vendidos
        </h3>
      </div>

      <div className="space-y-4">
        {products.map((product, index) => {
          const percentage = (product.quantity / maxQuantity) * 100

          return (
            <div key={product.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[#8b9ab0] text-sm w-5">
                    {index + 1}.
                  </span>
                  <span className="text-[#f0f2f5] font-medium truncate">
                    {product.name}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-[#8b9ab0]">
                    {product.quantity} ventas
                  </span>
                  <span className="text-[#FEC501] font-semibold min-w-[80px] text-right">
                    {formatPrice(product.revenue)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-[#252a35] rounded-full overflow-hidden ml-8">
                <div
                  className="h-full bg-[#FEC501] rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
