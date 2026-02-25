'use client'

import { DollarSign, TrendingUp, ArrowDownCircle, ArrowUpCircle, XCircle, UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import type { CashRegisterSession } from '@/lib/types/cash-register'

interface SessionStatusBarProps {
  session: CashRegisterSession
  currentCash: number
  openTablesCount?: number
  onMovement: () => void
  onViewHistory: () => void
  onCloseSession: () => void
}

export function SessionStatusBar({
  session,
  currentCash,
  openTablesCount = 0,
  onMovement,
  onViewHistory,
  onCloseSession,
}: SessionStatusBarProps) {
  return (
    <div className="bg-[#1a1d24] border-t border-[#2a2f3a] px-4 py-3 shrink-0">
      <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
        {/* Sales */}
        <div className="flex items-center gap-2 shrink-0">
          <TrendingUp className="h-5 w-5 text-green-400" />
          <div>
            <p className="text-xs text-[#a8b5c9] leading-none font-medium">Ventas</p>
            <p className="text-base font-bold text-[#f0f2f5] mt-0.5">
              {formatPrice(session.total_sales)}
            </p>
          </div>
        </div>

        <div className="w-px h-10 bg-[#2a2f3a] shrink-0" />

        {/* Orders */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-[#FEC501]">#{session.total_orders}</span>
          <p className="text-xs text-[#a8b5c9] font-medium">ventas</p>
        </div>

        <div className="w-px h-10 bg-[#2a2f3a] shrink-0" />

        {/* Open tables */}
        {openTablesCount > 0 && (
          <>
            <div className="flex items-center gap-2 shrink-0">
              <UtensilsCrossed className="h-5 w-5 text-orange-400" />
              <div>
                <p className="text-xs text-[#a8b5c9] leading-none font-medium">Mesas</p>
                <p className="text-base font-bold text-orange-400 mt-0.5">
                  {openTablesCount}
                </p>
              </div>
            </div>
            <div className="w-px h-10 bg-[#2a2f3a] shrink-0" />
          </>
        )}

        {/* Cash in register */}
        <div className="flex items-center gap-2 shrink-0">
          <DollarSign className="h-5 w-5 text-[#FEC501]" />
          <div>
            <p className="text-xs text-[#a8b5c9] leading-none font-medium">Efectivo</p>
            <p className="text-base font-bold text-[#f0f2f5] mt-0.5">
              {formatPrice(currentCash)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMovement}
            className="text-[#a8b5c9] hover:text-[#f0f2f5] hover:bg-[#252a35] h-9 gap-2 text-sm px-3"
          >
            <ArrowDownCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Movimiento</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewHistory}
            className="text-[#a8b5c9] hover:text-[#f0f2f5] hover:bg-[#252a35] h-9 gap-2 text-sm px-3"
          >
            <ArrowUpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Ventas</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCloseSession}
            className="text-red-400 hover:text-red-300 hover:bg-red-950/30 h-9 gap-2 text-sm px-3"
          >
            <XCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Cerrar Caja</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
