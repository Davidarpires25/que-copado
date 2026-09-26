'use client'

import { useState } from 'react'
import { X, Clock, Wallet, Truck } from 'lucide-react'
import { PAYMENT_METHOD_CONFIG } from '@/lib/constants/payments'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { CustomerBlock } from './customer-block'
import { orderLabel } from '@/lib/utils/order-number'
import { OrderStatusBadge } from './order-status-badge'
import { ChangeStatusDialog } from './change-status-dialog'
import { formatPrice } from '@/lib/utils'
import {
  formatDateTime,
  getPaymentMethodLabel,
  parseOrderItems,
} from '@/lib/services/order-formatter'
import type { OrderWithZone, OrderStatus } from '@/lib/types/database'

interface OrderDetailsDrawerProps {
  order: OrderWithZone | null
  open: boolean
  onClose: () => void
  onStatusChanged: (orderId: string, newStatus: OrderStatus) => void
}

export function OrderDetailsDrawer({
  order,
  open,
  onClose,
  onStatusChanged,
}: OrderDetailsDrawerProps) {
  const [showStatusDialog, setShowStatusDialog] = useState(false)

  if (!order) return null

  const items = parseOrderItems(order.items)
  const subtotal = order.total - order.shipping_cost

  const handleStatusChange = (newStatus: OrderStatus) => {
    onStatusChanged(order.id, newStatus)
  }

  const googleMapsUrl = order.customer_coordinates
    ? `https://www.google.com/maps?q=${order.customer_coordinates.lat},${order.customer_coordinates.lng}`
    : null

  // Sheet (Dialog de Radix) y no un div animado a mano: se anuncia como
  // dialogo, el foco entra y queda adentro, Escape lo cierra y el foco vuelve
  // a la fila del pedido.
  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
        <SheetContent
          side="right"
          showCloseButton={false}
          aria-describedby={undefined}
          overlayClassName="bg-black/60 backdrop-blur-sm"
          className="w-full sm:max-w-md gap-0 p-0 bg-[var(--admin-surface)] border-l border-[var(--admin-border)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--admin-border)]">
            <div>
              <SheetTitle className="text-lg font-bold text-[var(--admin-text)]">
                Pedido {orderLabel(order)}
              </SheetTitle>
              <p className="text-sm text-[var(--admin-text-muted)] flex items-center gap-1 mt-0.5">
                <Clock className="h-3.5 w-3.5" />
                {formatDateTime(order.created_at)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Cerrar"
              className="h-9 w-9 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Status */}
            <div className="flex items-center justify-between">
              <OrderStatusBadge status={order.status} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStatusDialog(true)}
                className="border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text)]"
              >
                Cambiar Estado
              </Button>
            </div>

            <CustomerBlock
              name={order.customer_name}
              phone={order.customer_phone}
              address={order.customer_address}
              zoneName={order.delivery_zones?.name}
              mapsUrl={googleMapsUrl}
            />

            {/* Las notas quedan aparte: son del pedido, no del cliente. */}
            {order.notes && (
              <div className="rounded-xl bg-[var(--admin-bg)] p-4">
                <p className="text-sm text-[var(--admin-text-muted)]">Notas</p>
                <p className="mt-1 text-[var(--admin-text)]">{order.notes}</p>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-[var(--admin-bg)] rounded-xl p-4">
              <h3 className="font-semibold text-[var(--admin-text)] mb-3">Productos</h3>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--admin-text-muted)] text-sm w-6">
                        {item.quantity}x
                      </span>
                      <span className="text-[var(--admin-text)]">{item.name}</span>
                    </div>
                    <span className="text-[var(--admin-text-muted)]">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[var(--admin-border)] mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--admin-text-muted)]">Subtotal</span>
                  <span className="text-[var(--admin-text-muted)]">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--admin-text-muted)] flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" />
                    Envío
                  </span>
                  <span className="text-[var(--admin-text-muted)]">
                    {order.shipping_cost === 0 ? 'Gratis' : formatPrice(order.shipping_cost)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span className="text-[var(--admin-text)]">Total</span>
                  <span className="text-[var(--admin-price)]">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-[var(--admin-bg)] rounded-xl p-4">
{(() => {
                const IconoDelMedio = PAYMENT_METHOD_CONFIG[order.payment_method]?.icon ?? Wallet
                return (
                  <div className="flex items-center gap-3">
                    <IconoDelMedio className="h-4 w-4 text-[var(--admin-text-muted)]" />
                    <div>
                      <p className="text-sm text-[var(--admin-text-muted)]">Método de pago</p>
                      <p className="text-[var(--admin-text)]">
                        {getPaymentMethodLabel(order.payment_method)}
                      </p>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--admin-border)]">
            <Button
              onClick={onClose}
              className="w-full bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold"
            >
              Cerrar
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Change Status Dialog */}
      <ChangeStatusDialog
        open={showStatusDialog}
        onOpenChange={setShowStatusDialog}
        orderId={order.id}
        currentStatus={order.status}
        onStatusChanged={handleStatusChange}
      />
    </>
  )
}
