'use client'

import { Plus, X } from 'lucide-react'
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
import type { Ingredient, IngredientUnit } from '@/lib/types/database'
import { INGREDIENT_UNIT_ABBR } from '@/lib/types/database'
import { formatCost } from '@/lib/constants/recipe-units'

export interface RecipeItem {
  ingredient_id: string
  quantity: number
}

interface RecipeBuilderProps {
  ingredients: Ingredient[]
  recipeItems: RecipeItem[]
  onChange: (items: RecipeItem[]) => void
}

export function RecipeBuilder({ ingredients, recipeItems, onChange }: RecipeBuilderProps) {
  const usedIds = new Set(recipeItems.map((r) => r.ingredient_id))
  const availableIngredients = ingredients.filter((i) => i.is_active && !usedIds.has(i.id))


  const getIngredient = (id: string) => ingredients.find((i) => i.id === id)

  const totalCost = recipeItems.reduce((sum, item) => {
    const ing = getIngredient(item.ingredient_id)
    return sum + (ing ? item.quantity * ing.cost_per_unit : 0)
  }, 0)

  const handleAdd = (ingredientId: string) => {
    onChange([...recipeItems, { ingredient_id: ingredientId, quantity: 1 }])
  }

  const handleRemove = (ingredientId: string) => {
    onChange(recipeItems.filter((r) => r.ingredient_id !== ingredientId))
  }

  const handleQuantityChange = (ingredientId: string, quantity: number) => {
    onChange(
      recipeItems.map((r) =>
        r.ingredient_id === ingredientId ? { ...r, quantity: Math.max(0.001, quantity) } : r
      )
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[var(--admin-text-muted)] text-sm font-medium">Receta (ingredientes)</p>
        {recipeItems.length > 0 && (
          <Badge variant="outline" className="border-[var(--admin-accent)]/30 text-[var(--admin-accent-text)] bg-[var(--admin-accent)]/10 text-xs">
            Costo: {formatCost(totalCost)}
          </Badge>
        )}
      </div>

      {recipeItems.length > 0 && (
        <div className="space-y-2">
          {recipeItems.map((item) => {
            const ing = getIngredient(item.ingredient_id)
            if (!ing) return null
            const unitAbbr = INGREDIENT_UNIT_ABBR[ing.unit as IngredientUnit] ?? ing.unit
            const subtotal = item.quantity * ing.cost_per_unit

            return (
              <div
                key={item.ingredient_id}
                className="flex items-center gap-2 p-2 rounded-lg bg-[var(--admin-surface-2)]/50 border border-[var(--admin-border)]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--admin-text)] font-medium truncate">{ing.name}</p>
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    {formatCost(ing.cost_per_unit)} / {unitAbbr}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Input
                    type="number"
                    step="0.01"
                    min="0.001"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.ingredient_id, parseFloat(e.target.value) || 0.001)}
                    className="w-20 h-8 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm text-center focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20"
                  />
                  <Badge variant="outline" className="border-[var(--admin-border)] text-[var(--admin-text-muted)] text-xs shrink-0">
                    {unitAbbr}
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
                  onClick={() => handleRemove(item.ingredient_id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add ingredient selector */}
      {availableIngredients.length > 0 && (
        <Select onValueChange={handleAdd}>
          <SelectTrigger className="bg-[var(--admin-bg)] border-[var(--admin-border)] border-dashed text-[var(--admin-text-muted)] text-sm h-9 focus:ring-2 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50 [&_svg]:text-[var(--admin-text-muted)] [&_svg]:opacity-100">
            <div className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" />
              <span>Agregar ingrediente</span>
            </div>
          </SelectTrigger>
          <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)]">
            {availableIngredients.map((ing) => (
              <SelectItem
                key={ing.id}
                value={ing.id}
                className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] focus:text-[var(--admin-text)] hover:bg-[var(--admin-border)] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {ing.name}
                  <span className="text-[var(--admin-text-muted)] text-xs">
                    ({formatCost(ing.cost_per_unit)} / {INGREDIENT_UNIT_ABBR[ing.unit as IngredientUnit] ?? ing.unit})
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {recipeItems.length === 0 && (
        <p className="text-xs text-[var(--admin-text-muted)]/60 text-center py-1">
          Sin receta. El costo se ingresa manualmente.
        </p>
      )}
    </div>
  )
}
