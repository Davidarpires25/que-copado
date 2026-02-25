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

  const formatCost = (cost: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(cost)

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
        <p className="text-[#a8b5c9] text-sm font-medium">Receta (ingredientes)</p>
        {recipeItems.length > 0 && (
          <Badge variant="outline" className="border-[#FEC501]/30 text-[#FEC501] bg-[#FEC501]/10 text-xs">
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
                className="flex items-center gap-2 p-2 rounded-lg bg-[#252a35]/50 border border-[#2a2f3a]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#f0f2f5] font-medium truncate">{ing.name}</p>
                  <p className="text-xs text-[#a8b5c9]">
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
                    className="w-20 h-8 bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] text-sm text-center focus:border-[#FEC501]/50 focus:ring-1 focus:ring-[#FEC501]/20"
                  />
                  <Badge variant="outline" className="border-[#2a2f3a] text-[#a8b5c9] text-xs shrink-0">
                    {unitAbbr}
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
          <SelectTrigger className="bg-[#1a1d24] border-[#2a2f3a] border-dashed text-[#a8b5c9] text-sm h-9 focus:ring-2 focus:ring-[#FEC501]/20 focus:border-[#FEC501]/50 [&_svg]:text-[#a8b5c9] [&_svg]:opacity-100">
            <div className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" />
              <span>Agregar ingrediente</span>
            </div>
          </SelectTrigger>
          <SelectContent className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5]">
            {availableIngredients.map((ing) => (
              <SelectItem
                key={ing.id}
                value={ing.id}
                className="text-[#f0f2f5] focus:bg-[#2a2f3a] focus:text-[#f0f2f5] hover:bg-[#2a2f3a] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {ing.name}
                  <span className="text-[#a8b5c9] text-xs">
                    ({formatCost(ing.cost_per_unit)} / {INGREDIENT_UNIT_ABBR[ing.unit as IngredientUnit] ?? ing.unit})
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {recipeItems.length === 0 && (
        <p className="text-xs text-[#a8b5c9]/60 text-center py-1">
          Sin receta. El costo se ingresa manualmente.
        </p>
      )}
    </div>
  )
}
