'use client'

import { useState } from 'react'
import { DollarSign, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { openSession } from '@/app/actions/cash-register'
import { toast } from 'sonner'
import type { CashRegisterSession } from '@/lib/types/cash-register'

interface SessionOpenScreenProps {
  onSessionOpened: (session: CashRegisterSession) => void
}

export function SessionOpenScreen({ onSessionOpened }: SessionOpenScreenProps) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const handleOpen = async () => {
    const balance = parseFloat(amount) || 0
    if (balance < 0) {
      toast.error('El monto no puede ser negativo')
      return
    }

    setLoading(true)
    const { data, error } = await openSession({ opening_balance: balance })
    setLoading(false)

    if (error) {
      toast.error(error)
      return
    }

    if (data) {
      toast.success('Caja abierta')
      onSessionOpened(data)
    }
  }

  return (
    <div className="h-full bg-[#1a1d24] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#FEC501]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#FEC501]/20">
            <Lock className="h-10 w-10 text-[#FEC501]" />
          </div>
          <h1 className="text-3xl font-bold text-[#f0f2f5]">Abrir Caja</h1>
          <p className="text-[#a8b5c9] mt-2 text-base">
            Ingresa el monto inicial en efectivo para comenzar
          </p>
        </div>

        <div className="bg-[#12151a] border border-[#2a2f3a] rounded-xl p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#a8b5c9]">
              Monto inicial en caja
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#a8b5c9]" />
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] text-2xl h-16 pl-10 text-center font-bold placeholder:text-[#3a3f4a] focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleOpen()}
              />
            </div>
          </div>

          <Button
            onClick={handleOpen}
            disabled={loading}
            className="w-full h-14 bg-[#FEC501] hover:bg-[#E5B001] text-black font-bold text-lg shadow-lg shadow-[#FEC501]/25 active:scale-95 transition-transform"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Abrir Caja'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
