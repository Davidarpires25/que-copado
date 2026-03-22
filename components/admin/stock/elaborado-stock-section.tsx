'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, AlertTriangle, ChefHat, ExternalLink, PowerOff, Power, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toggleElaboradoAvailability } from '@/app/actions/stock'
import { toast } from 'sonner'
import type { Product } from '@/lib/types/database'

export interface ElaboradoStockSectionProps {
  products: Product[]
  theoreticalStocks: Record<string, number | null>
  onProductChange: (updated: Product) => void
}

type StockLevel = 'no-data' | 'empty' | 'critical' | 'ok'

function getStockLevel(stock: number | null | undefined): StockLevel {
  if (stock === null || stock === undefined) return 'no-data'
  if (stock === 0) return 'empty'
  if (stock <= 3) return 'critical'
  return 'ok'
}

function TheoreticalStockChip({ stock }: { stock: number | null | undefined }) {
  const level = getStockLevel(stock)

  if (level === 'no-data') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="bg-slate-500/15 text-slate-400 border border-slate-500/30 hover:bg-slate-500/15 cursor-help">
              Sin datos
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] text-center text-xs">
            Habilitá el tracking de ingredientes para calcular el stock
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (level === 'empty') {
    return (
      <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/15 gap-1.5">
        <AlertTriangle className="h-3 w-3" />
        Agotado
      </Badge>
    )
  }

  if (level === 'critical') {
    return (
      <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/15">
        Crítico: {stock}
      </Badge>
    )
  }

  return (
    <Badge className="bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/15">
      Disponible: {stock}
    </Badge>
  )
}

export function ElaboradoStockSection({
  products,
  theoreticalStocks,
  onProductChange,
}: ElaboradoStockSectionProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return products
    const q = searchQuery.toLowerCase()
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, searchQuery])

  const agotadosCount = useMemo(
    () => products.filter((p) => theoreticalStocks[p.id] === 0).length,
    [products, theoreticalStocks]
  )

  const handleToggleAvailability = async (product: Product) => {
    const newValue = !product.is_out_of_stock
    setLoadingId(product.id)

    // Optimistic update
    onProductChange({ ...product, is_out_of_stock: newValue, auto_disabled: false })

    const result = await toggleElaboradoAvailability(product.id, newValue)

    if (result.error) {
      toast.error(result.error)
      onProductChange(product) // revert
    } else {
      toast.success(
        newValue
          ? `"${product.name}" marcado como agotado`
          : `"${product.name}" habilitado para la venta`
      )
    }

    setLoadingId(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[var(--admin-accent)]/10 rounded-lg flex items-center justify-center shrink-0">
          <ChefHat className="h-4 w-4 text-[var(--admin-accent-text)]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--admin-text)]">Productos elaborados</h3>
          <p className="text-xs text-[var(--admin-text-muted)]">Stock calculado según ingredientes disponibles</p>
        </div>
        <span className="ml-auto text-xs text-[var(--admin-text-muted)] tabular-nums">
          {products.length} {products.length === 1 ? 'producto' : 'productos'}
        </span>
      </div>

      {/* Banner de alertas */}
      {agotadosCount > 0 && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">
            <span className="font-semibold">{agotadosCount}</span>{' '}
            {agotadosCount === 1 ? 'producto elaborado agotado' : 'productos elaborados agotados'}.{' '}
            No hay ingredientes suficientes para prepararlos.
          </p>
        </div>
      )}

      {/* Buscador */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar elaborado..."
          className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-9 pl-9 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
        />
      </div>

      {/* Tabla o empty state */}
      {products.length === 0 ? (
        <div className="border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-[var(--admin-surface-2)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ChefHat className="h-8 w-8 text-slate-600" />
            </div>
            <h4 className="text-base font-semibold text-[var(--admin-text)] mb-2">
              No hay productos elaborados
            </h4>
            <p className="text-[var(--admin-text-muted)] text-sm max-w-xs mx-auto">
              Los productos con recetas van a aparecer acá una vez que los configures.
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
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold">Stock teórico</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold text-center hidden sm:table-cell">
                    Estado venta
                  </TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold text-center hidden md:table-cell">
                    Ficha
                  </TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold text-right">
                    Acción
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => {
                  const stock = theoreticalStocks[product.id]
                  const level = getStockLevel(stock)
                  const isAgotado = level === 'empty'
                  const isLoading = loadingId === product.id

                  return (
                    <tr
                      key={product.id}
                      className={`border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] transition-colors group ${
                        isAgotado ? 'border-l-2 border-l-red-500/60' : ''
                      }`}
                    >
                      {/* Nombre + badges */}
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          {isAgotado && <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />}
                          <p className="font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-accent-text)] transition-colors text-sm lg:text-base">
                            {product.name}
                          </p>
                          {product.auto_disabled && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/20 text-xs cursor-help">
                                    Auto-deshabilitado
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[260px] text-center">
                                  <p className="text-xs">
                                    Este producto fue deshabilitado automáticamente porque no hay
                                    ingredientes suficientes para prepararlo.
                                  </p>
                                  <a
                                    href="/admin/stock"
                                    className="mt-1 flex items-center justify-center gap-1 text-[var(--admin-accent-text)] hover:underline text-xs"
                                  >
                                    Ver ingredientes faltantes
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {product.is_out_of_stock && !product.auto_disabled && (
                            <Badge className="bg-slate-500/15 text-slate-400 border border-slate-500/30 hover:bg-slate-500/15 text-xs">
                              Agotado manual
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Stock teórico */}
                      <TableCell>
                        <TheoreticalStockChip stock={stock} />
                      </TableCell>

                      {/* Estado venta */}
                      <TableCell className="text-center hidden sm:table-cell">
                        {product.is_out_of_stock ? (
                          <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/15">
                            No disponible
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/15">
                            A la venta
                          </Badge>
                        )}
                      </TableCell>

                      {/* Ficha técnica */}
                      <TableCell className="text-center hidden md:table-cell">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 lg:h-10 lg:w-10 text-[var(--admin-text-muted)] hover:text-[var(--admin-accent-text)] hover:bg-[var(--admin-accent)]/10 transition-all"
                                onClick={() => router.push(`/admin/stock/ficha/${product.id}`)}
                                aria-label={`Ficha técnica de ${product.name}`}
                              >
                                <ClipboardList className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Ver ficha técnica</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>

                      {/* Toggle disponibilidad */}
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className={`h-9 w-9 lg:h-10 lg:w-10 transition-all ${
                                  product.is_out_of_stock
                                    ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
                                    : 'text-[var(--admin-text-muted)] hover:text-red-400 hover:bg-red-500/10'
                                }`}
                                onClick={() => handleToggleAvailability(product)}
                                disabled={isLoading}
                                aria-label={
                                  product.is_out_of_stock
                                    ? `Habilitar ${product.name}`
                                    : `Deshabilitar ${product.name}`
                                }
                              >
                                {isLoading ? (
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : product.is_out_of_stock ? (
                                  <Power className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                ) : (
                                  <PowerOff className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              {product.is_out_of_stock
                                ? 'Habilitar para la venta'
                                : 'Deshabilitar producto'}
                            </TooltipContent>
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

    </div>
  )
}
