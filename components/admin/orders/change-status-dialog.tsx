'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { OrderStatusBadge } from './order-status-badge'
import { updateOrderStatus } from '@/app/actions/orders'
import { toast } from 'sonner'
import type { OrderStatus } from '@/lib/types/database'
import { ORDER_STATUS_CONFIG } from '@/lib/types/orders'

interface ChangeStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  currentStatus: OrderStatus
  onStatusChanged: (newStatus: OrderStatus) => void
}

const STATUS_ORDER: OrderStatus[] = ['recibido', 'pagado', 'entregado', 'cancelado']

export function ChangeStatusDialog({
  open,
  onOpenChange,
  orderId,
  currentStatus,
  onStatusChanged,
}: ChangeStatusDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null)

  const handleChangeStatus = async (newStatus: OrderStatus) => {
    if (newStatus === currentStatus) return

    setSelectedStatus(newStatus)
    setIsLoading(true)

    const result = await updateOrderStatus(orderId, newStatus)

    setIsLoading(false)
    setSelectedStatus(null)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Estado actualizado a "${ORDER_STATUS_CONFIG[newStatus].label}"`)
      onStatusChanged(newStatus)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] max-w-sm shadow-xl shadow-black/10">
        <DialogHeader>
          <DialogTitle className="text-[var(--admin-text)]">Cambiar Estado</DialogTitle>
          <p className="text-sm text-[var(--admin-text-muted)] mt-1">
            Estado actual: <OrderStatusBadge status={currentStatus} size="sm" />
          </p>
        </DialogHeader>

        <div className="grid gap-2 mt-4">
          {STATUS_ORDER.map((status) => {
            const config = ORDER_STATUS_CONFIG[status]
            const isCurrentStatus = status === currentStatus
            const isSelected = status === selectedStatus

            return (
              <Button
                key={status}
                variant="outline"
                disabled={isCurrentStatus || isLoading}
                onClick={() => handleChangeStatus(status)}
                className={`justify-start h-12 border-[var(--admin-border)] hover:border-[var(--admin-accent)]/40 ${
                  isCurrentStatus
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-[var(--admin-surface-2)]'
                }`}
              >
                {isSelected && isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <span
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: config.color }}
                  />
                )}
                <span className="text-[var(--admin-text)]">{config.label}</span>
                {isCurrentStatus && (
                  <span className="ml-auto text-xs text-[var(--admin-text-muted)]">Actual</span>
                )}
              </Button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
