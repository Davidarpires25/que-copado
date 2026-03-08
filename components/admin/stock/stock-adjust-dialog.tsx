'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { adjustStock, updateMinStock } from '@/app/actions/stock'
import { toast } from 'sonner'
import type { StockMovementType } from '@/lib/types/stock'

interface AdjustItem {
  id: string
  name: string
  unit: string
  current_stock: number
  min_stock: number | null
  stock_tracking_enabled: boolean
}

interface StockAdjustDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetType: 'ingredient' | 'product'
  item: AdjustItem
  onAdjusted: (newStock: number, newMinStock?: number | null) => void
}

const MOVEMENT_OPTIONS: { value: StockMovementType; label: string; sign: '+' | '-' }[] = [
  { value: 'adjustment', label: 'Ajuste manual', sign: '+' },
  { value: 'waste', label: 'Merma / Desperdicio', sign: '-' },
  { value: 'return', label: 'Devolución', sign: '+' },
]

export function StockAdjustDialog({
  open,
  onOpenChange,
  targetType,
  item,
  onAdjusted,
}: StockAdjustDialogProps) {
  const [movementType, setMovementType] = useState<StockMovementType>('adjustment')
  const [quantityStr, setQuantityStr] = useState('')
  const [reason, setReason] = useState('')
  const [minStockStr, setMinStockStr] = useState(
    item.min_stock !== null ? String(item.min_stock) : ''
  )
  const [loading, setLoading] = useState(false)

  const selectedOption = MOVEMENT_OPTIONS.find((o) => o.value === movementType)!
  const quantity = parseFloat(quantityStr)
  const isNegative = movementType === 'waste'
  const signedQuantity = isNegative ? -Math.abs(quantity) : Math.abs(quantity)
  const previewStock = isNaN(quantity) ? item.current_stock : item.current_stock + signedQuantity

  const handleSubmit = async () => {
    if (!quantityStr || isNaN(quantity) || quantity <= 0) {
      toast.error('Ingresá una cantidad válida mayor a 0')
      return
    }
    if (!reason.trim()) {
      toast.error('El motivo es obligatorio')
      return
    }

    setLoading(true)

    const parsedMinStock = minStockStr === '' ? null : parseFloat(minStockStr)
    const newMinStock = parsedMinStock !== null && isNaN(parsedMinStock) ? item.min_stock : parsedMinStock
    const minStockChanged = newMinStock !== item.min_stock

    const [adjustResult, minStockResult] = await Promise.all([
      adjustStock({
        type: targetType,
        id: item.id,
        quantity: signedQuantity,
        movement_type: movementType,
        reason: reason.trim(),
      }),
      minStockChanged ? updateMinStock(targetType, item.id, newMinStock) : Promise.resolve({ data: true, error: null }),
    ])

    setLoading(false)

    if (adjustResult.error) {
      toast.error(adjustResult.error)
      return
    }
    if (minStockResult.error) {
      toast.error(minStockResult.error)
      return
    }

    toast.success('Stock actualizado')
    onAdjusted(previewStock, newMinStock)
    onOpenChange(false)
    setQuantityStr('')
    setReason('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] max-w-md shadow-xl shadow-black/10">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[var(--admin-text)]">
            Ajustar stock — {item.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current stock display */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)]">
            <span className="text-sm text-[var(--admin-text-muted)]">Stock actual</span>
            <span className="font-semibold text-[var(--admin-text)]">
              {item.current_stock} {item.unit}
            </span>
          </div>

          {/* Movement type */}
          <div className="space-y-1.5">
            <Label className="text-[var(--admin-text-muted)] text-sm">Tipo de movimiento</Label>
            <Select value={movementType} onValueChange={(v) => setMovementType(v as StockMovementType)}>
              <SelectTrigger className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] focus:border-[var(--admin-accent)]/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)]">
                {MOVEMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-[var(--admin-text)] focus:bg-[var(--admin-border)]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label className="text-[var(--admin-text-muted)] text-sm">
              Cantidad ({item.unit})
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--admin-text-muted)]">
                {selectedOption.sign}
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={quantityStr}
                onChange={(e) => setQuantityStr(e.target.value)}
                placeholder="0"
                className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] pl-7 focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
              />
            </div>
            {!isNaN(quantity) && quantity > 0 && (
              <p className="text-xs text-[var(--admin-text-muted)]">
                Nuevo stock:{' '}
                <span className={`font-semibold ${previewStock < 0 ? 'text-red-400' : 'text-[var(--admin-accent-text)]'}`}>
                  {previewStock.toFixed(previewStock % 1 === 0 ? 0 : 2)} {item.unit}
                </span>
              </p>
            )}
          </div>

          {/* Min stock */}
          <div className="space-y-1.5">
            <Label className="text-[var(--admin-text-muted)] text-sm">Stock mínimo (opcional)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={minStockStr}
              onChange={(e) => setMinStockStr(e.target.value)}
              placeholder="Sin mínimo"
              className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
            />
            <p className="text-xs text-[var(--admin-text-muted)]">
              Se mostrará una alerta cuando el stock caiga por debajo de este valor.
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-[var(--admin-text-muted)] text-sm">Motivo *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Corrección de inventario físico"
              rows={2}
              className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] resize-none focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 placeholder:text-[#4a5568]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !quantityStr || !reason.trim()}
            className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Confirmar ajuste'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
