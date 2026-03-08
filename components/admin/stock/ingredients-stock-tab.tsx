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
import { toggleStockTracking } from '@/app/actions/stock'
import { toast } from 'sonner'
import { INGREDIENT_UNIT_ABBR, type IngredientUnit } from '@/lib/types/database'
import type { IngredientWithStock, StockAlert, StockForecastItem } from '@/lib/types/stock'

interface IngredientsStockTabProps {
  ingredients: IngredientWithStock[]
  onIngredientsChange: (ingredients: IngredientWithStock[]) => void
  alerts: StockAlert[]
  onAlertsChange: (alerts: StockAlert[]) => void
  forecastMap?: Map<string, StockForecastItem>
}

export function IngredientsStockTab({
  ingredients,
  onIngredientsChange,
  alerts,
  onAlertsChange,
  forecastMap,
}: IngredientsStockTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [adjustTarget, setAdjustTarget] = useState<IngredientWithStock | null>(null)

  const filteredIngredients = useMemo(() => {
    if (!searchQuery) return ingredients
    return ingredients.filter((i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [ingredients, searchQuery])

  const getStockStatus = (item: IngredientWithStock) => {
    if (!item.stock_tracking_enabled) return 'untracked'
    if (item.min_stock !== null && item.current_stock <= item.min_stock) return 'low'
    return 'ok'
  }

  const isLowStock = (item: IngredientWithStock) => {
    return item.stock_tracking_enabled && item.min_stock !== null && item.current_stock <= item.min_stock
  }

  const handleToggleTracking = async (ingredient: IngredientWithStock) => {
    const newValue = !ingredient.stock_tracking_enabled
    // Optimistic update
    onIngredientsChange(
      ingredients.map((i) =>
        i.id === ingredient.id ? { ...i, stock_tracking_enabled: newValue } : i
      )
    )

    const result = await toggleStockTracking('ingredient', ingredient.id, newValue)
    if (result.error) {
      toast.error(result.error)
      // Revert
      onIngredientsChange(
        ingredients.map((i) =>
          i.id === ingredient.id ? { ...i, stock_tracking_enabled: !newValue } : i
        )
      )
    } else {
      toast.success(newValue ? 'Stock tracking activado' : 'Stock tracking desactivado')
    }
  }

  const handleStockAdjusted = (updatedItem: IngredientWithStock) => {
    onIngredientsChange(
      ingredients.map((i) => (i.id === updatedItem.id ? updatedItem : i))
    )
    // Update alerts
    if (updatedItem.min_stock !== null && updatedItem.current_stock <= updatedItem.min_stock) {
      if (!alerts.find((a) => a.id === updatedItem.id && a.type === 'ingredient')) {
        onAlertsChange([
          ...alerts,
          {
            id: updatedItem.id,
            name: updatedItem.name,
            type: 'ingredient',
            unit: updatedItem.unit,
            current_stock: updatedItem.current_stock,
            min_stock: updatedItem.min_stock,
          },
        ])
      }
    } else {
      onAlertsChange(alerts.filter((a) => !(a.id === updatedItem.id && a.type === 'ingredient')))
    }
    setAdjustTarget(null)
  }

  const formatStock = (value: number, unit: string) => {
    const abbr = INGREDIENT_UNIT_ABBR[unit as IngredientUnit] ?? unit
    return `${Number.isInteger(value) ? value : value.toFixed(2)} ${abbr}`
  }

  const renderForecast = (ingredient: IngredientWithStock) => {
    if (!forecastMap) return <span className="text-[var(--admin-text-muted)] text-sm">—</span>
    const forecast = forecastMap.get(ingredient.id)
    if (!forecast || forecast.days_remaining === null) {
      return <span className="text-[var(--admin-text-muted)] text-sm">—</span>
    }
    const days = forecast.days_remaining
    if (days < 3) {
      return <span className="text-red-400 text-sm font-semibold">{days < 1 ? '<1d' : `~${Math.floor(days)}d`}</span>
    }
    if (days < 7) {
      return <span className="text-yellow-400 text-sm font-medium">~{Math.floor(days)}d</span>
    }
    return <span className="text-green-400 text-sm">~{Math.floor(days)}d</span>
  }

  return (
    <>
      {/* Search Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar ingrediente..."
            className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-9 pl-9 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
            aria-label="Buscar ingrediente por nombre"
          />
        </div>
        <p className="text-[var(--admin-text-muted)] text-sm hidden sm:block">
          {filteredIngredients.length} {filteredIngredients.length === 1 ? 'ingrediente' : 'ingredientes'}
        </p>
      </div>

      {/* Alert Banner */}
      {alerts.filter((a) => a.type === 'ingredient').length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            <span className="font-semibold">{alerts.filter((a) => a.type === 'ingredient').length}</span>{' '}
            ingrediente{alerts.filter((a) => a.type === 'ingredient').length !== 1 ? 's' : ''} con stock bajo.
            Revisa los items marcados en la tabla.
          </p>
        </div>
      )}

      {/* Table */}
      {ingredients.length === 0 ? (
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-[var(--admin-surface-2)] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Search className="h-10 w-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--admin-text)] mb-2">No hay ingredientes</h3>
            <p className="text-[var(--admin-text-muted)] mb-6 max-w-sm mx-auto">
              Agrega ingredientes desde la seccion de Ingredientes para poder controlar su stock.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[var(--admin-bg)]">
                <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-bg)]">
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold">Nombre</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold hidden sm:table-cell">Unidad</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold">Stock Actual</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold hidden md:table-cell">Stock Minimo</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold hidden lg:table-cell">Agota en</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold text-center">Estado</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold text-center hidden sm:table-cell">Tracking</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIngredients.map((ingredient) => {
                  const status = getStockStatus(ingredient)
                  const lowStock = isLowStock(ingredient)

                  return (
                    <tr
                      key={ingredient.id}
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
                            {ingredient.name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="border-[var(--admin-border)] text-[var(--admin-text-muted)] bg-[var(--admin-surface-2)] font-medium">
                          {INGREDIENT_UNIT_ABBR[ingredient.unit as IngredientUnit] ?? ingredient.unit}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ingredient.stock_tracking_enabled ? (
                          <span className={`font-semibold text-sm lg:text-base ${lowStock ? 'text-red-400' : 'text-[var(--admin-text)]'}`}>
                            {formatStock(ingredient.current_stock, ingredient.unit)}
                          </span>
                        ) : (
                          <span className="text-[var(--admin-text-muted)] text-sm">--</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {ingredient.stock_tracking_enabled && ingredient.min_stock !== null ? (
                          <span className="text-[var(--admin-text-muted)] text-sm">
                            {formatStock(ingredient.min_stock, ingredient.unit)}
                          </span>
                        ) : (
                          <span className="text-[var(--admin-text-muted)] text-sm">--</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {ingredient.stock_tracking_enabled ? renderForecast(ingredient) : (
                          <span className="text-[var(--admin-text-muted)] text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {status === 'ok' && (
                          <Badge className="bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/15">
                            OK
                          </Badge>
                        )}
                        {status === 'low' && (
                          <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/15 animate-pulse-soft">
                            Bajo
                          </Badge>
                        )}
                        {status === 'untracked' && (
                          <Badge className="bg-slate-500/15 text-slate-400 border border-slate-500/30 hover:bg-slate-500/15">
                            Sin tracking
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex justify-center">
                                <Switch
                                  checked={ingredient.stock_tracking_enabled}
                                  onCheckedChange={() => handleToggleTracking(ingredient)}
                                  className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[var(--admin-border)]"
                                  aria-label={ingredient.stock_tracking_enabled ? 'Tracking activado' : 'Tracking desactivado'}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {ingredient.stock_tracking_enabled ? 'Desactivar tracking' : 'Activar tracking'}
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
                                className="h-8 w-8 lg:h-9 lg:w-9 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)] transition-all cursor-pointer"
                                onClick={() => setAdjustTarget(ingredient)}
                                aria-label={`Ajustar stock de ${ingredient.name}`}
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
          targetType="ingredient"
          item={{
            id: adjustTarget.id,
            name: adjustTarget.name,
            unit: INGREDIENT_UNIT_ABBR[adjustTarget.unit as IngredientUnit] ?? adjustTarget.unit,
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
