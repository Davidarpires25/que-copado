'use client'

import { useEffect, useState } from 'react'
import { Menu, ArrowUpDown, LogOut } from 'lucide-react'
import { formatPrice, cn } from '@/lib/utils'
import type { CashRegisterSession } from '@/lib/types/cash-register'

/** A partir de acá el turno lleva demasiado abierto y conviene avisarlo. */
const TURNO_LARGO_MIN = 8 * 60

interface ShiftBarProps {
  session: CashRegisterSession
  /** Efectivo que deberia haber en la caja ahora. Distinto de lo vendido. */
  currentCash: number
  openTablesCount?: number
  onMovement: () => void
  onCloseSession: () => void
  onOpenMenu?: () => void
}

/**
 * Estado del turno en una sola banda.
 *
 * Antes esto vivia partido en dos: la barra superior mostraba "Caja Abierta" y
 * el total vendido, y una barra al pie mostraba ventas, efectivo y mesas. Eran
 * datos del mismo objeto separados por toda la altura de la pantalla, y ademas
 * "vendido" arriba y "Efectivo" abajo son dos montos distintos que se prestaban
 * a confusion.
 */
export function ShiftBar({
  session,
  currentCash,
  openTablesCount = 0,
  onMovement,
  onCloseSession,
  onOpenMenu,
}: ShiftBarProps) {
  const minutos = useElapsedMinutes(session.opened_at)
  const turnoLargo = minutos >= TURNO_LARGO_MIN
  const requiereAtencion = openTablesCount > 0 || turnoLargo

  return (
    <div className="shrink-0 flex items-center gap-4 px-3 lg:px-4 h-[52px] bg-[var(--admin-sidebar-bg)] border-b border-[var(--admin-border)] overflow-x-auto scrollbar-hide">
      {onOpenMenu && (
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir menú"
          className="lg:hidden shrink-0 grid h-8 w-8 place-items-center rounded-md text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)] transition-colors cursor-pointer"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}

      {/* Semáforo + tiempo. El color dice si algo pide atención, no solo que
          hay una caja abierta. */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={cn(
            'h-2 w-2 rounded-full shrink-0',
            requiereAtencion ? 'bg-amber-500' : 'bg-emerald-500'
          )}
        />
        <span className="text-[13px] font-semibold text-[var(--admin-text)] whitespace-nowrap">
          Turno #{session.id.slice(-4).toUpperCase()}
        </span>
        <span
          className={cn(
            'text-[12px] tabular-nums whitespace-nowrap',
            turnoLargo ? 'text-amber-700 dark:text-amber-400 font-medium' : 'text-[var(--admin-text-muted)]'
          )}
          title={turnoLargo ? 'El turno lleva más de 8 horas abierto' : undefined}
        >
          {formatElapsed(minutos)}
        </span>
      </div>

      <Divider />

      <Metric label="Vendido" value={formatPrice(session.total_sales)} strong />
      <Metric label="En caja" value={formatPrice(currentCash)} hint="Efectivo que debería haber ahora" />
      <Metric label="Operaciones" value={String(session.total_orders)} />
      <Metric
        label="Mesas"
        value={String(openTablesCount)}
        warn={openTablesCount > 0}
        hint={openTablesCount > 0 ? 'Hay mesas sin cobrar' : undefined}
      />

      <div className="flex-1 min-w-2" />

      <button
        type="button"
        onClick={onMovement}
        className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium border border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:border-[var(--admin-text-placeholder)] transition-colors cursor-pointer"
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
        title={openTablesCount > 0 ? `${openTablesCount} mesa(s) sin cobrar` : undefined}
        className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium border border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/40 transition-colors cursor-pointer"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Cerrar Caja</span>
      </button>
    </div>
  )
}

// ─── Piezas ──────────────────────────────────────────────────────────────────

function Divider() {
  return <span className="shrink-0 h-5 w-px bg-[var(--admin-border)]" />
}

function Metric({
  label, value, strong, warn, hint,
}: {
  label: string
  value: string
  strong?: boolean
  warn?: boolean
  hint?: string
}) {
  return (
    <div className="flex items-baseline gap-1.5 shrink-0" title={hint}>
      <span className="text-[11px] text-[var(--admin-text-muted)] whitespace-nowrap">{label}</span>
      <span
        className={cn(
          'tabular-nums whitespace-nowrap font-semibold',
          strong ? 'text-[15px]' : 'text-[13px]',
          warn ? 'text-amber-700 dark:text-amber-400' : 'text-[var(--admin-text)]'
        )}
      >
        {value}
      </span>
    </div>
  )
}

// ─── Tiempo transcurrido ─────────────────────────────────────────────────────

/**
 * Minutos desde que se abrio el turno, refrescados cada minuto.
 *
 * El valor inicial se calcula en un efecto y no en el render para no romper la
 * hidratacion: el server y el cliente no comparten reloj.
 */
function useElapsedMinutes(openedAt: string): number {
  const [minutos, setMinutos] = useState(0)

  useEffect(() => {
    const calcular = () =>
      setMinutos(Math.max(0, Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000)))

    calcular()
    const id = setInterval(calcular, 60_000)
    return () => clearInterval(id)
  }, [openedAt])

  return minutos
}

function formatElapsed(min: number): string {
  if (min < 60) return `${min}m`
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`
}
