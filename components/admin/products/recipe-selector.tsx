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
        <p className="text-[#a8b5c9] text-sm font-medium">Recetas</p>
        {selectedRecipes.length > 0 && (
          <Badge variant="outline" className="border-[#FEC501]/30 text-[#FEC501] bg-[#FEC501]/10 text-xs">
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
                className="flex items-center gap-2 p-2 rounded-lg bg-[#252a35]/50 border border-[#2a2f3a]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#f0f2f5] font-medium truncate">{recipe.name}</p>
                  <p className="text-xs text-[#a8b5c9]">
                    {formatCost(recipeCost)} / unidad
                    <span className="ml-1 text-[#6b7a8d]">
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
                    className="w-16 h-8 bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] text-sm text-center focus:border-[#FEC501]/50 focus:ring-1 focus:ring-[#FEC501]/20"
                  />
                  <Badge variant="outline" className="border-[#2a2f3a] text-[#a8b5c9] text-xs shrink-0">
                    x
                  </Badge>
                </div>

                <p className="text-xs text-[#FEC501] font-medium w-16 text-right shrink-0">
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
          <SelectTrigger className="bg-[#1a1d24] border-[#2a2f3a] border-dashed text-[#a8b5c9] text-sm h-9 focus:ring-2 focus:ring-[#FEC501]/20 focus:border-[#FEC501]/50 [&_svg]:text-[#a8b5c9] [&_svg]:opacity-100">
            <div className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" />
              <span>Agregar receta</span>
            </div>
          </SelectTrigger>
          <SelectContent className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5]">
            {availableRecipes.map((recipe) => {
              const cost = getRecipeCost(recipe)
              return (
                <SelectItem
                  key={recipe.id}
                  value={recipe.id}
                  className="text-[#f0f2f5] focus:bg-[#2a2f3a] focus:text-[#f0f2f5] hover:bg-[#2a2f3a] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {recipe.name}
                    <span className="text-[#a8b5c9] text-xs">({formatCost(cost)})</span>
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      )}

      {selectedRecipes.length === 0 && (
        <p className="text-xs text-[#a8b5c9]/60 text-center py-1">
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
              className="flex items-center gap-2 text-xs text-[#a8b5c9] hover:text-[#FEC501] transition-colors group"
            >
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#2a2f3a] text-[10px] font-bold text-[#a8b5c9] group-hover:bg-[#FEC501]/20 group-hover:text-[#FEC501] transition-colors">1</span>
              <Wheat className="h-3 w-3" />
              <span>Crear ingredientes</span>
              <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              href="/admin/recipes"
              className="flex items-center gap-2 text-xs text-[#a8b5c9] hover:text-[#FEC501] transition-colors group"
            >
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#2a2f3a] text-[10px] font-bold text-[#a8b5c9] group-hover:bg-[#FEC501]/20 group-hover:text-[#FEC501] transition-colors">2</span>
              <BookOpen className="h-3 w-3" />
              <span>Armar recetas con esos ingredientes</span>
              <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <div className="flex items-center gap-2 text-xs text-[#a8b5c9]">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#FEC501]/20 text-[10px] font-bold text-[#FEC501]">3</span>
              <Plus className="h-3 w-3" />
              <span>Asignar recetas al producto (aca)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
