'use client'

import Link from 'next/link'
import { Plus, X, AlertTriangle, Wheat, BookOpen, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RecipeWithIngredients, IngredientUnit } from '@/lib/types/database'
import { INGREDIENT_UNIT_ABBR } from '@/lib/types/database'

export interface ProductRecipeItem {
  recipe_id: string
  quantity: number
}

interface RecipeSelectorProps {
  recipes: RecipeWithIngredients[]
  selectedRecipes: ProductRecipeItem[]
  onChange: (items: ProductRecipeItem[]) => void
}

export function RecipeSelector({ recipes, selectedRecipes, onChange }: RecipeSelectorProps) {
  const usedIds = new Set(selectedRecipes.map((r) => r.recipe_id))
  const availableRecipes = recipes.filter((r) => r.is_active && !usedIds.has(r.id))

  const formatCost = (cost: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(cost)

  const getRecipe = (id: string) => recipes.find((r) => r.id === id)

  const getRecipeCost = (recipe: RecipeWithIngredients) => {
    return recipe.recipe_ingredients.reduce((sum, ri) => {
      return sum + ri.quantity * ri.ingredients.cost_per_unit
    }, 0)
  }

  const totalCost = selectedRecipes.reduce((sum, item) => {
    const recipe = getRecipe(item.recipe_id)
    if (!recipe) return sum
    return sum + getRecipeCost(recipe) * item.quantity
  }, 0)

  const handleAdd = (recipeId: string) => {
    onChange([...selectedRecipes, { recipe_id: recipeId, quantity: 1 }])
  }

  const handleRemove = (recipeId: string) => {
    onChange(selectedRecipes.filter((r) => r.recipe_id !== recipeId))
  }

  const handleQuantityChange = (recipeId: string, quantity: number) => {
    onChange(
      selectedRecipes.map((r) =>
        r.recipe_id === recipeId ? { ...r, quantity: Math.max(1, quantity) } : r
      )
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[var(--admin-text-muted)] text-sm font-medium">Recetas</p>
        {selectedRecipes.length > 0 && (
          <Badge variant="outline" className="border-[var(--admin-accent)]/30 text-[var(--admin-accent-text)] bg-[var(--admin-accent)]/10 text-xs">
            Costo total: {formatCost(totalCost)}
          </Badge>
        )}
      </div>

      {selectedRecipes.length > 0 && (
        <div className="space-y-2">
          {selectedRecipes.map((item) => {
            const recipe = getRecipe(item.recipe_id)
            if (!recipe) return null
            const recipeCost = getRecipeCost(recipe)
            const subtotal = recipeCost * item.quantity

            return (
              <div
                key={item.recipe_id}
                className="flex items-center gap-2 p-2 rounded-lg bg-[var(--admin-surface-2)]/50 border border-[var(--admin-border)]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--admin-text)] font-medium truncate">{recipe.name}</p>
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    {formatCost(recipeCost)} / unidad
                    <span className="ml-1 text-[var(--admin-text-faint)]">
                      ({recipe.recipe_ingredients.length} ing.)
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      handleQuantityChange(item.recipe_id, parseInt(e.target.value) || 1)
                    }
                    className="w-16 h-8 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm text-center focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20"
                  />
                  <Badge variant="outline" className="border-[var(--admin-border)] text-[var(--admin-text-muted)] text-xs shrink-0">
                    x
                  </Badge>
                </div>

                <p className="text-xs text-[var(--admin-accent-text)] font-medium w-16 text-right shrink-0">
                  {formatCost(subtotal)}
                </p>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-950/30 shrink-0"
                  onClick={() => handleRemove(item.recipe_id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add recipe selector */}
      {availableRecipes.length > 0 && (
        <Select onValueChange={handleAdd}>
          <SelectTrigger className="bg-[var(--admin-bg)] border-[var(--admin-border)] border-dashed text-[var(--admin-text-muted)] text-sm h-9 focus:ring-2 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50 [&_svg]:text-[var(--admin-text-muted)] [&_svg]:opacity-100">
            <div className="flex items-center gap-2">
              <Plus className="text-[var(--admin-text)] h-3.5 w-3.5" />
              <span className="text-[var(--admin-text-muted)]q">Agregar receta</span>
            </div>
          </SelectTrigger>
          <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)]">
            {availableRecipes.map((recipe) => {
              const cost = getRecipeCost(recipe)
              return (
                <SelectItem
                  key={recipe.id}
                  value={recipe.id}
                  className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] focus:text-[var(--admin-text)] hover:bg-[var(--admin-border)] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {recipe.name}
                    <span className="text-[var(--admin-text-muted)] text-xs">({formatCost(cost)})</span>
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      )}

      {selectedRecipes.length === 0 && (
        <p className="text-xs text-[var(--admin-text-muted)]/60 text-center py-1">
          Sin recetas asignadas. El costo se calculara desde las recetas.
        </p>
      )}

      {recipes.length === 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-3 space-y-2.5">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-xs font-medium">Para asignar recetas, segui estos pasos:</p>
          </div>
          <div className="space-y-1.5 pl-1">
            <Link
              href="/admin/ingredients"
              className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-accent-text)] transition-colors group"
            >
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--admin-border)] text-xs font-bold text-[var(--admin-text-muted)] group-hover:bg-[var(--admin-accent)]/20 group-hover:text-[var(--admin-accent-text)] transition-colors">1</span>
              <Wheat className="h-3 w-3" />
              <span>Crear ingredientes</span>
              <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              href="/admin/recipes"
              className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-accent-text)] transition-colors group"
            >
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--admin-border)] text-xs font-bold text-[var(--admin-text-muted)] group-hover:bg-[var(--admin-accent)]/20 group-hover:text-[var(--admin-accent-text)] transition-colors">2</span>
              <BookOpen className="h-3 w-3" />
              <span>Armar recetas con esos ingredientes</span>
              <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <div className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)]">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--admin-accent)]/20 text-xs font-bold text-[var(--admin-accent-text)]">3</span>
              <Plus className="h-3 w-3" />
              <span>Asignar recetas al producto (aca)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
