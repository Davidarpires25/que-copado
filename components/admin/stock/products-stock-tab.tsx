'use client'

import { useState, useMemo } from 'react'
import { Search, Pencil, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StockAdjustDialog } from './stock-adjust-dialog'
import { ElaboradoStockSection } from './elaborado-stock-section'
import { toggleStockTracking } from '@/app/actions/stock'
import { toast } from 'sonner'
import type { ProductWithStock, StockAlert, ReservedStockItem } from '@/lib/types/stock'
import type { Product } from '@/lib/types/database'

interface ProductsStockTabProps {
  products: ProductWithStock[]
  onProductsChange: (products: ProductWithStock[]) => void
  alerts: StockAlert[]
  onAlertsChange: (alerts: StockAlert[]) => void
  elaboradoProducts: Product[]
  onElaboradoProductChange: (updated: Product) => void
  theoreticalStocks: Record<string, number | null>
  reservedMap?: Map<string, number>
}

export function ProductsStockTab({
  products,
  onProductsChange,
  alerts,
  onAlertsChange,
  elaboradoProducts,
  onElaboradoProductChange,
  theoreticalStocks,
  reservedMap,
}: ProductsStockTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [adjustTarget, setAdjustTarget] = useState<ProductWithStock | null>(null)

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [products, searchQuery])

  const getStockStatus = (item: ProductWithStock) => {
    if (!item.stock_tracking_enabled) return 'untracked'
    if (item.is_out_of_stock) return 'out_of_stock'
    if (item.min_stock !== null && item.current_stock <= item.min_stock) return 'low'
    return 'ok'
  }

  const isLowStock = (item: ProductWithStock) => {
    return item.stock_tracking_enabled && !item.is_out_of_stock && item.min_stock !== null && item.current_stock <= item.min_stock
  }

  const handleToggleTracking = async (product: ProductWithStock) => {
    const newValue = !product.stock_tracking_enabled
    onProductsChange(
      products.map((p) =>
        p.id === product.id ? { ...p, stock_tracking_enabled: newValue } : p
      )
    )

    const result = await toggleStockTracking('product', product.id, newValue)
    if (result.error) {
      toast.error(result.error)
      onProductsChange(
        products.map((p) =>
          p.id === product.id ? { ...p, stock_tracking_enabled: !newValue } : p
        )
      )
    } else {
      toast.success(newValue ? 'Stock tracking activado' : 'Stock tracking desactivado')
    }
  }

  const handleStockAdjusted = (updatedItem: ProductWithStock) => {
    onProductsChange(
      products.map((p) => (p.id === updatedItem.id ? updatedItem : p))
    )
    if (updatedItem.min_stock !== null && updatedItem.current_stock <= updatedItem.min_stock) {
      if (!alerts.find((a) => a.id === updatedItem.id && a.type === 'product')) {
        onAlertsChange([
          ...alerts,
          {
            id: updatedItem.id,
            name: updatedItem.name,
            type: 'product',
            unit: null,
            current_stock: updatedItem.current_stock,
            min_stock: updatedItem.min_stock,
          },
        ])
      }
    } else {
      onAlertsChange(alerts.filter((a) => !(a.id === updatedItem.id && a.type === 'product')))
    }
    setAdjustTarget(null)
  }

  return (
    <>
      {/* Sección: Elaborados */}
      <ElaboradoStockSection
        products={elaboradoProducts}
        theoreticalStocks={theoreticalStocks}
        onProductChange={onElaboradoProductChange}
      />

      <div className="my-6 border-t border-[var(--admin-border)]" />

      {/* Sección: Reventa */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
          <Search className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--admin-text)]">Productos de reventa</h3>
          <p className="text-xs text-[var(--admin-text-muted)]">Stock directo — gaseosas, agua y otros</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar producto..."
            className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-9 pl-9 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
          />
        </div>
        <p className="text-[var(--admin-text-muted)] text-sm hidden sm:block">
          {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
        </p>
      </div>

      {/* Alert Banner */}
      {alerts.filter((a) => a.type === 'product').length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            <span className="font-semibold">{alerts.filter((a) => a.type === 'product').length}</span>{' '}
            producto{alerts.filter((a) => a.type === 'product').length !== 1 ? 's' : ''} con stock bajo.
          </p>
        </div>
      )}

      {/* Table */}
      {products.length === 0 ? (
        <div className="border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-[var(--admin-surface-2)] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Search className="h-10 w-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--admin-text)] mb-2">No hay productos de reventa</h3>
            <p className="text-[var(--admin-text-muted)] max-w-sm mx-auto">
              Solo los productos de tipo <span className="text-[var(--admin-accent-text)] font-medium">reventa</span> aparecen aquí.
              Los elaborados se controlan mediante sus ingredientes.
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[var(--admin-bg)]">
                <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-bg)]">
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold">Nombre</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold">Stock Actual</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold hidden md:table-cell">Stock Mínimo</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold hidden lg:table-cell">En mesas</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold text-center">Estado</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold text-center hidden sm:table-cell">Tracking</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product)
                  const lowStock = isLowStock(product)

                  return (
                    <tr
                      key={product.id}
                      className={`border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] transition-colors group ${
                        lowStock ? 'border-l-2 border-l-red-500/60' : ''
                      }`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {lowStock && (
                            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                          )}
                          <p className="font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-accent-text)] transition-colors text-sm lg:text-base">
                            {product.name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.stock_tracking_enabled ? (
                          <span className={`font-semibold text-sm lg:text-base ${lowStock ? 'text-red-400' : 'text-[var(--admin-text)]'}`}>
                            {Number.isInteger(product.current_stock)
                              ? product.current_stock
                              : product.current_stock.toFixed(2)}{' '}
                            u
                          </span>
                        ) : (
                          <span className="text-[var(--admin-text-muted)] text-sm">--</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {product.stock_tracking_enabled && product.min_stock !== null ? (
                          <span className="text-[var(--admin-text-muted)] text-sm">{product.min_stock} u</span>
                        ) : (
                          <span className="text-[var(--admin-text-muted)] text-sm">--</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {(() => {
                          const reserved = reservedMap?.get(product.id) ?? 0
                          if (reserved <= 0) return <span className="text-[var(--admin-text-muted)] text-sm">—</span>
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-yellow-400 text-sm font-semibold cursor-default">
                                    {reserved} u
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">Comprometido en mesas abiertas</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        })()}
                      </TableCell>
                      <TableCell className="text-center">
                        {status === 'ok' && (
                          <Badge className="bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/15">OK</Badge>
                        )}
                        {status === 'low' && (
                          <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/15">Bajo</Badge>
                        )}
                        {status === 'out_of_stock' && (
                          <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/15">Agotado</Badge>
                        )}
                        {status === 'untracked' && (
                          <Badge className="bg-slate-500/15 text-slate-400 border border-slate-500/30 hover:bg-slate-500/15">Sin tracking</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex justify-center">
                                <Switch
                                  checked={product.stock_tracking_enabled}
                                  onCheckedChange={() => handleToggleTracking(product)}
                                  className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[var(--admin-border)]"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {product.stock_tracking_enabled ? 'Desactivar tracking' : 'Activar tracking'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 lg:h-10 lg:w-10 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)] transition-all"
                                onClick={() => setAdjustTarget(product)}
                              >
                                <Pencil className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ajustar stock</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </tr>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {adjustTarget && (
        <StockAdjustDialog
          open={!!adjustTarget}
          onOpenChange={(open) => !open && setAdjustTarget(null)}
          targetType="product"
          item={{
            id: adjustTarget.id,
            name: adjustTarget.name,
            unit: 'u',
            current_stock: adjustTarget.current_stock,
            min_stock: adjustTarget.min_stock,
            stock_tracking_enabled: adjustTarget.stock_tracking_enabled,
          }}
          onAdjusted={(newStock, newMinStock) => {
            handleStockAdjusted({
              ...adjustTarget,
              current_stock: newStock,
              min_stock: newMinStock ?? adjustTarget.min_stock,
            })
          }}
        />
      )}
    </>
  )
}
