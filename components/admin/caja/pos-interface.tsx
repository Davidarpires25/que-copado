'use client'

import { useState, useCallback } from 'react'
import { Store, UtensilsCrossed } from 'lucide-react'
import { PosProductGrid } from './product-grid'
import { OrderBuilder, type PosCartItem } from './order-builder'
import { PaymentPanel } from './payment-panel'
import { SessionStatusBar } from './session-status-bar'
import { CashMovementDialog } from './cash-movement-dialog'
import { PosOrderHistory } from './pos-order-history'
import { TableGrid } from './table-grid'
import { TableOrderPanel } from './table-order-panel'
import { AddItemsDialog } from './add-items-dialog'
import { TablePaymentDialog } from './table-payment-dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { createPosOrder, cancelPosOrder } from '@/app/actions/pos-orders'
import { getSessionOrders, getSessionSummary } from '@/app/actions/cash-register'
import { openTable, getTables } from '@/app/actions/tables'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Category, Product, PaymentMethod, Order } from '@/lib/types/database'
import type { CashRegisterSession, SessionSummary } from '@/lib/types/cash-register'
import type { TableWithOrder } from '@/lib/types/tables'

type PosMode = 'mostrador' | 'mesas'

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
  // Mode
  const [mode, setMode] = useState<PosMode>('mostrador')

  // Mostrador cart state
  const [items, setItems] = useState<PosCartItem[]>([])
  const [notes, setNotes] = useState('')

  // Mostrador UI state
  const [showPayment, setShowPayment] = useState(false)
  const [showMovement, setShowMovement] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [sessionOrders, setSessionOrders] = useState<Order[]>([])

  // Cancel order confirm
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)

  // Table state
  const [tables, setTables] = useState<TableWithOrder[]>(initialTables)
  const [selectedTable, setSelectedTable] = useState<TableWithOrder | null>(null)
  const [showAddItems, setShowAddItems] = useState(false)
  const [showTablePayment, setShowTablePayment] = useState(false)

  // Computed
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const currentCash =
    session.opening_balance +
    session.total_cash_sales +
    session.total_deposits -
    session.total_withdrawals
  const openTablesCount = tables.filter((t) => t.status !== 'libre').length

  // ─── Refresh tables from server ─────────────────────────
  const refreshTables = async () => {
    const { data } = await getTables()
    if (data) {
      setTables(data)
      // Update selected table if it still exists
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

  // ─── Mostrador handlers (unchanged) ─────────────────────
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

  const handleCheckout = () => {
    if (items.length === 0) return
    setShowPayment(true)
  }

  const handleConfirmPayment = async (method: PaymentMethod) => {
    setPaymentLoading(true)

    const { data, error } = await createPosOrder({
      items: items.map(({ id, name, price, quantity }) => ({
        id,
        name,
        price,
        quantity,
      })),
      total: subtotal,
      payment_method: method,
      order_type: 'mostrador',
      table_number: null,
      notes: notes || null,
      session_id: session.id,
    })

    setPaymentLoading(false)

    if (error) {
      toast.error(error)
      return
    }

    if (data) {
      toast.success('Venta registrada')
      setItems([])
      setNotes('')
      setShowPayment(false)

      const salesField =
        method === 'cash'
          ? 'total_cash_sales'
          : method === 'card'
            ? 'total_card_sales'
            : 'total_transfer_sales'

      onSessionUpdate({
        ...session,
        total_sales: session.total_sales + subtotal,
        total_orders: session.total_orders + 1,
        [salesField]: (session[salesField as keyof CashRegisterSession] as number) + subtotal,
      })
    }
  }

  const handleViewHistory = async () => {
    const { data } = await getSessionOrders(session.id)
    if (data) {
      setSessionOrders(data)
      setShowHistory(true)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    setCancelOrderId(null)
    const { error } = await cancelPosOrder(orderId)
    if (error) {
      toast.error(error)
      return
    }

    toast.success('Venta anulada')
    const { data } = await getSessionOrders(session.id)
    if (data) setSessionOrders(data)

    const { data: summaryData } = await getSessionSummary(session.id)
    if (summaryData) {
      onSessionUpdate(summaryData.session)
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
      // Select the newly opened table
      const { data: updatedTables } = await getTables()
      if (updatedTables) {
        setTables(updatedTables)
        const opened = updatedTables.find((t) => t.id === table.id)
        if (opened) setSelectedTable(opened)
      }
    }
  }

  const handleSelectTable = (table: TableWithOrder) => {
    setSelectedTable(table)
  }

  const handleTableItemsAdded = async () => {
    setShowAddItems(false)
    await refreshTables()
  }

  const handleTableBillRequested = async () => {
    await refreshTables()
  }

  const handleTablePaid = async () => {
    setShowTablePayment(false)
    setSelectedTable(null)
    await refreshTables()
    // Refresh session totals
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
    <div className="h-full flex flex-col bg-[#1a1d24]">
      {/* Mode tabs */}
      <div className="flex border-b border-[#2a2f3a] bg-[#12151a] shrink-0">
        <button
          onClick={() => setMode('mostrador')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors border-b-2',
            mode === 'mostrador'
              ? 'text-[#FEC501] border-[#FEC501]'
              : 'text-[#a8b5c9] border-transparent hover:text-[#f0f2f5]'
          )}
        >
          <Store className="h-4 w-4" />
          Mostrador
        </button>
        <button
          onClick={() => setMode('mesas')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors border-b-2',
            mode === 'mesas'
              ? 'text-[#FEC501] border-[#FEC501]'
              : 'text-[#a8b5c9] border-transparent hover:text-[#f0f2f5]'
          )}
        >
          <UtensilsCrossed className="h-4 w-4" />
          Mesas
          {openTablesCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-orange-500/20 text-orange-400 rounded-full">
              {openTablesCount}
            </span>
          )}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {mode === 'mostrador' && (
          <>
            {/* Product grid */}
            <div className="flex-1 min-w-0">
              <PosProductGrid
                products={products}
                categories={categories}
                onAddItem={handleAddItem}
              />
            </div>

            {/* Order builder (right panel) */}
            <div className="w-80 lg:w-96 border-l border-[#2a2f3a] shrink-0 hidden md:flex md:flex-col">
              <OrderBuilder
                items={items}
                notes={notes}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onSetNotes={setNotes}
                onCheckout={handleCheckout}
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
                  onAddItems={() => setShowAddItems(true)}
                  onRequestBill={handleTableBillRequested}
                  onPayOrder={() => setShowTablePayment(true)}
                  onCancelOrder={handleTableOrderCancelled}
                  onClose={() => setSelectedTable(null)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile cart button (mostrador only) */}
      {mode === 'mostrador' && (
        <div className="md:hidden fixed bottom-20 right-4 z-30">
          {items.length > 0 && (
            <button
              onClick={handleCheckout}
              className="bg-[#FEC501] text-black font-bold px-8 py-4 rounded-full shadow-lg shadow-[#FEC501]/30 flex items-center gap-2 active:scale-95 transition-transform"
            >
              Cobrar ({items.length})
            </button>
          )}
        </div>
      )}

      {/* Status bar */}
      <SessionStatusBar
        session={session}
        currentCash={currentCash}
        openTablesCount={openTablesCount}
        onMovement={() => setShowMovement(true)}
        onViewHistory={handleViewHistory}
        onCloseSession={handleCloseSessionClick}
      />

      {/* Mostrador dialogs */}
      <PaymentPanel
        open={showPayment}
        total={subtotal}
        loading={paymentLoading}
        onClose={() => setShowPayment(false)}
        onConfirm={handleConfirmPayment}
      />

      <CashMovementDialog
        open={showMovement}
        sessionId={session.id}
        onClose={() => setShowMovement(false)}
        onSuccess={handleMovementSuccess}
      />

      <PosOrderHistory
        orders={sessionOrders}
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onCancelOrder={(orderId) => setCancelOrderId(orderId)}
      />

      {/* Cancel order confirm */}
      <ConfirmDialog
        open={!!cancelOrderId}
        onOpenChange={(open) => !open && setCancelOrderId(null)}
        title="Anular venta"
        description="¿Estás seguro de anular esta venta? Esta acción no se puede deshacer."
        confirmLabel="Anular"
        onConfirm={() => cancelOrderId && handleCancelOrder(cancelOrderId)}
      />

      {/* Table dialogs */}
      {selectedTable?.orders && (
        <>
          <AddItemsDialog
            open={showAddItems}
            products={products}
            categories={categories}
            orderId={selectedTable.orders.id}
            onClose={() => setShowAddItems(false)}
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
    </div>
  )
}
