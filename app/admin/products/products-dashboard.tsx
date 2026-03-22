'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, Check, X, Package, DollarSign, Search, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AdminLayout } from '@/components/admin/layout'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  deleteProduct,
  toggleProductStock,
  toggleProductActive,
  updateProductPrice,
  bulkToggleActive,
  bulkDelete,
} from '@/app/actions/products'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Category, Product, RecipeWithIngredients } from '@/lib/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProductWithCategory = Product & { categories: Category | null }

interface AdminDashboardProps {
  initialProducts: ProductWithCategory[]
  categories: Category[]
  recipes: RecipeWithIngredients[]
}

// ---------------------------------------------------------------------------
// Stats Cards
// ---------------------------------------------------------------------------

interface StatsCardsProps {
  total: number
  active: number
  outOfStock: number
}

function StatsCards({ total, active, outOfStock }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 lg:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] hover:border-[var(--admin-accent)]/30 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[var(--admin-text-muted)] text-sm font-medium">Total</p>
            <p className="text-2xl lg:text-3xl font-bold text-[var(--admin-text)] mt-1">{total}</p>
          </div>
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[var(--admin-accent)]/10 rounded-xl flex items-center justify-center">
            <Package className="h-5 w-5 lg:h-6 lg:w-6 text-[var(--admin-accent-text)]" />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 lg:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] hover:border-green-500/30 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[var(--admin-text-muted)] text-sm font-medium">Activos</p>
            <p className="text-2xl lg:text-3xl font-bold text-[var(--admin-text)] mt-1">{active}</p>
          </div>
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
            <Check className="h-5 w-5 lg:h-6 lg:w-6 text-green-500" />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 lg:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] hover:border-red-500/30 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[var(--admin-text-muted)] text-sm font-medium">Sin Stock</p>
            <p className="text-2xl lg:text-3xl font-bold text-[var(--admin-text)] mt-1">{outOfStock}</p>
          </div>
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
            <X className="h-5 w-5 lg:h-6 lg:w-6 text-red-500" />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Dashboard Component
// ---------------------------------------------------------------------------

export function ProductsDashboard({
  initialProducts,
  categories,
  recipes,
}: AdminDashboardProps) {
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceValue, setPriceValue] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [isBulkAction, setIsBulkAction] = useState(false)

  const filteredProducts = products.filter((p) => {
    const matchesCategory = !selectedCategory || p.categories?.id === selectedCategory
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const categoryCounts: Record<string, number> = { all: products.length }
  categories.forEach((cat) => {
    categoryCounts[cat.id] = products.filter((p) => p.categories?.id === cat.id).length
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price)
  }

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleToggleStock = async (product: ProductWithCategory) => {
    const newValue = !product.is_out_of_stock
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, is_out_of_stock: newValue } : p
      )
    )
    const result = await toggleProductStock(product.id, newValue)
    if (result.error) {
      toast.error(result.error)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, is_out_of_stock: !newValue } : p
        )
      )
    } else {
      toast.success(newValue ? 'Marcado sin stock' : 'Stock disponible')
    }
  }

  const handleToggleActive = async (product: ProductWithCategory) => {
    const newValue = !product.is_active
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_active: newValue } : p))
    )
    const result = await toggleProductActive(product.id, newValue)
    if (result.error) {
      toast.error(result.error)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, is_active: !newValue } : p
        )
      )
    } else {
      toast.success(newValue ? 'Producto activado' : 'Producto desactivado')
    }
  }

  const handlePriceEdit = (product: ProductWithCategory) => {
    setEditingPrice(product.id)
    setPriceValue(product.price.toString())
  }

  const handlePriceSave = async (productId: string) => {
    const price = parseFloat(priceValue)
    if (isNaN(price) || price < 0) {
      toast.error('Precio invalido')
      return
    }

    const originalProduct = products.find((p) => p.id === productId)
    const originalPrice = originalProduct?.price ?? 0

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, price } : p))
    )
    setEditingPrice(null)

    const result = await updateProductPrice(productId, price)
    if (result.error) {
      toast.error(result.error)
      // Revert on error
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, price: originalPrice } : p))
      )
    } else {
      toast.success(`Precio actualizado a ${formatPrice(price)}`, {
        action: {
          label: 'Deshacer',
          onClick: async () => {
            setProducts((prev) =>
              prev.map((p) => (p.id === productId ? { ...p, price: originalPrice } : p))
            )
            const revert = await updateProductPrice(productId, originalPrice)
            if (revert.error) {
              toast.error('No se pudo deshacer el cambio')
            } else {
              toast.success(`Precio revertido a ${formatPrice(originalPrice)}`)
            }
          },
        },
        duration: 5000,
      })
    }
  }

  const handleDelete = async (productId: string) => {
    setDeleteTarget(null)
    const previousProducts = products
    setProducts((prev) => prev.filter((p) => p.id !== productId))

    const result = await deleteProduct(productId)
    if (result.error) {
      toast.error(result.error)
      setProducts(previousProducts)
    } else {
      toast.success('Producto eliminado')
    }
  }

  // -------------------------------------------------------------------------
  // Bulk action handlers
  // -------------------------------------------------------------------------

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.id)))
    }
  }

  const handleBulkActivate = async (activate: boolean) => {
    const ids = Array.from(selectedIds)
    setIsBulkAction(true)

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (selectedIds.has(p.id) ? { ...p, is_active: activate } : p))
    )

    const result = await bulkToggleActive(ids, activate)
    if (result.error) {
      toast.error(result.error)
      // Revert optimistic update
      setProducts(initialProducts)
    } else {
      toast.success(`${ids.length} producto${ids.length > 1 ? 's' : ''} ${activate ? 'activado' : 'desactivado'}${ids.length > 1 ? 's' : ''}`)
      setSelectedIds(new Set())
    }
    setIsBulkAction(false)
  }

  const handleBulkDelete = async () => {
    setBulkDeleteConfirm(false)
    const ids = Array.from(selectedIds)
    setIsBulkAction(true)

    const previousProducts = products
    setProducts((prev) => prev.filter((p) => !selectedIds.has(p.id)))

    const result = await bulkDelete(ids)
    if (result.error) {
      toast.error(result.error)
      setProducts(previousProducts)
    } else {
      toast.success(`${ids.length} producto${ids.length > 1 ? 's' : ''} eliminado${ids.length > 1 ? 's' : ''}`)
      setSelectedIds(new Set())
    }
    setIsBulkAction(false)
  }

  // -------------------------------------------------------------------------
  // Computed values
  // -------------------------------------------------------------------------

  const activeProducts = products.filter((p) => p.is_active)
  const outOfStock = products.filter((p) => p.is_out_of_stock)

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <AdminLayout title="Productos" description="Administra el catalogo de tu negocio">
      {/* Stats Cards */}
      <StatsCards
        total={products.length}
        active={activeProducts.length}
        outOfStock={outOfStock.length}
      />

      {products.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden"
        >
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-[var(--admin-surface-2)] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Package className="h-10 w-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--admin-text)] mb-2">
              No hay productos todavia
            </h3>
            <p className="text-[var(--admin-text-muted)] mb-6 max-w-sm mx-auto">
              Comienza agregando tu primer producto al catalogo para que los
              clientes puedan hacer pedidos.
            </p>
            <Button
              onClick={() => router.push('/admin/products/new')}
              className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/25"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primer Producto
            </Button>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Header with search, count and add button */}
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
              {filteredProducts.length}{' '}
              {filteredProducts.length === 1 ? 'producto' : 'productos'}
              {(selectedCategory || searchQuery) && products.length !== filteredProducts.length && (
                <span className="text-[var(--admin-text-muted)]/60"> de {products.length}</span>
              )}
            </p>
            <div className="ml-auto">
              <Button
                onClick={() => router.push('/admin/products/new')}
                className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/20 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Producto
              </Button>
            </div>
          </div>

          {/* Category tabs */}
          {categories.length > 0 && (
            <div className="flex items-center gap-0 border-b border-[var(--admin-border)] mb-0 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  selectedCategory === null
                    ? 'border-[var(--admin-accent)] text-[var(--admin-accent-text)]'
                    : 'border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
                )}
              >
                Todos
                <span className={cn(
                  'ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium',
                  selectedCategory === null
                    ? 'bg-[var(--admin-accent)]/20 text-[var(--admin-accent-text)]'
                    : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)]'
                )}>
                  {categoryCounts.all}
                </span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                    selectedCategory === cat.id
                      ? 'border-[var(--admin-accent)] text-[var(--admin-accent-text)]'
                      : 'border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
                  )}
                >
                  {cat.name}
                  {(categoryCounts[cat.id] ?? 0) > 0 && (
                    <span className={cn(
                      'ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium',
                      selectedCategory === cat.id
                        ? 'bg-[var(--admin-accent)]/20 text-[var(--admin-accent-text)]'
                        : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)]'
                    )}>
                      {categoryCounts[cat.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Products table */}
          <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={cn(
                  categories.length > 0
                    ? "rounded-b-xl border border-t-0 border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden transition-[padding]"
                    : "rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden transition-[padding]",
                  selectedIds.size > 0 && "pb-20"
                )}
              >
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-[var(--admin-bg)]">
                    <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-bg)]">
                      <TableHead className="w-10 text-center">
                        <Checkbox
                          checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                          onCheckedChange={toggleSelectAll}
                          className="border-[#3a4150] data-[state=checked]:bg-[var(--admin-accent)] data-[state=checked]:border-[var(--admin-accent)] data-[state=checked]:text-black"
                        />
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">
                        Producto
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold hidden md:table-cell">
                        Categoría
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold hidden lg:table-cell">
                        Tipo
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">
                        Precio
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold text-center hidden sm:table-cell">
                        Stock
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold text-center hidden sm:table-cell">
                        Visible
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product, index) => {
                      return (
                        <motion.tr
                          key={product.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="border-[var(--admin-border)] transition-colors duration-200 group hover:bg-[var(--admin-surface-2)]"
                        >
                          <TableCell className="w-10 text-center">
                            <Checkbox
                              checked={selectedIds.has(product.id)}
                              onCheckedChange={() => toggleSelectId(product.id)}
                              className="border-[#3a4150] data-[state=checked]:bg-[var(--admin-accent)] data-[state=checked]:border-[var(--admin-accent)] data-[state=checked]:text-black"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-lg bg-[var(--admin-border)] flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-[var(--admin-accent)]/30 transition-all duration-200 shrink-0">
                                {product.image_url ? (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="h-10 w-10 lg:h-12 lg:w-12 object-cover group-hover:scale-110 transition-transform duration-200"
                                  />
                                ) : (
                                  <Package className="h-4 w-4 lg:h-5 lg:w-5 text-[var(--admin-text-muted)]" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-accent-text)] transition-colors duration-200 text-sm lg:text-base truncate">
                                  {product.name}
                                </p>
                                {product.description && (
                                  <p className="text-xs lg:text-sm text-[var(--admin-text-muted)] truncate max-w-[150px] lg:max-w-xs">
                                    {product.description}
                                  </p>
                                )}
                                {/* Show category inline on mobile */}
                                <span className="md:hidden text-xs text-[var(--admin-text-muted)]">
                                  {product.categories?.name || 'Sin categoria'}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge
                              variant="outline"
                              className="border-[var(--admin-accent)]/20 text-[var(--admin-accent-text)] bg-[var(--admin-accent)]/10 font-medium"
                            >
                              {product.categories?.name || 'Sin categoría'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {product.product_type === 'reventa' ? (
                              <span className="text-xs bg-blue-500/15 text-blue-400 px-2 py-1 rounded-full font-medium border border-blue-500/20">
                                Reventa
                              </span>
                            ) : (
                              <span className="text-xs bg-emerald-500/15 text-emerald-400 px-2 py-1 rounded-full font-medium border border-emerald-500/20">
                                Elaborado
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingPrice === product.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={priceValue}
                                  onChange={(e) => setPriceValue(e.target.value)}
                                  className="w-20 lg:w-28 h-9 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20 text-sm"
                                  type="number"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handlePriceSave(product.id)
                                    if (e.key === 'Escape') setEditingPrice(null)
                                  }}
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-9 w-9 text-green-500 hover:text-green-400 hover:bg-green-950/30 transition-colors"
                                  onClick={() => handlePriceSave(product.id)}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-9 w-9 text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                                  onClick={() => setEditingPrice(null)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <button
                                  onClick={() => handlePriceEdit(product)}
                                  className="flex items-center gap-1 text-[var(--admin-accent-text)] hover:text-[#E09D00] transition-all duration-200 font-semibold group/price px-1.5 py-1 rounded-lg hover:bg-[var(--admin-accent)]/10 text-sm lg:text-base"
                                >
                                  {formatPrice(product.price)}
                                  <DollarSign className="h-3 w-3 lg:h-3.5 lg:w-3.5 opacity-50 group-hover/price:opacity-100 transition-opacity" />
                                </button>
                                {product.cost != null && (
                                  <p className="text-xs text-[var(--admin-text-muted)]/60 px-1.5">
                                    Costo: {formatPrice(product.cost)}
                                  </p>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center hidden sm:table-cell">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex justify-center">
                                    <Switch
                                      checked={!product.is_out_of_stock}
                                      onCheckedChange={() => handleToggleStock(product)}
                                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[var(--admin-border)]"
                                      aria-label={product.is_out_of_stock ? 'Sin stock' : 'En stock'}
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  {product.is_out_of_stock ? 'Sin stock' : 'En stock'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="text-center hidden sm:table-cell">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex justify-center">
                                    <Switch
                                      checked={product.is_active}
                                      onCheckedChange={() => handleToggleActive(product)}
                                      className="data-[state=checked]:bg-[var(--admin-accent)] data-[state=unchecked]:bg-[var(--admin-border)]"
                                      aria-label={product.is_active ? 'Activo' : 'Inactivo'}
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  {product.is_active ? 'Activo' : 'Inactivo'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-9 w-9 lg:h-10 lg:w-10 transition-all duration-200 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)]"
                                      onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                                    >
                                      <Pencil className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-9 w-9 lg:h-10 lg:w-10 text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-all duration-200"
                                      onClick={() => setDeleteTarget(product.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Eliminar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </motion.tr>
                      )
                    })}
                  </TableBody>
                </Table>
              </motion.div>
            </div>
        </>
      )}

      {/* Floating bulk action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-xl shadow-2xl shadow-black/50 px-4 py-3 flex items-center gap-3"
          >
            <span className="text-sm text-[var(--admin-text)] font-medium whitespace-nowrap">
              {selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}
            </span>
            <div className="w-px h-6 bg-[var(--admin-border)]" />
            <Button
              size="sm"
              variant="ghost"
              disabled={isBulkAction}
              onClick={() => handleBulkActivate(true)}
              className="text-green-400 hover:text-green-300 hover:bg-green-950/30 text-xs gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" />
              Activar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isBulkAction}
              onClick={() => handleBulkActivate(false)}
              className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] text-xs gap-1.5"
            >
              <EyeOff className="h-3.5 w-3.5" />
              Desactivar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isBulkAction}
              onClick={() => setBulkDeleteConfirm(true)}
              className="text-red-400 hover:text-red-300 hover:bg-red-950/30 text-xs gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </Button>
            <div className="w-px h-6 bg-[var(--admin-border)]" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] text-xs"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar producto"
        description="Esta accion no se puede deshacer. El producto sera eliminado del catalogo permanentemente."
        confirmLabel="Eliminar"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />

      <ConfirmDialog
        open={bulkDeleteConfirm}
        onOpenChange={(open) => !open && setBulkDeleteConfirm(false)}
        title={`Eliminar ${selectedIds.size} producto${selectedIds.size > 1 ? 's' : ''}`}
        description={`Esta accion no se puede deshacer. ${selectedIds.size > 1 ? 'Los productos seleccionados seran eliminados' : 'El producto seleccionado sera eliminado'} del catalogo permanentemente.`}
        confirmLabel="Eliminar"
        onConfirm={handleBulkDelete}
      />
    </AdminLayout>
  )
}
