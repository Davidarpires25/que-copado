'use client'

import { useState } from 'react'
import { X, MapPin, Phone, User, Clock, CreditCard, Truck, ExternalLink } from 'lucide-react'
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
  const [currentStatus, setCurrentStatus] = useState<OrderStatus | null>(null)

  if (!order) return null

  const items = parseOrderItems(order.items)
  const subtotal = order.total - order.shipping_cost

  const handleStatusChange = (newStatus: OrderStatus) => {
    setCurrentStatus(newStatus)
    onStatusChanged(order.id, newStatus)
  }

  const displayStatus = currentStatus || order.status

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
            className="fixed right-0 top-0 z-50 h-screen w-full max-w-md bg-[#12151a] border-l border-[#2a2f3a] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2a2f3a]">
              <div>
                <h2 className="text-lg font-bold text-[#f0f2f5]">
                  Pedido #{getShortOrderId(order.id)}
                </h2>
                <p className="text-sm text-[#8b9ab0] flex items-center gap-1 mt-0.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDateTime(order.created_at)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9 text-[#8b9ab0] hover:text-[#f0f2f5] hover:bg-[#252a35]"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <OrderStatusBadge status={displayStatus} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStatusDialog(true)}
                  className="border-[#2a2f3a] text-[#c4cdd9] hover:bg-[#252a35] hover:text-[#f0f2f5]"
                >
                  Cambiar Estado
                </Button>
              </div>

              {/* Customer Info */}
              <div className="bg-[#1a1d24] rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-[#f0f2f5] mb-3">Cliente</h3>

                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-[#8b9ab0] mt-0.5" />
                  <div>
                    <p className="text-[#f0f2f5]">{order.customer_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-[#8b9ab0] mt-0.5" />
                  <div>
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="text-[#FEC501] hover:underline"
                    >
                      {order.customer_phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-[#8b9ab0] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[#f0f2f5]">{order.customer_address}</p>
                    {order.delivery_zones && (
                      <p className="text-sm text-[#8b9ab0] mt-0.5">
                        Zona: {order.delivery_zones.name}
                      </p>
                    )}
                    {googleMapsUrl && (
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-[#FEC501] hover:underline mt-1"
                      >
                        Ver en Google Maps
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                {order.notes && (
                  <div className="pt-2 border-t border-[#2a2f3a]">
                    <p className="text-sm text-[#8b9ab0]">Notas:</p>
                    <p className="text-[#f0f2f5] mt-1">{order.notes}</p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="bg-[#1a1d24] rounded-xl p-4">
                <h3 className="font-semibold text-[#f0f2f5] mb-3">Productos</h3>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-[#8b9ab0] text-sm w-6">
                          {item.quantity}x
                        </span>
                        <span className="text-[#f0f2f5]">{item.name}</span>
                      </div>
                      <span className="text-[#c4cdd9]">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#2a2f3a] mt-4 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8b9ab0]">Subtotal</span>
                    <span className="text-[#c4cdd9]">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8b9ab0] flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5" />
                      Envío
                    </span>
                    <span className="text-[#c4cdd9]">
                      {order.shipping_cost === 0 ? 'Gratis' : formatPrice(order.shipping_cost)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2">
                    <span className="text-[#f0f2f5]">Total</span>
                    <span className="text-[#FEC501]">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-[#1a1d24] rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-[#8b9ab0]" />
                  <div>
                    <p className="text-sm text-[#8b9ab0]">Método de pago</p>
                    <p className="text-[#f0f2f5]">
                      {getPaymentMethodIcon(order.payment_method)}{' '}
                      {getPaymentMethodLabel(order.payment_method)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#2a2f3a]">
              <Button
                onClick={onClose}
                className="w-full bg-[#FEC501] hover:bg-[#E5B001] text-black font-semibold"
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
            currentStatus={displayStatus}
            onStatusChanged={handleStatusChange}
          />
        </>
      )}
    </AnimatePresence>
  )
}
