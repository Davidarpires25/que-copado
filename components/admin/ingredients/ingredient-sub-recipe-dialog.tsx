'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Plus, X, GitBranch, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { IngredientWithCategory, IngredientUnit, IngredientSubRecipeWithChild } from '@/lib/types/database'
import { INGREDIENT_UNIT_ABBR } from '@/lib/types/database'
import { getIngredientSubRecipes, setIngredientSubRecipes } from '@/app/actions/ingredient-sub-recipes'

interface SubRecipeLine {
  id: string
  child_ingredient_id: string
  quantity: string
  unit: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredient: { id: string; name: string; unit: string }
  allIngredients: IngredientWithCategory[]
}

const ALL_UNITS: IngredientUnit[] = ['kg', 'g', 'litro', 'ml', 'unidad']

let lineIdCounter = 0
const generateLineId = () => `line-${++lineIdCounter}`

export function IngredientSubRecipeDialog({
  open,
  onOpenChange,
  ingredient,
  allIngredients,
}: Props) {
  const [lines, setLines] = useState<SubRecipeLine[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const loadSubRecipes = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getIngredientSubRecipes(ingredient.id)
      if (result.error) {
        toast.error(result.error)
        setLines([])
      } else if (result.data) {
        setLines(
          result.data.map((item: IngredientSubRecipeWithChild) => ({
            id: generateLineId(),
            child_ingredient_id: item.child_ingredient_id,
            quantity: item.quantity.toString(),
            unit: item.unit,
          }))
        )
      } else {
        setLines([])
      }
    } catch {
      toast.error('Error al cargar la sub-receta')
      setLines([])
    } finally {
      setIsLoading(false)
    }
  }, [ingredient.id])

  useEffect(() => {
    if (open) {
      loadSubRecipes()
    }
  }, [open, loadSubRecipes])

  const usedChildIds = new Set(lines.map((l) => l.child_ingredient_id))
  const availableIngredients = allIngredients.filter(
    (i) => i.is_active && i.id !== ingredient.id && !usedChildIds.has(i.id)
  )

  const handleAddLine = () => {
    if (availableIngredients.length === 0) return
    const first = availableIngredients[0]
    setLines((prev) => [
      ...prev,
      {
        id: generateLineId(),
        child_ingredient_id: first.id,
        quantity: '1',
        unit: first.unit,
      },
    ])
  }

  const handleRemoveLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  const handleLineIngredientChange = (id: string, childIngredientId: string) => {
    const ing = allIngredients.find((i) => i.id === childIngredientId)
    setLines((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, child_ingredient_id: childIngredientId, unit: ing?.unit ?? 'unidad' }
          : l
      )
    )
  }

  const handleLineQuantityChange = (id: string, quantity: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, quantity } : l)))
  }

  const handleLineUnitChange = (id: string, unit: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, unit } : l)))
  }

  const handleSave = async () => {
    for (const line of lines) {
      const qty = parseFloat(line.quantity)
      if (!line.child_ingredient_id) {
        toast.error('Selecciona un ingrediente en todas las filas')
        return
      }
      if (isNaN(qty) || qty <= 0) {
        toast.error('La cantidad debe ser mayor a 0 en todas las filas')
        return
      }
    }

    setIsSaving(true)
    try {
      const result = await setIngredientSubRecipes(
        ingredient.id,
        lines.map((l) => ({
          child_ingredient_id: l.child_ingredient_id,
          quantity: parseFloat(l.quantity),
          unit: l.unit,
        }))
      )

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Sub-receta guardada correctamente')
      onOpenChange(false)
    } catch {
      toast.error('Error al guardar la sub-receta')
    } finally {
      setIsSaving(false)
    }
  }

  const baseUnitAbbr = INGREDIENT_UNIT_ABBR[ingredient.unit as IngredientUnit] ?? ingredient.unit

  const summaryText =
    lines.length > 0
      ? lines
          .map((l) => {
            const ing = allIngredients.find((i) => i.id === l.child_ingredient_id)
            const unitAbbr = INGREDIENT_UNIT_ABBR[l.unit as IngredientUnit] ?? l.unit
            return `${l.quantity}${unitAbbr} ${ing?.name ?? '?'}`
          })
          .join(' + ')
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--admin-accent)]/10 rounded-lg flex items-center justify-center shrink-0">
              <GitBranch className="h-4 w-4 text-[var(--admin-accent-text)]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-[var(--admin-text)]">
                Sub-receta de {ingredient.name}
              </DialogTitle>
              <p className="text-[var(--admin-text-muted)] text-xs mt-0.5">
                Define de que esta compuesto este ingrediente
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Summary badge */}
          {summaryText && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--admin-surface-2)] border border-[var(--admin-border)]">
              <Badge
                variant="outline"
                className="border-[var(--admin-accent)]/30 text-[var(--admin-accent-text)] bg-[var(--admin-accent)]/10 text-xs shrink-0"
              >
                1 {baseUnitAbbr}
              </Badge>
              <span className="text-sm text-[var(--admin-text-muted)] leading-relaxed">=&nbsp;{summaryText}</span>
            </div>
          )}

          {/* Info alert when there are lines */}
          {lines.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-950/20 border border-blue-500/20">
              <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-300/80">
                Al guardar, el costo de este ingrediente se recalculara automaticamente.
              </p>
            </div>
          )}

          {/* Lines */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--admin-text-muted)]" />
            </div>
          ) : (
            <div className="space-y-3">
              {lines.length === 0 && (
                <div className="py-8 text-center rounded-lg border border-dashed border-[var(--admin-border)]">
                  <GitBranch className="h-8 w-8 text-[#3a4150] mx-auto mb-2" />
                  <p className="text-sm text-[var(--admin-text-muted)]">
                    Este ingrediente no tiene sub-receta.
                  </p>
                  <p className="text-xs text-[var(--admin-text-faint)] mt-1">Es materia prima simple.</p>
                </div>
              )}

              {lines.map((line) => {
                const selectedIng = allIngredients.find((i) => i.id === line.child_ingredient_id)
                const optionsForThisLine = allIngredients.filter(
                  (i) =>
                    i.is_active &&
                    i.id !== ingredient.id &&
                    (!usedChildIds.has(i.id) || i.id === line.child_ingredient_id)
                )

                return (
                  <div
                    key={line.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-[var(--admin-surface-2)]/50 border border-[var(--admin-border)]"
                  >
                    {/* Ingredient selector */}
                    <Select
                      value={line.child_ingredient_id}
                      onValueChange={(v) => handleLineIngredientChange(line.id, v)}
                    >
                      <SelectTrigger className="flex-1 min-w-0 h-8 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-xs focus:ring-1 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50 [&_svg]:text-[var(--admin-text-muted)] [&_svg]:opacity-100">
                        <SelectValue>
                          {selectedIng?.name ?? 'Seleccionar...'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)]">
                        {optionsForThisLine.map((ing) => (
                          <SelectItem
                            key={ing.id}
                            value={ing.id}
                            className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] focus:text-[var(--admin-text)] hover:bg-[var(--admin-border)] cursor-pointer text-xs"
                          >
                            {ing.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Quantity input */}
                    <div className="w-20 shrink-0">
                      <Label className="sr-only">Cantidad</Label>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={line.quantity}
                        onChange={(e) => handleLineQuantityChange(line.id, e.target.value)}
                        placeholder="1"
                        className="h-8 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-xs text-center focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20"
                      />
                    </div>

                    {/* Unit selector */}
                    <Select
                      value={line.unit}
                      onValueChange={(v) => handleLineUnitChange(line.id, v)}
                    >
                      <SelectTrigger className="w-20 h-8 shrink-0 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-xs focus:ring-1 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50 [&_svg]:text-[var(--admin-text-muted)] [&_svg]:opacity-100 px-2">
                        <SelectValue>
                          {INGREDIENT_UNIT_ABBR[line.unit as IngredientUnit] ?? line.unit}
                        </SelectValue>
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

                    {/* Remove button */}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-red-500 hover:text-red-400 hover:bg-red-950/30"
                      onClick={() => handleRemoveLine(line.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}

              {/* Add line button */}
              {availableIngredients.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddLine}
                  className="w-full h-9 border-dashed border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] hover:border-[var(--admin-accent)]/40 text-sm gap-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar ingrediente
                </Button>
              )}

              {availableIngredients.length === 0 && lines.length > 0 && (
                <p className="text-xs text-[var(--admin-text-faint)] text-center">
                  No quedan ingredientes disponibles para agregar.
                </p>
              )}
            </div>
          )}

          {/* Footer actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-10 text-sm border-[#3a4150] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]"
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className={`flex-1 h-10 text-sm font-semibold transition-all duration-200 ${
                isSaving
                  ? 'bg-[var(--admin-text-placeholder)] text-[var(--admin-text-faint)] cursor-not-allowed shadow-none'
                  : 'bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black shadow-lg shadow-[var(--admin-accent)]/20'
              }`}
              disabled={isSaving || isLoading}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar sub-receta'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
