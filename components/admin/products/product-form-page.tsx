'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight,
  Loader2,
  Package,
  Info,
  ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { createProduct, updateProduct } from '@/app/actions/products'
import { setProductRecipes, getProductRecipes } from '@/app/actions/recipes'
import { RecipeSelector, type ProductRecipeItem } from './recipe-selector'
import type { Category, Product, RecipeWithIngredients, ProductType } from '@/lib/types/database'
import { PRODUCT_TYPE_LABELS, PRODUCT_TYPE_DESCRIPTIONS } from '@/lib/types/database'
import { formatPrice } from '@/lib/utils'

type ProductWithCategory = Product & { categories: Category | null }

interface ProductFormPageProps {
  mode: 'create' | 'edit'
  product?: ProductWithCategory
  categories: Category[]
  recipes: RecipeWithIngredients[]
  initialRecipes?: ProductRecipeItem[]
}

export function ProductFormPage({
  mode,
  product,
  categories,
  recipes,
  initialRecipes = [],
}: ProductFormPageProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form state
  const [productType, setProductType] = useState<ProductType>(
    (product?.product_type as ProductType) ?? 'elaborado'
  )
  const [selectedRecipes, setSelectedRecipes] = useState<ProductRecipeItem[]>(initialRecipes)
  const [isActive, setIsActive] = useState(product?.is_active ?? true)
  const [isOutOfStock, setIsOutOfStock] = useState(product?.is_out_of_stock ?? false)

  // Live preview state
  const [previewName, setPreviewName] = useState(product?.name ?? '')
  const [previewPrice, setPreviewPrice] = useState(product?.price?.toString() ?? '')
  const [previewImage, setPreviewImage] = useState(product?.image_url ?? '')
  const [previewCategory, setPreviewCategory] = useState(
    product?.categories?.name ?? ''
  )

  const calculatedCost =
    productType === 'elaborado' && selectedRecipes.length > 0
      ? Math.round(
          selectedRecipes.reduce((sum, item) => {
            const recipe = recipes.find((r) => r.id === item.recipe_id)
            if (!recipe) return sum
            const recipeCost = recipe.recipe_ingredients.reduce(
              (s, ri) => s + ri.quantity * ri.ingredients.cost_per_unit,
              0
            )
            return sum + recipeCost * item.quantity
          }, 0)
        )
      : null

  const handleSubmit = async (formData: FormData) => {
    formData.set('product_type', productType)

    startTransition(async () => {
      try {
        if (mode === 'edit' && product) {
          const stationRaw = (formData.get('station') as string) || 'none'
          const costStr = formData.get('cost') as string
          const result = await updateProduct(product.id, {
            name: formData.get('name') as string,
            description: (formData.get('description') as string) || undefined,
            price: parseFloat(formData.get('price') as string),
            cost: calculatedCost ?? (costStr ? parseFloat(costStr) : null),
            product_type: productType,
            category_id: formData.get('category_id') as string,
            image_url: (formData.get('image_url') as string) || undefined,
            station: stationRaw === 'none' ? null : stationRaw,
            is_active: isActive,
            is_out_of_stock: isOutOfStock,
          })

          if (result.error) {
            toast.error(result.error)
            return
          }

          const recipeResult = await setProductRecipes(
            product.id,
            productType === 'elaborado' ? selectedRecipes : []
          )
          if (recipeResult.error) {
            toast.error('Producto guardado pero hubo un error con las recetas: ' + recipeResult.error)
          } else {
            toast.success('Producto actualizado')
          }
        } else {
          const result = await createProduct(formData)

          if (result.error) {
            toast.error(result.error)
            return
          }

          if (result.product && productType === 'elaborado' && selectedRecipes.length > 0) {
            const recipeResult = await setProductRecipes(result.product.id, selectedRecipes)
            if (recipeResult.error) {
              toast.error('Producto creado pero hubo un error con las recetas: ' + recipeResult.error)
            }
          }

          toast.success('Producto creado')
        }

        router.push('/admin/products')
        router.refresh()
      } catch {
        toast.error('Ocurrió un error inesperado')
      }
    })
  }

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] font-sans">
      <form action={handleSubmit} className="h-full">
        {/* Hidden inputs for toggles */}
        <input type="hidden" name="product_type" value={productType} />
        <input type="hidden" name="is_active" value={isActive ? 'true' : 'false'} />
        <input type="hidden" name="is_out_of_stock" value={isOutOfStock ? 'true' : 'false'} />

        <div className="px-8 xl:px-10 py-8 max-w-[1200px] mx-auto space-y-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/admin/products"
              className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors"
            >
              Productos
            </Link>
            <ChevronRight className="h-4 w-4 text-[var(--admin-text-muted)]/50" />
            <span className="text-[var(--admin-text)] font-medium">
              {mode === 'edit' && product ? product.name : 'Nuevo Producto'}
            </span>
          </nav>

          {/* Header row */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[var(--admin-text)]">
              {mode === 'edit' ? 'Editar Producto' : 'Nuevo Producto'}
            </h1>
            <div className="flex items-center gap-3">
              <Link href="/admin/products">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] bg-transparent hover:bg-[var(--admin-surface)]"
                >
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isPending || (productType === 'elaborado' && selectedRecipes.length === 0)}
                className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </span>
                ) : mode === 'edit' ? (
                  'Guardar Cambios'
                ) : (
                  'Guardar Producto'
                )}
              </Button>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="flex gap-6 items-start">

            {/* ── Left card ── */}
            <div className="flex-1 min-w-0 space-y-5">
              <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 space-y-5">

                {/* Section: Información */}
                <div className="space-y-0.5">
                  <h2 className="text-sm font-semibold text-[var(--admin-text)]">
                    Información del Producto
                  </h2>
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    Datos básicos para mostrar en el menú
                  </p>
                </div>
                <div className="h-px bg-[var(--admin-border)]" />

                {/* Image URL */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[var(--admin-text-muted)]">
                    URL de imagen
                  </Label>
                  <div className="flex gap-3">
                    {/* Preview thumbnail */}
                    <div className="h-20 w-20 shrink-0 rounded-lg border-2 border-dashed border-[var(--admin-border)] bg-[var(--admin-bg)] flex items-center justify-center overflow-hidden">
                      {previewImage ? (
                        <img
                          src={previewImage}
                          alt="Preview"
                          className="h-full w-full object-cover"
                          onError={() => setPreviewImage('')}
                        />
                      ) : (
                        <ImageIcon className="h-7 w-7 text-[var(--admin-text-muted)]/40" />
                      )}
                    </div>
                    <Input
                      name="image_url"
                      type="url"
                      defaultValue={product?.image_url ?? ''}
                      placeholder="https://..."
                      onChange={(e) => setPreviewImage(e.target.value)}
                      className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                    />
                  </div>
                </div>

                {/* Nombre */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[var(--admin-text-muted)]">
                    Nombre <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    name="name"
                    required
                    defaultValue={product?.name ?? ''}
                    placeholder="Ej: Classic Burger"
                    onChange={(e) => setPreviewName(e.target.value)}
                    className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                  />
                </div>

                {/* Descripción */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[var(--admin-text-muted)]">
                    Descripción
                  </Label>
                  <textarea
                    name="description"
                    defaultValue={product?.description ?? ''}
                    placeholder="Descripción del producto..."
                    rows={3}
                    className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text)] text-sm px-3 py-2.5 placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 resize-none transition-all"
                  />
                </div>

                {/* Categoría */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[var(--admin-text-muted)]">
                    Categoría <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    name="category_id"
                    required
                    defaultValue={product?.category_id ?? undefined}
                    onValueChange={(val) => {
                      const cat = categories.find((c) => c.id === val)
                      setPreviewCategory(cat?.name ?? '')
                    }}
                  >
                    <SelectTrigger className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 focus:ring-2 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50 data-[placeholder]:text-[var(--admin-text-muted)] [&_svg]:text-[var(--admin-text-muted)]">
                      <SelectValue placeholder="Seleccionar categoría..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)]">
                      {categories.map((cat) => (
                        <SelectItem
                          key={cat.id}
                          value={cat.id}
                          className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] cursor-pointer"
                        >
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Section: Tipo y Preparación */}
                <div className="space-y-0.5 pt-2">
                  <h2 className="text-sm font-semibold text-[var(--admin-text)]">
                    Tipo y Preparación
                  </h2>
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    Cómo se elabora este producto
                  </p>
                </div>
                <div className="h-px bg-[var(--admin-border)]" />

                {/* Tipo de producto */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[var(--admin-text-muted)]">
                    Tipo de producto
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['elaborado', 'reventa'] as ProductType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setProductType(type)}
                        className={`p-3 rounded-lg border text-left transition-all duration-200 ${
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

                {/* Recipe selector (elaborado only) */}
                {productType === 'elaborado' && (
                  <>
                    <RecipeSelector
                      recipes={recipes}
                      selectedRecipes={selectedRecipes}
                      onChange={setSelectedRecipes}
                    />
                    {selectedRecipes.length === 0 && (
                      <p className="text-xs text-amber-400/80 text-center py-1">
                        Los productos elaborados requieren al menos una receta para calcular el costo.
                      </p>
                    )}
                  </>
                )}

                {/* Info note for elaborado with recipes */}
                {productType === 'elaborado' && selectedRecipes.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2.5">
                    <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-300">
                      El costo se calcula automáticamente desde las recetas asociadas.
                    </p>
                  </div>
                )}

                {/* Estación */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[var(--admin-text-muted)]">
                    Estación de cocina
                  </Label>
                  <Select
                    name="station"
                    defaultValue={product?.station ?? 'none'}
                  >
                    <SelectTrigger className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 focus:ring-2 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50 [&_svg]:text-[var(--admin-text-muted)]">
                      <SelectValue placeholder="Sin estación..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)]">
                      <SelectItem value="none" className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] cursor-pointer">
                        Sin estación (bebidas / reventa)
                      </SelectItem>
                      <SelectItem value="cocina" className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] cursor-pointer">
                        Cocina
                      </SelectItem>
                      <SelectItem value="barra" className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] cursor-pointer">
                        Barra
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ── Right card ── */}
            <div className="w-[340px] shrink-0 space-y-5">
              <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 space-y-5">

                {/* Section: Configuración */}
                <div className="space-y-0.5">
                  <h2 className="text-sm font-semibold text-[var(--admin-text)]">
                    Configuración
                  </h2>
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    Precio, visibilidad y disponibilidad
                  </p>
                </div>
                <div className="h-px bg-[var(--admin-border)]" />

                {/* Precio */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[var(--admin-text-muted)]">
                    Precio de venta <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] text-sm font-semibold">$</span>
                    <Input
                      name="price"
                      type="number"
                      step="1"
                      required
                      defaultValue={product?.price ?? ''}
                      placeholder="0"
                      onChange={(e) => setPreviewPrice(e.target.value)}
                      className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 pl-7 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                    />
                  </div>
                </div>

                {/* Costo */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[var(--admin-text-muted)] flex items-center gap-1.5">
                    Costo
                    {productType === 'elaborado' && selectedRecipes.length > 0 && (
                      <span className="text-xs bg-[var(--admin-accent)]/15 text-[var(--admin-accent-text)] px-1.5 py-0.5 rounded font-semibold">
                        Auto
                      </span>
                    )}
                  </Label>
                  {calculatedCost !== null ? (
                    <div className="h-10 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-md px-3 flex items-center">
                      <span className="text-[var(--admin-accent-text)] text-sm font-semibold">
                        ${calculatedCost.toLocaleString('es-AR')}
                      </span>
                    </div>
                  ) : (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] text-sm font-semibold">$</span>
                      <Input
                        name="cost"
                        type="number"
                        step="1"
                        defaultValue={product?.cost ?? ''}
                        placeholder={productType === 'reventa' ? 'Costo de compra' : 'Sin receta'}
                        className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 pl-7 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                      />
                    </div>
                  )}
                </div>

                <div className="h-px bg-[var(--admin-border)]" />

                {/* Toggles */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--admin-text)]">Visible (Activo)</p>
                      <p className="text-xs text-[var(--admin-text-muted)]">Mostrar en el menú</p>
                    </div>
                    <Switch
                      checked={isActive}
                      onCheckedChange={setIsActive}
                      className="data-[state=checked]:bg-[var(--admin-accent)] data-[state=unchecked]:bg-[var(--admin-border)]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--admin-text)]">Agotado</p>
                      <p className="text-xs text-[var(--admin-text-muted)]">Marcar como sin stock</p>
                    </div>
                    <Switch
                      checked={isOutOfStock}
                      onCheckedChange={setIsOutOfStock}
                      className="data-[state=checked]:bg-red-500 data-[state=unchecked]:bg-[var(--admin-border)]"
                    />
                  </div>
                </div>

                <div className="h-px bg-[var(--admin-border)]" />

                {/* Vista Previa */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[var(--admin-text)]">Vista Previa</p>
                  <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] overflow-hidden">
                    {/* Image area */}
                    <div className="h-32 bg-[var(--admin-border)]/40 flex items-center justify-center">
                      {previewImage ? (
                        <img
                          src={previewImage}
                          alt="Preview"
                          className="h-full w-full object-cover"
                          onError={() => {}}
                        />
                      ) : (
                        <Package className="h-8 w-8 text-[var(--admin-text-muted)]/30" />
                      )}
                    </div>
                    {/* Card body */}
                    <div className="p-4 space-y-1.5">
                      <p className="text-sm font-semibold text-[var(--admin-text)] truncate">
                        {previewName || 'Nombre del Producto'}
                      </p>
                      <p className="text-sm font-bold text-[var(--admin-accent-text)]">
                        {previewPrice
                          ? formatPrice(parseFloat(previewPrice))
                          : '$0'}
                      </p>
                      {previewCategory && (
                        <span className="inline-block text-xs font-medium text-[var(--admin-accent-text)] bg-[var(--admin-accent)]/10 rounded-full px-2 py-0.5">
                          {previewCategory}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </form>
    </div>
  )
}
