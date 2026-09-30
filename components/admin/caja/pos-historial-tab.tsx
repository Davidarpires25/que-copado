'use client'

import { useState, useMemo, useEffect, useCallback, Fragment } from 'react'
import { printClientTicketAction } from '@/app/actions/print'
import { facturarPedido, facturasDePedidos, type EstadoFacturaPedido } from '@/app/actions/facturas'
import {
  ChevronDown,
  Store,
  Table2,
  MessageSquare,
  Printer,
  ClipboardList,
  SearchX,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatPrice, cn } from '@/lib/utils'
import { paymentMethodLabel } from '@/lib/constants/payments'
import { estaCobrado } from '@/lib/types/database'
import type { PaymentMethod, Json } from '@/lib/types/database'
import type { OrderItem } from '@/lib/types/orders'
import type { OrderWithSplits } from '@/lib/types/cash-register'

// ─── Types ───────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'activa' | 'sin_cobrar' | 'anulada'

interface PosHistorialTabProps {
  orders: OrderWithSplits[]
  loading: boolean
  onCancelOrder: (orderId: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseItems(items: Json): OrderItem[] {
  if (Array.isArray(items)) return items as unknown as OrderItem[]
  return []
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}


const TABLE_HEAD_CLASS =
  'text-xs uppercase tracking-wide text-[var(--admin-text-faint)] font-semibold'

// ─── Fila de orden (expandible) ───────────────────────────────────────────────

function OrderRow({
  order,
  onCancelOrder,
  factura,
  facturable,
  onFacturar,
}: {
  order: OrderWithSplits
  onCancelOrder: (id: string) => void
  /** La última factura o nota de crédito del pedido, si tiene. */
  factura?: EstadoFacturaPedido
  /** Cobrado, sin factura, con la facturación encendida: se ofrece "Facturar". */
  facturable: boolean
  onFacturar: (id: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [facturando, setFacturando] = useState(false)
  // Lo que no salió es la excepción: una venta sin facturar (spec
  // facturacion-electronica). Lo emitido va como dato, en gris.
  const facturaFallida = factura && factura.estado !== 'emitida'
  const facturar = async () => {
    setFacturando(true)
    await onFacturar(order.id)
    setFacturando(false)
  }
  const isCancelled = order.status === 'cancelado'
  const sinCobrar = !isCancelled && !estaCobrado(order)
  const items = parseItems(order.items)

  const itemsSummary = items
    .slice(0, 3)
    .map((i) => `${i.quantity}x ${i.name}`)
    .join(', ')
  const extraItems = items.length > 3 ? ` +${items.length - 3}` : ''

  const paymentMethods =
    order.payment_splits && order.payment_splits.length > 1
      ? order.payment_splits.map((s) => s.method as PaymentMethod)
      : [order.payment_method as PaymentMethod]

  return (
    <Fragment>
      <TableRow
        onClick={() => setExpanded((p) => !p)}
        className={cn(
          'border-[var(--admin-border)] transition-colors group cursor-pointer',
          isCancelled ? 'opacity-55' : 'hover:bg-[var(--admin-surface-2)]'
        )}
        aria-expanded={expanded}
      >
        <TableCell className="w-8 pr-0">
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-[var(--admin-text-faint)] transition-transform duration-200',
              expanded && 'rotate-180'
            )}
          />
        </TableCell>

        <TableCell>
          <span className="text-sm text-[var(--admin-text-muted)] tabular-nums">
            {formatTime(order.created_at)}
          </span>
        </TableCell>

        <TableCell className="max-w-[240px]">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {order.order_type === 'mesa' ? (
                <Table2 className="h-3.5 w-3.5 text-[var(--admin-text-faint)] shrink-0" />
              ) : (
                <Store className="h-3.5 w-3.5 text-[var(--admin-text-faint)] shrink-0" />
              )}
              <span className="font-semibold text-sm text-[var(--admin-text)] truncate group-hover:text-[var(--admin-accent-text)] transition-colors">
                {order.order_type === 'mesa'
                  // Sin el nombre de la mesa a proposito: el historial lista
                  // pedidos de `orders`, que guarda el numero y no el nombre.
                  // Traerlo seria una consulta mas por una pantalla de consulta,
                  // y un pedido viejo con el nombre de hoy tampoco seria mas
                  // cierto: la mesa pudo haberse renombrado desde entonces.
                  ? `Mesa ${order.table_number || ''}`
                  : 'Mostrador'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-[var(--admin-text-muted)] truncate">
                {itemsSummary}{extraItems}
              </p>
              {order.notes && (
                <MessageSquare className="h-2.5 w-2.5 text-[var(--admin-accent-text)]/60 shrink-0" />
              )}
            </div>
          </div>
        </TableCell>

        <TableCell className="hidden sm:table-cell">
          <div className="flex flex-col gap-0.5">
            {/* Sin cobrar no hay medio: el que trae el pedido es el de arranque. */}
            {sinCobrar ? (
              <span className="text-sm text-[var(--admin-text-faint)]">—</span>
            ) : paymentMethods.map((method, i) => (
              <span
                key={i}
                className="text-sm text-[var(--admin-text-muted)] capitalize"
              >
                {paymentMethodLabel(method)}
              </span>
            ))}
          </div>
        </TableCell>

        <TableCell>
          <span
            className={cn(
              'text-sm font-semibold tabular-nums',
              isCancelled
                ? 'line-through text-[var(--admin-text-faint)]'
                : sinCobrar
                  ? 'text-[var(--admin-text-muted)]'
                  : 'text-[var(--admin-price)]'
            )}
          >
            {formatPrice(order.total)}
          </span>
        </TableCell>

        <TableCell>
          {/* El estado, como texto. En la caja nada de esto es la excepcion:
              durante el servicio las mesas abiertas y los pedidos en cocina
              estan "Sin cobrar" todo el tiempo, y la pestaña ya los cuenta.
              En pildora, las tres palabras eran ruido (David, 2026-09-27). */}
          <span
            className={cn(
              'text-sm whitespace-nowrap',
              sinCobrar ? 'font-medium text-aviso-texto'
                : isCancelled ? 'text-peligro-texto'
                : 'text-[var(--admin-text-muted)]'
            )}
          >
            {sinCobrar ? 'Sin cobrar' : isCancelled ? 'Anulado' : 'Pagado'}
          </span>
          {factura && (
            <span
              className={cn(
                'block text-xs whitespace-nowrap mt-0.5',
                facturaFallida ? 'font-medium text-aviso-texto' : 'text-[var(--admin-text-muted)]'
              )}
            >
              {factura.estado === 'emitida'
                ? factura.texto
                : `${factura.tipo === 13 ? 'Nota de crédito' : 'Factura'} ${factura.estado === 'pendiente' ? 'pendiente' : 'rechazada'}`}
            </span>
          )}
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="border-[var(--admin-border)] hover:bg-transparent">
          <TableCell colSpan={6} className="p-0 bg-[var(--admin-bg)]/40">
            <div className="px-4 py-3 border-t border-[var(--admin-border)]/50">
              <div className="space-y-1.5 pl-6">
                {items.length > 0 ? (
                  items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="tabular-nums text-[var(--admin-text-muted)] shrink-0 w-6 text-right">
                          {item.quantity}x
                        </span>
                        <span className="text-[var(--admin-text)] truncate">{item.name}</span>
                      </div>
                      <span className="tabular-nums text-[var(--admin-text-muted)] shrink-0 ml-4">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[var(--admin-text-muted)]">Sin detalle disponible</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[var(--admin-border)]/40 pl-6">
                <div className="space-y-0.5">
                  {facturaFallida && factura.motivo && (
                    <p className="text-xs text-aviso-texto">{factura.motivo}</p>
                  )}
                  {order.payment_splits && order.payment_splits.length > 1 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {order.payment_splits.map((s, i) => (
                        <span key={i} className="text-xs text-[var(--admin-text-muted)]">
                          {paymentMethodLabel(s.method)}: {formatPrice(s.amount)}
                        </span>
                      ))}
                    </div>
                  )}
                  {order.notes && (
                    <p className="text-xs text-[var(--admin-text-muted)]">
                      Nota: {order.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(facturaFallida || facturable) && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={facturando}
                      onClick={(e) => {
                        e.stopPropagation()
                        void facturar()
                      }}
                      className="h-7 px-3 text-xs"
                    >
                      {facturaFallida ? 'Reintentar' : 'Facturar'}
                    </Button>
                  )}
                  {!isCancelled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        printClientTicketAction(order.id)
                          .then((r) => { if (r.error) toast.error(r.error) })
                          .catch(() => toast.error('Error al imprimir'))
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] bg-[var(--admin-surface-2)] hover:bg-[var(--admin-border)] transition-colors"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Ticket
                    </button>
                  )}
                  {!isCancelled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCancelOrder(order.id)
                      }}
                      className="h-7 px-3 text-xs text-peligro-texto hover:bg-peligro/10 active:scale-95 transition-all"
                    >
                      Anular
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  )
}

// ─── Totalizador por método de pago ───────────────────────────────────────────



// ─── Componente principal ─────────────────────────────────────────────────────

export function PosHistorialTab({
  orders,
  loading,
  onCancelOrder,
}: PosHistorialTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [facturas, setFacturas] = useState<{ activa: boolean; porPedido: Record<string, EstadoFacturaPedido> }>({
    activa: false,
    porPedido: {},
  })

  // Las facturas de los pedidos a la vista. Se piden aparte: la mayoría de los
  // locales no factura desde acá, y el Historial no tiene por qué esperarlas.
  const ids = useMemo(() => orders.map((o) => o.id).join(','), [orders])
  const pedirFacturas = useCallback(() => facturasDePedidos(ids ? ids.split(',') : []), [ids])
  useEffect(() => {
    // Si los pedidos cambian antes de que llegue la respuesta, esa se descarta.
    let vigente = true
    pedirFacturas().then((r) => {
      if (vigente) setFacturas(r)
    })
    return () => {
      vigente = false
    }
  }, [pedirFacturas])
  const cargarFacturas = async () => setFacturas(await pedirFacturas())

  const handleFacturar = async (orderId: string) => {
    const r = await facturarPedido(orderId)
    if (r.error) toast.warning(r.error, { duration: 10_000 })
    else if (r.texto) toast.success(r.texto)
    await cargarFacturas()
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const isCancelled = order.status === 'cancelado'
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'anulada' && isCancelled) ||
        (statusFilter === 'sin_cobrar' && !isCancelled && !estaCobrado(order)) ||
        (statusFilter === 'activa' && estaCobrado(order))
      return matchesStatus
    })
  }, [orders, statusFilter])


  const statusCounts = useMemo(() => ({
    all: orders.length,
    activa: orders.filter(estaCobrado).length,
    sin_cobrar: orders.filter((o) => o.status !== 'cancelado' && !estaCobrado(o)).length,
    anulada: orders.filter((o) => o.status === 'cancelado').length,
  }), [orders])

  const statusTabs: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'activa', label: 'Pagadas' },
    { value: 'sin_cobrar', label: 'Sin cobrar' },
    { value: 'anulada', label: 'Anuladas' },
  ]

  return (
    <div className="flex flex-col h-full bg-[var(--admin-bg)] overflow-hidden">

      {/* Solo el estado. Se fueron la linea "N ventas" (contaba tambien lo sin
          cobrar y lo anulado, y repetia el numero de la pestaña), el filtro
          por medio de pago y el pie con el total por medio: separar lo cobrado
          por medio es lo que hace el cierre, que es donde se cuenta la plata.
          El total ya es el "Vendido" de la barra de turno. */}
      {/* Status tabs — orders-table style */}
      <div className="shrink-0 flex items-center gap-0 border-b border-[var(--admin-border)] bg-[var(--admin-surface)] overflow-x-auto no-scrollbar px-2">
        {statusTabs.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 tactil:min-h-11 transition-colors cursor-pointer',
              statusFilter === value
                ? 'border-[var(--admin-accent)] text-[var(--admin-accent-text)]'
                : 'border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
            )}
          >
            {label}
            {/* Un conteo es texto, no una pildora (spec tablas-del-admin). */}
            {statusCounts[value] > 0 && (
              <span className="ml-1.5 text-xs font-medium tabular-nums text-[var(--admin-text-faint)]">
                {statusCounts[value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tabla / estados vacíos */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-6 w-6 border-2 border-[var(--admin-accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-16">
            {orders.length === 0 ? (
              <>
                <ClipboardList className="h-10 w-10 text-[var(--admin-text-placeholder)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--admin-text-muted)]">
                    No hay ventas registradas en esta sesión
                  </p>
                  <p className="text-xs text-[var(--admin-text-faint)] mt-1">
                    Las ventas del turno aparecerán aquí
                  </p>
                </div>
              </>
            ) : (
              <>
                <SearchX className="h-10 w-10 text-[var(--admin-text-placeholder)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--admin-text-muted)]">Nada en esta pestaña</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="bg-[var(--admin-surface)]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[var(--admin-bg)]">
                <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-bg)]">
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'w-8')} />
                  <TableHead className={TABLE_HEAD_CLASS}>Hora</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Detalle</TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'hidden sm:table-cell')}>Método</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Total</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onCancelOrder={onCancelOrder}
                    factura={facturas.porPedido[order.id]}
                    facturable={facturas.activa && estaCobrado(order) && !facturas.porPedido[order.id]}
                    onFacturar={handleFacturar}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

    </div>
  )
}
