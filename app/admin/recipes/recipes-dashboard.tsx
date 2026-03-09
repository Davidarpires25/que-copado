'use client'

import { useState } from 'react'
import { Plus, BookOpen, Check, X, Pencil, Trash2, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
import { RecipeFormDialog } from '@/components/admin/recipes/recipe-form-dialog'
import { deleteRecipe, updateRecipe, getRecipeWithIngredients } from '@/app/actions/recipes'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import type { Ingredient, Recipe, RecipeWithIngredients, IngredientUnit } from '@/lib/types/database'
import { INGREDIENT_UNIT_ABBR } from '@/lib/types/database'

interface RecipesDashboardProps {
  initialRecipes: RecipeWithIngredients[]
  ingredients: Ingredient[]
}

export function RecipesDashboard({ initialRecipes, ingredients }: RecipesDashboardProps) {
  const [recipes, setRecipes] = useState(initialRecipes)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const formatCost = (cost: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(cost)

  const UNIT_TO_BASE: Record<string, number> = {
    kg: 1, g: 0.001, litro: 1, ml: 0.001, unidad: 1,
  }

  const getRecipeCost = (recipe: RecipeWithIngredients) => {
    return recipe.recipe_ingredients.reduce((sum, ri) => {
      const effectiveUnit = ri.unit ?? ri.ingredients.unit
      const factor = UNIT_TO_BASE[effectiveUnit] ?? 1
      return sum + ri.quantity * factor * ri.ingredients.cost_per_unit
    }, 0)
  }

  const filteredRecipes = recipes.filter(
    (r) => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeCount = recipes.filter((r) => r.is_active).length
  const inactiveCount = recipes.length - activeCount

  const handleEdit = (recipe: RecipeWithIngredients) => {
    setEditingRecipe(recipe)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingRecipe(null)
  }

  const handleCreated = async (recipe: Recipe) => {
    setIsFormOpen(false)
    const result = await getRecipeWithIngredients(recipe.id)
    const full = (result.data ?? { ...recipe, recipe_ingredients: [] }) as RecipeWithIngredients
    setRecipes((prev) => [...prev, full].sort((a, b) => a.name.localeCompare(b.name)))
  }

  const handleUpdated = async (updated: Recipe) => {
    setEditingRecipe(null)
    setIsFormOpen(false)
    const result = await getRecipeWithIngredients(updated.id)
    if (result.data) {
      setRecipes((prev) =>
        prev
          .map((r) => (r.id === updated.id ? (result.data as RecipeWithIngredients) : r))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    } else {
      // fallback: at least update metadata
      setRecipes((prev) =>
        prev
          .map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    }
  }

  const handleToggleActive = async (recipe: RecipeWithIngredients) => {
    const newValue = !recipe.is_active
    setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? { ...r, is_active: newValue } : r)))
    const result = await updateRecipe(recipe.id, { is_active: newValue })
    if (result.error) {
      toast.error(result.error)
      setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? { ...r, is_active: !newValue } : r)))
    } else {
      toast.success(newValue ? 'Receta activada' : 'Receta desactivada')
    }
  }

  const handleDelete = async (id: string) => {
    const prev = recipes
    setRecipes((list) => list.filter((r) => r.id !== id))
    setDeleteTarget(null)
    const result = await deleteRecipe(id)
    if (result.error) {
      toast.error(result.error)
      setRecipes(prev)
    } else {
      toast.success('Receta eliminada')
    }
  }

  return (
    <AdminLayout title="Recetas" description="Crea recetas reutilizables para calcular costos de productos">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div
          className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 lg:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] hover:border-[var(--admin-accent)]/30 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--admin-text-muted)] text-sm font-medium">Total</p>
              <p className="text-2xl lg:text-3xl font-bold text-[var(--admin-text)] mt-1">{recipes.length}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[var(--admin-accent)]/10 rounded-xl flex items-center justify-center">
              <BookOpen className="h-5 w-5 lg:h-6 lg:w-6 text-[var(--admin-accent-text)]" />
            </div>
          </div>
        </div>
        <div
          className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 lg:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] hover:border-green-500/30 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--admin-text-muted)] text-sm font-medium">Activas</p>
              <p className="text-2xl lg:text-3xl font-bold text-[var(--admin-text)] mt-1">{activeCount}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <Check className="h-5 w-5 lg:h-6 lg:w-6 text-green-500" />
            </div>
          </div>
        </div>
        <div
          className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 lg:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] hover:border-red-500/30 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--admin-text-muted)] text-sm font-medium">Inactivas</p>
              <p className="text-2xl lg:text-3xl font-bold text-[var(--admin-text)] mt-1">{inactiveCount}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
              <X className="h-5 w-5 lg:h-6 lg:w-6 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div
          className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden"
        >
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-[var(--admin-surface-2)] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-10 w-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--admin-text)] mb-2">No hay recetas todavia</h3>
            <p className="text-[var(--admin-text-muted)] mb-6 max-w-md mx-auto">
              Crea recetas reutilizables como &quot;Medallon 120g&quot; o &quot;Salsa Especial&quot; y
              asignalas a tus productos para calcular costos automaticamente.
            </p>
            <Button
              onClick={() => setIsFormOpen(true)}
              className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/25"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Receta
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar receta..."
                className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-9 pl-9 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
              />
            </div>
            <p className="text-[var(--admin-text-muted)] text-sm hidden sm:block">
              {filteredRecipes.length} {filteredRecipes.length === 1 ? 'receta' : 'recetas'}
            </p>
            <div className="ml-auto">
              <Button
                onClick={() => setIsFormOpen(true)}
                className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/20 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Nueva Receta</span>
                <span className="sm:hidden">Nueva</span>
              </Button>
            </div>
          </div>

          {/* Table */}
          <div
            className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden"
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[var(--admin-bg)]">
                <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-bg)]">
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold">Receta</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold hidden sm:table-cell">Ingredientes</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold">Costo</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold text-center hidden sm:table-cell">Activa</TableHead>
                  <TableHead className="text-[var(--admin-text-muted)] font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipes.map((recipe, index) => {
                  const recipeCost = getRecipeCost(recipe)
                  const isExpanded = expandedId === recipe.id

                  return (
                    <tr
                      key={recipe.id}
                      className="border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] transition-colors group"
                    >
                      <TableCell>
                        <div>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
                            className="flex items-center gap-1.5 text-left"
                          >
                            <p className="font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-accent-text)] transition-colors text-sm lg:text-base">
                              {recipe.name}
                            </p>
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5 text-[var(--admin-text-muted)]" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-[var(--admin-text-muted)]" />
                            )}
                          </button>
                          {recipe.description && (
                            <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">{recipe.description}</p>
                          )}
                          {/* Expanded ingredient details */}
                          {isExpanded && recipe.recipe_ingredients.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {recipe.recipe_ingredients.map((ri) => {
                                const effectiveUnit = ri.unit ?? ri.ingredients.unit
                                const factor = UNIT_TO_BASE[effectiveUnit] ?? 1
                                const unitAbbr = INGREDIENT_UNIT_ABBR[effectiveUnit as IngredientUnit] ?? effectiveUnit
                                return (
                                  <div key={ri.id} className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)]">
                                    <span className="text-[var(--admin-text-muted)]">{ri.ingredients.name}</span>
                                    <span>{ri.quantity} {unitAbbr}</span>
                                    <span className="text-[var(--admin-accent-text)]">
                                      {formatCost(ri.quantity * factor * ri.ingredients.cost_per_unit)}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="border-[var(--admin-border)] text-[var(--admin-text-muted)] bg-[var(--admin-surface-2)] font-medium">
                          {recipe.recipe_ingredients.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-[var(--admin-accent-text)] font-semibold text-sm lg:text-base">
                          {formatCost(recipeCost)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex justify-center">
                                <Switch
                                  checked={recipe.is_active}
                                  onCheckedChange={() => handleToggleActive(recipe)}
                                  className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[var(--admin-border)]"
                                  aria-label={recipe.is_active ? 'Activa' : 'Inactiva'}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {recipe.is_active ? 'Activa' : 'Inactiva'}
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
                                  className="h-8 w-8 lg:h-9 lg:w-9 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)] transition-all"
                                  onClick={() => handleEdit(recipe)}
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
                                  onClick={() => setDeleteTarget(recipe.id)}
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
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <RecipeFormDialog
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        recipe={editingRecipe}
        ingredients={ingredients}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar receta"
        description="Esta accion no se puede deshacer. Si la receta esta en uso en productos, no se podra eliminar."
        confirmLabel="Eliminar"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </AdminLayout>
  )
}
