'use client'

import { useState, useMemo } from 'react'
import { Loader2, ChevronsUp, ArrowRight, Tags } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { bulkUpdateCostByCategory } from '@/app/actions/ingredient-categories'
import { toast } from 'sonner'
import type { IngredientCategory, IngredientWithCategory } from '@/lib/types/database'
import { INGREDIENT_UNIT_ABBR, type IngredientUnit } from '@/lib/types/database'
import { formatCost } from '@/lib/constants/recipe-units'

type UpdateType = 'percentage' | 'fixed'

interface BulkPriceUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: IngredientCategory[]
  ingredients: IngredientWithCategory[]
  onUpdated: () => void
}

export function BulkPriceUpdateDialog({
  open,
  onOpenChange,
  categories,
  ingredients,
  onUpdated,
}: BulkPriceUpdateDialogProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [updateType, setUpdateType] = useState<UpdateType>('percentage')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)

  const parsedValue = parseFloat(value)
  const isValidValue = !isNaN(parsedValue) && parsedValue > 0

  const affectedIngredients = useMemo(() => {
    if (!selectedCategoryId) return []
    return ingredients.filter(
      (i) => i.ingredient_categories?.id === selectedCategoryId
    )
  }, [selectedCategoryId, ingredients])

  const getNewCost = (currentCost: number): number => {
    if (!isValidValue) return currentCost
    if (updateType === 'percentage') {
      return currentCost * (1 + parsedValue / 100)
    }
    return currentCost + parsedValue
  }

  const handleConfirm = async () => {
    if (!selectedCategoryId || !isValidValue) return

    setLoading(true)
    try {
      const result = await bulkUpdateCostByCategory(selectedCategoryId, updateType, parsedValue)
      if (result.error) {
        toast.error(result.error)
        return
      }
      const updated = result.data?.updated ?? affectedIngredients.length
      toast.success(`${updated} ${updated === 1 ? 'ingrediente actualizado' : 'ingredientes actualizados'}`)
      onUpdated()
      handleReset()
      onOpenChange(false)
    } catch {
      toast.error('Ocurrio un error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSelectedCategoryId('')
    setUpdateType('percentage')
    setValue('')
  }

  const selectedCategoryName = categories.find((c) => c.id === selectedCategoryId)?.name

  const canConfirm = !!selectedCategoryId && isValidValue && affectedIngredients.length > 0 && !loading

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleReset(); onOpenChange(o) }}>
      <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] sm:max-w-lg shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[var(--admin-text)] flex items-center gap-2">
            <ChevronsUp className="h-5 w-5 text-[var(--admin-accent-text)]" />
            Actualizar Precios por Categoria
          </DialogTitle>
          <p className="text-[var(--admin-text-muted)] text-xs mt-0.5">
            Aplica un aumento porcentual o un monto fijo a todos los ingredientes de una categoria.
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Category selector */}
          <div className="space-y-1.5">
            <Label className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Categoria
            </Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 text-sm focus:ring-2 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50 data-[placeholder]:text-[var(--admin-text-muted)] [&_svg]:text-[var(--admin-text-muted)] [&_svg]:opacity-100">
                <SelectValue placeholder="Seleccionar categoria..." />
              </SelectTrigger>
              <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)]">
                {categories.map((cat) => (
                  <SelectItem
                    key={cat.id}
                    value={cat.id}
                    className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] focus:text-[var(--admin-text)] hover:bg-[var(--admin-border)] cursor-pointer"
                  >
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCategoryId && (
              <p className="text-[var(--admin-text-muted)] text-xs">
                {affectedIngredients.length === 0
                  ? 'No hay ingredientes en esta categoria'
                  : `${affectedIngredients.length} ${affectedIngredients.length === 1 ? 'ingrediente' : 'ingredientes'} seran afectados`}
              </p>
            )}
          </div>

          {/* Update type selector */}
          <div className="space-y-1.5">
            <Label className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Tipo de Actualizacion
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUpdateType('percentage')}
                className={`p-3 rounded-lg border text-sm font-medium transition-all text-left ${
                  updateType === 'percentage'
                    ? 'border-[var(--admin-accent)]/60 bg-[var(--admin-accent)]/10 text-[var(--admin-accent-text)]'
                    : 'border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text-muted)] hover:border-[var(--admin-accent)]/40 hover:text-[var(--admin-text)]'
                }`}
              >
                <span className="block text-base font-bold mb-0.5">%</span>
                <span className="text-sm">Porcentaje</span>
              </button>
              <button
                type="button"
                onClick={() => setUpdateType('fixed')}
                className={`p-3 rounded-lg border text-sm font-medium transition-all text-left ${
                  updateType === 'fixed'
                    ? 'border-[var(--admin-accent)]/60 bg-[var(--admin-accent)]/10 text-[var(--admin-accent-text)]'
                    : 'border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text-muted)] hover:border-[var(--admin-accent)]/40 hover:text-[var(--admin-text)]'
                }`}
              >
                <span className="block text-base font-bold mb-0.5">$</span>
                <span className="text-sm">Monto Fijo</span>
              </button>
            </div>
          </div>

          {/* Value input */}
          <div className="space-y-1.5">
            <Label htmlFor="bulk-value" className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              {updateType === 'percentage' ? 'Porcentaje de Aumento' : 'Monto a Sumar'}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] text-sm font-semibold">
                {updateType === 'percentage' ? '%' : '$'}
              </span>
              <Input
                id="bulk-value"
                type="number"
                step={updateType === 'percentage' ? '0.1' : '1'}
                min="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={updateType === 'percentage' ? '10' : '500'}
                className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 text-sm pl-8 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
              />
            </div>
            {updateType === 'percentage' && isValidValue && (
              <p className="text-[var(--admin-text-muted)] text-xs">
                Un aumento de {parsedValue}% sobre el costo actual de cada ingrediente.
              </p>
            )}
          </div>

          {/* Preview table */}
          {selectedCategoryId && isValidValue && affectedIngredients.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
                  Vista Previa — {selectedCategoryName}
                </Label>
                <span className="text-[var(--admin-accent-text)] text-xs font-medium">
                  +{updateType === 'percentage' ? `${parsedValue}%` : formatCost(parsedValue)} por ingrediente
                </span>
              </div>
              <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] overflow-hidden max-h-48 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-bg)]">
                      <TableHead className="text-[var(--admin-text-muted)] text-xs font-semibold py-2">Ingrediente</TableHead>
                      <TableHead className="text-[var(--admin-text-muted)] text-xs font-semibold py-2 text-right">Actual</TableHead>
                      <TableHead className="text-[var(--admin-text-muted)] text-xs font-semibold py-2 text-right">Nuevo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affectedIngredients.map((ing) => {
                      const newCost = getNewCost(ing.cost_per_unit)
                      const unitAbbr = INGREDIENT_UNIT_ABBR[ing.unit as IngredientUnit] ?? ing.unit
                      return (
                        <TableRow key={ing.id} className="border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)]">
                          <TableCell className="py-2 text-xs text-[var(--admin-text)]">
                            <span className="font-medium">{ing.name}</span>
                            <span className="text-[var(--admin-text-muted)] ml-1">/ {unitAbbr}</span>
                          </TableCell>
                          <TableCell className="py-2 text-xs text-right text-[var(--admin-text-muted)]">
                            {formatCost(ing.cost_per_unit)}
                          </TableCell>
                          <TableCell className="py-2 text-xs text-right">
                            <div className="flex items-center justify-end gap-1">
                              <ArrowRight className="h-3 w-3 text-[var(--admin-text-muted)]" />
                              <span className="text-[var(--admin-accent-text)] font-semibold">
                                {formatCost(newCost)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {selectedCategoryId && affectedIngredients.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-6">
              <Tags className="h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-400">
                No hay ingredientes en esta categoría para actualizar.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => { handleReset(); onOpenChange(false) }}
            className="flex-1 h-10 text-sm border-[#3a4150] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-1 h-10 text-sm font-semibold transition-all duration-200 ${
              canConfirm
                ? 'bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black shadow-lg shadow-[var(--admin-accent)]/20'
                : 'bg-[var(--admin-text-placeholder)] text-[var(--admin-text-faint)] cursor-not-allowed shadow-none'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Actualizando...
              </>
            ) : (
              `Confirmar${affectedIngredients.length > 0 ? ` (${affectedIngredients.length})` : ''}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
