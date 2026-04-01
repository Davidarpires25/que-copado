'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, PackagePlus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { registerPurchase } from '@/app/actions/stock'
import { toast } from 'sonner'
import { INGREDIENT_UNIT_ABBR, type IngredientUnit } from '@/lib/types/database'
import type { IngredientWithStock } from '@/lib/types/stock'

interface PurchaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredients: IngredientWithStock[]
}

interface PurchaseLine {
  id: string
  ingredient_id: string
  quantity: string
  cost_per_unit: string
}

const EMPTY_LINE = (): PurchaseLine => ({
  id: crypto.randomUUID(),
  ingredient_id: '',
  quantity: '',
  cost_per_unit: '',
})

export function PurchaseDialog({ open, onOpenChange, ingredients }: PurchaseDialogProps) {
  const router = useRouter()
  const [lines, setLines] = useState<PurchaseLine[]>([EMPTY_LINE()])
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const addLine = () => setLines((prev) => [...prev, EMPTY_LINE()])

  const removeLine = (id: string) => {
    if (lines.length === 1) return
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  const updateLine = (id: string, field: keyof PurchaseLine, value: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    )
  }

  const isValid = () => {
    return lines.every(
      (l) =>
        l.ingredient_id &&
        l.quantity &&
        parseFloat(l.quantity) > 0
    )
  }

  const handleSubmit = async () => {
    if (!isValid()) {
      toast.error('Completá todos los campos de ingrediente y cantidad')
      return
    }

    setLoading(true)
    const result = await registerPurchase({
      items: lines.map((l) => ({
        ingredient_id: l.ingredient_id,
        quantity: parseFloat(l.quantity),
        cost_per_unit: l.cost_per_unit ? parseFloat(l.cost_per_unit) : undefined,
      })),
      reason: reason.trim() || 'Compra de mercadería',
    })
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(`Compra registrada — ${lines.length} ítem${lines.length !== 1 ? 's' : ''} actualizados`)
    onOpenChange(false)
    setLines([EMPTY_LINE()])
    setReason('')
    router.refresh()
  }

  const getUnitAbbr = (ingredientId: string) => {
    const ing = ingredients.find((i) => i.id === ingredientId)
    if (!ing) return ''
    return INGREDIENT_UNIT_ABBR[ing.unit as IngredientUnit] ?? ing.unit
  }

  const handleClose = () => {
    onOpenChange(false)
    setLines([EMPTY_LINE()])
    setReason('')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] max-w-lg max-h-[85vh] overflow-y-auto shadow-xl shadow-black/10">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[var(--admin-text)] flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-[var(--admin-accent-text)]" />
            Registrar Compra
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-[var(--admin-text-muted)]">
            Registrá los ingredientes comprados para incrementar el stock automáticamente.
          </p>

          {/* Lines */}
          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div key={line.id} className="flex gap-2 items-start p-3 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)]">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs text-[var(--admin-text-muted)] font-medium">Ítem {idx + 1}</span>
                  </div>
                  {/* Ingredient select */}
                  <Select
                    value={line.ingredient_id}
                    onValueChange={(v) => updateLine(line.id, 'ingredient_id', v)}
                  >
                    <SelectTrigger className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] h-8 text-sm focus:border-[var(--admin-accent)]/50">
                      <SelectValue placeholder="Seleccionar ingrediente..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)] max-h-52">
                      {ingredients.map((ing) => (
                        <SelectItem key={ing.id} value={ing.id} className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] text-sm">
                          {ing.name}{' '}
                          <span className="text-[var(--admin-text-muted)]">
                            ({INGREDIENT_UNIT_ABBR[ing.unit as IngredientUnit] ?? ing.unit})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Quantity + cost row */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.id, 'quantity', e.target.value)}
                          placeholder="Cantidad"
                          className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] h-8 text-sm focus:border-[var(--admin-accent)]/50 pr-8"
                        />
                        {line.ingredient_id && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--admin-text-muted)]">
                            {getUnitAbbr(line.ingredient_id)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--admin-text-muted)]">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.cost_per_unit}
                          onChange={(e) => updateLine(line.id, 'cost_per_unit', e.target.value)}
                          placeholder="Costo/u (opcional)"
                          className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] h-8 text-sm focus:border-[var(--admin-accent)]/50 pl-5"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {lines.length > 1 && (
                  <button
                    onClick={() => removeLine(line.id)}
                    className="mt-6 p-1.5 text-[var(--admin-text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add line */}
          <Button
            variant="ghost"
            onClick={addLine}
            className="w-full border border-dashed border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-accent-text)] hover:border-[var(--admin-accent)]/40 hover:bg-[var(--admin-accent)]/5 h-9"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar ingrediente
          </Button>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-[var(--admin-text-muted)] text-sm">Descripción / Nota (opcional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Compra semanal de mercadería"
              rows={2}
              className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] resize-none focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 placeholder:text-[#4a5568]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
            className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !isValid()}
            className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold disabled:opacity-50"
          >
            {loading ? 'Registrando...' : `Registrar compra (${lines.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
