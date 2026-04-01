'use client'

import { useState } from 'react'
import {
  Loader2, ArrowLeft, CheckCircle, AlertTriangle,
  TrendingUp, TrendingDown,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { closeSession } from '@/app/actions/cash-register'
import { toast } from 'sonner'
import { cn, formatPrice } from '@/lib/utils'
import type { SessionSummary } from '@/lib/types/cash-register'

interface SessionCloseScreenProps {
  summary: SessionSummary
  openTablesCount?: number
  onBack: () => void
  onClosed: () => void
}

export function SessionCloseScreen({
  summary,
  openTablesCount = 0,
  onBack,
  onClosed,
}: SessionCloseScreenProps) {
  const hasOpenTables = openTablesCount > 0
  const [actualCash, setActualCash] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const s = summary.session
  const expectedCash = summary.currentCash
  const enteredCash = parseFloat(actualCash) || 0
  const difference = enteredCash - expectedCash
  const hasEntered = actualCash !== ''

  // Session duration
  const openedAt = new Date(s.opened_at)
  const now = new Date()
  const durationMs = now.getTime() - openedAt.getTime()
  const durationH = Math.floor(durationMs / 3600000)
  const durationM = Math.floor((durationMs % 3600000) / 60000)
  const durationStr = durationH > 0 ? `${durationH}h ${durationM}m` : `${durationM}m`
  const openedStr = openedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs'
  const nowStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs'

  // Ticket promedio
  const avgTicket = s.total_orders > 0 ? s.total_sales / s.total_orders : 0

  // Payment bars
  const total = s.total_sales || 1
  const cashPct   = Math.round((s.total_cash_sales / total) * 100)
  const cardPct   = Math.round((s.total_card_sales / total) * 100)
  const transf    = s.total_transfer_sales
  const transPct  = Math.round((transf / total) * 100)

  const handleClose = async () => {
    if (!hasEntered) { toast.error('Ingresa el efectivo contado'); return }
    setLoading(true)
    const { error } = await closeSession(s.id, {
      actual_cash: enteredCash,
      notes: notes || undefined,
    })
    setLoading(false)
    if (error) { toast.error(error); return }
    toast.success('Caja cerrada correctamente')
    onClosed()
  }

  return (
    <div className="h-full flex flex-col bg-[var(--admin-bg)]">

      {/* Top bar — Pencil style */}
      <div className="shrink-0 flex items-center justify-between px-8 border-b border-[var(--admin-sidebar-border)] bg-[var(--admin-sidebar-bg)]" style={{ height: 56 }}>
        {/* Left: logo + session */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--admin-accent)]">
            <span className="text-[13px] font-black text-black">QC</span>
          </div>
          <span className="text-[16px] font-bold text-[var(--admin-text)]">Que Copado</span>
          <div className="w-px h-5 bg-[var(--admin-border)]" />
          <span className="text-[13px] font-medium text-[var(--admin-text-muted)]">
            Sesión #{s.id.slice(-4).toUpperCase()}
          </span>
        </div>
        {/* Right: back */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[var(--admin-accent-text)] hover:opacity-80 transition-opacity cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-[13px] font-medium">Volver al POS</span>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto py-8 px-4 flex justify-center">
        <div className="w-full" style={{ maxWidth: 640 }}>

          {/* Card */}
          <div
            className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl overflow-hidden"
            style={{ boxShadow: 'var(--shadow-card-lg)' }}
          >
            {/* ── Card header ── */}
            <div className="flex items-center justify-between px-7 pt-6 pb-4">
              <h1 className="text-[22px] font-bold text-[var(--admin-text)]">Cierre de Sesión</h1>
              {hasOpenTables && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[11px] font-semibold text-amber-400">
                    {openTablesCount} mesa{openTablesCount > 1 ? 's' : ''} abierta{openTablesCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>

            <div className="h-px bg-[var(--admin-border)]" />

            {/* ── Time section ── */}
            <div className="px-7 py-5 space-y-3">
              <SectionLabel>Tiempo de sesión</SectionLabel>
              <div className="grid grid-cols-3 gap-2.5">
                <InfoCell label="Apertura" value={openedStr} />
                <InfoCell label="Cierre"   value={nowStr} />
                <InfoCell label="Duración" value={durationStr} accent />
              </div>
            </div>

            <div className="h-px bg-[var(--admin-border)]" />

            {/* ── Sales summary ── */}
            <div className="px-7 py-5 space-y-3">
              <SectionLabel>Resumen de ventas</SectionLabel>
              <div className="grid grid-cols-3 gap-2.5">
                <InfoCell label="Total ventas"   value={formatPrice(s.total_sales)}        accent large />
                <InfoCell label="Total pedidos"  value={s.total_orders.toString()}          large />
                <InfoCell label="Ticket promedio" value={formatPrice(avgTicket)}            large />
              </div>
            </div>

            <div className="h-px bg-[var(--admin-border)]" />

            {/* ── Payment methods ── */}
            <div className="px-7 py-5 space-y-3">
              <SectionLabel>Métodos de pago</SectionLabel>
              <div className="space-y-3">
                <PayBar
                  label="Efectivo"
                  value={s.total_cash_sales}
                  pct={cashPct}
                  color="bg-green-500"
                  textColor="text-green-400"
                />
                <PayBar
                  label="Tarjeta"
                  value={s.total_card_sales}
                  pct={cardPct}
                  color="bg-blue-500"
                  textColor="text-blue-400"
                />
                <PayBar
                  label="Transferencia / MP"
                  value={transf}
                  pct={transPct}
                  color="bg-amber-500"
                  textColor="text-amber-400"
                />
              </div>
            </div>

            <div className="h-px bg-[var(--admin-border)]" />

            {/* ── Movements ── */}
            {(s.total_deposits > 0 || s.total_withdrawals > 0) && (
              <>
                <div className="px-7 py-5 space-y-3">
                  <SectionLabel>Movimientos de caja</SectionLabel>
                  <div className="space-y-2">
                    {s.total_deposits > 0 && (
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[var(--admin-surface-2)] border border-[var(--admin-border)]">
                        <div className="flex items-center gap-2.5">
                          <TrendingUp className="h-4 w-4 text-green-400 shrink-0" />
                          <span className="text-[13px] text-[var(--admin-text)]">Ingresos</span>
                        </div>
                        <span className="text-[13px] font-semibold text-green-400">+{formatPrice(s.total_deposits)}</span>
                      </div>
                    )}
                    {s.total_withdrawals > 0 && (
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[var(--admin-surface-2)] border border-[var(--admin-border)]">
                        <div className="flex items-center gap-2.5">
                          <TrendingDown className="h-4 w-4 text-red-400 shrink-0" />
                          <span className="text-[13px] text-[var(--admin-text)]">Retiros</span>
                        </div>
                        <span className="text-[13px] font-semibold text-red-400">-{formatPrice(s.total_withdrawals)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="h-px bg-[var(--admin-border)]" />
              </>
            )}

            {/* ── Conciliación de efectivo ── */}
            <div className="px-7 py-5 space-y-3">
              <SectionLabel>Conciliación de efectivo</SectionLabel>

              {/* Esperado */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[var(--admin-surface-2)] border border-[var(--admin-border)]">
                <span className="text-[13px] text-[var(--admin-text-muted)]">Efectivo esperado</span>
                <span className="text-[16px] font-bold tabular-nums text-[var(--admin-text)]">{formatPrice(expectedCash)}</span>
              </div>

              {/* Contado — input */}
              <div className="relative flex items-center rounded-xl bg-[var(--admin-surface-2)] border border-[var(--admin-accent)]/40" style={{ height: 40 }}>
                <span className="absolute left-3 text-[13px] font-medium text-[var(--admin-text-muted)]">Efectivo contado</span>
                <Input
                  type="number"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  placeholder="0"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleClose()}
                  className="absolute inset-0 bg-transparent border-0 text-right font-bold text-[16px] text-[var(--admin-text)] px-3 focus:ring-0 focus-visible:ring-0 shadow-none"
                />
              </div>

              {/* Diferencia */}
              {hasEntered && (
                <div className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl border',
                  difference === 0
                    ? 'bg-green-500/10 border-green-500/25 text-green-400'
                    : difference > 0
                      ? 'bg-blue-500/10 border-blue-500/25 text-blue-400'
                      : 'bg-red-500/10 border-red-500/25 text-red-400'
                )}>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span className="text-[13px] font-semibold">
                      {difference === 0 ? 'Diferencia' : difference > 0 ? 'Sobrante' : 'Faltante'}
                    </span>
                  </div>
                  <span className="text-[16px] font-bold tabular-nums">
                    {difference === 0
                      ? formatPrice(0)
                      : `${difference > 0 ? '+' : ''}${formatPrice(difference)}`}
                  </span>
                </div>
              )}
            </div>

            <div className="h-px bg-[var(--admin-border)]" />

            {/* ── Notes ── */}
            <div className="px-7 py-5 space-y-2">
              <span className="text-[13px] font-semibold text-[var(--admin-text-muted)]">Notas de cierre</span>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agregar observaciones del turno..."
                className="bg-[var(--admin-surface-2)] border-[var(--admin-border)] text-[var(--admin-text)] text-[13px] h-12 rounded-xl placeholder:text-[var(--admin-text-placeholder)] focus:border-[var(--admin-accent)]/50"
              />
            </div>

            {/* ── Buttons — Pencil: Cancelar outlined + Confirmar gold ── */}
            <div className="flex items-center justify-end gap-3 px-7 pb-7">
              <button
                onClick={onBack}
                className="h-11 px-6 rounded-xl border border-[var(--admin-border)] text-[14px] font-semibold text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:border-[var(--admin-text-placeholder)] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleClose}
                disabled={loading || !hasEntered || hasOpenTables}
                className="h-11 px-6 rounded-xl bg-[var(--admin-accent)] text-black text-[14px] font-bold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:brightness-95 transition-all cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    Confirmar Cierre
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--admin-text-faint)]">
      {children}
    </p>
  )
}

function InfoCell({
  label, value, accent, large,
}: {
  label: string
  value: string
  accent?: boolean
  large?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl px-3 py-2.5">
      <span className="text-[11px] font-medium text-[var(--admin-text-faint)]">{label}</span>
      <span className={cn(
        'font-bold tabular-nums leading-tight',
        large ? 'text-[20px]' : 'text-[15px]',
        accent ? 'text-[var(--admin-accent-text)]' : 'text-[var(--admin-text)]'
      )}>
        {value}
      </span>
    </div>
  )
}

function PayBar({
  label, value, pct, color, textColor,
}: {
  label: string
  value: number
  pct: number
  color: string
  textColor: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-[var(--admin-text)]">{label}</span>
        <span className={cn('text-[13px] font-semibold tabular-nums', textColor)}>
          {formatPrice(value)} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}
