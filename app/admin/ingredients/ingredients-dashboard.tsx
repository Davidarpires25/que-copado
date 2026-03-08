'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Wheat, Check, X, Pencil, Trash2, Search, TrendingUp, Tag, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AdminLayout } from '@/components/admin/layout'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { IngredientFormDialog } from '@/components/admin/ingredients/ingredient-form-dialog'
import { BulkPriceUpdateDialog } from '@/components/admin/ingredients/bulk-price-update-dialog'
import { CategoryManagerDialog } from '@/components/admin/ingredients/category-manager-dialog'
import { IngredientSubRecipeDialog } from '@/components/admin/ingredients/ingredient-sub-recipe-dialog'
import { deleteIngredient, updateIngredient } from '@/app/actions/ingredients'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import type { IngredientWithCategory, IngredientCategory } from '@/lib/types/database'
import { INGREDIENT_UNIT_ABBR, type IngredientUnit } from '@/lib/types/database'

interface IngredientsDashboardProps {
  initialIngredients: IngredientWithCategory[]
  categories: IngredientCategory[]
}

const ALL_CATEGORIES_VALUE = '__all__'

export function IngredientsDashboard({ initialIngredients, categories: initialCategories }: IngredientsDashboardProps) {
  const router = useRouter()
  const [ingredients, setIngredients] = useState(initialIngredients)
  const [categories, setCategories] = useState(initialCategories)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<IngredientWithCategory | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isBulkPriceOpen, setIsBulkPriceOpen] = useState(false)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [subRecipeTarget, setSubRecipeTarget] = useState<IngredientWithCategory | null>(null)

  const formatCost = (cost: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(cost)

  const filteredIngredients = ingredients.filter((i) => {
    const matchesSearch = !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      !filterCategory ||
      filterCategory === ALL_CATEGORIES_VALUE ||
      i.ingredient_categories?.id === filterCategory
    return matchesSearch && matchesCategory
  })

  const activeCount = ingredients.filter((i) => i.is_active).length
  const inactiveCount = ingredients.length - activeCount

  const handleEdit = (ingredient: IngredientWithCategory) => {
    setEditingIngredient(ingredient)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingIngredient(null)
  }

  const handleCreated = (ingredient: IngredientWithCategory) => {
    setIngredients((prev) => [...prev, ingredient].sort((a, b) => a.name.localeCompare(b.name)))
    setIsFormOpen(false)
  }

  const handleUpdated = (updated: IngredientWithCategory) => {
    setIngredients((prev) =>
      prev.map((i) => (i.id === updated.id ? updated : i)).sort((a, b) => a.name.localeCompare(b.name))
    )
    setEditingIngredient(null)
    setIsFormOpen(false)
  }

  const handleToggleActive = async (ingredient: IngredientWithCategory) => {
    const newValue = !ingredient.is_active
    setIngredients((prev) => prev.map((i) => (i.id === ingredient.id ? { ...i, is_active: newValue } : i)))
    const result = await updateIngredient(ingredient.id, { is_active: newValue })
    if (result.error) {
      toast.error(result.error)
      setIngredients((prev) => prev.map((i) => (i.id === ingredient.id ? { ...i, is_active: !newValue } : i)))
    } else {
      toast.success(newValue ? 'Ingrediente activado' : 'Ingrediente desactivado')
    }
  }

  const handleDelete = async (id: string) => {
    const prev = ingredients
    setIngredients((list) => list.filter((i) => i.id !== id))
    setDeleteTarget(null)
    const result = await deleteIngredient(id)
    if (result.error) {
      toast.error(result.error)
      setIngredients(prev)
    } else {
      toast.success('Ingrediente eliminado')
    }
  }

  // When bulk price update finishes, re-fetch ingredients by refreshing the page data
  // Since we can't call server actions to re-fetch here without a router refresh,
  // we trigger a full router refresh via window.location to pick up the new costs.
  const handleBulkUpdated = () => {
    router.refresh()
  }

  return (
    <AdminLayout title="Ingredientes" description="Gestiona los ingredientes y sus costos">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 lg:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] hover:border-[var(--admin-accent)]/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--admin-text-muted)] text-sm font-medium">Total</p>
              <p className="text-2xl lg:text-3xl font-bold text-[var(--admin-text)] mt-1">{ingredients.length}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[var(--admin-accent)]/10 rounded-xl flex items-center justify-center">
              <Wheat className="h-5 w-5 lg:h-6 lg:w-6 text-[var(--admin-accent-text)]" />
            </div>
          </div>
        </div>
        <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 lg:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] hover:border-green-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--admin-text-muted)] text-sm font-medium">Activos</p>
              <p className="text-2xl lg:text-3xl font-bold text-[var(--admin-text)] mt-1">{activeCount}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <Check className="h-5 w-5 lg:h-6 lg:w-6 text-green-500" />
            </div>
          </div>
        </div>
        <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 lg:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] hover:border-red-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--admin-text-muted)] text-sm font-medium">Inactivos</p>
              <p className="text-2xl lg:text-3xl font-bold text-[var(--admin-text)] mt-1">{inactiveCount}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
              <X className="h-5 w-5 lg:h-6 lg:w-6 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {ingredients.length === 0 ? (
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-[var(--admin-surface-2)] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Wheat className="h-10 w-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--admin-text)] mb-2">No hay ingredientes todavia</h3>
            <p className="text-[var(--admin-text-muted)] mb-6 max-w-sm mx-auto">
              Comienza agregando ingredientes para armar las recetas de tus productos.
            </p>
            <Button
              onClick={() => setIsFormOpen(true)}
              className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/25"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primer Ingrediente
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Header toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar ingrediente..."
                className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-9 pl-9 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
              />
            </div>

            {/* Category filter */}
            {categories.length > 0 && (
              <Select
                value={filterCategory || ALL_CATEGORIES_VALUE}
                onValueChange={(v) => setFilterCategory(v === ALL_CATEGORIES_VALUE ? '' : v)}
              >
                <SelectTrigger className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-9 text-sm w-auto min-w-[160px] focus:ring-2 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50 data-[placeholder]:text-[var(--admin-text-muted)] [&_svg]:text-[var(--admin-text-muted)] [&_svg]:opacity-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)]">
                  <SelectItem
                    value={ALL_CATEGORIES_VALUE}
                    className="text-[var(--admin-text-muted)] focus:bg-[var(--admin-border)] focus:text-[var(--admin-text)] hover:bg-[var(--admin-border)] cursor-pointer"
                  >
                    Todas las categorias
                  </SelectItem>
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
            )}

            {/* Count */}
            <p className="text-[var(--admin-text-muted)] text-sm hidden sm:block">
              {filteredIngredients.length} {filteredIngredients.length === 1 ? 'ingrediente' : 'ingredientes'}
            </p>

            {/* Action buttons */}
            <div className="ml-auto flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCategoryManagerOpen(true)}
                      className="h-9 border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] hover:border-[var(--admin-accent)]/40 gap-1.5"
                    >
                      <Tag className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Categorias</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Gestionar categorias</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBulkPriceOpen(true)}
                      className="h-9 border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] hover:border-[var(--admin-accent)]/40 gap-1.5"
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Actualizar precios</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Actualizar precios por categoria</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button
                onClick={() => setIsFormOpen(true)}
                className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/20 transition-all hover:scale-105 active:scale-95 h-9"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Nuevo Ingrediente</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[var(--admin-bg)]">
                <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-bg)]">
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold">Nombre</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold">Unidad</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold">Costo / Unidad</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold text-center hidden sm:table-cell">Activo</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIngredients.map((ingredient) => (
                  <tr
                    key={ingredient.id}
                    className="border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] transition-colors group"
                  >
                    <TableCell>
                      <p className="font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-accent-text)] transition-colors text-sm lg:text-base">
                        {ingredient.name}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {ingredient.ingredient_categories ? (
                        <Badge
                          variant="outline"
                          className="border-[var(--admin-accent)]/30 text-[var(--admin-accent-text)]/80 bg-[var(--admin-accent)]/5 font-medium text-xs"
                        >
                          {ingredient.ingredient_categories.name}
                        </Badge>
                      ) : (
                        <span className="text-[var(--admin-text-muted)] text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-[var(--admin-border)] text-[var(--admin-text-muted)] bg-[var(--admin-surface-2)] font-medium">
                        {INGREDIENT_UNIT_ABBR[ingredient.unit as IngredientUnit] ?? ingredient.unit}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-[var(--admin-accent-text)] font-semibold text-sm lg:text-base">
                        {formatCost(ingredient.cost_per_unit)}
                      </span>
                      <span className="text-[var(--admin-text-muted)] text-xs ml-1">
                        / {INGREDIENT_UNIT_ABBR[ingredient.unit as IngredientUnit] ?? ingredient.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex justify-center">
                              <Switch
                                checked={ingredient.is_active}
                                onCheckedChange={() => handleToggleActive(ingredient)}
                                className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[var(--admin-border)]"
                                aria-label={ingredient.is_active ? 'Activo' : 'Inactivo'}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {ingredient.is_active ? 'Activo' : 'Inactivo'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {ingredient.is_active && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 lg:h-9 lg:w-9 text-[var(--admin-text-muted)] hover:text-[var(--admin-accent-text)] hover:bg-[var(--admin-accent)]/10 transition-all"
                                  onClick={() => setSubRecipeTarget(ingredient)}
                                >
                                  <GitBranch className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Gestionar sub-receta</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 lg:h-9 lg:w-9 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)] transition-all"
                                onClick={() => handleEdit(ingredient)}
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
                                className="h-8 w-8 lg:h-9 lg:w-9 text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-all"
                                onClick={() => setDeleteTarget(ingredient.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </tr>
                ))}
              </TableBody>
            </Table>

            {filteredIngredients.length === 0 && (
              <div className="py-14 flex flex-col items-center justify-center text-center gap-3">
                {searchQuery || filterCategory ? (
                  <>
                    <Search className="h-9 w-9 text-[var(--admin-text-placeholder)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--admin-text-muted)]">Sin resultados</p>
                      <p className="text-xs text-[var(--admin-text-faint)] mt-1">No se encontraron ingredientes con los filtros aplicados</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSearchQuery(''); setFilterCategory('') }}
                      className="text-[var(--admin-accent-text)] hover:text-[var(--admin-accent-text)] hover:bg-[var(--admin-accent)]/10 text-xs h-8"
                    >
                      Limpiar filtros
                    </Button>
                  </>
                ) : (
                  <>
                    <Wheat className="h-9 w-9 text-[var(--admin-text-placeholder)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--admin-text-muted)]">No hay ingredientes todavía</p>
                      <p className="text-xs text-[var(--admin-text-faint)] mt-1">Agregá tu primer ingrediente para empezar</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <IngredientFormDialog
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        ingredient={editingIngredient}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        categories={categories}
      />

      <BulkPriceUpdateDialog
        open={isBulkPriceOpen}
        onOpenChange={setIsBulkPriceOpen}
        categories={categories}
        ingredients={ingredients}
        onUpdated={handleBulkUpdated}
      />

      <CategoryManagerDialog
        open={isCategoryManagerOpen}
        onOpenChange={setIsCategoryManagerOpen}
        categories={categories}
        onCategoriesChange={setCategories}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar ingrediente"
        description="Esta accion no se puede deshacer. Si el ingrediente esta en uso en recetas, no se podra eliminar."
        confirmLabel="Eliminar"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />

      {subRecipeTarget && (
        <IngredientSubRecipeDialog
          open={!!subRecipeTarget}
          onOpenChange={(open) => !open && setSubRecipeTarget(null)}
          ingredient={subRecipeTarget}
          allIngredients={ingredients}
        />
      )}
    </AdminLayout>
  )
}
