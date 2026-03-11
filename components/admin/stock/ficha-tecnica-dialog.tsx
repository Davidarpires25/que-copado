'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Printer, ChevronDown, ChevronRight, ClipboardList, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { getProductionSheet } from '@/app/actions/stock'
import type { Product } from '@/lib/types/database'
import type {
  ProductionSheetResult,
  ProductionSheetIngredient,
  ProductionSheetShoppingItem,
} from '@/lib/types/stock'
import { formatPrice } from '@/lib/utils'

interface FichaTecnicaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product
}

function formatQty(qty: number, unit: string): string {
  if (qty === 0) return `0 ${unit}`
  if (unit === 'unidad') {
    return qty % 1 === 0 ? `${qty} u` : `${qty.toFixed(2)} u`
  }
  if (qty < 0.01) return `${(qty * 1000).toFixed(1)} ${unit === 'kg' ? 'g' : 'ml'}`
  if (qty < 1) return `${qty.toFixed(3)} ${unit}`
  return `${qty.toFixed(unit === 'unidad' ? 0 : 3)} ${unit}`
}

// ---------------------------------------------------------------------------
// Desglose row — recursive with expand/collapse
// ---------------------------------------------------------------------------
function IngredientRow({
  ing,
  depth,
  quantity,
}: {
  ing: ProductionSheetIngredient
  depth: number
  quantity: number
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = (ing.children?.length ?? 0) > 0
  const netQty = ing.net_qty_per_unit * quantity
  const grossQty = ing.gross_qty_per_unit * quantity
  const showGross = Math.abs(grossQty - netQty) > 0.00001

  return (
    <>
      <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)]">
        <TableCell style={{ paddingLeft: `${depth * 24 + 16}px` }}>
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors shrink-0"
                aria-label={expanded ? 'Colapsar' : 'Expandir'}
              >
                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <span className={`text-sm ${depth === 0 ? 'font-medium text-[var(--admin-text)]' : 'text-[var(--admin-text-muted)]'}`}>
              {ing.name}
            </span>
            {hasChildren && (
              <Badge className="bg-[var(--admin-accent)]/10 text-[var(--admin-accent-text)] border border-[var(--admin-accent)]/20 hover:bg-[var(--admin-accent)]/10 text-[10px] py-0 px-1.5">
                compuesto
              </Badge>
            )}
            {ing.waste_pct > 0 && (
              <span className="text-[10px] text-amber-500/70 ml-1">{ing.waste_pct}% merma</span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right tabular-nums text-sm text-[var(--admin-text-muted)]">
          {formatQty(netQty, ing.unit)}
        </TableCell>
        <TableCell className="text-right tabular-nums text-sm">
          {showGross ? (
            <span className="text-amber-400 font-medium">{formatQty(grossQty, ing.unit)}</span>
          ) : (
            <span className="text-[var(--admin-text-muted)]">—</span>
          )}
        </TableCell>
      </TableRow>
      {hasChildren && expanded && ing.children!.map((child) => (
        <IngredientRow key={child.ingredient_id} ing={child} depth={depth + 1} quantity={quantity} />
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Shopping list row
// ---------------------------------------------------------------------------
function ShoppingRow({
  item,
  quantity,
}: {
  item: ProductionSheetShoppingItem
  quantity: number
}) {
  const netQty = item.net_qty_per_unit * quantity
  const grossQty = item.gross_qty_per_unit * quantity
  const totalCost = grossQty * item.cost_per_unit
  const showGross = Math.abs(grossQty - netQty) > 0.00001
  const delta = item.stock_tracking_enabled ? item.current_stock - grossQty : null
  const isShort = delta !== null && delta < 0

  return (
    <TableRow className={`border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] ${isShort ? 'bg-amber-500/5' : ''}`}>
      <TableCell>
        <div className="flex items-center gap-2">
          {isShort && <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
          <span className={`text-sm font-medium ${isShort ? 'text-amber-300' : 'text-[var(--admin-text)]'}`}>
            {item.name}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums text-sm text-[var(--admin-text-muted)]">
        {formatQty(netQty, item.unit)}
      </TableCell>
      <TableCell className="text-right tabular-nums text-sm">
        {showGross ? (
          <span className="text-amber-400">{formatQty(grossQty, item.unit)}</span>
        ) : (
          <span className="text-[var(--admin-text-muted)]">—</span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums text-sm text-[var(--admin-text-muted)]">
        {formatPrice(totalCost)}
      </TableCell>
      <TableCell className="text-right tabular-nums text-sm">
        {!item.stock_tracking_enabled ? (
          <Badge className="bg-slate-500/15 text-slate-400 border border-slate-500/30 hover:bg-slate-500/15 text-xs">
            Sin tracking
          </Badge>
        ) : isShort ? (
          <span className="text-amber-300 font-bold text-xs">
            {formatQty(item.current_stock, item.unit)}{' '}
            <span className="text-amber-400/80">(falta {formatQty(Math.abs(delta!), item.unit)})</span>
          </span>
        ) : (
          <span className="text-green-400 text-xs">{formatQty(item.current_stock, item.unit)} ✓</span>
        )}
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------
export function FichaTecnicaDialog({ open, onOpenChange, product }: FichaTecnicaDialogProps) {
  const [sheet, setSheet] = useState<ProductionSheetResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [quantityStr, setQuantityStr] = useState('10')
  const quantity = Math.max(1, parseInt(quantityStr) || 1)

  const loadSheet = useCallback(async () => {
    setIsLoading(true)
    const result = await getProductionSheet(product.id)
    setIsLoading(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setSheet(result.data)
  }, [product.id])

  useEffect(() => {
    if (open) {
      setSheet(null)
      setQuantityStr('10')
      loadSheet()
    }
  }, [open, loadSheet])

  const totalCost =
    sheet?.shopping_list.reduce(
      (acc, item) => acc + item.gross_qty_per_unit * quantity * item.cost_per_unit,
      0
    ) ?? 0

  return (
    <>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)]">
          {/* Header */}
          <DialogHeader className="ficha-tecnica-no-print shrink-0">
            <DialogTitle className="text-lg font-bold text-[var(--admin-text)] flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[var(--admin-accent-text)]" />
              Ficha Técnica — {product.name}
            </DialogTitle>
            <p className="text-xs text-[var(--admin-text-muted)]">
              Simulación de ingredientes y costos para la producción
            </p>
          </DialogHeader>

          {/* Quantity + cost bar */}
          <div className="ficha-tecnica-no-print shrink-0 flex flex-wrap items-center gap-4 px-1 py-3 bg-[var(--admin-surface-2)] border-y border-[var(--admin-border)] -mx-6">
            <div className="flex items-center gap-2 pl-6">
              <span className="text-sm text-[var(--admin-text-muted)] whitespace-nowrap">
                Simular producción de
              </span>
              <Input
                type="number"
                min={1}
                max={9999}
                value={quantityStr}
                onChange={(e) => setQuantityStr(e.target.value)}
                onBlur={() => {
                  const v = parseInt(quantityStr)
                  setQuantityStr(String(isNaN(v) || v < 1 ? 1 : v > 9999 ? 9999 : v))
                }}
                className="w-20 h-8 text-center bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm font-mono"
              />
              <span className="text-sm text-[var(--admin-text-muted)]">unidades</span>
            </div>
            {sheet && (
              <>
                <div className="h-4 w-px bg-[var(--admin-border)]" />
                <div className="text-sm">
                  <span className="text-[var(--admin-text-muted)]">Costo total: </span>
                  <span className="font-bold text-[var(--admin-accent-text)]">{formatPrice(totalCost)}</span>
                </div>
                <div className="h-4 w-px bg-[var(--admin-border)]" />
                <div className="text-sm pr-6">
                  <span className="text-[var(--admin-text-muted)]">Por unidad: </span>
                  <span className="font-semibold text-[var(--admin-text)]">
                    {formatPrice(quantity > 0 ? totalCost / quantity : 0)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--admin-accent)] border-t-transparent" />
                  <p className="text-sm text-[var(--admin-text-muted)]">Calculando ficha técnica...</p>
                </div>
              </div>
            ) : !sheet ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-sm text-[var(--admin-text-muted)]">
                  Este producto no tiene recetas configuradas.
                </p>
              </div>
            ) : (
              <Tabs defaultValue="desglose" className="flex flex-col flex-1 min-h-0">
                <TabsList className="ficha-tecnica-no-print shrink-0 mx-0 mt-3 bg-[var(--admin-bg)] border border-[var(--admin-border)] p-1 h-auto w-fit">
                  <TabsTrigger
                    value="desglose"
                    className="data-[state=active]:bg-[var(--admin-accent)]/15 data-[state=active]:text-[var(--admin-accent-text)] text-[var(--admin-text-muted)] px-4 py-1.5 text-sm font-medium transition-colors"
                  >
                    Desglose
                  </TabsTrigger>
                  <TabsTrigger
                    value="compras"
                    className="data-[state=active]:bg-[var(--admin-accent)]/15 data-[state=active]:text-[var(--admin-accent-text)] text-[var(--admin-text-muted)] px-4 py-1.5 text-sm font-medium transition-colors"
                  >
                    Lista de compras
                    {sheet.shopping_list.some(
                      (i) => i.stock_tracking_enabled && i.current_stock < i.gross_qty_per_unit * quantity
                    ) && (
                      <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* DESGLOSE tab */}
                <TabsContent value="desglose" className="flex-1 overflow-y-auto mt-3 pb-2">
                  <div className="space-y-5">
                    {sheet.recipes.map((recipe) => (
                      <div key={recipe.recipe_id}>
                        <div className="flex items-center gap-2 mb-2.5">
                          <h4 className="text-sm font-semibold text-[var(--admin-text)]">
                            Receta: {recipe.recipe_name}
                          </h4>
                          {recipe.multiplier !== 1 && (
                            <Badge className="bg-[var(--admin-accent)]/15 text-[var(--admin-accent-text)] border border-[var(--admin-accent)]/30 hover:bg-[var(--admin-accent)]/15 text-xs">
                              ×{recipe.multiplier}
                            </Badge>
                          )}
                        </div>
                        <div className="rounded-lg border border-[var(--admin-border)] overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-bg)] bg-[var(--admin-bg)]">
                                <TableHead className="text-[var(--admin-text-muted)] font-semibold text-xs py-2.5">
                                  Ingrediente
                                </TableHead>
                                <TableHead className="text-right text-[var(--admin-text-muted)] font-semibold text-xs py-2.5 w-32">
                                  Neto
                                </TableHead>
                                <TableHead className="text-right text-[var(--admin-text-muted)] font-semibold text-xs py-2.5 w-36">
                                  Bruto (con merma)
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {recipe.ingredients.map((ing) => (
                                <IngredientRow
                                  key={ing.ingredient_id}
                                  ing={ing}
                                  depth={0}
                                  quantity={quantity}
                                />
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* LISTA DE COMPRAS tab */}
                <TabsContent value="compras" className="flex-1 overflow-y-auto mt-3 pb-2">
                  <div className="rounded-lg border border-[var(--admin-border)] overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-bg)] bg-[var(--admin-bg)]">
                          <TableHead className="text-[var(--admin-text-muted)] font-semibold text-xs py-2.5">
                            Ingrediente
                          </TableHead>
                          <TableHead className="text-right text-[var(--admin-text-muted)] font-semibold text-xs py-2.5 w-28">
                            Neto
                          </TableHead>
                          <TableHead className="text-right text-[var(--admin-text-muted)] font-semibold text-xs py-2.5 w-28">
                            Bruto
                          </TableHead>
                          <TableHead className="text-right text-[var(--admin-text-muted)] font-semibold text-xs py-2.5 w-32">
                            Costo total
                          </TableHead>
                          <TableHead className="text-right text-[var(--admin-text-muted)] font-semibold text-xs py-2.5 w-40">
                            Disponible (Δ)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sheet.shopping_list.map((item) => (
                          <ShoppingRow key={item.ingredient_id} item={item} quantity={quantity} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <div className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                      <span className="text-[var(--admin-text-muted)]">Total estimado:</span>
                      <span className="font-bold text-lg text-[var(--admin-accent-text)]">
                        {formatPrice(totalCost)}
                      </span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

          {/* Footer */}
          <div className="ficha-tecnica-no-print shrink-0 flex items-center justify-between gap-3 pt-3 border-t border-[var(--admin-border)]">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(
                  `/admin/stock/ficha/${product.id}/print?qty=${quantity}`,
                  '_blank'
                )
              }
              disabled={!sheet}
              className="border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
