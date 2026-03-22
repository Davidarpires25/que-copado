'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { printClientTicketAction, printKitchenTicketAction } from '@/app/actions/print'
import { Store, UtensilsCrossed, History, Printer, X } from 'lucide-react'
import { PosProductGrid } from './product-grid'
import { OrderBuilder, type PosCartItem } from './order-builder'
import { PendingOrderPayView } from './pending-order-pay-view'
import { SessionStatusBar } from './session-status-bar'
import { CashMovementDialog } from './cash-movement-dialog'
import { PosHistorialTab } from './pos-historial-tab'
import { TableGrid } from './table-grid'
import { TableOrderPanel } from './table-order-panel'
import { AddItemsView } from './add-items-view'
import { TablePayView } from './table-pay-view'
import { TABLE_SECTION_LABELS } from '@/lib/types/tables'
// TablePaymentDialog kept as file — no longer rendered here
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
  const [payingTable, setPayingTable] = useState<TableWithOrder | null>(null)
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
        printKitchenTicketAction(data.id).then(r => {
          if (r.error) toast.error(r.error)
        })
        toast.success('Pedido enviado a cocina')
        setItems([])
        setNotes('')
        await refreshPendingOrders()
        setPayingOrder(data)
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
    setPayingTable(null)
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
            {/* Left: Product grid + Pending orders strip */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              {/* Product grid */}
              <div className="flex-1 overflow-hidden">
                <PosProductGrid
                  products={products}
                  categories={categories}
                  cartItems={items}
                  onAddItem={handleAddItem}
                />
              </div>

              {/* Pending orders strip — bottom */}
              <div className="shrink-0 border-t border-[var(--admin-border)] flex items-center gap-2.5 px-4 overflow-x-auto scrollbar-hide" style={{ height: 52, paddingTop: 10, paddingBottom: 10 }}>
                <span className="text-[12px] font-medium text-[var(--admin-text-muted)] shrink-0">
                  Pendientes:
                </span>
                {pendingLoading ? (
                  <span className="text-[13px] text-[var(--admin-text-muted)]">...</span>
                ) : pendingOrders.length === 0 ? (
                  <span className="text-[13px] text-[var(--admin-text-faint)]">—</span>
                ) : (
                  pendingOrders.map((order) => {
                    const isSelected = payingOrder?.id === order.id
                    return (
                      <button
                        key={order.id}
                        onClick={() => {
                          if (isSelected) { setPayingOrder(null); return }
                          setPayingOrder(order)
                          setShowMobileCart(true)
                        }}
                        className={cn(
                          'shrink-0 flex items-center px-4 text-[13px] font-semibold transition-all cursor-pointer tabular-nums',
                          isSelected
                            ? 'bg-[var(--admin-accent)]/20 border border-[var(--admin-accent)]/60 text-[var(--admin-accent-text)]'
                            : 'bg-amber-400 border border-amber-400 text-black hover:bg-amber-300'
                        )}
                        style={{ height: 32, borderRadius: 8 }}
                      >
                        #{order.id.slice(-4).toUpperCase()} — {formatPrice(order.total)}
                      </button>
                    )
                  })
                )}
                {payingOrder && (
                  <button
                    onClick={() => setPayingOrder(null)}
                    className="shrink-0 flex items-center px-4 text-[13px] font-semibold text-black bg-[var(--admin-accent)] border border-[var(--admin-accent)] hover:bg-amber-300 transition-colors cursor-pointer"
                    style={{ height: 32, borderRadius: 8 }}
                  >
                    + Nuevo pedido
                  </button>
                )}
              </div>
            </div>

            {/* Right panel — order builder or payment view */}
            <div className="w-[380px] shrink-0 hidden md:flex md:flex-col border-l border-[var(--admin-border)]">
              {payingOrder ? (
                <PendingOrderPayView
                  order={payingOrder}
                  loading={payingOrderLoading}
                  onBack={() => setPayingOrder(null)}
                  onPrint={() => printClientTicketAction(payingOrder.id).then(r => { if (r.error) toast.error(r.error) })}
                  onConfirm={handlePayPendingOrder}
                />
              ) : (
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
              )}
            </div>
          </>
        )}

        {mode === 'mesas' && (
          payingTable && payingTable.orders ? (
            <TablePayView
              order={payingTable.orders}
              table={payingTable}
              session={session}
              sectionLabel={TABLE_SECTION_LABELS[payingTable.section] || payingTable.section}
              onBack={() => setPayingTable(null)}
              onPaid={() => {
                const tableNum = payingTable.number
                setPayingTable(null)
                setSelectedTable(null)
                toast.success(`Mesa ${tableNum} cobrada`)
                void handleTablePaid()
              }}
            />
          ) : showAddItems && selectedTable?.orders ? (
            <AddItemsView
              products={products}
              categories={categories}
              table={selectedTable}
              orderId={selectedTable.orders.id}
              saleTag={addItemsSaleTag}
              onClose={() => { setShowAddItems(false); setAddItemsSaleTag(null) }}
              onItemsAdded={handleTableItemsAdded}
            />
          ) : (
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
                    onPayOrder={() => setPayingTable(selectedTable)}
                    onCancelOrder={handleTableOrderCancelled}
                    onClose={() => setSelectedTable(null)}
                  />
                </div>
              )}
            </>
          )
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

      {/* Mobile cart / payment sheet (Mostrador) */}
      <BottomSheet
        open={showMobileCart}
        onClose={() => { setShowMobileCart(false); if (payingOrder) setPayingOrder(null) }}
        title={payingOrder ? `Cobrar #${payingOrder.id.slice(-4).toUpperCase()}` : 'Venta mostrador'}
      >
        {payingOrder ? (
          <PendingOrderPayView
            order={payingOrder}
            loading={payingOrderLoading}
            onBack={() => { setPayingOrder(null); setShowMobileCart(false) }}
            onPrint={() => printClientTicketAction(payingOrder.id).then(r => { if (r.error) toast.error(r.error) })}
            onConfirm={async (method, splits) => {
              await handlePayPendingOrder(method, splits)
              setShowMobileCart(false)
            }}
          />
        ) : (
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
        )}
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
              setPayingTable(selectedTable)
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
