'use client'

import { useEffect } from 'react'
import { formatPrice } from '@/lib/utils'
import type { Order } from '@/lib/types/database'

interface TicketItem {
  name: string
  quantity: number
  price: number
  notes?: string | null
}

interface TicketPrintLayoutProps {
  order: Order
  items: TicketItem[]
  cashReceived?: number
  isKitchen?: boolean
  guestName?: string
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mercadopago: 'Mercado Pago',
}

const PRINT_STYLES = `
  @media print {
    @page { margin: 4mm 3mm; size: 80mm auto; }
    body > *:not(#ticket-root) { display: none !important; }
    body { margin: 0; padding: 0; background: white; }
    #ticket-root {
      width: 100% !important;
      box-sizing: border-box !important;
      padding: 0 !important;
    }
    #ticket-root * { opacity: 1 !important; }
  }
  #ticket-root { font-family: 'Courier New', monospace; }
`

export function TicketPrintLayout({ order, items, cashReceived, isKitchen = false, guestName }: TicketPrintLayoutProps) {
  useEffect(() => {
    if (window.self !== window.top) return
    const timer = setTimeout(() => window.print(), 400)
    return () => clearTimeout(timer)
  }, [])

  const date = new Date(order.created_at)
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`

  const orderLabel = order.order_type === 'mesa' && order.table_number
    ? `Mesa ${order.table_number}`
    : 'Mostrador'

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const displayTotal = guestName ? subtotal : order.total
  const change = cashReceived ? cashReceived - displayTotal : 0

  if (isKitchen) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
        <div id="ticket-root" className="w-[76mm] font-mono text-sm leading-snug p-1">
          <div className="text-center border-b-2 border-black pb-2 mb-3">
            <p className="font-bold text-2xl tracking-widest">COCINA</p>
            <p className="text-xs">──────────────────────</p>
            <p className="font-bold text-base">{orderLabel}</p>
            <p className="text-xs">{dateStr} · {timeStr}</p>
            <p className="text-xs opacity-60 mt-0.5">#{order.id.slice(-8).toUpperCase()}</p>
          </div>

          {items.length === 0 ? (
            <p className="text-center text-sm opacity-60 py-2">Sin items de cocina</p>
          ) : (
            <div className="space-y-2 mb-2">
              {items.map((item, i) => (
                <div key={i} className="mb-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-lg w-8 shrink-0">{item.quantity}x</span>
                    <span className="text-base font-semibold">{item.name}</span>
                  </div>
                  {item.notes && (
                    <p className="ml-10 text-sm italic">→ {item.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
      <div id="ticket-root" className="w-[76mm] font-mono text-sm leading-snug p-1">
        {/* Header */}
        <div className="text-center border-b border-dashed border-black pb-2 mb-2">
          <p className="font-bold text-base">QUE COPADO</p>
          <p className="text-xs">──────────────────────</p>
          <p className="text-sm">{orderLabel}{guestName ? ` · ${guestName}` : ''}</p>
          <p className="text-xs">{dateStr} · {timeStr}</p>
        </div>

        {/* Items */}
        <div className="space-y-1 mb-2">
          {items.map((item, i) => (
            <div key={i}>
              <div className="flex justify-between gap-2">
                <span>{item.quantity}x {item.name}</span>
                <span className="shrink-0">{formatPrice(item.price * item.quantity)}</span>
              </div>
              {item.notes && (
                <p className="ml-4 text-xs italic opacity-70">→ {item.notes}</p>
              )}
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-dashed border-black pt-2 space-y-1 mb-2">
          {order.shipping_cost > 0 && (
            <>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Envío</span>
                <span>{formatPrice(order.shipping_cost)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between font-bold">
            <span>TOTAL</span>
            <span>{formatPrice(displayTotal)}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="border-t border-dashed border-black pt-2 space-y-1">
          <div className="flex justify-between">
            <span>{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</span>
            <span>{cashReceived ? formatPrice(cashReceived) : formatPrice(displayTotal)}</span>
          </div>
          {cashReceived && change > 0 && (
            <div className="flex justify-between">
              <span>Vuelto</span>
              <span>{formatPrice(change)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs mt-3 pt-2 border-t border-dashed border-black">
          <p>Gracias!</p>
          <p className="text-xs opacity-60">#{order.id.slice(-8).toUpperCase()}</p>
        </div>
      </div>
    </>
  )
}
