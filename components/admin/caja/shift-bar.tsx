'use client'

import { Menu, ArrowUpDown, LogOut } from 'lucide-react'
import { formatPrice, cn } from '@/lib/utils'
import type { CashRegisterSession } from '@/lib/types/cash-register'

interface ShiftBarProps {
  session: CashRegisterSession
  /** Efectivo que deberia haber en la caja ahora. Distinto de lo vendido. */
  currentCash: number
  /** Solo para avisar al intentar cerrar. No se muestra: ya esta en la pestaña Mesas. */
  openTablesCount?: number
  onMovement: () => void
  onCloseSession: () => void
  onOpenMenu?: () => void
}

/**
 * Estado del turno en una sola banda.
 *
 * Lleva unicamente lo que no se ve en ningun otro lado de la pantalla: que la
 * caja esta abierta, y los dos montos. Las operaciones y las mesas abiertas
 * viven en los contadores de las pestañas, treinta pixeles mas abajo.
 *
 * Tampoco lleva desde cuando esta abierta: durante el servicio nadie decide
 * nada distinto porque el turno lleve tres horas o cinco.
 */
export function ShiftBar({
  session,
  currentCash,
  openTablesCount = 0,
  onMovement,
  onCloseSession,
  onOpenMenu,
}: ShiftBarProps) {
  return (
    // En el celular, dos renglones: arriba el menu, el estado y las acciones;
    // abajo los montos. En uno solo no entraba y se deslizaba de costado,
    // dejando "Cerrar caja" fuera de la vista. Desde sm, la banda de siempre.
    <div className="shrink-0 flex flex-wrap items-center gap-x-3 px-3 py-1 sm:flex-nowrap sm:gap-4 sm:py-0 lg:px-4 sm:h-[52px] bg-[var(--admin-sidebar-bg)] border-b border-[var(--admin-border)] sm:overflow-x-auto scrollbar-hide">
      {onOpenMenu && (
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir menú"
          className="lg:hidden shrink-0 grid h-8 w-8 tactil:size-11 place-items-center rounded-md text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)] transition-colors cursor-pointer"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-center gap-2 shrink-0">
        <span className="h-2 w-2 rounded-full shrink-0 bg-emerald-500" />
        <span className="text-[13px] font-medium whitespace-nowrap text-[var(--admin-text)]">
          Caja abierta
        </span>
      </div>

      <Divider className="hidden sm:block" />

      <div className="order-last w-full flex items-center gap-4 pb-1.5 sm:order-none sm:w-auto sm:pb-0">
        <Metric label="Vendido" value={formatPrice(session.total_sales)} strong />
        <Metric label="En caja" value={formatPrice(currentCash)} hint="Efectivo que debería haber ahora" />
      </div>

      <div className="flex-1 min-w-2" />

      <button
        type="button"
        onClick={onMovement}
        className="shrink-0 inline-flex items-center gap-1.5 h-8 tactil:h-11 px-3 rounded-md text-[12px] font-medium border border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:border-[var(--admin-text-placeholder)] transition-colors cursor-pointer"
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Movimiento de Caja</span>
        <span className="sm:hidden">Movimiento</span>
      </button>

      <Divider />

      {/* Cerrar el turno es irreversible desde la interfaz, asi que no comparte
          jerarquia con registrar un movimiento. */}
      <button
        type="button"
        onClick={onCloseSession}
        aria-label="Cerrar caja"
        title={openTablesCount > 0 ? `${openTablesCount} mesa(s) sin cobrar` : undefined}
        className="shrink-0 inline-flex items-center justify-center gap-1.5 h-8 tactil:h-11 tactil:min-w-11 px-3 rounded-md text-[12px] font-medium border border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/40 transition-colors cursor-pointer"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Cerrar Caja</span>
      </button>
    </div>
  )
}

// ─── Piezas ──────────────────────────────────────────────────────────────────

function Divider({ className }: { className?: string }) {
  return <span className={cn('shrink-0 h-5 w-px bg-[var(--admin-border)]', className)} />
}

function Metric({
  label, value, strong, hint,
}: {
  label: string
  value: string
  strong?: boolean
  hint?: string
}) {
  return (
    <div className="flex items-baseline gap-1.5 shrink-0" title={hint}>
      <span className="text-[11px] text-[var(--admin-text-muted)] whitespace-nowrap">{label}</span>
      <span
        className={cn(
          'tabular-nums whitespace-nowrap font-semibold text-[var(--admin-text)]',
          strong ? 'text-[15px]' : 'text-[13px]'
        )}
      >
        {value}
      </span>
    </div>
  )
}
