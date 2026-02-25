'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, formatPrice } from '@/lib/utils'
import type { PaymentMethod } from '@/lib/types/database'

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'Efectivo', icon: '💵' },
  { value: 'card', label: 'Tarjeta', icon: '💳' },
  { value: 'transfer', label: 'Transferencia', icon: '🏦' },
]

interface PaymentPanelProps {
  open: boolean
  total: number
  loading: boolean
  onClose: () => void
  onConfirm: (method: PaymentMethod) => void
}

export function PaymentPanel({
  open,
  total,
  loading,
  onClose,
  onConfirm,
}: PaymentPanelProps) {
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [cashReceived, setCashReceived] = useState('')

  const cashAmount = parseFloat(cashReceived) || 0
  const change = method === 'cash' ? cashAmount - total : 0

  const canConfirm =
    method !== 'cash' || cashAmount >= total

  const handleConfirm = () => {
    if (!canConfirm || loading) return
    onConfirm(method)
  }

  // Reset state when dialog opens
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
      <DialogContent className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#f0f2f5]">
            Cobrar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
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
                  <span className="text-3xl">{opt.icon}</span>
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
                {[Math.ceil(total / 1000) * 1000, Math.ceil(total / 5000) * 5000, Math.ceil(total / 10000) * 10000]
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
                  <p className="text-2xl font-bold">{formatPrice(Math.max(0, change))}</p>
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
