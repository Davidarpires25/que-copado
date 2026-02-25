'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, Filter, Eye, RefreshCw } from 'lucide-react'
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8b5c9]" />
          <Input
            placeholder="Buscar por nombre, teléfono, dirección..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] h-10 placeholder:text-[#a8b5c9] placeholder:italic"
          />
        </div>

        <div className="flex gap-3">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all')}
          >
            <SelectTrigger className="w-[180px] bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] h-10">
              <Filter className="h-4 w-4 mr-2 text-[#a8b5c9]" />
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1d24] border-[#2a2f3a]">
              <SelectItem value="all" className="text-[#f0f2f5] focus:bg-[#252a35]">
                Todos ({statusCounts.all})
              </SelectItem>
              {(Object.keys(ORDER_STATUS_CONFIG) as OrderStatus[]).map((status) => (
                <SelectItem
                  key={status}
                  value={status}
                  className="text-[#f0f2f5] focus:bg-[#252a35]"
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
                  className="border-[#2a2f3a] text-[#c4cdd9] hover:bg-[#252a35] h-10"
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#2a2f3a] bg-[#1a1d24] p-16 text-center"
        >
          <p className="text-[#a8b5c9]">
            {orders.length === 0
              ? 'No hay pedidos todavía'
              : 'No se encontraron pedidos con los filtros aplicados'}
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#2a2f3a] bg-[#1a1d24] overflow-hidden"
        >
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-[#1a1d24]">
              <TableRow className="border-[#2a2f3a] hover:bg-[#1a1d24]">
                <TableHead className="text-[#a8b5c9] font-semibold">Pedido</TableHead>
                <TableHead className="text-[#a8b5c9] font-semibold">Cliente</TableHead>
                <TableHead className="text-[#a8b5c9] font-semibold">Productos</TableHead>
                <TableHead className="text-[#a8b5c9] font-semibold">Total</TableHead>
                <TableHead className="text-[#a8b5c9] font-semibold">Estado</TableHead>
                <TableHead className="text-[#a8b5c9] font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order, index) => {
                const items = parseOrderItems(order.items)
                const itemsSummary = items.length > 2
                  ? `${items.slice(0, 2).map(i => `${i.quantity}x ${i.name}`).join(', ')}...`
                  : items.map(i => `${i.quantity}x ${i.name}`).join(', ')

                return (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-[#2a2f3a] hover:bg-[#252a35] transition-colors group cursor-pointer"
                    onClick={() => handleViewOrder(order)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-mono text-[#f0f2f5] font-semibold">
                          #{getShortOrderId(order.id)}
                        </p>
                        <p className="text-xs text-[#a8b5c9]">
                          {formatRelativeDate(order.created_at)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-[#f0f2f5]">{order.customer_name}</p>
                        <p className="text-xs text-[#a8b5c9]">{order.customer_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-[#c4cdd9] text-sm max-w-[200px] truncate">
                        {itemsSummary}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-[#FEC501]">
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
                              className="h-8 w-8 text-[#a8b5c9] hover:text-[#f0f2f5] hover:bg-[#2a2f3a]"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver detalle</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </motion.tr>
                )
              })}
            </TableBody>
          </Table>
        </motion.div>
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
