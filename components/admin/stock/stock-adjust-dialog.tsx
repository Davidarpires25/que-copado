'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { adjustStock, updateMinStock, getCompraHabitual } from '@/app/actions/stock'
import { toast } from 'sonner'

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

/**
 * Dos intenciones, no tres tipos de movimiento:
 *  - correct: el usuario contó y escribe el stock REAL; el delta lo calcula el sistema.
 *  - waste:   se perdió producto; el usuario escribe cuánto y siempre resta.
 */
type Mode = 'correct' | 'waste'

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: 'correct', label: 'Ajuste manual' },
  { value: 'waste', label: 'Merma / Desperdicio' },
]

const DEFAULT_ADJUSTMENT_REASON = 'Recuento de inventario'

/** Evita que 14.12 - 13.82 quede en 0.30000000000000004 al viajar al server. */
const round3 = (value: number) => Math.round(value * 1000) / 1000

const formatQty = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2))

export function StockAdjustDialog({
  open,
  onOpenChange,
  targetType,
  item,
  onAdjusted,
}: StockAdjustDialogProps) {
  const [mode, setMode] = useState<Mode>('correct')
  const [realStockStr, setRealStockStr] = useState(String(item.current_stock))
  const [wasteQtyStr, setWasteQtyStr] = useState('')
  const [reason, setReason] = useState('')
  const [minStockStr, setMinStockStr] = useState(
    item.min_stock !== null ? String(item.min_stock) : ''
  )
  const [loading, setLoading] = useState(false)

  /**
   * De a cuanto se compra esto, para poder avisar si el minimo es absurdo.
   *
   * Se pide al abrir el dialogo y no mientras se escribe: es un viaje solo, y
   * asi el aviso esta listo antes de que alguien termine de tipear.
   */
  const [compraHabitual, setCompraHabitual] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    let vigente = true
    getCompraHabitual(targetType, item.id).then((r) => {
      if (vigente) setCompraHabitual(r.data)
    })
    return () => {
      vigente = false
    }
  }, [open, targetType, item.id])

  // --- Modo corregir ---------------------------------------------------------
  const realStock = parseFloat(realStockStr)
  const hasRealStock = realStockStr !== '' && !isNaN(realStock)
  const delta = hasRealStock ? round3(realStock - item.current_stock) : 0

  /**
   * Un minimo desproporcionado respecto de lo que entra en una compra.
   *
   * Diez veces es el corte, elegido mirando los dos casos reales: muzzarella
   * tenia un minimo 156 veces su compra habitual y Tybo catorce. Un minimo
   * legitimo de tres o cuatro compras --querer tener el deposito lleno-- no
   * dispara nada.
   */
  const minStock = parseFloat(minStockStr)
  const minStockPedido = minStockStr === '' ? null : isNaN(minStock) ? item.min_stock : minStock
  const cambioElMinimo = mode === 'correct' && minStockPedido !== item.min_stock
  const minimoAbsurdo =
    minStockStr !== '' &&
    !isNaN(minStock) &&
    compraHabitual !== null &&
    compraHabitual > 0 &&
    minStock > compraHabitual * 10

  // --- Modo merma ------------------------------------------------------------
  const wasteQty = parseFloat(wasteQtyStr)
  const hasWasteQty = wasteQtyStr !== '' && !isNaN(wasteQty) && wasteQty > 0
  const wastePreview = hasWasteQty
    ? round3(item.current_stock - Math.abs(wasteQty))
    : item.current_stock

  /**
   * Alcanza con haber cambiado algo: el stock **o** el minimo.
   *
   * Antes pedia `delta !== 0`, asi que para tocar solo el minimo habia que
   * inventar un cambio de stock. David: *"intente cambiar el minimo desde la
   * tabla pero no me dejaba, me obliga a cambiar el stock"*. El minimo no es
   * stock: es la regla que decide cuando avisar, y cambiarla no deberia dejar
   * un movimiento en el historial --que es justo el historial con el que se
   * reconstruyen los faltantes--.
   */
  const canSubmit =
    mode === 'correct'
      ? hasRealStock && realStock >= 0 && (delta !== 0 || cambioElMinimo)
      : hasWasteQty && reason.trim() !== ''

  const handleSubmit = async () => {
    if (mode === 'correct') {
      if (!hasRealStock || realStock < 0) {
        toast.error('Ingresá el stock real (0 o más)')
        return
      }
      if (delta === 0 && !cambioElMinimo) {
        toast.error('No cambiaste nada')
        return
      }
    } else {
      if (!hasWasteQty) {
        toast.error('Ingresá una cantidad válida mayor a 0')
        return
      }
      if (!reason.trim()) {
        toast.error('El motivo es obligatorio')
        return
      }
    }

    setLoading(true)

    const newMinStock = minStockPedido
    const minStockChanged = cambioElMinimo

    const newStock = mode === 'correct' ? realStock : wastePreview

    // Sin cambio de stock no se toca el stock: un ajuste de cero seria una
    // fila de ruido en el historial de movimientos.
    const hayAjuste = mode === 'waste' || delta !== 0

    const [adjustResult, minStockResult] = await Promise.all([
      hayAjuste
        ? adjustStock({
            type: targetType,
            id: item.id,
            quantity: mode === 'correct' ? delta : -Math.abs(wasteQty),
            movement_type: mode === 'correct' ? 'adjustment' : 'waste',
            reason: reason.trim() || DEFAULT_ADJUSTMENT_REASON,
          })
        : Promise.resolve({ data: null, error: null }),
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

    toast.success(
      mode === 'waste'
        ? 'Merma registrada'
        : hayAjuste
          ? minStockChanged
            ? 'Stock y mínimo actualizados'
            : 'Stock corregido'
          : 'Mínimo actualizado'
    )
    onAdjusted(newStock, minStockChanged ? newMinStock : item.min_stock)
    onOpenChange(false)
    setWasteQtyStr('')
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
              {formatQty(item.current_stock)} {item.unit}
            </span>
          </div>

          {/* Movement type */}
          <div className="space-y-1.5">
            <Label className="text-[var(--admin-text-muted)] text-sm">Tipo de movimiento</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <SelectTrigger className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] focus:border-[var(--admin-accent)]/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)]">
                {MODE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-[var(--admin-text)] focus:bg-[var(--admin-border)]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === 'correct' ? (
            <>
              {/* Stock real contado */}
              <div className="space-y-1.5">
                <Label className="text-[var(--admin-text-muted)] text-sm">
                  Stock real ({item.unit})
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  autoFocus
                  onFocus={(e) => e.currentTarget.select()}
                  value={realStockStr}
                  onChange={(e) => setRealStockStr(e.target.value)}
                  placeholder="0"
                  className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                />
                <p className="text-xs text-[var(--admin-text-muted)]">
                  Escribí la cantidad que contaste. El sistema calcula la diferencia.
                </p>
                {hasRealStock && realStock >= 0 && (
                  <p className="text-sm text-[var(--admin-text-muted)]">
                    {delta === 0 ? (
                      'El stock ya es ese valor.'
                    ) : (
                      <>
                        Diferencia:{' '}
                        <span
                          className={`font-bold ${
                            delta < 0
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-green-700 dark:text-green-400'
                          }`}
                        >
                          {delta > 0 ? '+' : '−'}
                          {formatQty(Math.abs(delta))} {item.unit}
                        </span>
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Min stock */}
              <div className="space-y-1.5">
                <Label htmlFor="stock-minimo" className="text-[var(--admin-text-muted)] text-sm">
                  Stock mínimo (opcional)
                </Label>
                <Input
                  id="stock-minimo"
                  type="number"
                  min="0"
                  step="0.01"
                  value={minStockStr}
                  onChange={(e) => setMinStockStr(e.target.value)}
                  placeholder="Sin mínimo"
                  className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                />
                {minimoAbsurdo ? (
                  /* El error que motivo esto: `Queso muzzarela` tenia un minimo
                     de 1000 kg --mil kilos-- y avisaba "stock bajo" todos los
                     dias. Una alerta siempre encendida deja de ser una alerta.
                     Se muestra lo que el numero implica, no un reto: la cuenta
                     la hace quien la esta cargando. */
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Son{' '}
                    <strong>{formatQty(Math.round(minStock / compraHabitual!))} veces</strong>{' '}
                    lo que solés comprar de una vez ({formatQty(compraHabitual!)} {item.unit}).
                    Con este mínimo va a avisar siempre.
                  </p>
                ) : (
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    Se mostrará una alerta cuando el stock caiga por debajo de este valor.
                  </p>
                )}
              </div>

              {/* Reason — opcional */}
              <div className="space-y-1.5">
                <Label className="text-[var(--admin-text-muted)] text-sm">Motivo (opcional)</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={DEFAULT_ADJUSTMENT_REASON}
                  rows={2}
                  className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] resize-none focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 placeholder:text-[var(--admin-text-muted)]"
                />
              </div>
            </>
          ) : (
            <>
              {/* Cantidad perdida */}
              <div className="space-y-1.5">
                <Label className="text-[var(--admin-text-muted)] text-sm">
                  Cantidad perdida ({item.unit})
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--admin-text-muted)]">
                    −
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    autoFocus
                    value={wasteQtyStr}
                    onChange={(e) => setWasteQtyStr(e.target.value)}
                    placeholder="0"
                    className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] pl-7 focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                  />
                </div>
                {hasWasteQty && (
                  <p className="text-sm font-bold text-[var(--admin-text-muted)]">
                    Nuevo stock:{' '}
                    <span
                      className={`font-bold ${
                        wastePreview < 0 ? 'text-red-700 dark:text-red-400' : 'text-[var(--admin-price)]'
                      }`}
                    >
                      {formatQty(wastePreview)} {item.unit}
                    </span>
                  </p>
                )}
              </div>

              {/* Reason — obligatorio */}
              <div className="space-y-1.5">
                <Label className="text-[var(--admin-text-muted)] text-sm">Motivo *</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Se quemó en la plancha"
                  rows={2}
                  className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] resize-none focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 placeholder:text-[var(--admin-text-muted)]"
                />
              </div>
            </>
          )}
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
            disabled={loading || !canSubmit}
            className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Confirmar ajuste'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
