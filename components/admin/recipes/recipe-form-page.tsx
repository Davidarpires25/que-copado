'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight, Loader2, AlertTriangle, X, RefreshCw, BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { createRecipe, updateRecipe, getRecipeWithIngredients } from '@/app/actions/recipes'
import { createIngredient } from '@/app/actions/ingredients'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Ingredient, IngredientUnit, Recipe, RecipeWithIngredients } from '@/lib/types/database'
import { INGREDIENT_UNIT_ABBR } from '@/lib/types/database'
import { UNIT_TO_BASE, UNIT_FAMILY, ALL_UNITS, formatCost } from '@/lib/constants/recipe-units'
import { IngredientCombobox } from './ingredient-combobox'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecipeIngredientItem {
  ingredient_id: string
  quantity: number
  unit: string
}

// ─── Create Ingredient Mini-Dialog ────────────────────────────────────────────

function CreateIngredientDialog({
  open,
  onOpenChange,
  initialName,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialName: string
  onCreated: (ingredient: Ingredient) => void
}) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<IngredientUnit>('kg')
  const [costRaw, setCostRaw] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) { setName(initialName); setUnit('kg'); setCostRaw('') }
  }, [open, initialName])

  const canSubmit = name.trim().length > 0 && !isLoading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const cost = costRaw === '' ? 0 : parseFloat(costRaw)
    if (isNaN(cost) || cost < 0) { toast.error('El costo debe ser un número >= 0'); return }
    setIsLoading(true)
    try {
      const result = await createIngredient({ name: name.trim(), unit, cost_per_unit: cost })
      if (result.error) { toast.error(result.error); return }
      if (result.data) {
        toast.success(`Ingrediente "${result.data.name}" creado`)
        onCreated(result.data as Ingredient)
        onOpenChange(false)
      }
    } catch {
      toast.error('Error al crear el ingrediente')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] sm:max-w-sm shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[var(--admin-text)]">Nuevo Ingrediente</DialogTitle>
          <p className="text-[var(--admin-text-muted)] text-xs mt-0.5">Se creará y agregará a la receta automáticamente</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-3">
          <div className="space-y-1.5">
            <Label className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Nombre <span className="text-red-400 ml-0.5">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ej: "Harina", "Queso cheddar"'
              disabled={isLoading}
              autoFocus
              className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-9 text-sm placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Unidad base <span className="text-red-400 ml-0.5">*</span>
            </Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as IngredientUnit)} disabled={isLoading}>
              <SelectTrigger className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-9 text-sm focus:ring-1 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)]">
                {ALL_UNITS.map((u) => (
                  <SelectItem key={u} value={u} className="text-[var(--admin-text)] focus:bg-[var(--admin-surface-2)] cursor-pointer text-sm">
                    {INGREDIENT_UNIT_ABBR[u]} — {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Costo por unidad <span className="text-[var(--admin-text-faint)] font-normal">(opcional)</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--admin-text-muted)]">$</span>
              <Input
                type="number" min="0" step="any"
                value={costRaw} onChange={(e) => setCostRaw(e.target.value)}
                placeholder="0" disabled={isLoading}
                className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-9 text-sm pl-7 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}
              className="flex-1 h-9 text-sm border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] bg-transparent">
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}
              className={cn('flex-1 h-9 text-sm font-semibold transition-all',
                !canSubmit
                  ? 'bg-[var(--admin-border)] text-[var(--admin-text-muted)] cursor-not-allowed'
                  : 'bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black shadow-lg shadow-[var(--admin-accent)]/20'
              )}>
              {isLoading ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Creando...</> : 'Crear y agregar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Form Page ───────────────────────────────────────────────────────────

interface RecipeFormPageProps {
  mode: 'create' | 'edit'
  recipe?: RecipeWithIngredients
  ingredients: Ingredient[]
}

export function RecipeFormPage({ mode, recipe, ingredients }: RecipeFormPageProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(recipe?.name ?? '')
  const [description, setDescription] = useState(recipe?.description ?? '')
  const [isActive, setIsActive] = useState(recipe?.is_active ?? true)
  const [recipeItems, setRecipeItems] = useState<RecipeIngredientItem[]>([])
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false)
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>(ingredients)
  const [showCreateIngredient, setShowCreateIngredient] = useState(false)
  const [createIngredientName, setCreateIngredientName] = useState('')
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null)

  // Load recipe ingredients on mount (edit mode)
  useEffect(() => {
    if (mode === 'edit' && recipe) {
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
    }
  }, [mode, recipe])

  const getIngredient = (id: string) => allIngredients.find((i) => i.id === id)
  const usedIds = new Set(recipeItems.map((r) => r.ingredient_id))
  const availableIngredients = allIngredients.filter((i) => i.is_active && !usedIds.has(i.id))

  const totalCost = recipeItems.reduce((sum, item) => {
    const ing = getIngredient(item.ingredient_id)
    if (!ing) return sum
    return sum + item.quantity * (UNIT_TO_BASE[item.unit] ?? 1) * ing.cost_per_unit
  }, 0)

  const canSubmit = !!name.trim() && recipeItems.length > 0

  const getUnitCompatibility = (sel: string, base: string): 'same' | 'compatible' | 'incompatible' => {
    if (sel === base) return 'same'
    if (UNIT_FAMILY[sel] === UNIT_FAMILY[base]) return 'compatible'
    return 'incompatible'
  }

  const handleAddIngredient = (ingredientId: string) => {
    const ing = allIngredients.find((i) => i.id === ingredientId)
    setRecipeItems((prev) => [...prev, { ingredient_id: ingredientId, quantity: 1, unit: ing?.unit ?? 'unidad' }])
  }

  const handleRemoveIngredient = (ingredientId: string) =>
    setRecipeItems((prev) => prev.filter((r) => r.ingredient_id !== ingredientId))

  const handleQuantityChange = (ingredientId: string, quantity: number) =>
    setRecipeItems((prev) => prev.map((r) => r.ingredient_id === ingredientId ? { ...r, quantity } : r))

  const handleUnitChange = (ingredientId: string, unit: string) =>
    setRecipeItems((prev) => prev.map((r) => r.ingredient_id === ingredientId ? { ...r, unit } : r))

  const handleIngredientCreated = (ingredient: Ingredient) => {
    setAllIngredients((prev) => [...prev, ingredient].sort((a, b) => a.name.localeCompare(b.name)))
    setRecipeItems((prev) => [...prev, { ingredient_id: ingredient.id, quantity: 1, unit: ingredient.unit }])
    setNewlyCreatedId(ingredient.id)
    setTimeout(() => setNewlyCreatedId(null), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) { toast.error('Completá el nombre y agregá al menos un ingrediente'); return }

    startTransition(async () => {
      try {
        const ingredientPayload = recipeItems.map((item) => ({
          ingredient_id: item.ingredient_id,
          quantity: item.quantity,
          unit: item.unit,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any

        if (mode === 'edit' && recipe) {
          const result = await updateRecipe(recipe.id, {
            name: name.trim(),
            description: description.trim() || null,
            is_active: isActive,
            ingredients: ingredientPayload,
          })
          if (result.error) { toast.error(result.error); return }
          toast.success('Receta actualizada')
        } else {
          const result = await createRecipe({
            name: name.trim(),
            description: description.trim() || undefined,
            ingredients: ingredientPayload,
          })
          if (result.error) { toast.error(result.error); return }
          toast.success('Receta creada')
        }
        router.push('/admin/recipes')
        router.refresh()
      } catch {
        toast.error('Ocurrió un error inesperado')
      }
    })
  }

  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      <form onSubmit={handleSubmit} className="px-8 xl:px-10 py-8 max-w-[1200px] mx-auto space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/admin/recipes" className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors">
            Recetas
          </Link>
          <ChevronRight className="h-4 w-4 text-[var(--admin-text-muted)]/50" />
          <span className="text-[var(--admin-text)] font-medium">
            {mode === 'edit' && recipe ? recipe.name : 'Nueva Receta'}
          </span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--admin-text)]">
            {mode === 'edit' ? 'Editar Receta' : 'Nueva Receta'}
          </h1>
          <div className="flex items-center gap-3">
            <Link href="/admin/recipes">
              <Button type="button" variant="outline"
                className="border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] bg-transparent hover:bg-[var(--admin-surface)]">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={isPending || !canSubmit}
              className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/20 disabled:opacity-50 disabled:cursor-not-allowed">
              {isPending
                ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Guardando...</span>
                : mode === 'edit' ? 'Guardar Cambios' : 'Guardar Receta'}
            </Button>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6 items-start">

          {/* ── Left column ── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Información card */}
            <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 space-y-5">
              <div className="space-y-0.5">
                <h2 className="text-sm font-semibold text-[var(--admin-text)]">Información de la Receta</h2>
                <p className="text-xs text-[var(--admin-text-muted)]">Nombre y descripción de la receta</p>
              </div>
              <div className="h-px bg-[var(--admin-border)]" />

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[var(--admin-text-muted)]">
                  Nombre de la receta <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder='Ej: "Clásic Burger"'
                  className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[var(--admin-text-muted)]">
                  Descripción <span className="text-[var(--admin-text-faint)] font-normal">(opcional)</span>
                </Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descripción de la receta..."
                  rows={3}
                  className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text)] text-sm px-3 py-2.5 placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 resize-none transition-all"
                />
              </div>

              <div className="h-px bg-[var(--admin-border)]" />

              {/* Receta activa toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--admin-text)]">Receta activa</p>
                  <p className="text-xs text-[var(--admin-text-muted)]">Disponible para asignar a productos</p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  className="data-[state=checked]:bg-[var(--admin-accent)] data-[state=unchecked]:bg-[var(--admin-border)]"
                />
              </div>

              {mode === 'edit' && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Al modificar la receta se recalcularán los costos de todos los productos que la usen.
                  </p>
                </div>
              )}
            </div>

            {/* Resumen de Costos card */}
            {recipeItems.length > 0 && (
              <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 space-y-4">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-semibold text-[var(--admin-text)]">Resumen de Costos</h2>
                  <p className="text-xs text-[var(--admin-text-muted)]">Calculado en base a los ingredientes</p>
                </div>
                <div className="h-px bg-[var(--admin-border)]" />
                <div className="space-y-2">
                  {recipeItems.map((item) => {
                    const ing = getIngredient(item.ingredient_id)
                    if (!ing) return null
                    const subtotal = item.quantity * (UNIT_TO_BASE[item.unit] ?? 1) * ing.cost_per_unit
                    const unitAbbr = INGREDIENT_UNIT_ABBR[item.unit as IngredientUnit] ?? item.unit
                    return (
                      <div key={item.ingredient_id} className="flex items-center justify-between text-sm">
                        <span className="text-[var(--admin-text-muted)] truncate">{ing.name}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs text-[var(--admin-text-faint)]">{item.quantity} {unitAbbr}</span>
                          <span className="text-[var(--admin-text)] font-medium w-20 text-right">{formatCost(subtotal)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="h-px bg-[var(--admin-border)]" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--admin-text)]">
                    Total ({recipeItems.length} {recipeItems.length === 1 ? 'ingrediente' : 'ingredientes'})
                  </span>
                  <span className="text-base font-bold text-[var(--admin-accent-text)]">
                    {formatCost(totalCost)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Right column ── */}
          <div className="w-[420px] shrink-0">
            <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-semibold text-[var(--admin-text)]">Ingredientes de la Receta</h2>
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    {recipeItems.length > 0
                      ? `${recipeItems.length} ${recipeItems.length === 1 ? 'ingrediente' : 'ingredientes'}`
                      : 'Agrega al menos uno'}
                  </p>
                </div>
                {totalCost > 0 && (
                  <span className="text-xs font-semibold text-[var(--admin-accent-text)] bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/20 px-2 py-1 rounded-md">
                    {formatCost(totalCost)}
                  </span>
                )}
              </div>
              <div className="h-px bg-[var(--admin-border)]" />

              {isLoadingRecipe ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--admin-text-muted)]" />
                </div>
              ) : (
                <div className="space-y-3">
                  {recipeItems.length > 0 ? (
                    <div className="space-y-2">
                      {/* Table header */}
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-1 pb-1 border-b border-[var(--admin-border)]">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]/70">Ingrediente</span>
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]/70 w-16 text-center">Cant.</span>
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]/70 w-16 text-center">Unidad</span>
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]/70 w-16 text-right">Costo</span>
                      </div>

                      {recipeItems.map((item) => {
                        const ing = getIngredient(item.ingredient_id)
                        if (!ing) return null
                        const baseUnitAbbr = INGREDIENT_UNIT_ABBR[ing.unit as IngredientUnit] ?? ing.unit
                        const selectedUnitAbbr = INGREDIENT_UNIT_ABBR[item.unit as IngredientUnit] ?? item.unit
                        const subtotal = item.quantity * (UNIT_TO_BASE[item.unit] ?? 1) * ing.cost_per_unit
                        const compatibility = getUnitCompatibility(item.unit, ing.unit)
                        const isNew = newlyCreatedId === item.ingredient_id

                        return (
                          <div
                            key={item.ingredient_id}
                            className={cn(
                              'rounded-lg border p-2.5 transition-all duration-700',
                              'bg-[var(--admin-surface-2)] border-[var(--admin-border)]',
                              isNew && 'border-[var(--admin-accent)]/60 ring-2 ring-[var(--admin-accent)]/25'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-[var(--admin-text)] font-medium truncate">{ing.name}</p>
                                <p className="text-xs text-[var(--admin-text-muted)]">
                                  {formatCost(ing.cost_per_unit)} / {baseUnitAbbr}
                                </p>
                              </div>
                              <Input
                                type="number" step="any" min="0"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value)
                                  if (!isNaN(val) && val > 0) handleQuantityChange(item.ingredient_id, val)
                                }}
                                className="w-16 h-8 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm text-center focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20"
                              />
                              <Select value={item.unit} onValueChange={(v) => handleUnitChange(item.ingredient_id, v)}>
                                <SelectTrigger className="w-16 h-8 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-xs focus:ring-1 focus:ring-[var(--admin-accent)]/20 px-2">
                                  <SelectValue>{selectedUnitAbbr}</SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)]">
                                  {ALL_UNITS.map((u) => (
                                    <SelectItem key={u} value={u} className="text-[var(--admin-text)] focus:bg-[var(--admin-surface-2)] cursor-pointer text-xs">
                                      {INGREDIENT_UNIT_ABBR[u]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-[var(--admin-accent-text)] font-semibold w-14 text-right shrink-0">
                                {formatCost(subtotal)}
                              </p>
                              <Button
                                type="button" size="icon" variant="ghost"
                                className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10 shrink-0"
                                onClick={() => handleRemoveIngredient(item.ingredient_id)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            {compatibility === 'incompatible' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5 mt-1.5 cursor-default">
                                      <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                                      <span className="text-xs text-amber-600 dark:text-amber-400">
                                        Unidad incompatible con la base ({baseUnitAbbr})
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>Esta unidad no es compatible con la unidad base del ingrediente</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            {compatibility === 'compatible' && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <RefreshCw className="h-3 w-3 text-green-500 shrink-0" />
                                <span className="text-xs text-green-600 dark:text-green-400">
                                  Se convertirá desde {selectedUnitAbbr} a {baseUnitAbbr}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-12 h-12 rounded-xl bg-[var(--admin-surface-2)] flex items-center justify-center mb-3">
                        <BookOpen className="h-6 w-6 text-[var(--admin-text-faint)]" />
                      </div>
                      <p className="text-sm text-[var(--admin-text-muted)]">Sin ingredientes</p>
                      <p className="text-xs text-[var(--admin-text-faint)] mt-1">Agregá al menos uno para calcular el costo</p>
                    </div>
                  )}

                  <IngredientCombobox
                    availableIngredients={availableIngredients}
                    onSelect={handleAddIngredient}
                    onCreateRequest={(name) => { setCreateIngredientName(name); setShowCreateIngredient(true) }}
                  />

                  {allIngredients.length === 0 && (
                    <p className="text-xs text-[var(--admin-text-muted)] text-center py-1">
                      Buscá un nombre y usá{' '}
                      <span className="text-[var(--admin-accent-text)] font-medium">Crear &ldquo;...&rdquo;</span>
                      {' '}para crear tu primer ingrediente.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </form>

      <CreateIngredientDialog
        open={showCreateIngredient}
        onOpenChange={setShowCreateIngredient}
        initialName={createIngredientName}
        onCreated={handleIngredientCreated}
      />
    </div>
  )
}
