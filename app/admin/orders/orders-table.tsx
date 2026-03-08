'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter, Eye, RefreshCw, ClipboardList, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AdminLayout } from '@/components/admin/layout'
import { OrderStatusBadge, OrderDetailsDrawer } from '@/components/admin/orders'
import { formatPrice } from '@/lib/utils'
import {
  formatRelativeDate,
  getShortOrderId,
  parseOrderItems,
} from '@/lib/services/order-formatter'
import { ORDER_STATUS_CONFIG } from '@/lib/types/orders'
import type { OrderWithZone, OrderStatus } from '@/lib/types/database'

interface OrdersTableProps {
  initialOrders: OrderWithZone[]
}

export function OrdersTable({ initialOrders }: OrdersTableProps) {
  const router = useRouter()
  const [orders, setOrders] = useState(initialOrders)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [selectedOrder, setSelectedOrder] = useState<OrderWithZone | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Filtrar órdenes
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Filtro por estado
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false
      }

      // Filtro por búsqueda
      if (searchQuery) {
        const search = searchQuery.toLowerCase()
        const matchesName = order.customer_name?.toLowerCase().includes(search)
        const matchesPhone = order.customer_phone?.toLowerCase().includes(search)
        const matchesAddress = order.customer_address?.toLowerCase().includes(search)
        const matchesId = order.id.toLowerCase().includes(search)

        if (!matchesName && !matchesPhone && !matchesAddress && !matchesId) {
          return false
        }
      }

      return true
    })
  }, [orders, statusFilter, searchQuery])

  const handleViewOrder = (order: OrderWithZone) => {
    setSelectedOrder(order)
    setIsDrawerOpen(true)
  }

  const handleStatusChanged = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    )
  }

  const handleRefresh = () => {
    router.refresh()
  }

  // Contadores por estado
  const statusCounts = useMemo(() => {
    const counts: Record<OrderStatus | 'all', number> = {
      all: orders.length,
      abierto: 0,
      recibido: 0,
      cuenta_pedida: 0,
      pagado: 0,
      entregado: 0,
      cancelado: 0,
    }
    orders.forEach((order) => {
      counts[order.status]++
    })
    return counts
  }, [orders])

  return (
    <AdminLayout title="Pedidos" description="Gestiona los pedidos de tu negocio">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
          <Input
            placeholder="Buscar por nombre, teléfono, dirección..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 placeholder:text-[var(--admin-text-muted)]"
          />
        </div>

        <div className="flex gap-3">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all')}
          >
            <SelectTrigger className="w-[180px] bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10">
              <Filter className="h-4 w-4 mr-2 text-[var(--admin-text-muted)]" />
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)]">
              <SelectItem value="all" className="text-[var(--admin-text)] focus:bg-[var(--admin-surface-2)]">
                Todos ({statusCounts.all})
              </SelectItem>
              {(Object.keys(ORDER_STATUS_CONFIG) as OrderStatus[]).map((status) => (
                <SelectItem
                  key={status}
                  value={status}
                  className="text-[var(--admin-text)] focus:bg-[var(--admin-surface-2)]"
                >
                  {ORDER_STATUS_CONFIG[status].label} ({statusCounts[status]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  className="border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:bg-[var(--admin-surface-2)] h-10"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Actualizar pedidos</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] p-16 flex flex-col items-center justify-center text-center gap-3">
          {orders.length === 0 ? (
            <>
              <ClipboardList className="h-10 w-10 text-[var(--admin-text-placeholder)]" />
              <div>
                <p className="text-sm font-medium text-[var(--admin-text-muted)]">No hay pedidos todavía</p>
                <p className="text-xs text-[var(--admin-text-faint)] mt-1">Los pedidos nuevos aparecerán aquí</p>
              </div>
            </>
          ) : (
            <>
              <SearchX className="h-10 w-10 text-[var(--admin-text-placeholder)]" />
              <div>
                <p className="text-sm font-medium text-[var(--admin-text-muted)]">Sin resultados</p>
                <p className="text-xs text-[var(--admin-text-faint)] mt-1">No se encontraron pedidos con los filtros aplicados</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearchQuery(''); setStatusFilter('all') }}
                className="text-[var(--admin-accent-text)] hover:text-[var(--admin-accent-text)] hover:bg-[var(--admin-accent)]/10 text-xs h-8"
              >
                Limpiar filtros
              </Button>
            </>
          )}
        </div>
      ) : (
        <div
          className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden"
        >
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-[var(--admin-bg)]">
              <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-bg)]">
                <TableHead className="text-[var(--admin-text-muted)] font-semibold">Pedido</TableHead>
                <TableHead className="text-[var(--admin-text-muted)] font-semibold">Cliente</TableHead>
                <TableHead className="text-[var(--admin-text-muted)] font-semibold">Productos</TableHead>
                <TableHead className="text-[var(--admin-text-muted)] font-semibold">Total</TableHead>
                <TableHead className="text-[var(--admin-text-muted)] font-semibold">Estado</TableHead>
                <TableHead className="text-[var(--admin-text-muted)] font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order, index) => {
                const items = parseOrderItems(order.items)
                const itemsSummary = items.length > 2
                  ? `${items.slice(0, 2).map(i => `${i.quantity}x ${i.name}`).join(', ')}...`
                  : items.map(i => `${i.quantity}x ${i.name}`).join(', ')

                return (
                  <tr
                    key={order.id}
                    className="border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] transition-colors group cursor-pointer"
                    onClick={() => handleViewOrder(order)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-mono text-[var(--admin-text)] font-semibold">
                          #{getShortOrderId(order.id)}
                        </p>
                        <p className="text-xs text-[var(--admin-text-muted)]">
                          {formatRelativeDate(order.created_at)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-[var(--admin-text)]">{order.customer_name}</p>
                        <p className="text-xs text-[var(--admin-text-muted)]">{order.customer_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-[var(--admin-text-muted)] text-sm max-w-[200px] truncate">
                        {itemsSummary}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-[var(--admin-accent-text)]">
                        {formatPrice(order.total)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewOrder(order)
                              }}
                              className="h-8 w-8 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)]"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver detalle</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </tr>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Order Details Drawer */}
      <OrderDetailsDrawer
        order={selectedOrder}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onStatusChanged={handleStatusChanged}
      />
    </AdminLayout>
  )
}
