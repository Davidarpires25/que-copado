'use client'

import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { ProfitabilityData } from '@/app/actions/analytics'

interface ProfitabilityTableProps {
  data: ProfitabilityData
}

function getMarginColor(pct: number, hasCost: boolean) {
  if (!hasCost) return 'text-[#a8b5c9]'
  if (pct >= 65) return 'text-green-500'
  if (pct >= 50) return 'text-yellow-500'
  return 'text-red-500'
}

function getFoodCostColor(pct: number) {
  if (pct <= 30) return 'text-green-500'
  if (pct <= 40) return 'text-yellow-500'
  return 'text-red-500'
}

export function ProfitabilityTable({ data }: ProfitabilityTableProps) {
  if (data.products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-[#a8b5c9] gap-2">
        <TrendingUp className="h-8 w-8 opacity-50" />
        <p className="text-sm">No hay datos de ventas en este periodo</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#252a35] rounded-lg p-3 hover:bg-[#2a2f3a] transition-colors">
          <p className="text-xs text-[#a8b5c9] mb-1">Revenue</p>
          <p className="text-lg font-bold text-[#f0f2f5]">{formatPrice(data.totalRevenue)}</p>
        </div>
        <div className="bg-[#252a35] rounded-lg p-3 hover:bg-[#2a2f3a] transition-colors">
          <p className="text-xs text-[#a8b5c9] mb-1">COGS</p>
          <p className="text-lg font-bold text-[#f0f2f5]">{formatPrice(data.totalCOGS)}</p>
        </div>
        <div className="bg-[#252a35] rounded-lg p-3 hover:bg-[#2a2f3a] transition-colors">
          <p className="text-xs text-[#a8b5c9] mb-1">Margen Bruto</p>
          <p className={`text-lg font-bold ${getMarginColor(data.grossMarginPercentage, true)}`}>
            {data.grossMarginPercentage}%
          </p>
        </div>
        <div className="bg-[#252a35] rounded-lg p-3 hover:bg-[#2a2f3a] transition-colors">
          <p className="text-xs text-[#a8b5c9] mb-1">Food Cost</p>
          <p className={`text-lg font-bold ${getFoodCostColor(data.foodCostPercentage)}`}>
            {data.foodCostPercentage}%
          </p>
        </div>
      </div>

      {/* Warning if products missing cost */}
      {data.productsWithoutCost > 0 && (
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
          <p className="text-xs text-yellow-500">
            {data.productsWithoutCost} producto{data.productsWithoutCost > 1 ? 's' : ''} sin costo cargado. Los margenes son parciales.
          </p>
        </div>
      )}

      {/* Product table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2f3a]">
              <th className="text-left text-[#a8b5c9] font-semibold pb-2 pr-3">Producto</th>
              <th className="text-right text-[#a8b5c9] font-semibold pb-2 px-2">Cant.</th>
              <th className="text-right text-[#a8b5c9] font-semibold pb-2 px-2">Revenue</th>
              <th className="text-right text-[#a8b5c9] font-semibold pb-2 px-2">Costo</th>
              <th className="text-right text-[#a8b5c9] font-semibold pb-2 px-2">Margen</th>
              <th className="text-right text-[#a8b5c9] font-semibold pb-2 pl-2">Food Cost</th>
            </tr>
          </thead>
          <tbody>
            {data.products.map((product) => {
              const hasCost = product.cost !== null
              return (
                <tr
                  key={product.id}
                  className="border-b border-[#2a2f3a]/50 hover:bg-[#252a35] transition-colors"
                >
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[#f0f2f5] font-medium truncate max-w-[180px]">
                        {product.name}
                      </span>
                      {!hasCost && (
                        <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded shrink-0">
                          Sin costo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-right py-2.5 px-2 text-[#f0f2f5]">
                    {product.quantitySold}
                  </td>
                  <td className="text-right py-2.5 px-2 text-[#f0f2f5]">
                    {formatPrice(product.revenue)}
                  </td>
                  <td className="text-right py-2.5 px-2 text-[#a8b5c9]">
                    {hasCost ? formatPrice(product.cogs) : '-'}
                  </td>
                  <td className="text-right py-2.5 px-2">
                    <span className={`font-semibold ${getMarginColor(product.marginPercentage, hasCost)}`}>
                      {hasCost ? `${product.marginPercentage}%` : '-'}
                    </span>
                  </td>
                  <td className="text-right py-2.5 pl-2">
                    <span className={`font-semibold ${hasCost ? getFoodCostColor(product.foodCostPercentage) : 'text-[#a8b5c9]'}`}>
                      {hasCost ? `${product.foodCostPercentage}%` : '-'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
