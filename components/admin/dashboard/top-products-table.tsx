'use client'

import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { TopProduct } from '@/lib/types/orders'

interface TopProductsTableProps {
  products: TopProduct[]
}

export function TopProductsTable({ products }: TopProductsTableProps) {
  if (products.length === 0) {
    return (
      <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-6 shadow-[var(--shadow-card)] w-full h-full flex flex-col">
        <h3 className="text-lg font-semibold text-[var(--admin-text)] mb-4">
          Productos Más Vendidos
        </h3>
        <p className="text-[var(--admin-text-muted)] text-center py-8 flex-1 flex items-center justify-center">
          No hay datos de ventas este mes
        </p>
      </div>
    )
  }

  const maxQuantity = useMemo(() => Math.max(...products.map((p) => p.quantity)), [products])

  return (
    <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-6 shadow-[var(--shadow-card)] w-full h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-[var(--admin-accent-text)]" />
        <h3 className="text-lg font-semibold text-[var(--admin-text)]">
          Productos Más Vendidos
        </h3>
      </div>

      <div className="space-y-4 flex-1">
        {products.map((product, index) => {
          const percentage = (product.quantity / maxQuantity) * 100

          return (
            <div key={product.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--admin-text-muted)] text-sm w-5">
                    {index + 1}.
                  </span>
                  <span className="text-[var(--admin-text)] font-medium truncate">
                    {product.name}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-[var(--admin-text-muted)]">
                    {product.quantity} ventas
                  </span>
                  <span className="text-[var(--admin-accent-text)] font-semibold min-w-[80px] text-right">
                    {formatPrice(product.revenue)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-[var(--admin-surface-2)] rounded-full overflow-hidden ml-8">
                <div
                  className="h-full bg-[var(--admin-accent)] rounded-full transition-all duration-500"
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
