'use client'

import { Receipt, Wallet, LayoutGrid, ArrowLeftRight, LogOut } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { CashRegisterSession } from '@/lib/types/cash-register'

interface SessionStatusBarProps {
  session: CashRegisterSession
  currentCash: number
  openTablesCount?: number
  onMovement: () => void
  onCloseSession: () => void
}

export function SessionStatusBar({
  session,
  currentCash,
  openTablesCount = 0,
  onMovement,
  onCloseSession,
}: SessionStatusBarProps) {
  return (
    <div className="flex items-center justify-between px-4 lg:px-6 shrink-0 overflow-x-auto scrollbar-hide bg-[var(--admin-sidebar-bg)] border-t border-[var(--admin-border)]"
         style={{ height: 48 }}>
      {/* Left: stats inline — Pencil style */}
      <div className="flex items-center gap-5 shrink-0">
        <div className="flex items-center gap-1.5 text-[var(--admin-text-muted)]">
          <Receipt className="h-3.5 w-3.5" />
          <span className="text-[13px]">
            Ventas:{' '}
            <span className="font-semibold text-[var(--admin-text)] tabular-nums">
              {session.total_orders}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[var(--admin-text-muted)]">
          <Wallet className="h-3.5 w-3.5" />
          <span className="text-[13px]">
            Efectivo:{' '}
            <span className="font-semibold text-[var(--admin-text)] tabular-nums">
              {formatPrice(currentCash)}
            </span>
          </span>
        </div>
        {openTablesCount > 0 && (
          <div className="flex items-center gap-1.5 text-[var(--admin-text-muted)] hidden sm:flex">
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="text-[13px]">
              Mesas:{' '}
              <span className="font-semibold text-[var(--admin-text)] tabular-nums">
                {openTablesCount}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Right: action buttons — outlined, Pencil style */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onMovement}
          className="flex items-center gap-1.5 px-3 rounded-md text-[12px] font-medium transition-colors cursor-pointer text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] bg-[var(--admin-bg)] border border-[var(--admin-border)] hover:border-[var(--admin-text-placeholder)]"
          style={{ height: 32 }}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Movimiento de Caja</span>
          <span className="sm:hidden">Movimiento</span>
        </button>
        <button
          onClick={onCloseSession}
          className="flex items-center gap-1.5 px-3 rounded-md text-[12px] font-medium transition-colors cursor-pointer text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 hover:border-red-500/30"
          style={{ height: 32 }}
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Cerrar Caja</span>
        </button>
      </div>
    </div>
  )
}
