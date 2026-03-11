'use client'

import { useState, useCallback, useEffect } from 'react'

function printInBackground(url: string) {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;top:0;left:0;'
  iframe.src = url
  document.body.appendChild(iframe)
  iframe.addEventListener('load', () => {
    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 3000)
    }, 400)
  })
}
import { useRouter } from 'next/navigation'
import { Store, UtensilsCrossed, History, Clock, Printer, ChefHat, X } from 'lucide-react'
import { PosProductGrid } from './product-grid'
import { OrderBuilder, type PosCartItem } from './order-builder'
import { PaymentPanel } from './payment-panel'
import { SessionStatusBar } from './session-status-bar'
import { CashMovementDialog } from './cash-movement-dialog'
import { PosHistorialTab } from './pos-historial-tab'
import { TableGrid } from './table-grid'
import { TableOrderPanel } from './table-order-panel'
import { AddItemsDialog } from './add-items-dialog'
import { TablePaymentDialog } from './table-payment-dialog'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  createMostadorOrder,
  completeMostadorPayment,
  cancelPosOrder,
  cancelMostadorOrder,
  getPendingMostadorOrders,
} from '@/app/actions/pos-orders'
import { getSessionOrders, getSessionSummary } from '@/app/actions/cash-register'
import { openTable, getTables } from '@/app/actions/tables'
import { toast } from 'sonner'
import { cn, formatPrice } from '@/lib/utils'
import type { Category, Product, PaymentMethod, Order } from '@/lib/types/database'
import type { CashRegisterSession, SessionSummary, PaymentSplit, OrderWithSplits } from '@/lib/types/cash-register'
import type { TableWithOrder } from '@/lib/types/tables'

type PosMode = 'mostrador' | 'mesas' | 'historial'

interface PosInterfaceProps {
  products: Product[]
  categories: Category[]
  session: CashRegisterSession
  initialTables: TableWithOrder[]
  onCloseSession: (summary: SessionSummary) => void
  onSessionUpdate: (session: CashRegisterSession) => void
}

export function PosInterface({
  products,
  categories,
  session,
  initialTables,
  onCloseSession,
  onSessionUpdate,
}: PosInterfaceProps) {
  const router = useRouter()

  // Mode
  const [mode, setMode] = useState<PosMode>('mostrador')

  // Mostrador cart state
  const [items, setItems] = useState<PosCartItem[]>([])
  const [notes, setNotes] = useState('')

  // Mostrador UI state
  const [showPayment, setShowPayment] = useState(false)
  const [showMovement, setShowMovement] = useState(false)
  const [historialLoading, setHistorialLoading] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [sessionOrders, setSessionOrders] = useState<OrderWithSplits[]>([])

  // Pending mostrador orders (abierto)
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [payingOrder, setPayingOrder] = useState<Order | null>(null)
  const [payingOrderLoading, setPayingOrderLoading] = useState(false)

  // Cancel order confirm
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)

  // Mobile cart sheet (Mostrador)
  const [showMobileCart, setShowMobileCart] = useState(false)

  // Mobile table panel sheet (Mesas)
  const [showMobileTablePanel, setShowMobileTablePanel] = useState(false)

  // Table state
  const [tables, setTables] = useState<TableWithOrder[]>(initialTables)
  const [selectedTable, setSelectedTable] = useState<TableWithOrder | null>(null)
  const [showAddItems, setShowAddItems] = useState(false)
  const [showTablePayment, setShowTablePayment] = useState(false)
  const [addItemsSaleTag, setAddItemsSaleTag] = useState<string | null>(null)

  // Computed
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const hasKitchenItems = items.some((item) => item.product_type === 'elaborado')
  const currentCash =
    session.opening_balance +
    session.total_cash_sales +
    session.total_deposits -
    session.total_withdrawals
  const openTablesCount = tables.filter((t) => t.status !== 'libre').length

  // ─── Refresh ─────────────────────────────────────────────
  const refreshTables = async () => {
    const { data } = await getTables()
    if (data) {
      setTables(data)
      if (selectedTable) {
        const updated = data.find((t) => t.id === selectedTable.id)
        if (updated && updated.status !== 'libre') {
          setSelectedTable(updated)
        } else {
          setSelectedTable(null)
        }
      }
    }
  }

  const refreshPendingOrders = useCallback(async () => {
    setPendingLoading(true)
    const { data } = await getPendingMostadorOrders(session.id)
    if (data) setPendingOrders(data)
    setPendingLoading(false)
  }, [session.id])

  // Carga inicial de pedidos pendientes al montar (B1)
  useEffect(() => {
    void refreshPendingOrders()
  }, [refreshPendingOrders])

  // ─── Mostrador handlers ─────────────────────────────────
  const handleAddItem = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        toast.success(`${product.name} x${existing.quantity + 1}`, {
          duration: 1000,
          position: 'top-center',
        })
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      toast.success(`${product.name} agregado`, {
        duration: 1000,
        position: 'top-center',
      })
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image_url: product.image_url,
          product_type: product.product_type ?? null,
        },
      ]
    })
  }, [])

  const handleUpdateQuantity = useCallback((id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }, [])

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const handleSetItemNotes = useCallback((id: string, itemNotes: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, notes: itemNotes || null } : item
      )
    )
  }, [])

  // "Confirmar pedido" — crea orden abierta y envía a cocina
  const handleCheckout = () => {
    if (items.length === 0) return
    handleConfirmOrder()
  }

  const handleConfirmOrder = async () => {
    if (items.length === 0 || confirmLoading) return
    setConfirmLoading(true)

    const { data, error } = await createMostadorOrder({
      items: items.map(({ id, name, price, quantity, notes }) => ({
        id,
        name,
        price,
        quantity,
        notes: notes || null,
      })),
      total: subtotal,
      notes: notes || null,
      session_id: session.id,
    })

    setConfirmLoading(false)

    if (error) {
      toast.error(error)
      return
    }

    if (data) {
      if (hasKitchenItems) {
        printInBackground(`/admin/caja/ticket/${data.id}/print?kitchen=1`)
        toast.success('Pedido enviado a cocina')
        setItems([])
        setNotes('')
        await refreshPendingOrders()
      } else {
        // Solo reventa: cobro inmediato sin pasar por la tarjeta
        toast.success('Pedido registrado')
        setItems([])
        setNotes('')
        setPayingOrder(data)
      }
    }
  }

  const handleLoadHistorial = useCallback(async () => {
    setHistorialLoading(true)
    const { data } = await getSessionOrders(session.id)
    if (data) setSessionOrders(data)
    setHistorialLoading(false)
  }, [session.id])

  const handleSwitchToHistorial = async () => {
    setMode('historial')
    await handleLoadHistorial()
  }

  const handleSwitchToMostrador = async () => {
    setMode('mostrador')
    await refreshPendingOrders()
  }

  const handleCancelOrder = async (orderId: string, isMostrador = false) => {
    setCancelOrderId(null)
    const { error } = isMostrador
      ? await cancelMostadorOrder(orderId)
      : await cancelPosOrder(orderId)
    if (error) {
      toast.error(error)
      return
    }
    toast.success('Pedido cancelado')
    if (isMostrador) {
      await refreshPendingOrders()
    } else {
      router.refresh()
      await handleLoadHistorial()
      const { data: summaryData } = await getSessionSummary(session.id)
      if (summaryData) onSessionUpdate(summaryData.session)
    }
  }

  const handleCloseSessionClick = async () => {
    const { data: summary } = await getSessionSummary(session.id)
    if (summary) {
      onCloseSession(summary)
    }
  }

  const handleMovementSuccess = async () => {
    const { data: summary } = await getSessionSummary(session.id)
    if (summary) {
      onSessionUpdate(summary.session)
    }
  }

  // ─── Pending mostrador handlers ──────────────────────────
  const handlePayPendingOrder = async (method: PaymentMethod, splits?: PaymentSplit[]) => {
    if (!payingOrder) return
    setPayingOrderLoading(true)

    const { data, error } = await completeMostadorPayment(
      payingOrder.id,
      method,
      session.id,
      splits
    )

    setPayingOrderLoading(false)

    if (error) {
      toast.error(error)
      return
    }

    if (data) {
      toast.success('Pago registrado')
      setPayingOrder(null)
      router.refresh()
      await refreshPendingOrders()

      const orderTotal = payingOrder.total
      const sessionDelta: Partial<CashRegisterSession> = {
        total_sales: session.total_sales + orderTotal,
        total_orders: session.total_orders + 1,
      }

      if (splits && splits.length > 1) {
        // Hybrid: accumulate per split method
        for (const s of splits) {
          const field =
            s.method === 'cash' ? 'total_cash_sales'
            : s.method === 'card' ? 'total_card_sales'
            : 'total_transfer_sales'
          sessionDelta[field] = ((sessionDelta[field] as number | undefined) ?? (session[field as keyof CashRegisterSession] as number)) + s.amount
        }
      } else {
        const salesField =
          method === 'cash' ? 'total_cash_sales'
          : method === 'card' ? 'total_card_sales'
          : 'total_transfer_sales'
        sessionDelta[salesField] = (session[salesField as keyof CashRegisterSession] as number) + orderTotal
      }

      onSessionUpdate({ ...session, ...sessionDelta })
    }
  }

  // ─── Table handlers ─────────────────────────────────────
  const handleOpenTable = async (table: TableWithOrder) => {
    const { data, error } = await openTable(table.id, session.id)
    if (error) {
      toast.error(error)
      return
    }
    if (data) {
      toast.success(`Mesa ${table.number} abierta`)
      await refreshTables()
      const { data: updatedTables } = await getTables()
      if (updatedTables) {
        setTables(updatedTables)
        const opened = updatedTables.find((t) => t.id === table.id)
        if (opened) {
          setSelectedTable(opened)
          setShowMobileTablePanel(true)
        }
      }
    }
  }

  const handleSelectTable = (table: TableWithOrder) => {
    setSelectedTable(table)
    setShowMobileTablePanel(true)
  }

  const handleTableItemsAdded = async () => {
    setShowAddItems(false)
    setAddItemsSaleTag(null)
    await refreshTables()
  }

  const handleTableBillRequested = async () => {
    await refreshTables()
  }

  const handleTablePaid = async () => {
    setShowTablePayment(false)
    setSelectedTable(null)
    router.refresh()
    await refreshTables()
    const { data: summary } = await getSessionSummary(session.id)
    if (summary) {
      onSessionUpdate(summary.session)
    }
  }

  const handleTableOrderCancelled = async () => {
    setSelectedTable(null)
    await refreshTables()
  }

  return (
    <div className="h-full flex flex-col bg-[var(--admin-bg)]">
      {/* Mode tabs */}
      <div className="flex border-b border-[var(--admin-border)] bg-[var(--admin-surface)] shrink-0">
        <button
          onClick={handleSwitchToMostrador}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 cursor-pointer',
            mode === 'mostrador'
              ? 'text-[var(--admin-accent-text)] border-[var(--admin-accent)]'
              : 'text-[var(--admin-text-muted)] border-transparent hover:text-[var(--admin-text)]'
          )}
        >
          <Store className="h-4 w-4" />
          Mostrador
          {pendingOrders.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-[var(--admin-accent)]/15 text-[var(--admin-accent-text)] rounded-full">
              {pendingOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setMode('mesas')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 cursor-pointer',
            mode === 'mesas'
              ? 'text-[var(--admin-accent-text)] border-[var(--admin-accent)]'
              : 'text-[var(--admin-text-muted)] border-transparent hover:text-[var(--admin-text)]'
          )}
        >
          <UtensilsCrossed className="h-4 w-4" />
          Mesas
          {openTablesCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-[var(--admin-accent)]/15 text-[var(--admin-accent-text)] rounded-full">
              {openTablesCount}
            </span>
          )}
        </button>
        <button
          onClick={handleSwitchToHistorial}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 cursor-pointer',
            mode === 'historial'
              ? 'text-[var(--admin-accent-text)] border-[var(--admin-accent)]'
              : 'text-[var(--admin-text-muted)] border-transparent hover:text-[var(--admin-text)]'
          )}
        >
          <History className="h-4 w-4" />
          Historial
          {session.total_orders > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-[var(--admin-accent)]/15 text-[var(--admin-accent-text)] rounded-full num-tabular">
              {session.total_orders}
            </span>
          )}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {mode === 'mostrador' && (
          <>
            {/* Left: Product grid + Pending orders */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              {/* Pending orders strip */}
              {(pendingOrders.length > 0 || pendingLoading) && (
                <div className="shrink-0 border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-400">
                      Pendientes ({pendingOrders.length})
                    </span>
                  </div>
                  {pendingLoading ? (
                    <p className="text-xs text-[var(--admin-text-muted)]">Cargando...</p>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {pendingOrders.map((order) => {
                        const orderItems = order.items as { name: string; quantity: number }[]
                        const diffMs = Date.now() - new Date(order.opened_at || order.created_at).getTime()
                        const mins = Math.floor(diffMs / 60000)
                        const timeAgo = mins < 1 ? '<1m' : `${mins}m`
                        const urgencyClass =
                          mins < 5
                            ? 'text-green-400'
                            : mins < 10
                              ? 'text-amber-400'
                              : 'text-red-400'
                        const urgencyBorder =
                          mins < 5
                            ? 'border-green-500/30 hover:border-green-400/60'
                            : mins < 10
                              ? 'border-amber-500/30 hover:border-amber-400/60'
                              : 'border-red-500/40 hover:border-red-400/70'
                        return (
                          <div
                            key={order.id}
                            className={`shrink-0 bg-[var(--admin-bg)] border ${urgencyBorder} rounded-xl text-left transition-colors w-[200px] h-[130px] flex flex-col`}
                          >
                            {/* Card header */}
                            <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-[var(--admin-border)]/40 shrink-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-mono text-[var(--admin-text-muted)]">
                                  #{order.id.slice(-4).toUpperCase()}
                                </span>
                                <span className={`text-xs font-bold ${urgencyClass}`}>{timeAgo}</span>
                              </div>
                              <span className="text-sm font-bold text-[var(--admin-accent-text)]">
                                {formatPrice(order.total)}
                              </span>
                            </div>
                            {/* Items */}
                            <p className="text-xs text-[var(--admin-text-muted)] px-3 py-1.5 flex-1 overflow-hidden line-clamp-2 leading-relaxed">
                              {Array.isArray(orderItems)
                                ? orderItems.map((i) => `${i.quantity}x ${i.name}`).join(' · ')
                                : '...'}
                            </p>
                            {/* Actions */}
                            <div className="flex items-center gap-1 px-2 pb-2 shrink-0">
                              <button
                                onClick={() => setPayingOrder(order)}
                                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-colors active:scale-95 cursor-pointer"
                              >
                                Cobrar
                              </button>
                              <button
                                onClick={() => window.open(`/admin/caja/ticket/${order.id}/print?kitchen=1`, '_blank')}
                                className="h-9 w-9 flex items-center justify-center rounded-lg text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] transition-colors cursor-pointer"
                                aria-label="Imprimir ticket cocina"
                              >
                                <ChefHat className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => window.open(`/admin/caja/ticket/${order.id}/print`, '_blank')}
                                className="h-9 w-9 flex items-center justify-center rounded-lg text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] transition-colors cursor-pointer"
                                aria-label="Imprimir ticket cliente"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setCancelOrderId(`mostrador:${order.id}`)}
                                className="h-9 w-9 flex items-center justify-center rounded-lg text-red-500/50 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                                aria-label="Cancelar pedido"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <PosProductGrid
                  products={products}
                  categories={categories}
                  cartItems={items}
                  onAddItem={handleAddItem}
                />
              </div>
            </div>

            {/* Order builder (right panel) */}
            <div className="w-80 lg:w-96 border-l border-[var(--admin-border)] shrink-0 hidden md:flex md:flex-col">
              <OrderBuilder
                items={items}
                notes={notes}
                hasKitchenItems={hasKitchenItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onSetNotes={setNotes}
                onSetItemNotes={handleSetItemNotes}
                onCheckout={handleCheckout}
                loading={confirmLoading}
              />
            </div>
          </>
        )}

        {mode === 'mesas' && (
          <>
            {/* Table grid */}
            <div className="flex-1 min-w-0">
              <TableGrid
                tables={tables}
                selectedTableId={selectedTable?.id ?? null}
                onSelectTable={handleSelectTable}
                onOpenTable={handleOpenTable}
              />
            </div>

            {/* Table order panel (right) */}
            {selectedTable && selectedTable.orders && (
              <div className="shrink-0 hidden md:block">
                <TableOrderPanel
                  table={selectedTable}
                  session={session}
                  onAddItems={(tag) => { setAddItemsSaleTag(tag ?? null); setShowAddItems(true) }}
                  onRequestBill={handleTableBillRequested}
                  onPayOrder={() => setShowTablePayment(true)}
                  onCancelOrder={handleTableOrderCancelled}
                  onClose={() => setSelectedTable(null)}
                />
              </div>
            )}
          </>
        )}

        {mode === 'historial' && (
          <div className="flex-1 min-w-0">
            <PosHistorialTab
              orders={sessionOrders}
              loading={historialLoading}
              onRefresh={handleLoadHistorial}
              onCancelOrder={(orderId) => setCancelOrderId(orderId)}
            />
          </div>
        )}
      </div>

      {/* Mobile cart button (mostrador only) */}
      {mode === 'mostrador' && (
        <div className="md:hidden fixed bottom-20 right-4 z-30">
          {items.length > 0 && (
            <button
              onClick={() => setShowMobileCart(true)}
              className="bg-[var(--admin-accent)] text-black font-bold px-6 py-4 rounded-full shadow-lg shadow-[var(--admin-accent)]/30 flex items-center gap-2 active:scale-95 transition-transform"
            >
              <span className="text-base font-black">{items.reduce((s, i) => s + i.quantity, 0)}</span>
              <span>productos · {formatPrice(subtotal)}</span>
            </button>
          )}
        </div>
      )}

      {/* Mobile cart sheet (Mostrador) */}
      <BottomSheet
        open={showMobileCart}
        onClose={() => setShowMobileCart(false)}
        title="Venta mostrador"
      >
        <OrderBuilder
          items={items}
          notes={notes}
          loading={confirmLoading}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onSetNotes={setNotes}
          onSetItemNotes={handleSetItemNotes}
          onCheckout={async () => {
            await handleConfirmOrder()
            setShowMobileCart(false)
          }}
        />
      </BottomSheet>

      {/* Status bar */}
      <SessionStatusBar
        session={session}
        currentCash={currentCash}
        openTablesCount={openTablesCount}
        onMovement={() => setShowMovement(true)}
        onViewHistory={handleSwitchToHistorial}
        onCloseSession={handleCloseSessionClick}
      />

      {/* Mostrador dialogs */}
      {/* Payment panel for pending mostrador order */}
      <PaymentPanel
        open={!!payingOrder}
        total={payingOrder?.total ?? 0}
        loading={payingOrderLoading}
        onClose={() => setPayingOrder(null)}
        onConfirm={handlePayPendingOrder}
      />

      <CashMovementDialog
        open={showMovement}
        sessionId={session.id}
        onClose={() => setShowMovement(false)}
        onSuccess={handleMovementSuccess}
      />

      {/* Cancel order confirm */}
      <ConfirmDialog
        open={!!cancelOrderId}
        onOpenChange={(open) => !open && setCancelOrderId(null)}
        title="Anular venta"
        description="¿Estás seguro de anular esta venta? Esta acción no se puede deshacer."
        confirmLabel="Anular"
        onConfirm={() => {
          if (!cancelOrderId) return
          const isMostrador = cancelOrderId.startsWith('mostrador:')
          const id = isMostrador ? cancelOrderId.replace('mostrador:', '') : cancelOrderId
          void handleCancelOrder(id, isMostrador)
        }}
      />

      {/* Table dialogs */}
      {selectedTable?.orders && (
        <>
          <AddItemsDialog
            open={showAddItems}
            products={products}
            categories={categories}
            orderId={selectedTable.orders.id}
            saleTag={addItemsSaleTag}
            onClose={() => { setShowAddItems(false); setAddItemsSaleTag(null) }}
            onItemsAdded={handleTableItemsAdded}
          />

          <TablePaymentDialog
            open={showTablePayment}
            order={selectedTable.orders}
            table={selectedTable}
            sessionId={session.id}
            onClose={() => setShowTablePayment(false)}
            onPaid={handleTablePaid}
          />
        </>
      )}

      {/* Mobile table panel sheet (Mesas) */}
      {selectedTable?.orders && (
        <BottomSheet
          open={showMobileTablePanel}
          onClose={() => setShowMobileTablePanel(false)}
          title={`Mesa ${selectedTable.number}`}
        >
          <TableOrderPanel
            table={selectedTable}
            session={session}
            asSheet
            onAddItems={(tag) => {
              setAddItemsSaleTag(tag ?? null)
              setShowAddItems(true)
            }}
            onRequestBill={handleTableBillRequested}
            onPayOrder={() => {
              setShowMobileTablePanel(false)
              setShowTablePayment(true)
            }}
            onCancelOrder={() => {
              setShowMobileTablePanel(false)
              handleTableOrderCancelled()
            }}
            onClose={() => setShowMobileTablePanel(false)}
          />
        </BottomSheet>
      )}
    </div>
  )
}
