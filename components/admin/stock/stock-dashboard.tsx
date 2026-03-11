'use client'

import { useState, useMemo, useEffect } from 'react'
import { Package, AlertTriangle, ArrowRightLeft, ShoppingCart, UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AdminLayout } from '@/components/admin/layout/admin-layout'
import { IngredientsStockTab } from './ingredients-stock-tab'
import { ProductsStockTab } from './products-stock-tab'
import { MovementsTab } from './movements-tab'
import { ConsumptionTab } from './consumption-tab'
import { PurchaseDialog } from './purchase-dialog'
import type {
  IngredientWithStock,
  ProductWithStock,
  StockAlert,
  StockMovementWithDetails,
  StockForecastItem,
  ReservedStockItem,
  ConsumptionReportItem,
} from '@/lib/types/stock'
import type { Product } from '@/lib/types/database'

interface StockDashboardProps {
  initialIngredients: IngredientWithStock[]
  initialProducts: ProductWithStock[]
  initialAlerts: StockAlert[]
  initialMovements: StockMovementWithDetails[]
  initialElaboradoProducts: Product[]
  initialTheoreticalStocks: Record<string, number | null>
  initialForecast: StockForecastItem[]
  initialReserved: ReservedStockItem[]
  initialConsumption: ConsumptionReportItem[]
}

export function StockDashboard({
  initialIngredients,
  initialProducts,
  initialAlerts,
  initialMovements,
  initialElaboradoProducts,
  initialTheoreticalStocks,
  initialForecast,
  initialReserved,
  initialConsumption,
}: StockDashboardProps) {
  const [ingredients, setIngredients] = useState(initialIngredients)
  const [products, setProducts] = useState(initialProducts)
  const [alerts, setAlerts] = useState(initialAlerts)
  const [movements, setMovements] = useState(initialMovements)
  const [elaboradoProducts, setElaboradoProducts] = useState(initialElaboradoProducts)
  const [theoreticalStocks] = useState(initialTheoreticalStocks)
  const [purchaseOpen, setPurchaseOpen] = useState(false)

  // Build maps for fast lookup
  const forecastMap = useMemo(
    () => new Map<string, StockForecastItem>((initialForecast ?? []).map((f) => [f.ingredient_id, f])),
    [initialForecast]
  )
  const reservedMap = useMemo(
    () => new Map<string, number>((initialReserved ?? []).map((r) => [r.product_id, r.reserved_qty])),
    [initialReserved]
  )
  const reservedTotal = useMemo(
    () => (initialReserved ?? []).reduce((sum, r) => sum + r.reserved_qty, 0),
    [initialReserved]
  )

  // Sync server props to state when router.refresh() delivers new data
  useEffect(() => { setIngredients(initialIngredients) }, [initialIngredients])
  useEffect(() => { setProducts(initialProducts) }, [initialProducts])
  useEffect(() => { setAlerts(initialAlerts) }, [initialAlerts])
  useEffect(() => { setMovements(initialMovements) }, [initialMovements])

  const trackedCount = useMemo(() => {
    const trackedIngredients = ingredients.filter((i) => i.stock_tracking_enabled).length
    const trackedProducts = products.filter((p) => p.stock_tracking_enabled).length
    return trackedIngredients + trackedProducts
  }, [ingredients, products])

  const elaboradosAgotados = useMemo(
    () => elaboradoProducts.filter((p) => theoreticalStocks[p.id] === 0).length,
    [elaboradoProducts, theoreticalStocks]
  )

  const ingredientAlerts = useMemo(() => alerts.filter((a) => a.type === 'ingredient'), [alerts])
  const productAlerts = useMemo(() => alerts.filter((a) => a.type === 'product'), [alerts])

  const lastMovementDate = useMemo(() => {
    if (movements.length === 0) return null
    return new Date(movements[0].created_at)
  }, [movements])

  const formatRelativeDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Hace un momento'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHours < 24) return `Hace ${diffHours}h`
    if (diffDays === 1) return 'Ayer'
    return `Hace ${diffDays} dias`
  }

  return (
    <AdminLayout title="Control de Stock" description="Gestiona el inventario de ingredientes y productos">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {/* Tracked Items */}
        <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 lg:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] hover:border-[var(--admin-accent)]/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--admin-text-muted)] text-sm font-medium">Items Trackeados</p>
              <p className="text-2xl lg:text-3xl font-bold text-[var(--admin-text)] mt-1">{trackedCount}</p>
              <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                de {ingredients.length + products.length} totales
              </p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[var(--admin-accent)]/10 rounded-xl flex items-center justify-center">
              <Package className="h-5 w-5 lg:h-6 lg:w-6 text-[var(--admin-accent-text)]" />
            </div>
          </div>
        </div>

        {/* Stock Alerts */}
        <div
          className={`bg-[var(--admin-bg)] border rounded-xl p-4 lg:p-6 transition-colors ${
            alerts.length > 0 || elaboradosAgotados > 0
              ? 'border-red-500/30 hover:border-red-500/50'
              : 'border-[var(--admin-border)] hover:border-green-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--admin-text-muted)] text-sm font-medium">Alertas Stock</p>
              <p className="text-2xl lg:text-3xl font-bold text-[var(--admin-text)] mt-1">
                {alerts.length + elaboradosAgotados}
              </p>
              {(alerts.length > 0 || elaboradosAgotados > 0) && (
                <p className="text-sm text-red-400 mt-0.5 font-medium leading-tight">
                  {ingredientAlerts.length > 0 && `${ingredientAlerts.length} ingrediente${ingredientAlerts.length !== 1 ? 's' : ''} bajo`}
                  {ingredientAlerts.length > 0 && (productAlerts.length > 0 || elaboradosAgotados > 0) && ' · '}
                  {productAlerts.length > 0 && `${productAlerts.length} reventa${productAlerts.length !== 1 ? 's' : ''} bajo`}
                  {productAlerts.length > 0 && elaboradosAgotados > 0 && ' · '}
                  {elaboradosAgotados > 0 && `${elaboradosAgotados} elaborado${elaboradosAgotados !== 1 ? 's' : ''} agotado`}
                </p>
              )}
            </div>
            <div
              className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center ${
                alerts.length > 0 || elaboradosAgotados > 0 ? 'bg-red-500/10' : 'bg-green-500/10'
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 lg:h-6 lg:w-6 ${
                  alerts.length > 0 || elaboradosAgotados > 0 ? 'text-red-500' : 'text-green-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Reserved (En mesas) */}
        <div
          className={`bg-[var(--admin-bg)] border rounded-xl p-4 lg:p-6 transition-colors ${
            reservedTotal > 0 ? 'border-yellow-500/30 hover:border-yellow-500/50' : 'border-[var(--admin-border)] hover:border-[var(--admin-border)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--admin-text-muted)] text-sm font-medium">En mesas</p>
              <p className="text-2xl lg:text-3xl font-bold text-[var(--admin-text)] mt-1">{reservedTotal}</p>
              <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                {reservedTotal > 0 ? `${(initialReserved ?? []).length} producto${(initialReserved ?? []).length !== 1 ? 's' : ''}` : 'Sin reservas'}
              </p>
            </div>
            <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center ${reservedTotal > 0 ? 'bg-yellow-500/10' : 'bg-[var(--admin-surface-2)]'}`}>
              <UtensilsCrossed className={`h-5 w-5 lg:h-6 lg:w-6 ${reservedTotal > 0 ? 'text-yellow-500' : 'text-[var(--admin-text-muted)]'}`} />
            </div>
          </div>
        </div>

        {/* Last Movement */}
        <div className="bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-xl p-4 lg:p-6 hover:border-blue-500/30 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--admin-text-muted)] text-sm font-medium">Ultimo Movimiento</p>
              <p className="text-2xl lg:text-3xl font-bold text-[var(--admin-text)] mt-1">
                {lastMovementDate ? formatRelativeDate(lastMovementDate) : '--'}
              </p>
              {lastMovementDate && (
                <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                  {lastMovementDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                </p>
              )}
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <ArrowRightLeft className="h-5 w-5 lg:h-6 lg:w-6 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Button + Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div /> {/* Spacer */}
        <Button
          onClick={() => setPurchaseOpen(true)}
          className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/20 transition-all hover:scale-105 active:scale-95"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Registrar Compra</span>
          <span className="sm:hidden">Compra</span>
        </Button>
      </div>

      <Tabs defaultValue="ingredientes" className="space-y-4">
        <TabsList className="bg-[var(--admin-bg)] border border-[var(--admin-border)] p-1 h-auto flex-wrap">
          <TabsTrigger
            value="ingredientes"
            className="data-[state=active]:bg-[var(--admin-accent)]/15 data-[state=active]:text-[var(--admin-accent-text)] text-[var(--admin-text-muted)] px-4 py-2 text-sm font-medium transition-colors"
          >
            Ingredientes
          </TabsTrigger>
          <TabsTrigger
            value="productos"
            className="data-[state=active]:bg-[var(--admin-accent)]/15 data-[state=active]:text-[var(--admin-accent-text)] text-[var(--admin-text-muted)] px-4 py-2 text-sm font-medium transition-colors"
          >
            Productos
          </TabsTrigger>
          <TabsTrigger
            value="movimientos"
            className="data-[state=active]:bg-[var(--admin-accent)]/15 data-[state=active]:text-[var(--admin-accent-text)] text-[var(--admin-text-muted)] px-4 py-2 text-sm font-medium transition-colors"
          >
            Movimientos
          </TabsTrigger>
          <TabsTrigger
            value="consumo"
            className="data-[state=active]:bg-[var(--admin-accent)]/15 data-[state=active]:text-[var(--admin-accent-text)] text-[var(--admin-text-muted)] px-4 py-2 text-sm font-medium transition-colors"
          >
            Consumo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingredientes">
          <IngredientsStockTab
            ingredients={ingredients}
            onIngredientsChange={setIngredients}
            alerts={alerts}
            onAlertsChange={setAlerts}
            forecastMap={forecastMap}
          />
        </TabsContent>

        <TabsContent value="productos">
          <ProductsStockTab
            products={products}
            onProductsChange={setProducts}
            alerts={alerts}
            onAlertsChange={setAlerts}
            elaboradoProducts={elaboradoProducts}
            onElaboradoProductChange={(updated) =>
              setElaboradoProducts((prev) =>
                prev.map((p) => (p.id === updated.id ? updated : p))
              )
            }
            theoreticalStocks={theoreticalStocks}
            reservedMap={reservedMap}
          />
        </TabsContent>

        <TabsContent value="movimientos">
          <MovementsTab initialMovements={movements} />
        </TabsContent>

        <TabsContent value="consumo">
          <ConsumptionTab initialData={initialConsumption ?? []} />
        </TabsContent>
      </Tabs>

      <PurchaseDialog
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
        ingredients={ingredients}
        products={products}
      />
    </AdminLayout>
  )
}
