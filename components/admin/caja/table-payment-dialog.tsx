'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { payTableOrder } from '@/app/actions/tables'
import type { PaymentMethod } from '@/lib/types/database'
import type { OrderWithItems, RestaurantTable } from '@/lib/types/tables'

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'Efectivo', icon: '$' },
  { value: 'card', label: 'Tarjeta', icon: 'T' },
  { value: 'transfer', label: 'Transferencia', icon: 'B' },
]

interface TablePaymentDialogProps {
  open: boolean
  order: OrderWithItems
  table: RestaurantTable
  sessionId: string
  onClose: () => void
  onPaid: () => void
}

export function TablePaymentDialog({
  open,
  order,
  table,
  sessionId,
  onClose,
  onPaid,
}: TablePaymentDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [loading, setLoading] = useState(false)

  const total = order.total
  const cashAmount = parseFloat(cashReceived) || 0
  const change = method === 'cash' ? cashAmount - total : 0

  const canConfirm = method !== 'cash' || cashAmount >= total

  const activeItems = order.order_items.filter(
    (item) => item.status !== 'cancelado'
  )

  const handleConfirm = async () => {
    if (!canConfirm || loading) return

    setLoading(true)
    const result = await payTableOrder(order.id, table.id, method, sessionId)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(`Mesa ${table.number} cobrada correctamente`)
    onPaid()
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose()
    } else {
      setMethod('cash')
      setCashReceived('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#f0f2f5]">
            Cobrar Mesa {table.number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Item breakdown */}
          <div className="bg-[#12151a] rounded-xl border border-[#2a2f3a] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#2a2f3a]">
              <p className="text-xs font-semibold text-[#a8b5c9] uppercase tracking-wider">
                Detalle del pedido
              </p>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {activeItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-4 py-2 border-b border-[#2a2f3a]/50 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#f0f2f5] truncate">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-[#6b7a8d]">
                      {item.quantity} x {formatPrice(item.product_price)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#f0f2f5] ml-3">
                    {formatPrice(item.product_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="text-center py-3 bg-[#12151a] rounded-xl border border-[#2a2f3a]">
            <p className="text-sm text-[#a8b5c9]">Total a cobrar</p>
            <p className="text-3xl font-bold text-[#FEC501]">
              {formatPrice(total)}
            </p>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#a8b5c9]">
              Metodo de pago
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setMethod(opt.value)
                    setCashReceived('')
                  }}
                  className={cn(
                    'flex flex-col items-center gap-2 py-4 rounded-xl border transition-all active:scale-95',
                    method === opt.value
                      ? 'bg-[#FEC501]/10 border-[#FEC501] text-[#FEC501] shadow-lg shadow-[#FEC501]/10'
                      : 'bg-[#12151a] border-[#2a2f3a] text-[#a8b5c9] hover:border-[#3a3f4a]'
                  )}
                >
                  <span className="text-2xl font-bold">{opt.icon}</span>
                  <span className="text-sm font-semibold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash calculation */}
          {method === 'cash' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[#a8b5c9]">
                  Recibido
                </label>
                <Input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="0"
                  className="bg-[#12151a] border-[#2a2f3a] text-[#f0f2f5] text-xl h-12 text-center font-bold placeholder:text-[#3a3f4a] focus:border-[#FEC501]/50"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                />
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2">
                {[
                  Math.ceil(total / 1000) * 1000,
                  Math.ceil(total / 5000) * 5000,
                  Math.ceil(total / 10000) * 10000,
                ]
                  .filter((v, i, a) => a.indexOf(v) === i && v >= total)
                  .slice(0, 3)
                  .map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setCashReceived(amount.toString())}
                      className="flex-1 py-2 rounded-lg bg-[#252a35] text-[#a8b5c9] text-sm font-medium hover:text-[#f0f2f5] hover:bg-[#2a2f3a] transition-colors"
                    >
                      {formatPrice(amount)}
                    </button>
                  ))}
              </div>

              {cashAmount > 0 && (
                <div
                  className={cn(
                    'text-center py-2 rounded-lg',
                    change >= 0
                      ? 'bg-green-950/30 text-green-400'
                      : 'bg-red-950/30 text-red-400'
                  )}
                >
                  <p className="text-sm">Vuelto</p>
                  <p className="text-2xl font-bold">
                    {formatPrice(Math.max(0, change))}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Confirm button */}
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className="w-full h-14 bg-green-600 hover:bg-green-500 text-white font-bold text-base disabled:opacity-40 active:scale-95 transition-transform shadow-lg shadow-green-600/20"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              `Confirmar ${PAYMENT_OPTIONS.find((o) => o.value === method)?.label}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
