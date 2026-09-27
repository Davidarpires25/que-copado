'use client'

import { useState } from 'react'
import {
  Loader2, ArrowLeft, CheckCircle, AlertTriangle, Globe, Lock,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { closeSession } from '@/app/actions/cash-register'
import { toast } from 'sonner'
import { cn, formatPrice } from '@/lib/utils'
import type { SessionSummary } from '@/lib/types/cash-register'
import { parseARS } from '@/lib/utils/currency'
import { orderLabel } from '@/lib/utils/order-number'

/**
 * Lo que la caja sabe que sigue abierto al pedir el cierre. Los pedidos de
 * mostrador sin cobrar no van aca: vienen en `summary.orders`.
 */
export interface LoQueQuedaAbierto {
  mesas: { nombre: string; total: number }[]
  /** Pedidos web o de WhatsApp recibidos y sin cobrar: avisan, no bloquean. */
  remotosSinCobrar: number
}

interface SessionCloseScreenProps {
  summary: SessionSummary
  quedaAbierto: LoQueQuedaAbierto
  onBack: () => void
  onClosed: () => void
}

export function SessionCloseScreen({
  summary,
  quedaAbierto,
  onBack,
  onClosed,
}: SessionCloseScreenProps) {
  const [actualCash, setActualCash] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)

  const s = summary.session
  const expectedCash = summary.currentCash
  const enteredCash = parseARS(actualCash) ?? 0
  const difference = enteredCash - expectedCash
  const hasEntered = parseARS(actualCash) !== null

  // Lo que impide cerrar: la misma regla que aplica `closeSession`.
  const bloqueos = [
    ...quedaAbierto.mesas,
    ...summary.orders
      .filter((o) => o.order_type === 'mostrador' && (o.status === 'abierto' || o.status === 'cuenta_pedida'))
      .map((o) => ({ nombre: `Pedido ${orderLabel(o)}`, total: o.total })),
  ]
  // Una sola condicion para el boton y para el Enter del contado: el Enter
  // tenia su propio camino y cerraba con mesas abiertas.
  const puedeCerrar = hasEntered && bloqueos.length === 0 && !loading

  // Las partes del esperado; ingresos y retiros solo si los hubo.
  const desglose = [
    { label: 'Apertura', valor: s.opening_balance, signo: '' },
    { label: 'Ventas en efectivo', valor: s.total_cash_sales, signo: '+ ' },
    ...(s.total_deposits > 0 ? [{ label: 'Ingresos', valor: s.total_deposits, signo: '+ ' }] : []),
    ...(s.total_withdrawals > 0 ? [{ label: 'Retiros', valor: s.total_withdrawals, signo: '− ' }] : []),
  ]

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
    if (!puedeCerrar) return
    setLoading(true)
    setErrorServidor(null)
    const { error } = await closeSession(s.id, {
      actual_cash: enteredCash,
      notes: notes || undefined,
    })
    setLoading(false)
    // Junto al boton y no en un toast: si el servidor rechaza es porque algo
    // cambio desde que se abrio esta pantalla, y hay que leer que.
    if (error) { setErrorServidor(error); return }
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
          className="flex items-center gap-1.5 tactil:min-h-11 text-[var(--admin-accent-text)] hover:opacity-80 transition-opacity cursor-pointer"
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
                  textColor="text-green-700 dark:text-green-400"
                />
                <PayBar
                  label="Tarjeta"
                  value={s.total_card_sales}
                  pct={cardPct}
                  color="bg-blue-500"
                  textColor="text-blue-700 dark:text-blue-400"
                />
                <PayBar
                  label="Transferencia / MP"
                  value={transf}
                  pct={transPct}
                  color="bg-amber-500"
                  textColor="text-amber-700 dark:text-amber-400"
                />
              </div>
            </div>

            <div className="h-px bg-[var(--admin-border)]" />

            {/* ── Conciliación de efectivo ── */}
            <div className="px-7 py-5 space-y-3">
              <SectionLabel>Conciliación de efectivo</SectionLabel>

              {/* Esperado, con de donde sale: un numero solo no se puede chequear
                  ante un faltante. Absorbe la seccion de movimientos, que era el
                  mismo dato en otro lugar. */}
              <section
                aria-label="Efectivo esperado"
                className="rounded-xl border border-[var(--admin-border)] divide-y divide-[var(--admin-border)] overflow-hidden"
              >
                {desglose.map((d) => (
                  <div key={d.label} className="flex items-center justify-between px-3 py-2 text-[13px]">
                    <span className="text-[var(--admin-text-muted)]">{d.label}</span>
                    <span className="tabular-nums text-[var(--admin-text)]">
                      {d.signo}{formatPrice(d.valor)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--admin-surface-2)]">
                  <span className="text-[13px] font-semibold text-[var(--admin-text)]">Efectivo esperado</span>
                  <span className="text-[16px] font-bold tabular-nums text-[var(--admin-text)]">{formatPrice(expectedCash)}</span>
                </div>
              </section>

              {/* Contado — input */}
              <div className="relative flex items-center rounded-xl bg-[var(--admin-surface-2)] border border-[var(--admin-accent)]/40" style={{ height: 40 }}>
                <span className="absolute left-3 text-[13px] font-medium text-[var(--admin-text-muted)]">Efectivo contado</span>
                <Input
                  type="text"
                  inputMode="decimal"
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
                    ? 'bg-green-500/10 border-green-500/25 text-green-700 dark:text-green-400'
                    : difference > 0
                      ? 'bg-blue-500/10 border-blue-500/25 text-blue-700 dark:text-blue-400'
                      : 'bg-red-500/10 border-red-500/25 text-red-700 dark:text-red-400'
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

            {/* ── Lo que impide cerrar, junto al boton que deshabilita ── */}
            {(bloqueos.length > 0 || errorServidor || quedaAbierto.remotosSinCobrar > 0) && (
              <div className="px-7 pb-4 space-y-2">
                {bloqueos.length > 0 && (
                  <section
                    aria-label="Lo que impide cerrar"
                    className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2.5"
                  >
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-red-700 dark:text-red-400">
                      <Lock className="h-4 w-4 shrink-0" />
                      No se puede cerrar: falta cobrar
                    </p>
                    <ul className="mt-1.5 space-y-0.5 pl-6">
                      {bloqueos.map((b) => (
                        <li key={b.nombre} className="flex justify-between gap-3 text-[13px] text-[var(--admin-text)]">
                          <span>{b.nombre}</span>
                          <span className="tabular-nums">{formatPrice(b.total)}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {errorServidor && (
                  <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-[13px] text-red-700 dark:text-red-400">
                    {errorServidor}
                  </p>
                )}
                {quedaAbierto.remotosSinCobrar > 0 && (
                  <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[13px] text-amber-700 dark:text-amber-400">
                    <Globe className="h-4 w-4 shrink-0 mt-px" />
                    {quedaAbierto.remotosSinCobrar === 1
                      ? 'Hay 1 pedido de WhatsApp o web sin cobrar. No es de este turno: no impide cerrar, se cobra en el próximo.'
                      : `Hay ${quedaAbierto.remotosSinCobrar} pedidos de WhatsApp o web sin cobrar. No son de este turno: no impiden cerrar, se cobran en el próximo.`}
                  </p>
                )}
              </div>
            )}

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
                disabled={!puedeCerrar}
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
