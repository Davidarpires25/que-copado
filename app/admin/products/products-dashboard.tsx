'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {Plus, Pencil, Trash2, Check, X, Package, DollarSign, Loader2, RotateCcw, Search, Eye, EyeOff,} from 'lucide-react'
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
  bulkToggleActive,
  bulkDelete,
} from '@/app/actions/products'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Category, Product, RecipeWithIngredients, ProductType } from '@/lib/types/database'
import { PRODUCT_TYPE_LABELS, PRODUCT_TYPE_DESCRIPTIONS } from '@/lib/types/database'
import { CategoryFilter } from '@/components/category-filter'
import { RecipeSelector, type ProductRecipeItem } from '@/components/admin/products/recipe-selector'
import { setProductRecipes, getProductRecipes } from '@/app/actions/recipes'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProductWithCategory = Product & { categories: Category | null }

type FormMode = 'create' | 'edit'

interface AdminDashboardProps {
  initialProducts: ProductWithCategory[]
  categories: Category[]
  recipes: RecipeWithIngredients[]
}

// ---------------------------------------------------------------------------
// Product Form (shared between desktop panel and mobile sheet)
// ---------------------------------------------------------------------------

interface ProductFormProps {
  mode: FormMode
  editingProduct: ProductWithCategory | null
  categories: Category[]
  recipes: RecipeWithIngredients[]
  productType: ProductType
  onProductTypeChange: (type: ProductType) => void
  selectedRecipes: ProductRecipeItem[]
  onRecipesChange: (items: ProductRecipeItem[]) => void
  isSaving: boolean
  onSubmit: (formData: FormData) => void
  onCancelEdit: () => void
  onDirtyChange?: (dirty: boolean) => void
}

function ProductForm({
  mode,
  editingProduct,
  categories,
  recipes,
  productType,
  onProductTypeChange,
  selectedRecipes,
  onRecipesChange,
  isSaving,
  onSubmit,
  onCancelEdit,
  onDirtyChange,
}: ProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null)

  const markDirty = () => onDirtyChange?.(true)

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
      <input type="hidden" name="product_type" value={productType} />
      <div className="space-y-2">
        <Label className="text-[var(--admin-text-muted)] text-sm font-medium">Nombre</Label>
        <Input
          name="name"
          required
          defaultValue={mode === 'edit' && editingProduct ? editingProduct.name : ''}
          placeholder="Nombre del producto"
          onChange={markDirty}
          className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[var(--admin-text-muted)] text-sm font-medium">Descripcion</Label>
        <Input
          name="description"
          defaultValue={mode === 'edit' && editingProduct ? (editingProduct.description || '') : ''}
          placeholder="Descripcion opcional"
          onChange={markDirty}
          className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all"
        />
      </div>

      {/* Product Type Selector */}
      <div className="space-y-2">
        <Label className="text-[var(--admin-text-muted)] text-sm font-medium">Tipo de producto</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['elaborado', 'reventa'] as ProductType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => { onProductTypeChange(type); markDirty() }}
              className={`p-2.5 rounded-lg border text-left transition-all duration-200 ${
                productType === type
                  ? 'border-[var(--admin-accent)]/50 bg-[var(--admin-accent)]/10 ring-1 ring-[var(--admin-accent)]/20'
                  : 'border-[var(--admin-border)] bg-[var(--admin-bg)] hover:border-[var(--admin-accent)]/40'
              }`}
            >
              <p className={`text-sm font-semibold ${productType === type ? 'text-[var(--admin-accent-text)]' : 'text-[var(--admin-text)]'}`}>
                {PRODUCT_TYPE_LABELS[type]}
              </p>
              <p className="text-xs text-[var(--admin-text-muted)] mt-0.5 leading-tight">
                {PRODUCT_TYPE_DESCRIPTIONS[type]}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-[var(--admin-text-muted)] text-sm font-medium">Precio</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] text-sm font-semibold">$</span>
            <Input
              name="price"
              type="number"
              step="1"
              required
              defaultValue={mode === 'edit' && editingProduct ? editingProduct.price : ''}
              placeholder="Venta"
              onChange={markDirty}
              className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 pl-7 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-[var(--admin-text-muted)] text-sm font-medium flex items-center gap-1.5">
            Costo
            {productType === 'elaborado' && selectedRecipes.length > 0 && (
              <span className="text-xs bg-[var(--admin-accent)]/15 text-[var(--admin-accent-text)] px-1.5 py-0.5 rounded font-semibold">
                Recetas
              </span>
            )}
            {productType === 'reventa' && (
              <span className="text-xs bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded font-semibold">
                Directo
              </span>
            )}
          </Label>
          {productType === 'elaborado' && selectedRecipes.length > 0 ? (
            <div className="h-11 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-md px-3 flex items-center">
              <span className="text-[var(--admin-accent-text)] text-sm font-semibold">
                ${Math.round(selectedRecipes.reduce((sum, item) => {
                  const recipe = recipes.find((r) => r.id === item.recipe_id)
                  if (!recipe) return sum
                  const recipeCost = recipe.recipe_ingredients.reduce(
                    (s, ri) => s + ri.quantity * ri.ingredients.cost_per_unit, 0
                  )
                  return sum + recipeCost * item.quantity
                }, 0)).toLocaleString('es-AR')}
              </span>
            </div>
          ) : (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] text-sm font-semibold">$</span>
              <Input
                name="cost"
                type="number"
                step="1"
                defaultValue={mode === 'edit' && editingProduct ? (editingProduct.cost ?? '') : ''}
                placeholder={productType === 'reventa' ? 'Costo de compra' : 'Sin receta'}
                onChange={markDirty}
                className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 pl-7 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all"
              />
            </div>
          )}
        </div>
      </div>

      {/* Recipe Selector (only for elaborado) */}
      {productType === 'elaborado' && (
        <RecipeSelector
          recipes={recipes}
          selectedRecipes={selectedRecipes}
          onChange={(items) => { onRecipesChange(items); markDirty() }}
        />
      )}

      <div className="space-y-2">
        <Label className="text-[var(--admin-text-muted)] text-sm font-medium">Categoria</Label>
        <Select
          name="category_id"
          required
          defaultValue={mode === 'edit' && editingProduct ? editingProduct.category_id : undefined}
          onValueChange={() => markDirty()}
        >
          <SelectTrigger className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 focus:ring-2 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50 data-[placeholder]:text-[var(--admin-text-muted)] [&_svg]:text-[var(--admin-text-muted)] [&_svg]:opacity-100 transition-all">
            <SelectValue placeholder="Seleccionar categoria..." />
          </SelectTrigger>
          <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)]">
            {categories.map((cat) => (
              <SelectItem
                key={cat.id}
                value={cat.id}
                className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] focus:text-[var(--admin-text)] hover:bg-[var(--admin-border)] cursor-pointer"
              >
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-[var(--admin-text-muted)] text-sm font-medium">URL de imagen (opcional)</Label>
        <Input
          name="image_url"
          type="url"
          defaultValue={mode === 'edit' && editingProduct ? (editingProduct.image_url || '') : ''}
          placeholder="URL de la imagen"
          onChange={markDirty}
          className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all"
        />
      </div>

      {/* Station selector (cocina de preparacion) */}
      <div className="space-y-2">
        <Label className="text-[var(--admin-text-muted)] text-sm font-medium">Estacion de cocina</Label>
        <Select
          name="station"
          defaultValue={mode === 'edit' && editingProduct ? (editingProduct.station ?? 'none') : 'none'}
          onValueChange={() => markDirty()}
        >
          <SelectTrigger className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 focus:ring-2 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50 data-[placeholder]:text-[var(--admin-text-muted)] [&_svg]:text-[var(--admin-text-muted)] [&_svg]:opacity-100 transition-all">
            <SelectValue placeholder="Sin estacion..." />
          </SelectTrigger>
          <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)]">
            <SelectItem value="none" className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] focus:text-[var(--admin-text)] hover:bg-[var(--admin-border)] cursor-pointer">
              Sin estacion (bebidas / reventa)
            </SelectItem>
            <SelectItem value="cocina" className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] focus:text-[var(--admin-text)] hover:bg-[var(--admin-border)] cursor-pointer">
              Cocina
            </SelectItem>
            <SelectItem value="barra" className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] focus:text-[var(--admin-text)] hover:bg-[var(--admin-border)] cursor-pointer">
              Barra
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Warning: elaborado without recipes */}
      {productType === 'elaborado' && selectedRecipes.length === 0 && (
        <p className="text-xs text-amber-400/80 text-center py-1">
          Los productos elaborados requieren al menos una receta para calcular el costo.
        </p>
      )}

      <div className="flex flex-col gap-2 pt-2">
        <Button
          type="submit"
          disabled={isSaving || (productType === 'elaborado' && selectedRecipes.length === 0)}
          className={`w-full h-10 font-semibold transition-all duration-200 ${
            isSaving || (productType === 'elaborado' && selectedRecipes.length === 0)
              ? 'bg-[var(--admin-text-placeholder)] text-[var(--admin-text-muted)] cursor-not-allowed shadow-none'
              : mode === 'edit'
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                : 'bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black shadow-lg shadow-[var(--admin-accent)]/20'
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
            className="w-full h-10 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]"
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
  const [products, setProducts] = useState(initialProducts)
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceValue, setPriceValue] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Form state
  const [formMode, setFormMode] = useState<FormMode>('create')
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [productType, setProductType] = useState<ProductType>('elaborado')
  const [selectedRecipes, setSelectedRecipes] = useState<ProductRecipeItem[]>([])

  // Mobile sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [isBulkAction, setIsBulkAction] = useState(false)

  // Dirty state tracking
  const [formDirty, setFormDirty] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const pendingActionRef = useRef<(() => void) | null>(null)

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
    setProductType('elaborado')
    setSelectedRecipes([])
    setFormDirty(false)
  }, [])

  /** If form has unsaved changes, show confirm dialog. Otherwise execute action immediately. */
  const guardDirty = useCallback((action: () => void) => {
    if (formDirty) {
      pendingActionRef.current = action
      setShowDiscardConfirm(true)
    } else {
      action()
    }
  }, [formDirty])

  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardConfirm(false)
    setFormDirty(false)
    pendingActionRef.current?.()
    pendingActionRef.current = null
  }, [])

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

    // Reset form if editing a deleted product
    if (editingProduct && selectedIds.has(editingProduct.id)) {
      resetToCreateMode()
    }

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

  const doStartEdit = useCallback(async (product: ProductWithCategory) => {
    setFormMode('edit')
    setEditingProduct(product)
    setProductType((product.product_type as ProductType) || 'elaborado')
    setSelectedRecipes([])
    setFormDirty(false)

    // Load existing product recipes
    if (product.product_type === 'elaborado') {
      const result = await getProductRecipes(product.id)
      if (result.data) {
        setSelectedRecipes(
          result.data.map((pr) => ({
            recipe_id: pr.recipe_id,
            quantity: pr.quantity,
          }))
        )
      }
    }

    // Only open sheet on mobile (< lg breakpoint)
    if (window.innerWidth < 1024) {
      setIsSheetOpen(true)
    }
  }, [])

  const handleStartEdit = useCallback((product: ProductWithCategory) => {
    guardDirty(() => doStartEdit(product))
  }, [guardDirty, doStartEdit])

  const handleFormSubmit = async (formData: FormData) => {
    setIsSaving(true)

    try {
      if (formMode === 'edit' && editingProduct) {
        // Edit existing product
        const isElaborado = productType === 'elaborado'
        const hasRecipes = isElaborado && selectedRecipes.length > 0
        const costStr = formData.get('cost') as string
        const stationRaw = (formData.get('station') as string) || 'none'
        const result = await updateProduct(editingProduct.id, {
          name: formData.get('name') as string,
          description: formData.get('description') as string,
          price: parseFloat(formData.get('price') as string),
          cost: hasRecipes ? editingProduct.cost : (costStr ? parseFloat(costStr) : null),
          product_type: productType,
          category_id: formData.get('category_id') as string,
          image_url: (formData.get('image_url') as string) || undefined,
          station: stationRaw === 'none' ? null : stationRaw,
        })

        if (result.error) {
          toast.error(result.error)
        } else {
          // Save product-recipe links (for elaborado only)
          if (isElaborado) {
            const recipeResult = await setProductRecipes(editingProduct.id, selectedRecipes)
            if (recipeResult.error) {
              toast.error('Producto guardado pero hubo un error con las recetas: ' + recipeResult.error)
            } else {
              toast.success('Producto actualizado')
            }
          } else {
            // Clear recipes for reventa products
            await setProductRecipes(editingProduct.id, [])
            toast.success('Producto actualizado')
          }

          if (result.product) {
            const updated = result.product as ProductWithCategory
            if (hasRecipes) {
              const totalCost = selectedRecipes.reduce((sum, item) => {
                const recipe = recipes.find((r) => r.id === item.recipe_id)
                if (!recipe) return sum
                const recipeCost = recipe.recipe_ingredients.reduce(
                  (s, ri) => s + ri.quantity * ri.ingredients.cost_per_unit, 0
                )
                return sum + recipeCost * item.quantity
              }, 0)
              updated.cost = Math.round(totalCost * 100) / 100
            }
            setProducts((prev) =>
              prev.map((p) => (p.id === editingProduct.id ? updated : p))
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
          const newProduct = result.product as ProductWithCategory

          // Save product-recipe links if elaborado
          if (productType === 'elaborado' && selectedRecipes.length > 0 && newProduct) {
            const recipeResult = await setProductRecipes(newProduct.id, selectedRecipes)
            if (recipeResult.error) {
              toast.error('Producto creado pero hubo un error con las recetas: ' + recipeResult.error)
            } else {
              const totalCost = selectedRecipes.reduce((sum, item) => {
                const recipe = recipes.find((r) => r.id === item.recipe_id)
                if (!recipe) return sum
                const recipeCost = recipe.recipe_ingredients.reduce(
                  (s, ri) => s + ri.quantity * ri.ingredients.cost_per_unit, 0
                )
                return sum + recipeCost * item.quantity
              }, 0)
              newProduct.cost = Math.round(totalCost * 100) / 100
            }
          }

          toast.success('Producto creado')
          if (newProduct) {
            setProducts((prev) => [newProduct, ...prev])
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
    if (!open) {
      guardDirty(() => {
        setIsSheetOpen(false)
        // Small delay to allow closing animation
        setTimeout(() => {
          resetToCreateMode()
        }, 300)
      })
    } else {
      setIsSheetOpen(true)
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
            recipes={recipes}
            productType={productType}
            onProductTypeChange={setProductType}
            selectedRecipes={selectedRecipes}
            onRecipesChange={setSelectedRecipes}
            isSaving={isSaving}
            onSubmit={handleFormSubmit}
            onCancelEdit={() => guardDirty(resetToCreateMode)}
            onDirtyChange={setFormDirty}
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
            {/* Mobile: open sheet, Desktop: form is always visible */}
            <Button
              onClick={() => {
                resetToCreateMode()
                setIsSheetOpen(true)
              }}
              className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/25 lg:hidden"
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
                onClick={() => {
                  resetToCreateMode()
                  setIsSheetOpen(true)
                }}
                className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/20 transition-all duration-200 hover:scale-105 active:scale-95 lg:hidden"
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
                className={cn(
                  "rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden transition-[padding]",
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
                      <TableHead className="text-[var(--admin-text-muted)] font-semibold">
                        Producto
                      </TableHead>
                      <TableHead className="text-[var(--admin-text-muted)] font-semibold hidden md:table-cell">
                        Categoria
                      </TableHead>
                      <TableHead className="text-[var(--admin-text-muted)] font-semibold">
                        Precio / Costo
                      </TableHead>
                      <TableHead className="text-[var(--admin-text-muted)] font-semibold text-center hidden sm:table-cell">
                        Stock
                      </TableHead>
                      <TableHead className="text-[var(--admin-text-muted)] font-semibold text-center hidden sm:table-cell">
                        Activo
                      </TableHead>
                      <TableHead className="text-[var(--admin-text-muted)] font-semibold text-right">
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
                          className={`border-[var(--admin-border)] transition-colors duration-200 group ${
                            isBeingEdited
                              ? 'bg-blue-950/20 border-l-2 border-l-blue-500'
                              : 'hover:bg-[var(--admin-surface-2)]'
                          }`}
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
                              className="border-[var(--admin-border)] text-[var(--admin-text-muted)] bg-[var(--admin-surface-2)] font-medium"
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
                                  className="flex items-center gap-1 text-[var(--admin-accent-text)] hover:text-[#E09D00] transition-all duration-200 font-semibold group/price px-1.5 py-1 rounded-lg hover:bg-[var(--admin-accent)]/10 text-sm lg:text-base"
                                >
                                  {formatPrice(product.price)}
                                  <DollarSign className="h-3 w-3 lg:h-3.5 lg:w-3.5 opacity-50 group-hover/price:opacity-100 transition-opacity" />
                                </button>
                                <p className="text-xs text-[var(--admin-text-muted)] px-1.5 flex items-center gap-1">
                                  {product.cost != null
                                    ? `Costo: ${formatPrice(product.cost)}`
                                    : <span className="text-[var(--admin-text-muted)]/50">Sin costo</span>
                                  }
                                  {product.product_type === 'reventa' ? (
                                    <span className="text-xs bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded font-semibold">
                                      Reventa
                                    </span>
                                  ) : product.cost != null && (
                                    <span className="text-xs bg-[var(--admin-accent)]/15 text-[var(--admin-accent-text)] px-1.5 py-0.5 rounded font-semibold">
                                      Receta
                                    </span>
                                  )}
                                </p>
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
                            <div className="flex items-center justify-end gap-0.5">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className={`h-8 w-8 lg:h-9 lg:w-9 transition-all duration-200 ${
                                        isBeingEdited
                                          ? 'text-blue-400 bg-blue-950/30'
                                          : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)]'
                                      }`}
                                      onClick={() => handleStartEdit(product)}
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
                                      className="h-8 w-8 lg:h-9 lg:w-9 text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-all duration-200"
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

            {/* Right column: form panel (desktop only, sticky) */}
            <div className="hidden lg:block lg:w-[320px] xl:w-[360px] shrink-0">
              <div className="sticky top-6 max-h-[calc(100vh-48px)] overflow-y-auto scrollbar-hide rounded-xl">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden"
                >
                  {/* Form header with mode indicator */}
                  <div
                    className={`px-6 py-4 border-b transition-colors duration-300 ${
                      formMode === 'edit'
                        ? 'border-blue-500/30 bg-blue-950/20'
                        : 'border-[var(--admin-border)]'
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
                        <h3 className="text-lg font-semibold text-[var(--admin-text)] flex items-center gap-2">
                          {formMode === 'edit' ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                              Editar Producto
                            </>
                          ) : (
                            <>
                              <Plus className="h-5 w-5 text-[var(--admin-accent-text)]" />
                              Nuevo Producto
                            </>
                          )}
                        </h3>
                        <p className="text-[var(--admin-text-muted)] text-sm mt-1">
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
              className="bg-[var(--admin-surface)] border-[var(--admin-border)] rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col lg:hidden"
              showCloseButton
            >
              <SheetHeader className="pb-2 shrink-0">
                <SheetTitle className="text-[var(--admin-text)] text-xl flex items-center gap-2">
                  {formMode === 'edit' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      Editar Producto
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5 text-[var(--admin-accent-text)]" />
                      Nuevo Producto
                    </>
                  )}
                </SheetTitle>
                <SheetDescription className="text-[var(--admin-text-muted)] text-sm">
                  {formMode === 'edit' && editingProduct
                    ? `Editando: ${editingProduct.name}`
                    : 'Completa los datos para agregar al catalogo'}
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-6">{formPanelContent}</div>
            </SheetContent>
          </Sheet>
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
        open={showDiscardConfirm}
        onOpenChange={(open) => {
          if (!open) {
            setShowDiscardConfirm(false)
            pendingActionRef.current = null
          }
        }}
        title="Cambios sin guardar"
        description="Tenes cambios sin guardar en el formulario. Si continuas, se van a perder."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        onConfirm={handleConfirmDiscard}
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
