'use client'

import { Fragment, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, AlertTriangle, ChefHat, EyeOff, Eye, ClipboardList, ChevronRight, Loader2 } from 'lucide-react'
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
import { toggleElaboradoAvailability, getInsumosDelProducto } from '@/app/actions/stock'
import type { InsumoDelProducto } from '@/app/actions/stock'
import { toast } from 'sonner'
import type { Product } from '@/lib/types/database'

export interface ElaboradoStockSectionProps {
  products: Product[]
  theoreticalStocks: Record<string, number | null>
  onProductChange: (updated: Product) => void
}

type StockLevel = 'no-data' | 'empty' | 'critical' | 'ok'

/** Sin decimales de mas: 0,03 kg se lee, 0,030000000000000002 no. */
function formatCantidad(n: number): string {
  const redondeado = Math.round(n * 1000) / 1000
  return redondeado.toLocaleString('es-AR', { maximumFractionDigits: 3 })
}

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
            {/* "Sin datos" no es un problema, es la ausencia de uno: no hay
                stock que calcular porque los insumos no se siguen. Va como
                texto. */}
            <span className="text-sm text-[var(--admin-text-faint)] cursor-help underline decoration-dotted underline-offset-4">
              sin datos
            </span>
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
      <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30 hover:bg-red-500/15 gap-1.5">
        <AlertTriangle className="h-3 w-3" />
        Agotado
      </Badge>
    )
  }

  if (level === 'critical') {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/15">
        Crítico: {stock}
      </Badge>
    )
  }

  /* Lo normal es el numero pelado.
   *
   * Iba en pildora verde --"Disponible: 6"-- en casi todas las filas, y con
   * eso el "Agotado" rojo competia contra catorce verdes. La columna ya se
   * llama "Stock teorico", asi que la palabra sobraba; lo que se lee es el
   * numero. El color queda para cuando hay algo que mirar: critico y agotado. */
  return <span className="text-sm font-semibold text-[var(--admin-text)]">{stock}</span>
}

export function ElaboradoStockSection({
  products,
  theoreticalStocks,
  onProductChange,
}: ElaboradoStockSectionProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // De que depende cada producto. Se pide al desplegar y se guarda: son 16
  // productos y cada uno recorre sus recetas y sub-recetas, asi que pedir todo
  // de entrada seria pagar 16 recorridos para mirar uno.
  const [abierto, setAbierto] = useState<string | null>(null)
  const [insumos, setInsumos] = useState<Record<string, InsumoDelProducto[]>>({})
  const [cargandoInsumos, setCargandoInsumos] = useState<string | null>(null)

  const desplegar = async (productId: string) => {
    if (abierto === productId) {
      setAbierto(null)
      return
    }
    setAbierto(productId)
    if (insumos[productId]) return

    setCargandoInsumos(productId)
    const { data, error } = await getInsumosDelProducto(productId)
    setCargandoInsumos(null)
    if (error) {
      toast.error(error)
      return
    }
    setInsumos((prev) => ({ ...prev, [productId]: data ?? [] }))
  }

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return products
    const q = searchQuery.toLowerCase()
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, searchQuery])

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

                  const estaAbierto = abierto === product.id
                  const detalle = insumos[product.id]

                  return (
                    <Fragment key={product.id}>
                    <tr
                      onClick={() => desplegar(product.id)}
                      className={`cursor-pointer border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] transition-colors group ${
                        isAgotado ? 'border-l-2 border-l-red-500/60' : ''
                      } ${estaAbierto ? 'bg-[var(--admin-surface-2)]' : ''}`}
                    >
                      {/* Nombre + badges */}
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <ChevronRight
                            className={`h-4 w-4 shrink-0 text-[var(--admin-text-muted)] transition-transform ${
                              estaAbierto ? 'rotate-90' : ''
                            }`}
                          />
                          {isAgotado && <AlertTriangle className="h-4 w-4 text-red-700 dark:text-red-400 shrink-0" />}
                          <p className="font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-accent-text)] transition-colors text-sm lg:text-base">
                            {product.name}
                          </p>
                          {product.auto_disabled && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/40 hover:bg-red-500/20 text-xs cursor-help">
                                    Auto-deshabilitado
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[260px] text-center">
                                  <p className="text-xs">
                                    El sistema dejó de ofrecerlo porque no alcanzan los
                                    ingredientes. Abrí la fila para ver cuál falta.
                                  </p>
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
                        {/* Estar a la venta es lo esperado: va como texto.
                            Lo que hay que ver de un vistazo es cual se cayo. */}
                        {product.is_out_of_stock ? (
                          <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30 hover:bg-red-500/15">
                            No disponible
                          </Badge>
                        ) : (
                          <span className="text-sm text-[var(--admin-text-muted)]">A la venta</span>
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
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/admin/stock/ficha/${product.id}`)
                                }}
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
                                    ? 'text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 hover:bg-green-500/10'
                                    : 'text-[var(--admin-text-muted)] hover:text-red-700 dark:hover:text-red-400 hover:bg-red-500/10'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleAvailability(product)
                                }}
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
                                  <Eye className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                ) : (
                                  <EyeOff className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
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

                    {/* De que depende este producto.
                      *
                      * Hasta aca, un producto escondido solo ofrecia un cartel que
                      * decia "no hay ingredientes suficientes" y un link a esta
                      * misma pantalla. Saber cual insumo lo frenaba obligaba a
                      * abrir la ficha tecnica y comparar a mano contra la tabla de
                      * stock. */}
                    {estaAbierto && (
                      <tr className="border-[var(--admin-border)] bg-[var(--admin-bg)]">
                        <TableCell colSpan={5} className="p-0">
                          <div className="px-4 py-3 sm:px-12">
                            {cargandoInsumos === product.id ? (
                              <p className="flex items-center gap-2 py-2 text-sm text-[var(--admin-text-muted)]">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Buscando de qué depende…
                              </p>
                            ) : !detalle || detalle.length === 0 ? (
                              <p className="py-2 text-sm text-[var(--admin-text-muted)]">
                                Este producto no tiene receta cargada, así que su stock
                                no se calcula.
                              </p>
                            ) : (
                              <>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
                                  Para una unidad hace falta
                                </p>
                                <div className="overflow-hidden rounded-lg border border-[var(--admin-border)]">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)]">
                                        <th className="px-3 py-2 text-left font-medium">Insumo</th>
                                        <th className="px-3 py-2 text-right font-medium">Necesita</th>
                                        <th className="px-3 py-2 text-right font-medium">Hay</th>
                                        <th className="px-3 py-2 text-right font-medium">Alcanza para</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--admin-border)]">
                                      {detalle.map((ins) => (
                                        <tr
                                          key={ins.id}
                                          className={
                                            ins.limita
                                              ? 'bg-red-500/5 text-[var(--admin-text)]'
                                              : 'text-[var(--admin-text)]'
                                          }
                                        >
                                          <td className="px-3 py-2">
                                            <span className={ins.limita ? 'font-semibold' : ''}>
                                              {ins.nombre}
                                            </span>
                                            {ins.limita && (
                                              <span className="ml-2 rounded bg-red-500/15 px-1.5 py-0.5 text-[11px] font-medium text-red-700 dark:text-red-400">
                                                es el que frena
                                              </span>
                                            )}
                                            {!ins.sigue && (
                                              <span className="ml-2 text-[11px] text-[var(--admin-text-muted)]">
                                                sin seguimiento
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 text-right tabular-nums">
                                            {formatCantidad(ins.necesita)} {ins.unidad}
                                          </td>
                                          <td className="px-3 py-2 text-right tabular-nums">
                                            {formatCantidad(ins.hay)} {ins.unidad}
                                          </td>
                                          <td className="px-3 py-2 text-right tabular-nums">
                                            {ins.alcanzaPara === null ? (
                                              <span className="text-[var(--admin-text-muted)]">—</span>
                                            ) : (
                                              <span className={ins.limita ? 'font-semibold' : ''}>
                                                {ins.alcanzaPara}
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </tr>
                    )}
                    </Fragment>
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
