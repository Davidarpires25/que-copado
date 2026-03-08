'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, AlertTriangle, Plus, X, Wheat, ArrowRight, RefreshCw } from 'lucide-react'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface RecipeIngredientItem {
  ingredient_id: string
  quantity: number
  unit: string
}

// Conversion factors relative to base unit for client-side cost preview
const UNIT_TO_BASE: Record<string, number> = {
  kg: 1,
  g: 0.001,
  litro: 1,
  ml: 0.001,
  unidad: 1,
}

// Unit family groups for compatibility hints
const UNIT_FAMILY: Record<string, string> = {
  kg: 'masa',
  g: 'masa',
  litro: 'volumen',
  ml: 'volumen',
  unidad: 'unidad',
}

const ALL_UNITS: IngredientUnit[] = ['kg', 'g', 'litro', 'ml', 'unidad']

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

  // Inline validation
  const [nameTouched, setNameTouched] = useState(false)
  const [ingredientsTouched, setIngredientsTouched] = useState(false)

  const nameError = nameTouched && !name.trim() ? 'El nombre es requerido' : ''
  const ingredientsError = ingredientsTouched && recipeItems.length === 0 ? 'Agrega al menos un ingrediente' : ''
  const canSubmit = !isLoading && !!name.trim() && recipeItems.length > 0

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
            result.data.recipe_ingredients.map(
              (ri: { ingredient_id: string; quantity: number; unit?: string | null; ingredients?: { unit: string } }) => ({
                ingredient_id: ri.ingredient_id,
                quantity: ri.quantity,
                unit: ri.unit ?? ri.ingredients?.unit ?? 'unidad',
              })
            )
          )
        }
        setIsLoadingRecipe(false)
      })
    } else {
      setName('')
      setDescription('')
      setRecipeItems([])
    }
    setNameTouched(false)
    setIngredientsTouched(false)
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
    if (!ing) return sum
    const conversionFactor = UNIT_TO_BASE[item.unit] ?? 1
    return sum + item.quantity * conversionFactor * ing.cost_per_unit
  }, 0)

  const handleAddIngredient = (ingredientId: string) => {
    const ing = ingredients.find((i) => i.id === ingredientId)
    setRecipeItems((prev) => [
      ...prev,
      { ingredient_id: ingredientId, quantity: 1, unit: ing?.unit ?? 'unidad' },
    ])
  }

  const handleUnitChange = (ingredientId: string, unit: string) => {
    setRecipeItems((prev) =>
      prev.map((r) => (r.ingredient_id === ingredientId ? { ...r, unit } : r))
    )
  }

  const getUnitCompatibility = (
    selectedUnit: string,
    baseUnit: string
  ): 'same' | 'compatible' | 'incompatible' => {
    if (selectedUnit === baseUnit) return 'same'
    if (UNIT_FAMILY[selectedUnit] === UNIT_FAMILY[baseUnit]) return 'compatible'
    return 'incompatible'
  }

  const handleRemoveIngredient = (ingredientId: string) => {
    setRecipeItems((prev) => prev.filter((r) => r.ingredient_id !== ingredientId))
  }

  const handleQuantityChange = (ingredientId: string, quantity: number) => {
    setRecipeItems((prev) =>
      prev.map((r) =>
        r.ingredient_id === ingredientId ? { ...r, quantity } : r
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameTouched(true)
    setIngredientsTouched(true)
    if (!canSubmit) return

    setIsLoading(true)
    try {
      if (isEditing && recipe) {
        const result = await updateRecipe(recipe.id, {
          name: name.trim(),
          description: description.trim() || null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ingredients: recipeItems.map((item) => ({ ingredient_id: item.ingredient_id, quantity: item.quantity, unit: item.unit })) as any,
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ingredients: recipeItems.map((item) => ({ ingredient_id: item.ingredient_id, quantity: item.quantity, unit: item.unit })) as any,
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
      <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[var(--admin-text)]">
            {isEditing ? 'Editar Receta' : 'Nueva Receta'}
          </DialogTitle>
          <p className="text-[var(--admin-text-muted)] text-xs mt-0.5">
            {isEditing
              ? 'Modifica los datos de la receta'
              : 'Crea una receta reutilizable para tus productos'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="recipe-name" className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Nombre <span className="text-red-400 ml-0.5">*</span>
            </Label>
            <Input
              id="recipe-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              placeholder='Ej: "Medallon 120g", "Salsa Especial"'
              disabled={isLoading}
              className={`border h-10 text-sm placeholder:text-[var(--admin-text-muted)] transition-all ${
                nameError
                  ? 'bg-[var(--admin-bg)] border-red-500/60 text-[var(--admin-text)] focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20'
              }`}
            />
            {nameError && <p className="text-xs text-red-400">{nameError}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="recipe-desc" className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Descripcion <span className="text-[var(--admin-text-faint)] font-normal">(opcional)</span>
            </Label>
            <Input
              id="recipe-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripcion de la receta"
              className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 text-sm placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all"
            />
          </div>

          {/* Ingredients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
                Ingredientes <span className="text-red-400 ml-0.5">*</span>
              </Label>
              {recipeItems.length > 0 && (
                <Badge variant="outline" className="border-[var(--admin-accent)]/30 text-[var(--admin-accent-text)] bg-[var(--admin-accent)]/10 text-xs">
                  Costo: {formatCost(totalCost)}
                </Badge>
              )}
            </div>

            {isLoadingRecipe ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--admin-text-muted)]" />
              </div>
            ) : (
              <>
                {recipeItems.length > 0 && (
                  <div className="space-y-2">
                    {recipeItems.map((item) => {
                      const ing = getIngredient(item.ingredient_id)
                      if (!ing) return null
                      const baseUnitAbbr = INGREDIENT_UNIT_ABBR[ing.unit as IngredientUnit] ?? ing.unit
                      const selectedUnitAbbr = INGREDIENT_UNIT_ABBR[item.unit as IngredientUnit] ?? item.unit
                      const conversionFactor = UNIT_TO_BASE[item.unit] ?? 1
                      const subtotal = item.quantity * conversionFactor * ing.cost_per_unit
                      const compatibility = getUnitCompatibility(item.unit, ing.unit)

                      return (
                        <div
                          key={item.ingredient_id}
                          className="flex flex-col gap-1.5 p-2 rounded-lg bg-[var(--admin-surface-2)]/50 border border-[var(--admin-border)]"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[var(--admin-text)] font-medium truncate">{ing.name}</p>
                              <p className="text-xs text-[var(--admin-text-muted)]">
                                {formatCost(ing.cost_per_unit)} / {baseUnitAbbr}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value)
                                  if (!isNaN(val) && val > 0) {
                                    handleQuantityChange(item.ingredient_id, val)
                                  }
                                }}
                                className="w-20 h-8 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm text-center focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20"
                              />
                              <Select
                                value={item.unit}
                                onValueChange={(v) => handleUnitChange(item.ingredient_id, v)}
                              >
                                <SelectTrigger className="w-20 h-8 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-xs focus:ring-1 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50 [&_svg]:text-[var(--admin-text-muted)] [&_svg]:opacity-100 px-2">
                                  <SelectValue>{selectedUnitAbbr}</SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)]">
                                  {ALL_UNITS.map((u) => (
                                    <SelectItem
                                      key={u}
                                      value={u}
                                      className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] focus:text-[var(--admin-text)] hover:bg-[var(--admin-border)] cursor-pointer text-xs"
                                    >
                                      {INGREDIENT_UNIT_ABBR[u]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <p className="text-xs text-[var(--admin-accent-text)] font-medium w-16 text-right shrink-0">
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

                          {compatibility === 'incompatible' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5 px-1 cursor-default">
                                    <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                                    <span className="text-xs text-amber-400">
                                      Unidad incompatible con la base ({baseUnitAbbr})
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Esta unidad no es compatible con la unidad base del ingrediente
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          {compatibility === 'compatible' && (
                            <div className="flex items-center gap-1.5 px-1">
                              <RefreshCw className="h-3 w-3 text-green-400 shrink-0" />
                              <span className="text-xs text-green-400">
                                Se convertira automaticamente desde {selectedUnitAbbr} a {baseUnitAbbr}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add ingredient selector */}
                {availableIngredients.length > 0 && (
                  <Select onValueChange={handleAddIngredient}>
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

                {ingredients.length === 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <p className="text-xs font-medium">No hay ingredientes creados</p>
                    </div>
                    <Link
                      href="/admin/ingredients"
                      className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-accent-text)] transition-colors group pl-1"
                    >
                      <Wheat className="h-3.5 w-3.5" />
                      <span>Ir a crear ingredientes</span>
                      <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </div>
                )}

                {ingredients.length > 0 && recipeItems.length === 0 && (
                  <p className="text-xs text-[var(--admin-text-muted)]/60 text-center py-2">
                    Agrega ingredientes para armar la receta.
                  </p>
                )}
                {ingredientsError && (
                  <p className="text-xs text-red-400">{ingredientsError}</p>
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
              className="flex-1 h-10 text-sm border-[#3a4150] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className={`flex-1 h-10 text-sm font-semibold transition-all duration-200 ${
                !canSubmit
                  ? 'bg-[var(--admin-text-placeholder)] text-[var(--admin-text-faint)] cursor-not-allowed shadow-none'
                  : 'bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black shadow-lg shadow-[var(--admin-accent)]/20'
              }`}
              disabled={!canSubmit}
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
