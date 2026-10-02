'use client'

import { TrendingUp, AlertCircle, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatPrice } from '@/lib/utils'
import type { ProfitabilityData } from '@/app/actions/analytics'

interface ProfitabilityTableProps {
  data: ProfitabilityData
}

function getMarginColor(pct: number, hasCost: boolean) {
  if (!hasCost) return 'text-[var(--admin-text-muted)]'
  if (pct >= 65) return 'text-exito-texto'
  if (pct >= 50) return 'text-aviso-texto'
  return 'text-peligro-texto'
}

function getFoodCostColor(pct: number) {
  if (pct <= 30) return 'text-exito-texto'
  if (pct <= 40) return 'text-aviso-texto'
  return 'text-peligro-texto'
}

export function ProfitabilityTable({ data }: ProfitabilityTableProps) {
  if (data.products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-[var(--admin-text-muted)] gap-2">
        <TrendingUp className="h-8 w-8 opacity-50" />
        <p className="text-sm">No hay datos de ventas en este periodo</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--admin-surface-2)] rounded-lg p-3 hover:bg-[var(--admin-border)] transition-colors">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-sm text-[var(--admin-text-muted)]">Ingresos</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-[var(--admin-text-muted)] cursor-help opacity-70 hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-center text-xs">
                  <p className="font-semibold mb-0.5">Ingresos totales</p>
                  <p>Suma de todo lo facturado por ventas de productos en el período.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-lg font-bold text-[var(--admin-text)]">{formatPrice(data.totalRevenue)}</p>
        </div>
        <div className="bg-[var(--admin-surface-2)] rounded-lg p-3 hover:bg-[var(--admin-border)] transition-colors">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-sm text-[var(--admin-text-muted)]">Costo Directo</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-[var(--admin-text-muted)] cursor-help opacity-70 hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-center text-xs">
                  <p className="font-semibold mb-0.5">COGS — Costo de Mercancía Vendida</p>
                  <p>Costo total de ingredientes usados para producir los productos vendidos.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-lg font-bold text-[var(--admin-text)]">{formatPrice(data.totalCOGS)}</p>
        </div>
        <div className="bg-[var(--admin-surface-2)] rounded-lg p-3 hover:bg-[var(--admin-border)] transition-colors">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-sm text-[var(--admin-text-muted)]">Margen Bruto</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-[var(--admin-text-muted)] cursor-help opacity-70 hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-center text-xs">
                  <p className="font-semibold mb-0.5">Margen Bruto</p>
                  <p>Porcentaje de ingresos que queda después de descontar el costo directo. Mayor es mejor.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className={`text-lg font-bold ${getMarginColor(data.grossMarginPercentage, true)}`}>
            {data.grossMarginPercentage}%
          </p>
        </div>
        <div className="bg-[var(--admin-surface-2)] rounded-lg p-3 hover:bg-[var(--admin-border)] transition-colors">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-sm text-[var(--admin-text-muted)]">% Food Cost</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-[var(--admin-text-muted)] cursor-help opacity-70 hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-center text-xs">
                  <p className="font-semibold mb-0.5">Food Cost %</p>
                  <p>Qué porcentaje del precio de venta representa el costo de ingredientes. Ideal: menos del 30%.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className={`text-lg font-bold ${getFoodCostColor(data.foodCostPercentage)}`}>
            {data.foodCostPercentage}%
          </p>
        </div>
      </div>

      {/* Warning if products missing cost */}
      {data.productsWithoutCost > 0 && (
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 text-aviso-texto shrink-0" />
          <p className="text-sm text-aviso-texto">
            {data.productsWithoutCost} producto{data.productsWithoutCost > 1 ? 's' : ''} sin costo cargado. Los margenes son parciales.
          </p>
        </div>
      )}

      {/* Product table. En el celular se desplaza a lo ancho: tiene que poder
          enfocarse para recorrerla con el teclado (axe scrollable-region-focusable). */}
      <div
        className="overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
        tabIndex={0}
        role="region"
        aria-label="Rentabilidad por producto"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--admin-border)]">
              <th className="text-left text-[var(--admin-text-muted)] font-semibold pb-2 pr-3">Producto</th>
              <th className="text-right text-[var(--admin-text-muted)] font-semibold pb-2 px-2">Cant.</th>
              <th className="text-right text-[var(--admin-text-muted)] font-semibold pb-2 px-2">Ingresos</th>
              <th className="text-right text-[var(--admin-text-muted)] font-semibold pb-2 px-2">Costo</th>
              <th className="text-right text-[var(--admin-text-muted)] font-semibold pb-2 px-2">Margen</th>
              <th className="text-right text-[var(--admin-text-muted)] font-semibold pb-2 pl-2">% Costo</th>
            </tr>
          </thead>
          <tbody>
            {data.products.map((product) => {
              const hasCost = product.cost !== null
              return (
                <tr
                  key={product.id}
                  className="border-b border-[var(--admin-border)]/50 hover:bg-[var(--admin-surface-2)] transition-colors"
                >
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--admin-text)] font-medium truncate max-w-[180px]">
                        {product.name}
                      </span>
                      {!hasCost && (
                        <span className="text-xs bg-yellow-500/10 text-aviso-texto px-1.5 py-0.5 rounded shrink-0">
                          Sin costo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-right py-2.5 px-2 text-[var(--admin-text)]">
                    {product.quantitySold}
                  </td>
                  <td className="text-right py-2.5 px-2 text-[var(--admin-text)]">
                    {formatPrice(product.revenue)}
                  </td>
                  <td className="text-right py-2.5 px-2 text-[var(--admin-text-muted)]">
                    {hasCost ? formatPrice(product.cogs) : '-'}
                  </td>
                  <td className="text-right py-2.5 px-2">
                    <span className={`font-semibold ${getMarginColor(product.marginPercentage, hasCost)}`}>
                      {hasCost ? `${product.marginPercentage}%` : '-'}
                    </span>
                  </td>
                  <td className="text-right py-2.5 pl-2">
                    <span className={`font-semibold ${hasCost ? getFoodCostColor(product.foodCostPercentage) : 'text-[var(--admin-text-muted)]'}`}>
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
