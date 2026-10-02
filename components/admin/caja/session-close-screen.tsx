'use client'

import { useState } from 'react'
import {
  Loader2, ArrowLeft, CheckCircle, FileWarning, Globe, Lock, TrendingUp, TrendingDown,
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
  /** Facturas o notas de crédito del turno que no se emitieron: avisan, no bloquean. */
  facturasSinEmitir: number
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

  // Horario del turno. Esta pantalla se abre con un clic, nunca se renderiza
  // en el servidor, asi que la hora local no desencuentra la hidratacion.
  const hora = (d: Date) => d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
  const openedAt = new Date(s.opened_at)
  const now = new Date()
  const durationMs = now.getTime() - openedAt.getTime()
  const durationH = Math.floor(durationMs / 3600000)
  const durationM = Math.floor((durationMs % 3600000) / 60000)
  const durationStr = durationH > 0 ? `${durationH} h ${durationM} min` : `${durationM} min`

  // Sin centavos, como el resto de la caja: "$ 13.833,33" no dice nada mas.
  const avgTicket = s.total_orders > 0 ? Math.round(s.total_sales / s.total_orders) : 0

  const total = s.total_sales || 1
  const medios = [
    { label: 'Efectivo', valor: s.total_cash_sales, barra: 'bg-exito' },
    { label: 'Tarjeta', valor: s.total_card_sales, barra: 'bg-info' },
    { label: 'Transferencia / MP', valor: s.total_transfer_sales, barra: 'bg-aviso' },
  ].map((m) => ({ ...m, pct: Math.round((m.valor / total) * 100) }))

  // El contado se ve crudo mientras se escribe y con separador de miles al
  // salir del campo: al lado de "$ 46.000", "40000" no se compara de un vistazo.
  const [editandoContado, setEditandoContado] = useState(true)

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
      {/* En el celular la barra es la del panel (MobileTopBar, la pone la caja). */}
      <div className="hidden lg:flex shrink-0 h-14 items-center justify-between px-8 border-b border-[var(--admin-sidebar-border)] bg-[var(--admin-sidebar-bg)]">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-panel-sm font-medium">Volver a la caja</span>
        </button>
        <span className="text-panel-sm text-[var(--admin-text-muted)] tabular-nums">
          Turno desde las {hora(openedAt)} · {durationStr}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 lg:py-6 flex justify-center">
        {/* Un solo panel: en la netbook se ve entero sin desplazar. Antes eran
            secciones apiladas y el conteo —lo que se hace aca— quedaba al final;
            la maqueta que lo partio en dos tarjetas dejaba el resumen fuera de
            la vista. Desde lg, dos columnas: la tarea a la izquierda, el turno
            a la derecha. */}
        <section
          aria-label="Cierre de caja"
          className="w-full max-w-[1000px] self-start bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl lg:grid lg:grid-cols-[1.15fr_1fr] lg:divide-x divide-[var(--admin-border)]"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          {/* ── La tarea: contar y cerrar ── */}
          <div className="p-5 lg:p-6 space-y-3">
            <h1 className="text-xl font-bold text-[var(--admin-text)]">Cerrar caja</h1>

            <div
              role="region"
              aria-label="Efectivo esperado"
              className="rounded-xl border border-[var(--admin-border)] divide-y divide-[var(--admin-border)] overflow-hidden"
            >
              {desglose.map((d) => (
                <div key={d.label} className="flex items-center justify-between px-3 py-1.5 text-panel-sm">
                  <span className="text-[var(--admin-text-muted)]">{d.label}</span>
                  <span className="tabular-nums text-[var(--admin-text)]">{d.signo}{formatPrice(d.valor)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--admin-surface-2)]">
                <span className="text-panel-sm font-semibold text-[var(--admin-text)]">Efectivo esperado</span>
                <span className="text-panel-lg font-bold tabular-nums text-[var(--admin-text)]">{formatPrice(expectedCash)}</span>
              </div>
            </div>

            <label className="flex h-12 items-center justify-between gap-3 rounded-xl border-2 border-[var(--admin-accent)] bg-[var(--admin-surface)] px-3">
              <span className="shrink-0 text-panel-base font-semibold text-[var(--admin-text)]">Efectivo contado</span>
              <Input
                type="text"
                inputMode="decimal"
                value={editandoContado || !hasEntered ? actualCash : formatPrice(enteredCash)}
                onFocus={() => setEditandoContado(true)}
                onBlur={() => setEditandoContado(false)}
                onChange={(e) => setActualCash(e.target.value)}
                placeholder="$ 0"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleClose()}
                className="h-10 bg-transparent border-0 px-0 text-right text-panel-xl font-bold text-[var(--admin-text)] shadow-none focus:ring-0 focus-visible:ring-0"
              />
            </label>

            {hasEntered && (
              <div className={cn(
                'flex items-center justify-between rounded-xl border px-3 py-2',
                difference === 0
                  ? 'bg-exito/10 border-exito/25 text-exito-texto'
                  : difference > 0
                    ? 'bg-info/10 border-info/25 text-info-texto'
                    : 'bg-peligro/10 border-peligro/25 text-peligro-texto'
              )}>
                <div className="flex items-center gap-2">
                  {/* El faltante llevaba un tilde, que dice "esta bien". */}
                  {difference === 0 ? <CheckCircle className="h-4 w-4" /> : difference > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span className="text-panel-base font-semibold">
                    {difference === 0 ? 'Cierra justo' : difference > 0 ? 'Sobrante' : 'Faltante'}
                  </span>
                </div>
                <span className="text-panel-xl font-bold tabular-nums">
                  {difference > 0 ? '+ ' : difference < 0 ? '− ' : ''}{formatPrice(Math.abs(difference))}
                </span>
              </div>
            )}

            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas del turno (opcional)"
              className="h-10 rounded-xl border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-panel-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-placeholder)] focus:border-[var(--admin-accent)]/50"
            />

            {/* Lo que impide cerrar, junto al boton que deshabilita. */}
            {bloqueos.length > 0 && (
              <section
                aria-label="Lo que impide cerrar"
                className="rounded-xl border border-peligro/30 bg-peligro/5 px-3 py-2.5"
              >
                <p className="flex items-center gap-2 text-panel-sm font-semibold text-peligro-texto">
                  <Lock className="h-4 w-4 shrink-0" />
                  No se puede cerrar: falta cobrar
                </p>
                <ul className="mt-1.5 space-y-0.5 pl-6">
                  {bloqueos.map((b) => (
                    <li key={b.nombre} className="flex justify-between gap-3 text-panel-sm text-[var(--admin-text)]">
                      <span>{b.nombre}</span>
                      <span className="tabular-nums">{formatPrice(b.total)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {errorServidor && (
              <p role="alert" className="rounded-xl border border-peligro/30 bg-peligro/5 px-3 py-2 text-panel-sm text-peligro-texto">
                {errorServidor}
              </p>
            )}
            {quedaAbierto.remotosSinCobrar > 0 && (
              <p className="flex items-start gap-2 rounded-xl border border-aviso/30 bg-aviso/5 px-3 py-2 text-panel-sm text-aviso-texto">
                <Globe className="mt-px h-4 w-4 shrink-0" />
                {quedaAbierto.remotosSinCobrar === 1
                  ? 'Hay 1 pedido de WhatsApp o web sin cobrar. No es de este turno: no impide cerrar, se cobra en el próximo.'
                  : `Hay ${quedaAbierto.remotosSinCobrar} pedidos de WhatsApp o web sin cobrar. No son de este turno: no impiden cerrar, se cobran en el próximo.`}
              </p>
            )}

            {quedaAbierto.facturasSinEmitir > 0 && (
              <p className="flex items-start gap-2 rounded-xl border border-aviso/30 bg-aviso/5 px-3 py-2 text-panel-sm text-aviso-texto">
                <FileWarning className="mt-px h-4 w-4 shrink-0" />
                {quedaAbierto.facturasSinEmitir === 1
                  ? 'Hay 1 factura de este turno sin emitir. No impide cerrar: reintentala desde el Historial.'
                  : `Hay ${quedaAbierto.facturasSinEmitir} facturas de este turno sin emitir. No impiden cerrar: reintentalas desde el Historial.`}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={onBack}
                className="h-11 px-5 rounded-xl border border-[var(--admin-border)] text-panel-base font-semibold text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:border-[var(--admin-text-placeholder)] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleClose}
                disabled={!puedeCerrar}
                className="h-11 px-6 rounded-xl bg-[var(--admin-accent)] text-black text-panel-base font-bold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:brightness-95 transition-all cursor-pointer"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Cierre'}
              </button>
            </div>
          </div>

          {/* ── El turno: para mirar, no para hacer ── */}
          <div className="border-t border-[var(--admin-border)] p-5 lg:border-t-0 lg:p-6 space-y-5">
            <p className="text-panel-2xs font-semibold uppercase tracking-widest text-[var(--admin-text-faint)]">Resumen del turno</p>

            <dl className="grid grid-cols-3 gap-3">
              {[
                ['Ventas', formatPrice(s.total_sales)],
                ['Pedidos', String(s.total_orders)],
                ['Ticket promedio', formatPrice(avgTicket)],
              ].map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-panel-xs text-[var(--admin-text-faint)]">{k}</dt>
                  <dd className="text-panel-lg sm:text-panel-xl font-bold tabular-nums whitespace-nowrap text-[var(--admin-text)]">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="space-y-2.5">
              {medios.map((m) => (
                <div key={m.label} className="space-y-1">
                  <div className="flex justify-between text-panel-sm">
                    <span className="text-[var(--admin-text)]">{m.label}</span>
                    <span className="tabular-nums text-[var(--admin-text-muted)]">{formatPrice(m.valor)} · {m.pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--admin-surface-2)]">
                    <div className={cn('h-full rounded-full', m.barra)} style={{ width: `${Math.min(m.pct, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-panel-sm tabular-nums text-[var(--admin-text-muted)]">
              Apertura {hora(openedAt)} · ahora {hora(now)} · {durationStr}
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
