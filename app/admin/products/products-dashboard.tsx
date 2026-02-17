'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {Plus, Pencil, Trash2, Check, X, Package, DollarSign, Loader2, RotateCcw, Search,} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStock,
  toggleProductActive,
  updateProductPrice,
} from '@/app/actions/products'
import { toast } from 'sonner'
import type { Category, Product } from '@/lib/types/database'
import { CategoryFilter } from '@/components/category-filter'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProductWithCategory = Product & { categories: Category | null }

type FormMode = 'create' | 'edit'

interface AdminDashboardProps {
  initialProducts: ProductWithCategory[]
  categories: Category[]
}

// ---------------------------------------------------------------------------
// Product Form (shared between desktop panel and mobile sheet)
// ---------------------------------------------------------------------------

interface ProductFormProps {
  mode: FormMode
  editingProduct: ProductWithCategory | null
  categories: Category[]
  isSaving: boolean
  onSubmit: (formData: FormData) => void
  onCancelEdit: () => void
}

function ProductForm({
  mode,
  editingProduct,
  categories,
  isSaving,
  onSubmit,
  onCancelEdit,
}: ProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null)

  // Reset the form when mode changes to create or when editingProduct changes
  useEffect(() => {
    if (mode === 'create' && formRef.current) {
      formRef.current.reset()
    }
  }, [mode])

  // Use key to force remount when switching between products or modes
  const formKey = mode === 'edit' && editingProduct ? editingProduct.id : 'create'

  return (
    <form
      key={formKey}
      ref={formRef}
      action={onSubmit}
      className="space-y-4 font-sans"
    >
      <div className="space-y-2">
        <Label className="text-[#8b9ab0] text-sm font-medium">Nombre</Label>
        <Input
          name="name"
          required
          defaultValue={mode === 'edit' && editingProduct ? editingProduct.name : ''}
          placeholder="Nombre del producto"
          className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] text-sm h-11 placeholder:text-[#8b9ab0] focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[#8b9ab0] text-sm font-medium">Descripcion</Label>
        <Input
          name="description"
          defaultValue={mode === 'edit' && editingProduct ? (editingProduct.description || '') : ''}
          placeholder="Descripcion opcional"
          className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] text-sm h-11 placeholder:text-[#8b9ab0] focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-[#8b9ab0] text-sm font-medium">Precio</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b9ab0] text-sm font-semibold">$</span>
            <Input
              name="price"
              type="number"
              step="1"
              required
              defaultValue={mode === 'edit' && editingProduct ? editingProduct.price : ''}
              placeholder="Venta"
              className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] text-sm h-11 pl-7 placeholder:text-[#8b9ab0] focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-[#8b9ab0] text-sm font-medium">Costo</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b9ab0] text-sm font-semibold">$</span>
            <Input
              name="cost"
              type="number"
              step="1"
              defaultValue={mode === 'edit' && editingProduct ? (editingProduct.cost ?? '') : ''}
              placeholder="Materia prima"
              className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] text-sm h-11 pl-7 placeholder:text-[#8b9ab0] focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[#8b9ab0] text-sm font-medium">Categoria</Label>
        <Select
          name="category_id"
          required
          defaultValue={mode === 'edit' && editingProduct ? editingProduct.category_id : undefined}
        >
          <SelectTrigger className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] text-sm h-11 focus:ring-2 focus:ring-[#FEC501]/20 focus:border-[#FEC501]/50 data-[placeholder]:text-[#8b9ab0] [&_svg]:text-[#8b9ab0] [&_svg]:opacity-100 transition-all">
            <SelectValue placeholder="Seleccionar categoria..." />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5]">
            {categories.map((cat) => (
              <SelectItem
                key={cat.id}
                value={cat.id}
                className="text-[#f0f2f5] focus:bg-[#2a2f3a] focus:text-[#f0f2f5] hover:bg-[#2a2f3a] cursor-pointer"
              >
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-[#8b9ab0] text-sm font-medium">URL de imagen (opcional)</Label>
        <Input
          name="image_url"
          type="url"
          defaultValue={mode === 'edit' && editingProduct ? (editingProduct.image_url || '') : ''}
          placeholder="URL de la imagen"
          className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] text-sm h-11 placeholder:text-[#8b9ab0] focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
        />
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <Button
          type="submit"
          disabled={isSaving}
          className={`w-full h-11 font-semibold transition-all duration-200 ${
            isSaving
              ? 'bg-[#3a3f4a] text-[#8b9ab0] cursor-not-allowed shadow-none'
              : mode === 'edit'
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                : 'bg-[#FEC501] hover:bg-[#E5B001] text-black shadow-lg shadow-[#FEC501]/20'
          }`}
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </span>
          ) : mode === 'edit' ? (
            'Guardar Cambios'
          ) : (
            'Crear Producto'
          )}
        </Button>

        {mode === 'edit' && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancelEdit}
            className="w-full h-10 text-[#8b9ab0] hover:text-[#f0f2f5] hover:bg-[#252a35]"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Cancelar y crear nuevo
          </Button>
        )}
      </div>
    </form>
  )
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
        className="bg-[#1a1d24] backdrop-blur border border-[#2a2f3a] rounded-xl p-4 lg:p-6 hover:border-[#FEC501]/30 transition-colors duration-200"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#8b9ab0] text-sm font-medium">Total</p>
            <p className="text-2xl lg:text-3xl font-bold text-[#f0f2f5] mt-1">{total}</p>
          </div>
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#FEC501]/10 rounded-xl flex items-center justify-center">
            <Package className="h-5 w-5 lg:h-6 lg:w-6 text-[#FEC501]" />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#1a1d24] backdrop-blur border border-[#2a2f3a] rounded-xl p-4 lg:p-6 hover:border-green-500/30 transition-colors duration-200"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#8b9ab0] text-sm font-medium">Activos</p>
            <p className="text-2xl lg:text-3xl font-bold text-[#f0f2f5] mt-1">{active}</p>
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
        className="bg-[#1a1d24] backdrop-blur border border-[#2a2f3a] rounded-xl p-4 lg:p-6 hover:border-red-500/30 transition-colors duration-200"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#8b9ab0] text-sm font-medium">Sin Stock</p>
            <p className="text-2xl lg:text-3xl font-bold text-[#f0f2f5] mt-1">{outOfStock}</p>
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
}: AdminDashboardProps) {
  const [products, setProducts] = useState(initialProducts)
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceValue, setPriceValue] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Form state
  const [formMode, setFormMode] = useState<FormMode>('create')
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Mobile sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const filteredProducts = products.filter((p) => {
    const matchesCategory = !selectedCategory || p.categories?.id === selectedCategory
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
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

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, price } : p))
    )
    setEditingPrice(null)

    const result = await updateProductPrice(productId, price)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Precio actualizado')
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Estas seguro de eliminar este producto?')) return

    const previousProducts = products
    setProducts((prev) => prev.filter((p) => p.id !== productId))

    // If we were editing this product, reset form to create mode
    if (editingProduct?.id === productId) {
      resetToCreateMode()
    }

    const result = await deleteProduct(productId)
    if (result.error) {
      toast.error(result.error)
      setProducts(previousProducts)
    } else {
      toast.success('Producto eliminado')
    }
  }

  const resetToCreateMode = useCallback(() => {
    setFormMode('create')
    setEditingProduct(null)
  }, [])

  const handleStartEdit = useCallback((product: ProductWithCategory) => {
    setFormMode('edit')
    setEditingProduct(product)
    // Only open sheet on mobile (< lg breakpoint)
    if (window.innerWidth < 1024) {
      setIsSheetOpen(true)
    }
  }, [])

  const handleFormSubmit = async (formData: FormData) => {
    setIsSaving(true)

    try {
      if (formMode === 'edit' && editingProduct) {
        // Edit existing product
        const costStr = formData.get('cost') as string
        const result = await updateProduct(editingProduct.id, {
          name: formData.get('name') as string,
          description: formData.get('description') as string,
          price: parseFloat(formData.get('price') as string),
          cost: costStr ? parseFloat(costStr) : null,
          category_id: formData.get('category_id') as string,
          image_url: (formData.get('image_url') as string) || undefined,
        })

        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Producto actualizado')
          // Update local state with returned product data
          if (result.product) {
            setProducts((prev) =>
              prev.map((p) =>
                p.id === editingProduct.id
                  ? (result.product as ProductWithCategory)
                  : p
              )
            )
          }
          resetToCreateMode()
          setIsSheetOpen(false)
        }
      } else {
        // Create new product
        const result = await createProduct(formData)

        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Producto creado')
          // Add new product to the beginning of the list
          if (result.product) {
            setProducts((prev) => [result.product as ProductWithCategory, ...prev])
          }
          resetToCreateMode()
          setIsSheetOpen(false)
        }
      }
    } catch {
      toast.error('Ocurrio un error inesperado')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle sheet close - reset form if closing
  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open)
    if (!open) {
      // Small delay to allow closing animation
      setTimeout(() => {
        resetToCreateMode()
      }, 300)
    }
  }

  // -------------------------------------------------------------------------
  // Computed values
  // -------------------------------------------------------------------------

  const activeProducts = products.filter((p) => p.is_active)
  const outOfStock = products.filter((p) => p.is_out_of_stock)

  // -------------------------------------------------------------------------
  // Form panel content (reused between desktop panel and mobile sheet)
  // -------------------------------------------------------------------------

  const formPanelContent = (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={formMode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <ProductForm
            mode={formMode}
            editingProduct={editingProduct}
            categories={categories}
            isSaving={isSaving}
            onSubmit={handleFormSubmit}
            onCancelEdit={resetToCreateMode}
          />
        </motion.div>
      </AnimatePresence>
    </>
  )

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
          className="rounded-xl border border-[#2a2f3a] bg-[#1a1d24] overflow-hidden"
        >
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-[#252a35] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Package className="h-10 w-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-[#f0f2f5] mb-2">
              No hay productos todavia
            </h3>
            <p className="text-[#8b9ab0] mb-6 max-w-sm mx-auto">
              Comienza agregando tu primer producto al catalogo para que los
              clientes puedan hacer pedidos.
            </p>
            {/* Mobile: open sheet, Desktop: form is always visible */}
            <Button
              onClick={() => {
                resetToCreateMode()
                setIsSheetOpen(true)
              }}
              className="bg-[#FEC501] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[#FEC501]/25 lg:hidden"
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b9ab0]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto..."
                className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] text-sm h-9 pl-9 placeholder:text-[#6b7a8d] focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20"
              />
            </div>
            <p className="text-[#8b9ab0] text-sm hidden sm:block">
              {filteredProducts.length}{' '}
              {filteredProducts.length === 1 ? 'producto' : 'productos'}
              {(selectedCategory || searchQuery) && products.length !== filteredProducts.length && (
                <span className="text-[#8b9ab0]/60"> de {products.length}</span>
              )}
            </p>
            <div className="ml-auto">
              <Button
                onClick={() => {
                  resetToCreateMode()
                  setIsSheetOpen(true)
                }}
                className="bg-[#FEC501] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[#FEC501]/20 transition-all duration-200 hover:scale-105 active:scale-95 lg:hidden"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>

          {/* Category filter */}
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            typeCategory="admin"
          />

          {/* Desktop Layout: side-by-side */}
          <div className="flex flex-col lg:flex-row lg:gap-6">
            {/* Left column: product list */}
            <div className="flex-1 min-w-0">

              {/* Products table */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-xl border border-[#2a2f3a] bg-[#1a1d24] overflow-hidden backdrop-blur"
              >
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2a2f3a] hover:bg-[#1a1d24]">
                      <TableHead className="text-[#8b9ab0] font-semibold">
                        Producto
                      </TableHead>
                      <TableHead className="text-[#8b9ab0] font-semibold hidden md:table-cell">
                        Categoria
                      </TableHead>
                      <TableHead className="text-[#8b9ab0] font-semibold">
                        Precio / Costo
                      </TableHead>
                      <TableHead className="text-[#8b9ab0] font-semibold text-center hidden sm:table-cell">
                        Stock
                      </TableHead>
                      <TableHead className="text-[#8b9ab0] font-semibold text-center hidden sm:table-cell">
                        Activo
                      </TableHead>
                      <TableHead className="text-[#8b9ab0] font-semibold text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product, index) => {
                      const isBeingEdited =
                        formMode === 'edit' && editingProduct?.id === product.id
                      return (
                        <motion.tr
                          key={product.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={`border-[#2a2f3a] transition-colors duration-200 group ${
                            isBeingEdited
                              ? 'bg-blue-950/20 border-l-2 border-l-blue-500'
                              : 'hover:bg-[#252a35]'
                          }`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-lg bg-[#2a2f3a] flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-[#FEC501]/30 transition-all duration-200 shrink-0">
                                {product.image_url ? (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="h-10 w-10 lg:h-12 lg:w-12 object-cover group-hover:scale-110 transition-transform duration-200"
                                  />
                                ) : (
                                  <Package className="h-4 w-4 lg:h-5 lg:w-5 text-[#8b9ab0]" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-[#f0f2f5] group-hover:text-[#FEC501] transition-colors duration-200 text-sm lg:text-base truncate">
                                  {product.name}
                                </p>
                                {product.description && (
                                  <p className="text-xs lg:text-sm text-[#8b9ab0] truncate max-w-[150px] lg:max-w-xs">
                                    {product.description}
                                  </p>
                                )}
                                {/* Show category inline on mobile */}
                                <span className="md:hidden text-xs text-[#8b9ab0]">
                                  {product.categories?.name || 'Sin categoria'}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge
                              variant="outline"
                              className="border-[#2a2f3a] text-[#c4cdd9] bg-[#252a35] font-medium"
                            >
                              {product.categories?.name || 'Sin categoria'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {editingPrice === product.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={priceValue}
                                  onChange={(e) => setPriceValue(e.target.value)}
                                  className="w-20 lg:w-28 h-9 bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] focus:border-[#FEC501] focus:ring-2 focus:ring-[#FEC501]/20 text-sm"
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
                                  className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-950/30 transition-colors"
                                  onClick={() => handlePriceSave(product.id)}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                                  onClick={() => setEditingPrice(null)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <button
                                  onClick={() => handlePriceEdit(product)}
                                  className="flex items-center gap-1 text-[#FEC501] hover:text-[#E09D00] transition-all duration-200 font-semibold group/price px-1.5 py-1 rounded-lg hover:bg-[#FEC501]/10 text-sm lg:text-base"
                                >
                                  {formatPrice(product.price)}
                                  <DollarSign className="h-3 w-3 lg:h-3.5 lg:w-3.5 opacity-50 group-hover/price:opacity-100 transition-opacity" />
                                </button>
                                <p className="text-xs text-[#8b9ab0] px-1.5">
                                  {product.cost != null
                                    ? `Costo: ${formatPrice(product.cost)}`
                                    : <span className="text-[#8b9ab0]/50">Sin costo</span>
                                  }
                                </p>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center hidden sm:table-cell">
                            <div className="flex justify-center">
                              <Switch
                                checked={!product.is_out_of_stock}
                                onCheckedChange={() => handleToggleStock(product)}
                                className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#2a2f3a]"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-center hidden sm:table-cell">
                            <div className="flex justify-center">
                              <Switch
                                checked={product.is_active}
                                onCheckedChange={() => handleToggleActive(product)}
                                className="data-[state=checked]:bg-[#FEC501] data-[state=unchecked]:bg-[#2a2f3a]"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                className={`h-8 w-8 lg:h-9 lg:w-9 transition-all duration-200 ${
                                  isBeingEdited
                                    ? 'text-blue-400 bg-blue-950/30'
                                    : 'text-[#8b9ab0] hover:text-[#f0f2f5] hover:bg-[#2a2f3a]'
                                }`}
                                onClick={() => handleStartEdit(product)}
                              >
                                <Pencil className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 lg:h-9 lg:w-9 text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-all duration-200"
                                onClick={() => handleDelete(product.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      )
                    })}
                  </TableBody>
                </Table>
              </motion.div>
            </div>

            {/* Right column: form panel (desktop only, sticky) */}
            <div className="hidden lg:block lg:w-[320px] xl:w-[360px] shrink-0">
              <div className="sticky top-6">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-xl border border-[#2a2f3a] bg-[#1a1d24] overflow-hidden backdrop-blur"
                >
                  {/* Form header with mode indicator */}
                  <div
                    className={`px-6 py-4 border-b transition-colors duration-300 ${
                      formMode === 'edit'
                        ? 'border-blue-500/30 bg-blue-950/20'
                        : 'border-[#2a2f3a]'
                    }`}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={formMode}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <h3 className="text-lg font-semibold text-[#f0f2f5] flex items-center gap-2">
                          {formMode === 'edit' ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                              Editar Producto
                            </>
                          ) : (
                            <>
                              <Plus className="h-5 w-5 text-[#FEC501]" />
                              Nuevo Producto
                            </>
                          )}
                        </h3>
                        <p className="text-[#8b9ab0] text-sm mt-1">
                          {formMode === 'edit' && editingProduct
                            ? `Editando: ${editingProduct.name}`
                            : 'Completa los datos para agregar al catalogo'}
                        </p>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="p-6">{formPanelContent}</div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Mobile Sheet / Drawer */}
          <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
            <SheetContent
              side="bottom"
              className="bg-[#12151a] border-[#2a2f3a] rounded-t-2xl max-h-[90vh] overflow-y-auto lg:hidden"
              showCloseButton
            >
              <SheetHeader className="pb-2">
                <SheetTitle className="text-[#f0f2f5] text-xl flex items-center gap-2">
                  {formMode === 'edit' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      Editar Producto
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5 text-[#FEC501]" />
                      Nuevo Producto
                    </>
                  )}
                </SheetTitle>
                <SheetDescription className="text-[#8b9ab0] text-sm">
                  {formMode === 'edit' && editingProduct
                    ? `Editando: ${editingProduct.name}`
                    : 'Completa los datos para agregar al catalogo'}
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6">{formPanelContent}</div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </AdminLayout>
  )
}
