'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Package, AlertTriangle, PackagePlus, EyeOff, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AdminLayout } from '@/components/admin/layout/admin-layout'
import { PlanillaDialog } from '@/components/admin/stock/planilla-dialog'
import { IngredientsStockTab } from './ingredients-stock-tab'
import { ProductsStockTab } from './products-stock-tab'
import { MovementsTab } from './movements-tab'
import { ConsumptionTab } from './consumption-tab'
import type {
  IngredientWithStock,
  ProductWithStock,
  StockAlert,
  StockMovementWithDetails,
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
  initialReserved,
  initialConsumption,
}: StockDashboardProps) {
  const [ingredients, setIngredients] = useState(initialIngredients)
  const [products, setProducts] = useState(initialProducts)
  const [alerts, setAlerts] = useState(initialAlerts)
  const [movements, setMovements] = useState(initialMovements)
  const [elaboradoProducts, setElaboradoProducts] = useState(initialElaboradoProducts)
  const [theoreticalStocks] = useState(initialTheoreticalStocks)
  const [activeTab, setActiveTab] = useState<'ingredientes' | 'productos' | 'movimientos' | 'consumo'>('ingredientes')
  const [ingredientSearch, setIngredientSearch] = useState('')

  // Build maps for fast lookup
  const reservedMap = useMemo(
    () => new Map<string, number>((initialReserved ?? []).map((r) => [r.product_id, r.reserved_qty])),
    [initialReserved]
  )

  // Los hijos aplican updates optimistas sobre este estado, asi que las props
  // del server son una semilla que hay que re-sembrar cuando router.refresh()
  // trae datos nuevos. Se hace en render (patron "ajustar estado al cambiar
  // props") en vez de en un efecto: evita pintar una vez con los datos viejos.
  const [syncedFrom, setSyncedFrom] = useState(initialIngredients)
  if (syncedFrom !== initialIngredients) {
    setSyncedFrom(initialIngredients)
    setIngredients(initialIngredients)
    setProducts(initialProducts)
    setAlerts(initialAlerts)
    setMovements(initialMovements)
  }

  const ingredientAlerts = useMemo(() => alerts.filter((a) => a.type === 'ingredient'), [alerts])
  const productAlerts = useMemo(() => alerts.filter((a) => a.type === 'product'), [alerts])
  const ocultos = useMemo(() => alerts.filter((a) => a.type === 'oculto'), [alerts])

  // La lista de movimientos se carga recien al abrir su pestana, asi que el
  // valor inicial viene del server por separado.
  // `ocultos` ya viene adentro de `alerts`: no se suma aparte.
  //
  // Antes esto sumaba `elaboradosAgotados` —los elaborados con stock teorico en
  // cero—, que son exactamente los que el sistema escondio. Con la alerta nueva
  // el mismo producto se contaba dos veces: el cartel decia 3 y desglosaba 2.
  // Y `ocultos` dice mejor lo mismo, porque sabe por que insumo fue.
  const totalAlerts = alerts.length

  const alertBreakdown = useMemo(() => {
    const parts: string[] = []
    if (ingredientAlerts.length > 0) {
      parts.push(`${ingredientAlerts.length} ingrediente${ingredientAlerts.length !== 1 ? 's' : ''} bajo`)
    }
    if (productAlerts.length > 0) {
      parts.push(`${productAlerts.length} reventa${productAlerts.length !== 1 ? 's' : ''} bajo`)
    }
    if (ocultos.length > 0) {
      parts.push(`${ocultos.length} sin ofrecer`)
    }
    return parts.join(' · ')
  }, [ingredientAlerts, productAlerts, ocultos])

  return (
    <AdminLayout title="Stock e Inventario">
      {/* Search + action button (only for tabs that have search) */}
      {(activeTab === 'ingredientes') && (
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Package className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
            <input
              value={ingredientSearch}
              onChange={(e) => setIngredientSearch(e.target.value)}
              placeholder="Buscar ingrediente..."
              className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[var(--admin-text)] text-sm tactil:text-base h-9 tactil:h-11 pl-9 pr-3 rounded-md placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <PlanillaDialog />
            <Link href="/admin/stock/compras/nueva">
              <Button className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/20 transition-all hover:scale-105 active:scale-95">
                <PackagePlus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Registrar Compra</span>
                <span className="sm:hidden">Compra</span>
              </Button>
            </Link>
          </div>
        </div>
      )}

      {activeTab !== 'ingredientes' && (
        <div className="flex justify-end items-center gap-2 mb-4">
          <PlanillaDialog />
          <Link href="/admin/stock/compras/nueva">
            <Button className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/20 transition-all hover:scale-105 active:scale-95">
              <PackagePlus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Registrar Compra</span>
              <span className="sm:hidden">Compra</span>
            </Button>
          </Link>
        </div>
      )}

      {/* Alert banner — cuenta ingredientes, reventas y elaborados agotados */}
      {totalAlerts > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-700 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-300">
            <span className="font-semibold">{totalAlerts}</span>{' '}
            {totalAlerts === 1 ? 'item necesita atención' : 'items necesitan atención'}
            {alertBreakdown && <>: {alertBreakdown}</>}. Revisá los items marcados en la tabla.
          </p>
        </div>
      )}

      {/* Lo que el sistema dejo de ofrecer, y por que.
        *
        * Va arriba de todo y aparte del contador: esconder un producto es una
        * decision comercial que se tomaba en silencio. El aviso de abajo decia
        * "Salsa de tomate: 0" y en ningun lado decia que por eso habian
        * desaparecido tres pizzas del catalogo. */}
      {ocultos.length > 0 && (
        /* Plegado por defecto.
         *
         * Cuando se escribio, este aviso era el unico lugar donde se decia que
         * el sistema habia dejado de ofrecer algo. Hoy ya no: esos productos
         * salen primeros en la tabla, llevan el cartel "Auto-deshabilitado" y
         * al abrir la fila se ve que insumo falta. La lista entera aca arriba
         * repetia todo eso y se comia 170px de pantalla en cada visita.
         *
         * Queda el renglon, que es lo que no esta en ningun otro lado --que
         * pasa **ahora mismo** y cuantos son-- y el detalle a un click. David:
         * *"esta ocupando mucho espacio, quizas en una notificacion que se
         * pueda abrir"*. */
        <details className="group mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-3 text-sm text-amber-800 dark:text-amber-200">
            <EyeOff className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
            <span className="font-semibold">
              {ocultos.length === 1
                ? 'Dejamos de ofrecer 1 producto'
                : `Dejamos de ofrecer ${ocultos.length} productos`}
              {' '}en la web y en WhatsApp
            </span>
            <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
          </summary>

          <div className="px-3 pb-3 pl-11 text-sm text-amber-800 dark:text-amber-200">
            <ul className="space-y-0.5">
              {ocultos.map((o) => (
                <li key={o.id}>
                  <span className="font-medium">{o.name}</span>
                  {o.falta && o.falta.length > 0 && (
                    <> — falta {o.falta.join(', ')}</>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs opacity-80">
              En el mostrador se siguen pudiendo vender. Si en la cocina hay,
              marcalos disponibles desde Productos y no se vuelven a apagar
              solos.
            </p>
          </div>
        </details>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-[var(--admin-border)] mb-0 overflow-x-auto no-scrollbar">
        {([
          { key: 'ingredientes', label: 'Stock Actual', alert: ingredientAlerts.length > 0 },
          { key: 'productos', label: 'Alertas', alert: (productAlerts.length + ocultos.length) > 0 },
          { key: 'movimientos', label: 'Movimientos' },
          { key: 'consumo', label: 'Consumo Histórico' },
        ] as const).map(({ key, label, ...rest }) => {
          const alert = 'alert' in rest ? rest.alert : undefined
          return (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 tactil:min-h-11 transition-colors flex items-center gap-1.5',
              activeTab === key
                ? 'border-[var(--admin-accent)] text-[var(--admin-accent-text)]'
                : 'border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
            )}
          >
            {label}
            {alert && (
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            )}
          </button>
          )
        })}
      </div>

      {/* Tab content — Stock Actual uses connected panel, others render with top spacing */}
      {activeTab === 'ingredientes' && (
        <div className="border border-t-0 border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
          <IngredientsStockTab
            ingredients={ingredients}
            onIngredientsChange={setIngredients}
            alerts={alerts}
            onAlertsChange={setAlerts}
            searchQuery={ingredientSearch}
          />
        </div>
      )}
      {activeTab === 'productos' && (
        <div className="mt-6">
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
        </div>
      )}
      {activeTab === 'movimientos' && (
        <div className="mt-6">
          <MovementsTab initialMovements={movements} />
        </div>
      )}
      {activeTab === 'consumo' && (
        <div className="mt-6">
          <ConsumptionTab initialData={initialConsumption ?? []} />
        </div>
      )}
    </AdminLayout>
  )
}
