'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  X,
  Plus,
  Receipt,
  CreditCard,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TableOrderItems } from './table-order-items'
import { TABLE_STATUS_CONFIG } from '@/lib/types/tables'
import {
  updateOrderItem,
  removeOrderItem,
  requestBill,
  cancelTableOrder,
} from '@/app/actions/tables'
import type { TableWithOrder } from '@/lib/types/tables'
import type { CashRegisterSession } from '@/lib/types/cash-register'

interface TableOrderPanelProps {
  table: TableWithOrder
  session: CashRegisterSession
  onAddItems: () => void
  onRequestBill: () => void
  onPayOrder: () => void
  onCancelOrder: () => void
  onClose: () => void
}

/**
 * Calcula el tiempo transcurrido desde opened_at
 */
function formatElapsedTime(openedAt: string): string {
  const now = Date.now()
  const opened = new Date(openedAt).getTime()
  const diffMs = now - opened
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return '< 1 min'
  if (diffMin < 60) return `${diffMin} min`

  const hours = Math.floor(diffMin / 60)
  const mins = diffMin % 60
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

export function TableOrderPanel({
  table,
  session,
  onAddItems,
  onRequestBill,
  onPayOrder,
  onCancelOrder,
  onClose,
}: TableOrderPanelProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const order = table.orders
  const statusConfig = TABLE_STATUS_CONFIG[table.status]
  const orderStatus = order?.status as 'abierto' | 'cuenta_pedida' | undefined

  const canModify = orderStatus === 'abierto' || orderStatus === 'cuenta_pedida'

  const activeItems = useMemo(() => {
    if (!order?.order_items) return []
    return order.order_items.filter((item) => item.status !== 'cancelado')
  }, [order?.order_items])

  const hasItems = activeItems.length > 0

  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollDown, setCanScrollDown] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const checkScroll = () => {
      setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 8)
    }

    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    return () => el.removeEventListener('scroll', checkScroll)
  }, [activeItems])

  const handleUpdateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      const result = await updateOrderItem(itemId, quantity)
      if (result.error) {
        toast.error(result.error)
      }
    },
    []
  )

  const handleRemoveItem = useCallback(async (itemId: string) => {
    const result = await removeOrderItem(itemId)
    if (result.error) {
      toast.error(result.error)
    }
  }, [])

  const handleRequestBill = async () => {
    if (!order) return
    setLoadingAction('bill')
    const result = await requestBill(order.id)
    setLoadingAction(null)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Cuenta pedida')
      onRequestBill()
    }
  }

  const handleCancelOrder = async () => {
    if (!order) return
    setLoadingAction('cancel')
    const result = await cancelTableOrder(order.id, table.id)
    setLoadingAction(null)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Orden cancelada')
      onCancelOrder()
    }
  }

  if (!order) {
    return (
      <div className="w-80 lg:w-96 border-l border-[#2a2f3a] bg-[#1a1d24] flex flex-col items-center justify-center p-6 text-[#a8b5c9]">
        <p className="text-sm">Sin orden activa</p>
      </div>
    )
  }

  return (
    <div className="w-80 lg:w-96 border-l border-[#2a2f3a] bg-[#1a1d24] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2f3a]">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[#f0f2f5]">
            Mesa {table.number}
          </h2>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
              statusConfig.bgColor,
              statusConfig.color
            )}
          >
            {statusConfig.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {order.opened_at && (
            <span className="text-xs text-[#a8b5c9]">
              {formatElapsedTime(order.opened_at)}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#a8b5c9] hover:text-[#f0f2f5] hover:bg-[#252a35]"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable item list */}
      <div className="relative flex-1 min-h-0">
        <div ref={scrollRef} className="absolute inset-0 overflow-y-auto py-2">
          {hasItems ? (
            <TableOrderItems
              items={order.order_items}
              canModify={canModify}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#a8b5c9] px-6">
              <Receipt className="h-8 w-8 mb-2 text-[#3a3f4a]" />
              <p className="text-sm text-center">
                Sin productos - Agrega productos al pedido
              </p>
            </div>
          )}
        </div>

        {/* Scroll fade indicator */}
        {canScrollDown && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#1a1d24] to-transparent pointer-events-none" />
        )}
      </div>

      {/* Add products button */}
      <div className="px-4 py-2">
        <Button
          onClick={onAddItems}
          className="w-full h-11 bg-[#FEC501] hover:bg-[#e5b301] text-black font-bold text-sm active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Productos
        </Button>
      </div>

      {/* Total */}
      <div className="px-4 py-3 border-t border-[#2a2f3a]">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#a8b5c9]">Total</span>
          <span className="text-2xl font-bold text-[#f0f2f5]">
            {formatPrice(order.total)}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-4 space-y-2">
        {orderStatus === 'abierto' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRequestBill}
              disabled={!hasItems || loadingAction === 'bill'}
              className="flex-1 h-11 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 disabled:opacity-40"
            >
              {loadingAction === 'bill' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Receipt className="h-4 w-4 mr-2" />
                  Pedir Cuenta
                </>
              )}
            </Button>
            <Button
              onClick={onPayOrder}
              disabled={!hasItems}
              className="flex-1 h-11 bg-green-600 hover:bg-green-500 text-white font-bold disabled:opacity-40 shadow-lg shadow-green-600/20"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Cobrar
            </Button>
          </div>
        )}

        {orderStatus === 'cuenta_pedida' && (
          <Button
            onClick={onPayOrder}
            disabled={!hasItems}
            className="w-full h-12 bg-green-600 hover:bg-green-500 text-white font-bold text-base disabled:opacity-40 shadow-lg shadow-green-600/20"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Cobrar
          </Button>
        )}

        {/* Cancel order — visually separated */}
        <div className="border-t border-red-500/20 mt-1 pt-2">
          <button
            onClick={() => setShowCancelConfirm(true)}
            disabled={loadingAction === 'cancel'}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-40"
          >
            {loadingAction === 'cancel' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            Cancelar Pedido
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title={`Cancelar pedido de Mesa ${table.number}`}
        description="Esta accion no se puede deshacer. Los items del pedido se perderan."
        confirmLabel="Si, cancelar"
        variant="destructive"
        onConfirm={handleCancelOrder}
      />
    </div>
  )
}
