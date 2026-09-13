'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { orderLabel } from '@/lib/utils/order-number'
import { getOrders } from '@/app/actions/orders'
import { toast } from 'sonner'
import {
  orderDateRange,
  ymdInAR,
  DATE_FILTER_OPTIONS,
  type DateFilter,
} from '@/lib/utils/order-date-range'
import { Search, ClipboardList, SearchX, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { useRealtimeChannel } from '@/lib/hooks/use-realtime-channel'
import { OrderStatusBadge, OrderDetailsDrawer } from '@/components/admin/orders'
import { formatPrice, cn } from '@/lib/utils'
import {
  parseOrderItems,
} from '@/lib/services/order-formatter'
import type { OrderWithZone, OrderStatus } from '@/lib/types/database'

interface OrdersTableProps {
  initialOrders: OrderWithZone[]
  initialDateFilter: DateFilter
}

/**
 * El numero de pedido se reinicia cada dia (ver 021_numero_de_pedido_por_dia),
 * asi que "#1" solo identifica un pedido junto con su fecha. La tabla trae
 * todos los dias, por eso la fecha se muestra siempre salvo para los de hoy.
 */
function formatOrderDay(date: Date): string {
  const ymd = ymdInAR(date)
  if (ymd === ymdInAR()) return 'Hoy'
  const ayer = new Date()
  ayer.setDate(ayer.getDate() - 1)
  if (ymd === ymdInAR(ayer)) return 'Ayer'
  const [, m, d] = ymd.split('-')
  return `${d}/${m}`
}

export function OrdersTable({ initialOrders, initialDateFilter }: OrdersTableProps) {
  const [orders, setOrders] = useState(initialOrders)
  const [searchQuery, setSearchQuery] = useState('')

  // Esta pantalla aplica los eventos sobre su propia copia, asi que si el canal
  // se cae los pedidos que entren mientras tanto no aparecen nunca. Al
  // reconectar se pide al servidor de nuevo.
  useRealtimeChannel(
    'orders-realtime',
    (canal) => canal
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
      ),
    { etiqueta: 'pedidos', onReconexion: () => recargarRef.current() }
  )

  // El componente guarda su propia copia de los pedidos, asi que un
  // router.refresh() llegaba a las props y moria ahi. Ajustar el estado durante
  // el render es el patron de React para "resetear cuando cambia una prop".
  const [pedidosDelServidor, setPedidosDelServidor] = useState(initialOrders)
  if (pedidosDelServidor !== initialOrders) {
    setPedidosDelServidor(initialOrders)
    setOrders(initialOrders)
  }
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  // Arranca en "Hoy": la lista trae todo el historico y el numero de pedido se
  // reinicia cada dia, asi que sin acotar no se puede encontrar nada.
  const [dateFilter, setDateFilter] = useState<DateFilter>(initialDateFilter)
  const [specificDate, setSpecificDate] = useState('')
  const [cargando, setCargando] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderWithZone | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Filtrar órdenes
  // El server ya devuelve solo el periodo pedido, pero el realtime inserta en
  // esta lista cualquier pedido nuevo: sin este filtro, mirando "Ayer" se
  // colaria uno de hoy. Comparar YYYY-MM-DD alcanza y no depende del huso local.
  const ordersInPeriod = useMemo(() => {
    const rango = orderDateRange(dateFilter, specificDate)
    if (!rango) return orders
    return orders.filter((order) => {
      const ymd = ymdInAR(new Date(order.created_at))
      return ymd >= rango.fromYMD && ymd <= rango.toYMD
    })
  }, [orders, dateFilter, specificDate])

  const filteredOrders = useMemo(() => {
    return ordersInPeriod.filter((order) => {
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
  }, [ordersInPeriod, statusFilter, searchQuery])

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

  // router.refresh() volveria a traer el periodo inicial de la pagina y pisaria
  // el que el usuario eligio, asi que recargar es pedir de nuevo el periodo
  // vigente. El ref lo hace accesible desde arriba (realtime) y desde aca.
  const recargarRef = useRef<() => void>(() => {})
  const handleRefresh = () => recargarRef.current()

  // Cada pedido al server lleva numero: si el usuario cambia de periodo rapido,
  // una respuesta vieja no debe pisar a la ultima.
  const peticionRef = useRef(0)

  const cargarPeriodo = useCallback(async (filtro: DateFilter, fecha: string) => {
    const nro = ++peticionRef.current
    setCargando(true)
    const rango = orderDateRange(filtro, fecha)
    const { data, error } = await getOrders(
      rango ? { dateFrom: rango.dateFrom, dateTo: rango.dateTo } : undefined
    )
    if (nro !== peticionRef.current) return
    setCargando(false)
    if (error) {
      toast.error(error)
      return
    }
    setOrders(data ?? [])
  }, [])

  // El canal de realtime se registra una vez, asi que su callback no puede
  // capturar el periodo directamente: quedaria congelado en el inicial.
  useEffect(() => {
    recargarRef.current = () => { void cargarPeriodo(dateFilter, specificDate) }
  }, [cargarPeriodo, dateFilter, specificDate])

  const elegirPreset = (filtro: DateFilter) => {
    setSpecificDate('')
    setDateFilter(filtro)
    cargarPeriodo(filtro, '')
  }

  const elegirFecha = (fecha: string) => {
    setSpecificDate(fecha)
    cargarPeriodo(dateFilter, fecha)
  }

  // Contadores por estado
  const statusCounts = useMemo(() => {
    const counts: Record<OrderStatus | 'all', number> = {
      all: ordersInPeriod.length,
      abierto: 0,
      recibido: 0,
      cuenta_pedida: 0,
      pagado: 0,
      entregado: 0,
      cancelado: 0,
    }
    ordersInPeriod.forEach((order) => {
      counts[order.status]++
    })
    return counts
  }, [ordersInPeriod])

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
        <Select
          value={specificDate ? 'custom' : dateFilter}
          onValueChange={(v) => {
            if (v === 'custom') return
            elegirPreset(v as DateFilter)
          }}
        >
          <SelectTrigger className="w-36 h-9 text-sm bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] focus:border-[var(--admin-accent)]/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)]">
            {DATE_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-[var(--admin-text)] focus:bg-[var(--admin-border)]">
                {opt.label}
              </SelectItem>
            ))}
            {specificDate && (
              <SelectItem value="custom" className="text-[var(--admin-text)] focus:bg-[var(--admin-border)]">
                Fecha elegida
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={specificDate}
          onChange={(e) => elegirFecha(e.target.value)}
          aria-label="Filtrar por fecha"
          className="w-40 h-9 text-sm bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] focus:border-[var(--admin-accent)]/50"
        />
        <p className="text-[var(--admin-text-muted)] text-sm hidden lg:block">
          {cargando
            ? 'Cargando...'
            : `${filteredOrders.length} ${filteredOrders.length === 1 ? 'pedido' : 'pedidos'}`}
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
        <div className="border border-t-0 border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] p-16 flex flex-col items-center justify-center text-center gap-3">
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
                <p className="text-xs text-[var(--admin-text-faint)] mt-1">
                  {ordersInPeriod.length === 0
                    ? 'No hay pedidos en el período elegido'
                    : 'No se encontraron pedidos con los filtros aplicados'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); elegirPreset('all') }}
                className="text-[var(--admin-accent-text)] hover:text-[var(--admin-accent-text)] hover:bg-[var(--admin-accent)]/10 text-xs h-8"
              >
                Limpiar filtros
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="border border-t-0 border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-[var(--admin-bg)]">
              <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-bg)]">
                <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">ID</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">Cliente</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold hidden sm:table-cell text-center">Fecha</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold hidden md:table-cell text-center">Items</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold text-center">Total</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold hidden lg:table-cell text-center">Método Pago</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const items = parseOrderItems(order.items)
                const orderDate = new Date(order.created_at)
                const timeStr = orderDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
                const dayStr = formatOrderDay(orderDate)
                const paymentMethod = order.payment_method

                return (
                  <tr
                    key={order.id}
                    className="hover:bg-[var(--admin-surface-2)] transition-colors group cursor-pointer"
                    onClick={() => handleViewOrder(order)}
                  >
                    <TableCell>
                      <span className="font-mono text-sm lg:text-base font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-accent-text)] transition-colors">
                        {orderLabel(order)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-sm lg:text-base text-[var(--admin-text)] group-hover:text-[var(--admin-accent-text)] transition-colors">
                        {order.customer_name}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center">
                      <span className="text-sm lg:text-base text-[var(--admin-text-muted)] whitespace-nowrap">
                        <span className="text-[var(--admin-text)]">{dayStr}</span> {timeStr}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center">
                      <span className="text-sm lg:text-base text-[var(--admin-text-muted)]">{items.length}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm lg:text-base font-semibold text-[var(--admin-price)]">
                        {formatPrice(order.total)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-center">
                      <span className="text-sm lg:text-base text-[var(--admin-text-muted)] capitalize">
                        {paymentMethod === 'cash' ? 'Efectivo'
                          : paymentMethod === 'card' ? 'Tarjeta'
                          : paymentMethod === 'transfer' || paymentMethod === 'mercadopago' ? 'Transferencia'
                          : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
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
