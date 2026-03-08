'use client'

import { useEffect } from 'react'
import { formatPrice } from '@/lib/utils'
import type { Order } from '@/lib/types/database'

interface TicketItem {
  name: string
  quantity: number
  price: number
}

interface TicketPrintLayoutProps {
  order: Order
  items: TicketItem[]
  cashReceived?: number
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mercadopago: 'Mercado Pago',
}

export function TicketPrintLayout({ order, items, cashReceived }: TicketPrintLayoutProps) {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 400)
    return () => clearTimeout(timer)
  }, [])

  const date = new Date(order.created_at)
  const dateStr = date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const orderLabel = order.order_type === 'mesa' && order.table_number
    ? `Mesa ${order.table_number}`
    : 'Mostrador'

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const change = cashReceived ? cashReceived - order.total : 0

  return (
    <div className="w-[300px] font-mono text-sm leading-snug p-2">
      {/* Header */}
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <p className="font-bold text-base">QUE COPADO 🍔</p>
        <p className="text-xs">──────────────────────</p>
        <p className="text-sm">{orderLabel}</p>
        <p className="text-xs">{dateStr} · {timeStr}</p>
      </div>

      {/* Items */}
      <div className="space-y-1 mb-2">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between gap-2">
            <span>{item.quantity}x {item.name}</span>
            <span className="shrink-0">{formatPrice(item.price * item.quantity)}</span>
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
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      {/* Payment */}
      <div className="border-t border-dashed border-black pt-2 space-y-1">
        <div className="flex justify-between">
          <span>{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</span>
          <span>{cashReceived ? formatPrice(cashReceived) : formatPrice(order.total)}</span>
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
        <p>¡Gracias! 🙌</p>
        <p className="text-xs opacity-60">#{order.id.slice(-8).toUpperCase()}</p>
      </div>
    </div>
  )
}
