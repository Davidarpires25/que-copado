'use client'

import { useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils'
import { PAYMENT_METHOD_CONFIG } from '@/lib/types/orders'
import type { Order, PaymentMethod, Json } from '@/lib/types/database'
import type { OrderItem } from '@/lib/types/orders'

interface PosOrderHistoryProps {
  orders: Order[]
  open: boolean
  onClose: () => void
  onCancelOrder: (orderId: string) => void
}

function parseOrderItems(items: Json): OrderItem[] {
  if (Array.isArray(items)) return items as unknown as OrderItem[]
  return []
}

export function PosOrderHistory({
  orders,
  open,
  onClose,
  onCancelOrder,
}: PosOrderHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (!open) return null

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1d24] border border-[#2a2f3a] rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2f3a]">
          <h2 className="text-lg font-bold text-[#f0f2f5]">
            Ventas de la sesion ({orders.length})
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#a8b5c9] hover:text-[#f0f2f5] hover:bg-[#252a35] transition-colors active:scale-95"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
          {orders.length === 0 ? (
            <p className="text-center text-[#a8b5c9] py-12 text-sm">
              No hay ventas en esta sesion
            </p>
          ) : (
            orders.map((order) => {
              const paymentConfig =
                PAYMENT_METHOD_CONFIG[order.payment_method as PaymentMethod]
              const isCancelled = order.status === 'cancelado'
              const isExpanded = expandedId === order.id
              const items = parseOrderItems(order.items)

              return (
                <div
                  key={order.id}
                  className={`bg-[#12151a] rounded-lg border border-[#2a2f3a] hover:border-[#3a3f4a] transition-colors ${
                    isCancelled ? 'opacity-50' : ''
                  }`}
                >
                  {/* Order row — clickeable para expandir */}
                  <button
                    onClick={() => toggle(order.id)}
                    className="w-full flex items-center justify-between p-3 text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-[#a8b5c9] shrink-0 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                      <span className="text-xs text-[#a8b5c9] shrink-0">
                        {new Date(order.created_at).toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-[#2a2f3a] text-[#c4cdd9] bg-[#252a35] text-[10px] shrink-0"
                      >
                        {order.order_type === 'mesa'
                          ? `Mesa ${order.table_number || ''}`
                          : 'Mostrador'}
                      </Badge>
                      {paymentConfig && (
                        <span className="text-xs text-[#a8b5c9] shrink-0 hidden sm:inline">
                          {paymentConfig.icon} {paymentConfig.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-sm font-bold ${
                          isCancelled
                            ? 'text-red-400 line-through'
                            : 'text-[#FEC501]'
                        }`}
                      >
                        {formatPrice(order.total)}
                      </span>
                      {isCancelled && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs px-2 py-0.5">
                          Anulada
                        </Badge>
                      )}
                    </div>
                  </button>

                  {/* Detalle expandible */}
                  {isExpanded && (
                    <div className="border-t border-[#2a2f3a] px-3 pb-3">
                      {/* Items */}
                      <div className="py-2 space-y-1.5">
                        {items.length > 0 ? (
                          items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[#a8b5c9] shrink-0 w-5 text-right">
                                  {item.quantity}x
                                </span>
                                <span className="text-[#f0f2f5] truncate">
                                  {item.name}
                                </span>
                              </div>
                              <span className="text-[#a8b5c9] shrink-0 ml-2">
                                {formatPrice(item.price * item.quantity)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-[#a8b5c9]">Sin detalle</p>
                        )}
                      </div>

                      {/* Notas + Anular */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#2a2f3a]/50">
                        <div className="flex items-center gap-2">
                          {paymentConfig && (
                            <span className="text-[10px] text-[#a8b5c9] sm:hidden">
                              {paymentConfig.icon} {paymentConfig.label}
                            </span>
                          )}
                          {order.notes && (
                            <span className="text-[10px] text-[#a8b5c9] italic truncate max-w-[200px]">
                              {order.notes}
                            </span>
                          )}
                        </div>
                        {!isCancelled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onCancelOrder(order.id)
                            }}
                            className="h-7 px-3 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 active:scale-95 transition-all"
                          >
                            Anular
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
