'use client'

import { useState } from 'react'
import { X, MapPin, Phone, User, Clock, Wallet, Truck, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { OrderStatusBadge } from './order-status-badge'
import { ChangeStatusDialog } from './change-status-dialog'
import { formatPrice } from '@/lib/utils'
import {
  formatDateTime,
  getPaymentMethodLabel,
  getPaymentMethodIcon,
  parseOrderItems,
  getShortOrderId,
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

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-screen w-full max-w-md bg-[var(--admin-surface)] border-l border-[var(--admin-border)] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--admin-border)]">
              <div>
                <h2 className="text-lg font-bold text-[var(--admin-text)]">
                  Pedido #{getShortOrderId(order.id)}
                </h2>
                <p className="text-sm text-[var(--admin-text-muted)] flex items-center gap-1 mt-0.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDateTime(order.created_at)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
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

              {/* Customer Info */}
              <div className="bg-[var(--admin-bg)] rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-[var(--admin-text)] mb-3">Cliente</h3>

                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-[var(--admin-text-muted)] mt-0.5" />
                  <div>
                    <p className="text-[var(--admin-text)]">{order.customer_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-[var(--admin-text-muted)] mt-0.5" />
                  <div>
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="text-[var(--admin-accent-text)] hover:underline"
                    >
                      {order.customer_phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-[var(--admin-text-muted)] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[var(--admin-text)]">{order.customer_address}</p>
                    {order.delivery_zones && (
                      <p className="text-sm text-[var(--admin-text-muted)] mt-0.5">
                        Zona: {order.delivery_zones.name}
                      </p>
                    )}
                    {googleMapsUrl && (
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-[var(--admin-accent-text)] hover:underline mt-1"
                      >
                        Ver en Google Maps
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                {order.notes && (
                  <div className="pt-2 border-t border-[var(--admin-border)]">
                    <p className="text-sm text-[var(--admin-text-muted)]">Notas:</p>
                    <p className="text-[var(--admin-text)] mt-1">{order.notes}</p>
                  </div>
                )}
              </div>

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
                    <span className="text-[var(--admin-accent-text)]">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-[var(--admin-bg)] rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Wallet className="h-4 w-4 text-[var(--admin-text-muted)]" />
                  <div>
                    <p className="text-sm text-[var(--admin-text-muted)]">Método de pago</p>
                    <p className="text-[var(--admin-text)]">
                      {getPaymentMethodIcon(order.payment_method)}{' '}
                      {getPaymentMethodLabel(order.payment_method)}
                    </p>
                  </div>
                </div>
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
          </motion.div>

          {/* Change Status Dialog */}
          <ChangeStatusDialog
            open={showStatusDialog}
            onOpenChange={setShowStatusDialog}
            orderId={order.id}
            currentStatus={order.status}
            onStatusChanged={handleStatusChange}
          />
        </>
      )}
    </AnimatePresence>
  )
}
