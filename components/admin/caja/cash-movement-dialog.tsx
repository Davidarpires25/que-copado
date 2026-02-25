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
import { cn } from '@/lib/utils'
import { createCashMovement } from '@/app/actions/cash-register'
import { toast } from 'sonner'
import type { CashMovementType } from '@/lib/types/database'

interface CashMovementDialogProps {
  open: boolean
  sessionId: string
  onClose: () => void
  onSuccess: () => void
}

export function CashMovementDialog({
  open,
  sessionId,
  onClose,
  onSuccess,
}: CashMovementDialogProps) {
  const [type, setType] = useState<CashMovementType>('withdrawal')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Ingresa un monto valido')
      return
    }
    if (!reason.trim()) {
      toast.error('Ingresa un motivo')
      return
    }

    setLoading(true)
    const { error } = await createCashMovement({
      session_id: sessionId,
      type,
      amount: parsedAmount,
      reason: reason.trim(),
    })
    setLoading(false)

    if (error) {
      toast.error(error)
      return
    }

    toast.success(type === 'withdrawal' ? 'Retiro registrado' : 'Ingreso registrado')
    setAmount('')
    setReason('')
    onSuccess()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#f0f2f5]">
            Movimiento de Caja
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setType('withdrawal')}
              className={cn(
                'py-2.5 rounded-xl text-sm font-medium transition-all border',
                type === 'withdrawal'
                  ? 'bg-red-500/10 border-red-500 text-red-400'
                  : 'bg-[#12151a] border-[#2a2f3a] text-[#a8b5c9] hover:border-[#3a3f4a]'
              )}
            >
              Retiro
            </button>
            <button
              onClick={() => setType('deposit')}
              className={cn(
                'py-2.5 rounded-xl text-sm font-medium transition-all border',
                type === 'deposit'
                  ? 'bg-green-500/10 border-green-500 text-green-400'
                  : 'bg-[#12151a] border-[#2a2f3a] text-[#a8b5c9] hover:border-[#3a3f4a]'
              )}
            >
              Ingreso
            </button>
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-[#a8b5c9]">Monto</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="bg-[#12151a] border-[#2a2f3a] text-[#f0f2f5] text-lg h-10 text-center font-bold placeholder:text-[#3a3f4a] focus:border-[#FEC501]/50"
              autoFocus
            />
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-[#a8b5c9]">Motivo</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Pago proveedor, cambio, etc."
              className="bg-[#12151a] border-[#2a2f3a] text-[#f0f2f5] text-sm h-10 placeholder:text-[#a8b5c9] focus:border-[#FEC501]/50"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className={cn(
              'w-full h-12 font-bold active:scale-95 transition-transform',
              type === 'withdrawal'
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20'
                : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/20'
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : type === 'withdrawal' ? (
              'Registrar Retiro'
            ) : (
              'Registrar Ingreso'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
