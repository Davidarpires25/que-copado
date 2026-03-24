'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ClipboardList, SearchX, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AdminLayout } from '@/components/admin/layout'
import { createClient } from '@/lib/supabase/client'
import { OrderStatusBadge, OrderDetailsDrawer } from '@/components/admin/orders'
import { formatPrice, cn } from '@/lib/utils'
import {
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

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => setOrders((prev) => [payload.new as OrderWithZone, ...prev])
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => setOrders((prev) =>
          prev.map((o) => o.id === payload.new.id ? { ...o, ...payload.new } as OrderWithZone : o)
        )
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' },
        (payload) => setOrders((prev) => prev.filter((o) => o.id !== payload.old.id))
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])
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

  // Tab labels matching design
  const tabs: Array<{ key: OrderStatus | 'all'; label: string }> = [
    { key: 'all', label: 'Todos' },
    { key: 'abierto', label: 'Abierto' },
    { key: 'recibido', label: 'Recibido' },
    { key: 'pagado', label: 'Pagado' },
    { key: 'entregado', label: 'Entregado' },
    { key: 'cancelado', label: 'Cancelado' },
  ]

  return (
    <AdminLayout title="Pedidos" description="Gestiona los pedidos de tu negocio">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: statusCounts.all, color: 'text-[var(--admin-accent-text)]', bg: 'bg-[var(--admin-accent)]/10', border: 'hover:border-[var(--admin-accent)]/30', icon: ClipboardList },
          { label: 'Abiertos', value: statusCounts.abierto + statusCounts.recibido, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'hover:border-blue-500/30', icon: Filter },
          { label: 'Pagados', value: statusCounts.pagado + statusCounts.entregado, color: 'text-green-500', bg: 'bg-green-500/10', border: 'hover:border-green-500/30', icon: Search },
          { label: 'Cancelados', value: statusCounts.cancelado, color: 'text-red-500', bg: 'bg-red-500/10', border: 'hover:border-red-500/30', icon: SearchX },
        ].map(({ label, value, color, bg, border, icon: Icon }) => (
          <div key={label} className={`bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 lg:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] ${border} transition-all`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--admin-text-muted)] text-sm font-medium">{label}</p>
                <p className="text-2xl lg:text-3xl font-bold text-[var(--admin-text)] mt-1">{value}</p>
              </div>
              <div className={`w-10 h-10 lg:w-12 lg:h-12 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`h-5 w-5 lg:h-6 lg:w-6 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top bar: search + refresh */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
          <Input
            placeholder="Buscar pedido..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-9 text-sm placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
          />
        </div>
        <p className="text-[var(--admin-text-muted)] text-sm hidden sm:block">
          {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'}
        </p>
        <div className="ml-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] h-9 gap-2"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Actualizar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Actualizar pedidos</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-0 border-b border-[var(--admin-border)] mb-0 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              statusFilter === tab.key
                ? 'border-[var(--admin-accent)] text-[var(--admin-accent-text)]'
                : 'border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
            )}
          >
            {tab.label}
            {statusCounts[tab.key] > 0 && (
              <span className={cn(
                'ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium',
                statusFilter === tab.key
                  ? 'bg-[var(--admin-accent)]/20 text-[var(--admin-accent-text)]'
                  : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)]'
              )}>
                {statusCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-b-xl border border-t-0 border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] p-16 flex flex-col items-center justify-center text-center gap-3">
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
        <div className="rounded-b-xl border border-t-0 border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-[var(--admin-bg)]">
              <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-bg)]">
                <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">ID</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">Cliente</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold hidden sm:table-cell">Hora</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold hidden md:table-cell text-center">Items</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">Total</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold hidden lg:table-cell">Método Pago</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const items = parseOrderItems(order.items)
                const orderDate = new Date(order.created_at)
                const timeStr = orderDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
                const paymentMethod = order.payment_method

                return (
                  <tr
                    key={order.id}
                    className="hover:bg-[var(--admin-surface-2)] transition-colors group cursor-pointer"
                    onClick={() => handleViewOrder(order)}
                  >
                    <TableCell>
                      <span className="font-mono text-sm lg:text-base font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-accent-text)] transition-colors">
                        #{getShortOrderId(order.id)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-sm lg:text-base text-[var(--admin-text)] group-hover:text-[var(--admin-accent-text)] transition-colors">
                        {order.customer_name}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-sm lg:text-base text-[var(--admin-text-muted)]">{timeStr}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center">
                      <span className="text-sm lg:text-base text-[var(--admin-text-muted)]">{items.length}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm lg:text-base font-semibold text-[var(--admin-accent-text)]">
                        {formatPrice(order.total)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm lg:text-base text-[var(--admin-text-muted)] capitalize">
                        {paymentMethod === 'cash' ? 'Efectivo'
                          : paymentMethod === 'card' ? 'Tarjeta'
                          : paymentMethod === 'transfer' || paymentMethod === 'mercadopago' ? 'Transferencia'
                          : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} size="sm" />
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
