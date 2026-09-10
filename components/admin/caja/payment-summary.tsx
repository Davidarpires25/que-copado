'use client'

import { cn, formatPrice } from '@/lib/utils'

interface PaymentSummaryProps {
  /** Lo que hay que cobrar. Incluye el envio. */
  total: number
  /** Envio ya contenido en `total`. Cero o ausente = no hay linea de envio. */
  shipping?: number
  /** Nombre de la zona, si se conoce. */
  shippingZone?: string | null
  /** Efectivo que puso el cliente. Solo se muestra si hay vuelto. */
  cashReceived?: number
  change: number
  covered: number
  isComplete: boolean
  methodCount: number
}

/**
 * El cierre de la cuenta.
 *
 * Antes esto imprimia `formatPrice(total)` dos veces, una etiquetada "Subtotal"
 * y otra "Total", y el envio no aparecia en ninguna linea. Por eso un pedido
 * pudo registrarse por 35.500 habiendo cobrado 38.500 sin que nada lo delatara:
 * la pantalla nunca mostro los 3.000 que estaban adentro.
 *
 * Ahora el desglose aparece solo si hay algo que desglosar, y las cuentas
 * tienen que cerrar a la vista.
 */
export function PaymentSummary({
  total, shipping = 0, shippingZone,
  cashReceived = 0, change, covered, isComplete, methodCount,
}: PaymentSummaryProps) {
  const hayEnvio = shipping > 0
  const items = total - shipping
  const falta = Math.max(0, total - covered)

  return (
    <div className="flex flex-col gap-1.5">
      {hayEnvio && (
        <>
          <Row k="Items" v={formatPrice(items)} />
          <Row
            k={shippingZone ? `Envío · ${shippingZone}` : 'Envío'}
            v={formatPrice(shipping)}
          />
          <div className="my-0.5 h-px bg-[var(--admin-border)]" />
        </>
      )}

      <div className="flex items-baseline justify-between">
        <span className="text-[17px] font-bold text-[var(--admin-text)]">Total</span>
        <span className="text-[17px] font-bold tabular-nums text-[var(--admin-price)]">
          {formatPrice(total)}
        </span>
      </div>

      {/* Un vuelto sin su origen no se puede chequear. */}
      {change > 0 && (
        <Row k="Recibís" v={formatPrice(cashReceived)} muted />
      )}

      {/* Con un solo medio que cubre el total, el boton ya lo dice. */}
      {methodCount > 1 && isComplete && (
        <Row k={`Cubierto · ${methodCount} medios`} v={formatPrice(covered)} tone="good" />
      )}
      {methodCount > 0 && !isComplete && (
        <Row k="Faltan" v={formatPrice(falta)} tone="warn" />
      )}

      {change > 0 && (
        <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-center">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
            Vuelto
          </span>
          <span className="block text-[26px] font-extrabold leading-tight tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatPrice(change)}
          </span>
        </div>
      )}
    </div>
  )
}

function Row({
  k, v, muted, tone,
}: {
  k: string
  v: string
  muted?: boolean
  tone?: 'good' | 'warn'
}) {
  const color =
    tone === 'good' ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
    : tone === 'warn' ? 'text-amber-700 dark:text-amber-400 font-semibold'
    : muted ? 'text-[var(--admin-text-faint)]'
    : 'text-[var(--admin-text-muted)]'

  return (
    <div className={cn('flex items-baseline justify-between text-[13px]', color)}>
      <span>{k}</span>
      <span className="tabular-nums">{v}</span>
    </div>
  )
}
