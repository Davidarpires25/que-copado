'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, AlertTriangle, Plus, X, RefreshCw, Search, ChevronDown } from 'lucide-react'
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
import { createIngredient } from '@/app/actions/ingredients'
import { toast } from 'sonner'
import type { Ingredient, IngredientUnit, Recipe } from '@/lib/types/database'
import { INGREDIENT_UNIT_ABBR } from '@/lib/types/database'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

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

// ─── Inline Ingredient Combobox ──────────────────────────────────────────────

interface IngredientComboboxProps {
  availableIngredients: Ingredient[]
  onSelect: (ingredientId: string) => void
  onCreateRequest: (name: string) => void
  disabled?: boolean
}

function IngredientCombobox({
  availableIngredients,
  onSelect,
  onCreateRequest,
  disabled,
}: IngredientComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = availableIngredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  const exactMatch = availableIngredients.some(
    (i) => i.name.toLowerCase() === search.toLowerCase()
  )

  // Show create option always (empty = "Crear nuevo"), or when typed name has no exact match
  const showCreateOption = !exactMatch

  useEffect(() => {
    if (!open) { setSearch(''); return }
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const formatCost = (cost: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(cost)

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-2 h-9 px-3 rounded-md border border-dashed text-sm transition-colors',
          'bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text-muted)]',
          'hover:border-[var(--admin-accent)]/50 hover:text-[var(--admin-text)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          open && 'border-[var(--admin-accent)]/50 text-[var(--admin-text)]'
        )}
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">Agregar ingrediente</span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--admin-border)]">
            <Search className="h-3.5 w-3.5 text-[var(--admin-text-muted)] shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ingrediente..."
              className="flex-1 bg-transparent text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="p-0.5 rounded hover:bg-[var(--admin-border)] text-[var(--admin-text-muted)] transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Results list */}
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 && !showCreateOption && (
              <li className="px-3 py-2 text-xs text-[var(--admin-text-muted)] text-center">
                No hay ingredientes disponibles
              </li>
            )}
            {filtered.map((ing) => (
              <li key={ing.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(ing.id)
                    setOpen(false)
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] transition-colors text-left"
                >
                  <span className="truncate">{ing.name}</span>
                  <span className="text-xs text-[var(--admin-text-muted)] shrink-0 ml-2">
                    {formatCost(ing.cost_per_unit)} / {INGREDIENT_UNIT_ABBR[ing.unit as IngredientUnit] ?? ing.unit}
                  </span>
                </button>
              </li>
            ))}

            {/* Create option */}
            {showCreateOption && (
              <li className="border-t border-[var(--admin-border)] mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    onCreateRequest(search.trim())
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--admin-accent-text)] hover:bg-[var(--admin-accent)]/10 transition-colors text-left"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {search.trim()
                      ? <>Crear <span className="font-semibold">&ldquo;{search.trim()}&rdquo;</span></>
                      : 'Crear nuevo ingrediente'
                    }
                  </span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Create Ingredient Mini-Dialog ───────────────────────────────────────────

interface CreateIngredientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialName: string
  onCreated: (ingredient: Ingredient) => void
}

function CreateIngredientDialog({
  open,
  onOpenChange,
  initialName,
  onCreated,
}: CreateIngredientDialogProps) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<IngredientUnit>('kg')
  const [costRaw, setCostRaw] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setName(initialName)
      setUnit('kg')
      setCostRaw('')
    }
  }, [open, initialName])

  const canSubmit = name.trim().length > 0 && !isLoading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    const cost = costRaw === '' ? 0 : parseFloat(costRaw)
    if (isNaN(cost) || cost < 0) {
      toast.error('El costo debe ser un número >= 0')
      return
    }

    setIsLoading(true)
    try {
      const result = await createIngredient({
        name: name.trim(),
        unit,
        cost_per_unit: cost,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

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
          <DialogTitle className="text-base font-semibold text-[var(--admin-text)]">
            Nuevo Ingrediente
          </DialogTitle>
          <p className="text-[var(--admin-text-muted)] text-xs mt-0.5">
            Se creará y agregará a la receta automáticamente
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 mt-3">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="ing-name" className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Nombre <span className="text-red-400 ml-0.5">*</span>
            </Label>
            <Input
              id="ing-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ej: "Harina", "Queso cheddar"'
              disabled={isLoading}
              autoFocus
              className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-9 text-sm placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
            />
          </div>

          {/* Unit */}
          <div className="space-y-1.5">
            <Label className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Unidad base <span className="text-red-400 ml-0.5">*</span>
            </Label>
            <Select
              value={unit}
              onValueChange={(v) => setUnit(v as IngredientUnit)}
              disabled={isLoading}
            >
              <SelectTrigger className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-9 text-sm focus:ring-1 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50 [&_svg]:text-[var(--admin-text-muted)] [&_svg]:opacity-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)]">
                {ALL_UNITS.map((u) => (
                  <SelectItem
                    key={u}
                    value={u}
                    className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] focus:text-[var(--admin-text)] hover:bg-[var(--admin-border)] cursor-pointer text-sm"
                  >
                    {INGREDIENT_UNIT_ABBR[u]} — {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cost */}
          <div className="space-y-1.5">
            <Label htmlFor="ing-cost" className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Costo por unidad{' '}
              <span className="text-[var(--admin-text-faint)] font-normal">(opcional)</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--admin-text-muted)]">$</span>
              <Input
                id="ing-cost"
                type="number"
                min="0"
                step="any"
                value={costRaw}
                onChange={(e) => setCostRaw(e.target.value)}
                placeholder="0"
                disabled={isLoading}
                className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-9 text-sm pl-7 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1 h-9 text-sm border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                'flex-1 h-9 text-sm font-semibold transition-all duration-200',
                !canSubmit
                  ? 'bg-[var(--admin-text-placeholder)] text-[var(--admin-text-faint)] cursor-not-allowed shadow-none'
                  : 'bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black shadow-lg shadow-[var(--admin-accent)]/20'
              )}
            >
              {isLoading ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Creando...</>
              ) : (
                'Crear y agregar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Recipe Form Dialog ──────────────────────────────────────────────────

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

  // Local ingredients state — can grow with inline-created ingredients
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>(ingredients)

  // Inline ingredient creation
  const [showCreateIngredient, setShowCreateIngredient] = useState(false)
  const [createIngredientName, setCreateIngredientName] = useState('')
  // ID to highlight after creation (amber ring animation)
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null)

  // Inline validation
  const [nameTouched, setNameTouched] = useState(false)
  const [ingredientsTouched, setIngredientsTouched] = useState(false)

  const nameError = nameTouched && !name.trim() ? 'El nombre es requerido' : ''
  const ingredientsError = ingredientsTouched && recipeItems.length === 0 ? 'Agrega al menos un ingrediente' : ''
  const canSubmit = !isLoading && !!name.trim() && recipeItems.length > 0

  const isEditing = !!recipe

  // Sync allIngredients when prop changes (e.g., parent fetches new list)
  useEffect(() => {
    setAllIngredients(ingredients)
  }, [ingredients])

  useEffect(() => {
    if (!open) return

    if (recipe) {
      setName(recipe.name)
      setDescription(recipe.description || '')
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
    setNewlyCreatedId(null)
  }, [recipe, open])

  const formatCost = (cost: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(cost)

  const getIngredient = (id: string) => allIngredients.find((i) => i.id === id)

  const usedIds = new Set(recipeItems.map((r) => r.ingredient_id))
  const availableIngredients = allIngredients.filter((i) => i.is_active && !usedIds.has(i.id))

  const totalCost = recipeItems.reduce((sum, item) => {
    const ing = getIngredient(item.ingredient_id)
    if (!ing) return sum
    const conversionFactor = UNIT_TO_BASE[item.unit] ?? 1
    return sum + item.quantity * conversionFactor * ing.cost_per_unit
  }, 0)

  const handleAddIngredient = (ingredientId: string) => {
    const ing = allIngredients.find((i) => i.id === ingredientId)
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

  const handleCreateIngredientRequest = (name: string) => {
    setCreateIngredientName(name)
    setShowCreateIngredient(true)
  }

  const handleIngredientCreated = (ingredient: Ingredient) => {
    // Add to local list
    setAllIngredients((prev) => [...prev, ingredient].sort((a, b) => a.name.localeCompare(b.name)))
    // Auto-add to recipe
    setRecipeItems((prev) => [
      ...prev,
      { ingredient_id: ingredient.id, quantity: 1, unit: ingredient.unit },
    ])
    // Highlight briefly
    setNewlyCreatedId(ingredient.id)
    setTimeout(() => setNewlyCreatedId(null), 2000)
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
    <>
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
                        const isNew = newlyCreatedId === item.ingredient_id

                        return (
                          <div
                            key={item.ingredient_id}
                            className={cn(
                              'flex flex-col gap-1.5 p-2 rounded-lg bg-[var(--admin-surface-2)]/50 border transition-all duration-700',
                              isNew
                                ? 'border-[var(--admin-accent)]/60 ring-2 ring-[var(--admin-accent)]/25'
                                : 'border-[var(--admin-border)]'
                            )}
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

                  {/* Add ingredient combobox */}
                  <IngredientCombobox
                    availableIngredients={availableIngredients}
                    onSelect={handleAddIngredient}
                    onCreateRequest={handleCreateIngredientRequest}
                    disabled={isLoading}
                  />

                  {allIngredients.length === 0 && (
                    <p className="text-xs text-[var(--admin-text-muted)] text-center py-1">
                      Buscá un nombre y usá{' '}
                      <span className="text-[var(--admin-accent-text)] font-medium">Crear &ldquo;...&rdquo;</span>
                      {' '}para crear tu primer ingrediente.
                    </p>
                  )}

                  {allIngredients.length > 0 && recipeItems.length === 0 && (
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

      {/* Stacked dialog for inline ingredient creation */}
      <CreateIngredientDialog
        open={showCreateIngredient}
        onOpenChange={setShowCreateIngredient}
        initialName={createIngredientName}
        onCreated={handleIngredientCreated}
      />
    </>
  )
}
