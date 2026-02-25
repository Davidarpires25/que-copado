'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, AlertTriangle, Plus, X, Wheat, ArrowRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createRecipe, updateRecipe, getRecipeWithIngredients } from '@/app/actions/recipes'
import { toast } from 'sonner'
import type { Ingredient, IngredientUnit, Recipe } from '@/lib/types/database'
import { INGREDIENT_UNIT_ABBR } from '@/lib/types/database'

interface RecipeIngredientItem {
  ingredient_id: string
  quantity: number
}

interface RecipeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe: Recipe | null
  ingredients: Ingredient[]
  onCreated: (recipe: Recipe) => void
  onUpdated: (recipe: Recipe) => void
}

export function RecipeFormDialog({
  open,
  onOpenChange,
  recipe,
  ingredients,
  onCreated,
  onUpdated,
}: RecipeFormDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [recipeItems, setRecipeItems] = useState<RecipeIngredientItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false)

  const isEditing = !!recipe

  useEffect(() => {
    if (!open) return

    if (recipe) {
      setName(recipe.name)
      setDescription(recipe.description || '')
      // Load existing recipe ingredients
      setIsLoadingRecipe(true)
      getRecipeWithIngredients(recipe.id).then((result) => {
        if (result.data?.recipe_ingredients) {
          setRecipeItems(
            result.data.recipe_ingredients.map((ri: { ingredient_id: string; quantity: number }) => ({
              ingredient_id: ri.ingredient_id,
              quantity: ri.quantity,
            }))
          )
        }
        setIsLoadingRecipe(false)
      })
    } else {
      setName('')
      setDescription('')
      setRecipeItems([])
    }
  }, [recipe, open])

  const formatCost = (cost: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(cost)

  const getIngredient = (id: string) => ingredients.find((i) => i.id === id)

  const usedIds = new Set(recipeItems.map((r) => r.ingredient_id))
  const availableIngredients = ingredients.filter((i) => i.is_active && !usedIds.has(i.id))

  const totalCost = recipeItems.reduce((sum, item) => {
    const ing = getIngredient(item.ingredient_id)
    return sum + (ing ? item.quantity * ing.cost_per_unit : 0)
  }, 0)

  const handleAddIngredient = (ingredientId: string) => {
    setRecipeItems((prev) => [...prev, { ingredient_id: ingredientId, quantity: 1 }])
  }

  const handleRemoveIngredient = (ingredientId: string) => {
    setRecipeItems((prev) => prev.filter((r) => r.ingredient_id !== ingredientId))
  }

  const handleQuantityChange = (ingredientId: string, quantity: number) => {
    setRecipeItems((prev) =>
      prev.map((r) =>
        r.ingredient_id === ingredientId ? { ...r, quantity: Math.max(0.001, quantity) } : r
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (recipeItems.length === 0) {
      toast.error('Agrega al menos un ingrediente a la receta')
      return
    }

    setIsLoading(true)
    try {
      if (isEditing && recipe) {
        const result = await updateRecipe(recipe.id, {
          name: name.trim(),
          description: description.trim() || null,
          ingredients: recipeItems,
        })

        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Receta actualizada')
        if (result.data) onUpdated(result.data as Recipe)
      } else {
        const result = await createRecipe({
          name: name.trim(),
          description: description.trim() || undefined,
          ingredients: recipeItems,
        })

        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Receta creada')
        if (result.data) onCreated(result.data as Recipe)
      }
    } catch {
      toast.error('Ocurrio un error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#12151a] border-[#2a2f3a] text-[#f0f2f5] sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#f0f2f5]">
            {isEditing ? 'Editar Receta' : 'Nueva Receta'}
          </DialogTitle>
          <p className="text-[#a8b5c9] text-xs mt-0.5">
            {isEditing
              ? 'Modifica los datos de la receta'
              : 'Crea una receta reutilizable para tus productos'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="recipe-name" className="text-[#a8b5c9] text-xs font-semibold uppercase tracking-wide">
              Nombre
            </Label>
            <Input
              id="recipe-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ej: "Medallon 120g", "Salsa Especial"'
              className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] h-10 text-sm placeholder:text-[#a8b5c9] focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="recipe-desc" className="text-[#a8b5c9] text-xs font-semibold uppercase tracking-wide">
              Descripcion <span className="text-[#6b7a8d] font-normal">(opcional)</span>
            </Label>
            <Input
              id="recipe-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripcion de la receta"
              className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] h-10 text-sm placeholder:text-[#a8b5c9] focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
            />
          </div>

          {/* Ingredients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[#a8b5c9] text-xs font-semibold uppercase tracking-wide">
                Ingredientes
              </Label>
              {recipeItems.length > 0 && (
                <Badge variant="outline" className="border-[#FEC501]/30 text-[#FEC501] bg-[#FEC501]/10 text-xs">
                  Costo: {formatCost(totalCost)}
                </Badge>
              )}
            </div>

            {isLoadingRecipe ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-[#a8b5c9]" />
              </div>
            ) : (
              <>
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
                              onChange={(e) =>
                                handleQuantityChange(item.ingredient_id, parseFloat(e.target.value) || 0.001)
                              }
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
                            onClick={() => handleRemoveIngredient(item.ingredient_id)}
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
                  <Select onValueChange={handleAddIngredient}>
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

                {ingredients.length === 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <p className="text-xs font-medium">No hay ingredientes creados</p>
                    </div>
                    <Link
                      href="/admin/ingredients"
                      className="flex items-center gap-2 text-xs text-[#a8b5c9] hover:text-[#FEC501] transition-colors group pl-1"
                    >
                      <Wheat className="h-3.5 w-3.5" />
                      <span>Ir a crear ingredientes</span>
                      <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </div>
                )}

                {ingredients.length > 0 && recipeItems.length === 0 && (
                  <p className="text-xs text-[#a8b5c9]/60 text-center py-2">
                    Agrega ingredientes para armar la receta.
                  </p>
                )}
              </>
            )}
          </div>

          {isEditing && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/20 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-400/80">
                Al modificar la receta se recalcularan los costos de todos los productos que la usen.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-10 text-sm border-[#3a4150] text-[#a8b5c9] hover:text-[#f0f2f5] hover:bg-[#252a35]"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className={`flex-1 h-10 text-sm font-semibold transition-all duration-200 ${
                isLoading || !name.trim() || recipeItems.length === 0
                  ? 'bg-[#3a3f4a] text-[#6b7a8d] cursor-not-allowed shadow-none'
                  : 'bg-[#FEC501] hover:bg-[#E5B001] text-black shadow-lg shadow-[#FEC501]/20'
              }`}
              disabled={isLoading || !name.trim() || recipeItems.length === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : isEditing ? (
                'Guardar Cambios'
              ) : (
                'Crear Receta'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
