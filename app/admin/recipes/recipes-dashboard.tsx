'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, BookOpen, Check, X, Pencil, Trash2, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AdminLayout } from '@/components/admin/layout'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { deleteRecipe, updateRecipe } from '@/app/actions/recipes'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import type { RecipeWithIngredients, IngredientUnit } from '@/lib/types/database'
import { INGREDIENT_UNIT_ABBR } from '@/lib/types/database'

interface RecipesDashboardProps {
  initialRecipes: RecipeWithIngredients[]
}

const UNIT_TO_BASE: Record<string, number> = {
  kg: 1, g: 0.001, litro: 1, ml: 0.001, unidad: 1,
}

const formatCost = (cost: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(cost)

export function RecipesDashboard({ initialRecipes }: RecipesDashboardProps) {
  const router = useRouter()
  const [recipes, setRecipes] = useState(initialRecipes)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const getRecipeCost = (recipe: RecipeWithIngredients) =>
    recipe.recipe_ingredients.reduce((sum, ri) => {
      const effectiveUnit = ri.unit ?? ri.ingredients.unit
      const factor = UNIT_TO_BASE[effectiveUnit] ?? 1
      return sum + ri.quantity * factor * ri.ingredients.cost_per_unit
    }, 0)

  const filteredRecipes = recipes.filter(
    (r) => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeCount = recipes.filter((r) => r.is_active).length
  const inactiveCount = recipes.length - activeCount

  const handleToggleActive = async (recipe: RecipeWithIngredients) => {
    const newValue = !recipe.is_active
    setRecipes((prev) => prev.map((r) => r.id === recipe.id ? { ...r, is_active: newValue } : r))
    const result = await updateRecipe(recipe.id, { is_active: newValue })
    if (result.error) {
      toast.error(result.error)
      setRecipes((prev) => prev.map((r) => r.id === recipe.id ? { ...r, is_active: !newValue } : r))
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
        {[
          { label: 'Total', value: recipes.length, icon: BookOpen, color: 'text-[var(--admin-accent-text)]', bg: 'bg-[var(--admin-accent)]/10', border: 'hover:border-[var(--admin-accent)]/30' },
          { label: 'Activas', value: activeCount, icon: Check, color: 'text-green-600 dark:text-green-500', bg: 'bg-green-500/10', border: 'hover:border-green-500/30' },
          { label: 'Inactivas', value: inactiveCount, icon: X, color: 'text-red-500', bg: 'bg-red-500/10', border: 'hover:border-red-500/30' },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 lg:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] ${border} transition-all`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--admin-text-muted)] text-sm font-medium">{label}</p>
                <p className="text-2xl lg:text-3xl font-bold text-[var(--admin-text)] mt-1">{value}</p>
              </div>
              <div className={`w-10 h-10 lg:w-12 lg:h-12 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`h-5 w-5 lg:h-6 lg:w-6 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-[var(--admin-surface-2)] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-10 w-10 text-[var(--admin-text-faint)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--admin-text)] mb-2">No hay recetas todavía</h3>
            <p className="text-[var(--admin-text-muted)] mb-6 max-w-md mx-auto">
              Crea recetas reutilizables como &quot;Medallón 120g&quot; o &quot;Salsa Especial&quot; y
              asignalas a tus productos para calcular costos automáticamente.
            </p>
            <Button
              onClick={() => router.push('/admin/recipes/new')}
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
                onClick={() => router.push('/admin/recipes/new')}
                className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/20 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Nueva Receta</span>
                <span className="sm:hidden">Nueva</span>
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[var(--admin-bg)]">
                <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-bg)]">
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">Receta</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold hidden sm:table-cell">Ingredientes</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">Costo</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold text-center hidden sm:table-cell">Activa</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipes.map((recipe) => {
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
                            {isExpanded
                              ? <ChevronUp className="h-3.5 w-3.5 text-[var(--admin-text-muted)]" />
                              : <ChevronDown className="h-3.5 w-3.5 text-[var(--admin-text-muted)]" />
                            }
                          </button>
                          {recipe.description && (
                            <p className="text-sm text-[var(--admin-text-muted)] mt-0.5">{recipe.description}</p>
                          )}
                          {isExpanded && recipe.recipe_ingredients.length > 0 && (
                            <div className="mt-2 space-y-1 pl-1">
                              {recipe.recipe_ingredients.map((ri) => {
                                const effectiveUnit = ri.unit ?? ri.ingredients.unit
                                const factor = UNIT_TO_BASE[effectiveUnit] ?? 1
                                const unitAbbr = INGREDIENT_UNIT_ABBR[effectiveUnit as IngredientUnit] ?? effectiveUnit
                                return (
                                  <div key={ri.id} className="flex items-center gap-2 text-sm text-[var(--admin-text-muted)]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-text-faint)] shrink-0" />
                                    <span className="text-[var(--admin-text)]">{ri.ingredients.name}</span>
                                    <span>{ri.quantity} {unitAbbr}</span>
                                    <span className="text-[var(--admin-accent-text)] font-medium ml-auto">
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
                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium border border-[var(--admin-border)] text-[var(--admin-text-muted)] bg-[var(--admin-surface-2)]">
                          {recipe.recipe_ingredients.length} {recipe.recipe_ingredients.length === 1 ? 'ingrediente' : 'ingredientes'}
                        </span>
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
                            <TooltipContent>{recipe.is_active ? 'Activa' : 'Inactiva'}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon" variant="ghost"
                                  className="h-9 w-9 lg:h-10 lg:w-10 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] transition-all"
                                  onClick={() => router.push(`/admin/recipes/${recipe.id}/edit`)}
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
                                  size="icon" variant="ghost"
                                  className="h-9 w-9 lg:h-10 lg:w-10 text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-all"
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar receta"
        description="Esta acción no se puede deshacer. Si la receta está en uso en productos, no se podrá eliminar."
        confirmLabel="Eliminar"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </AdminLayout>
  )
}
