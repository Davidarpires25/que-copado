'use client'

import Link from 'next/link'
import { Plus, X, AlertTriangle, Wheat, BookOpen, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NumberInput } from '@/components/ui/number-input'
import { AyudaCampo } from '@/components/ui/ayuda-campo'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  } from '@/components/ui/select'
import type { RecipeWithIngredients } from '@/lib/types/database'
import { costoDeReceta } from '@/lib/utils/recipe-cost'
import { formatCost } from '@/lib/constants/recipe-units'

export interface ProductRecipeItem {
  recipe_id: string
  quantity: number
}

interface RecipeSelectorProps {
  recipes: RecipeWithIngredients[]
  selectedRecipes: ProductRecipeItem[]
  onChange: (items: ProductRecipeItem[]) => void
  /**
   * Aclaracion para el signo de pregunta de al lado de "Recetas".
   *
   * Va como prop porque el selector lo comparten los elaborados y los combos,
   * y lo que hay que explicar es distinto: en un combo la receta es lo que se
   * consume *por ser combo* --el envase, la preparacion-- y no lo que lleva
   * adentro, que son sus componentes.
   */
  ayuda?: React.ReactNode
}

export function RecipeSelector({ recipes, selectedRecipes, onChange, ayuda }: RecipeSelectorProps) {
  const usedIds = new Set(selectedRecipes.map((r) => r.recipe_id))
  const availableRecipes = recipes.filter((r) => r.is_active && !usedIds.has(r.id))


  const getRecipe = (id: string) => recipes.find((r) => r.id === id)

  // La misma cuenta que hace el servidor al guardar. Antes multiplicaba la
  // cantidad cruda por el precio: 500 g de papa a $1.500 el kilo daban
  // $750.000 en vez de $750.
  const getRecipeCost = (recipe: RecipeWithIngredients) =>
    costoDeReceta(recipe.recipe_ingredients)

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
        <p className="text-[var(--admin-text-muted)] text-sm font-medium inline-flex items-center gap-1.5">
          Recetas
          {ayuda && <AyudaCampo>{ayuda}</AyudaCampo>}
        </p>
        {selectedRecipes.length > 0 && (
          <p className="text-xs text-[var(--admin-text-muted)]">
            Costo total{' '}
            <span className="text-[var(--admin-price)] font-semibold">{formatCost(totalCost)}</span>
          </p>
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
                  <NumberInput
                    step="1"
                    min="1"
                    integer
                    value={item.quantity}
                    onValueChange={(n) => handleQuantityChange(item.recipe_id, n)}
                    aria-label={`Cantidad de ${recipe.name}`}
                    className="w-16 h-8 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm text-center focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20"
                  />
                  <span className="text-xs text-[var(--admin-text-muted)] shrink-0">x</span>
                </div>

                <p className="text-xs text-[var(--admin-price)] font-medium w-16 text-right shrink-0">
                  {formatCost(subtotal)}
                </p>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-700 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
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

      {recipes.length === 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-50 dark:bg-amber-950/10 p-3 space-y-2.5">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
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
