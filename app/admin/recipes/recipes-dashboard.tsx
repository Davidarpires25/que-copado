'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
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
import { deleteRecipe, updateRecipe } from '@/app/actions/recipes'
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

  const getRecipeCost = (recipe: RecipeWithIngredients) => {
    return recipe.recipe_ingredients.reduce((sum, ri) => {
      return sum + ri.quantity * ri.ingredients.cost_per_unit
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

  const handleCreated = (recipe: Recipe) => {
    // We need to refetch with ingredients - for now add with empty ingredients
    // The page will revalidate and show correct data
    const recipeWithIngredients = { ...recipe, recipe_ingredients: [] } as RecipeWithIngredients
    setRecipes((prev) => [...prev, recipeWithIngredients].sort((a, b) => a.name.localeCompare(b.name)))
    setIsFormOpen(false)
  }

  const handleUpdated = (updated: Recipe) => {
    setRecipes((prev) =>
      prev
        .map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
        .sort((a, b) => a.name.localeCompare(b.name))
    )
    setEditingRecipe(null)
    setIsFormOpen(false)
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1a1d24] border border-[#2a2f3a] rounded-xl p-4 lg:p-6 hover:border-[#FEC501]/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#a8b5c9] text-sm font-medium">Total</p>
              <p className="text-2xl lg:text-3xl font-bold text-[#f0f2f5] mt-1">{recipes.length}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#FEC501]/10 rounded-xl flex items-center justify-center">
              <BookOpen className="h-5 w-5 lg:h-6 lg:w-6 text-[#FEC501]" />
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1a1d24] border border-[#2a2f3a] rounded-xl p-4 lg:p-6 hover:border-green-500/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#a8b5c9] text-sm font-medium">Activas</p>
              <p className="text-2xl lg:text-3xl font-bold text-[#f0f2f5] mt-1">{activeCount}</p>
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
          className="bg-[#1a1d24] border border-[#2a2f3a] rounded-xl p-4 lg:p-6 hover:border-red-500/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#a8b5c9] text-sm font-medium">Inactivas</p>
              <p className="text-2xl lg:text-3xl font-bold text-[#f0f2f5] mt-1">{inactiveCount}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
              <X className="h-5 w-5 lg:h-6 lg:w-6 text-red-500" />
            </div>
          </div>
        </motion.div>
      </div>

      {recipes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#2a2f3a] bg-[#1a1d24] overflow-hidden"
        >
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-[#252a35] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-10 w-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-[#f0f2f5] mb-2">No hay recetas todavia</h3>
            <p className="text-[#a8b5c9] mb-6 max-w-md mx-auto">
              Crea recetas reutilizables como &quot;Medallon 120g&quot; o &quot;Salsa Especial&quot; y
              asignalas a tus productos para calcular costos automaticamente.
            </p>
            <Button
              onClick={() => setIsFormOpen(true)}
              className="bg-[#FEC501] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[#FEC501]/25"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Receta
            </Button>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8b5c9]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar receta..."
                className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] text-sm h-9 pl-9 placeholder:text-[#a8b5c9] focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20"
              />
            </div>
            <p className="text-[#a8b5c9] text-sm hidden sm:block">
              {filteredRecipes.length} {filteredRecipes.length === 1 ? 'receta' : 'recetas'}
            </p>
            <div className="ml-auto">
              <Button
                onClick={() => setIsFormOpen(true)}
                className="bg-[#FEC501] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[#FEC501]/20 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Nueva Receta</span>
                <span className="sm:hidden">Nueva</span>
              </Button>
            </div>
          </div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-[#2a2f3a] bg-[#1a1d24] overflow-hidden backdrop-blur"
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[#1a1d24]">
                <TableRow className="border-[#2a2f3a] hover:bg-[#1a1d24]">
                  <TableHead className="text-[#a8b5c9] font-semibold">Receta</TableHead>
                  <TableHead className="text-[#a8b5c9] font-semibold hidden sm:table-cell">Ingredientes</TableHead>
                  <TableHead className="text-[#a8b5c9] font-semibold">Costo</TableHead>
                  <TableHead className="text-[#a8b5c9] font-semibold text-center hidden sm:table-cell">Activa</TableHead>
                  <TableHead className="text-[#a8b5c9] font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipes.map((recipe, index) => {
                  const recipeCost = getRecipeCost(recipe)
                  const isExpanded = expandedId === recipe.id

                  return (
                    <motion.tr
                      key={recipe.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-[#2a2f3a] hover:bg-[#252a35] transition-colors group"
                    >
                      <TableCell>
                        <div>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
                            className="flex items-center gap-1.5 text-left"
                          >
                            <p className="font-semibold text-[#f0f2f5] group-hover:text-[#FEC501] transition-colors text-sm lg:text-base">
                              {recipe.name}
                            </p>
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5 text-[#a8b5c9]" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-[#a8b5c9]" />
                            )}
                          </button>
                          {recipe.description && (
                            <p className="text-xs text-[#a8b5c9] mt-0.5">{recipe.description}</p>
                          )}
                          {/* Expanded ingredient details */}
                          {isExpanded && recipe.recipe_ingredients.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {recipe.recipe_ingredients.map((ri) => {
                                const unitAbbr = INGREDIENT_UNIT_ABBR[ri.ingredients.unit as IngredientUnit] ?? ri.ingredients.unit
                                return (
                                  <div key={ri.id} className="flex items-center gap-2 text-xs text-[#a8b5c9]">
                                    <span className="text-[#c4cdd9]">{ri.ingredients.name}</span>
                                    <span>{ri.quantity} {unitAbbr}</span>
                                    <span className="text-[#FEC501]">
                                      {formatCost(ri.quantity * ri.ingredients.cost_per_unit)}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="border-[#2a2f3a] text-[#c4cdd9] bg-[#252a35] font-medium">
                          {recipe.recipe_ingredients.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-[#FEC501] font-semibold text-sm lg:text-base">
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
                                  className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#2a2f3a]"
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
                                  className="h-8 w-8 lg:h-9 lg:w-9 text-[#a8b5c9] hover:text-[#f0f2f5] hover:bg-[#2a2f3a] transition-all"
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
                    </motion.tr>
                  )
                })}
              </TableBody>
            </Table>
          </motion.div>
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
