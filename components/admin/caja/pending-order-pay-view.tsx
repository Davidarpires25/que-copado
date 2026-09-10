'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Printer, Loader2, ChefHat, Globe, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatPrice } from '@/lib/utils'
import { usePaymentSplit } from '@/lib/hooks/use-payment-split'
import { PaymentMethods, PaymentMethodsLabel } from './payment-methods'
import { PaymentSummary } from './payment-summary'
import { StockAlert } from './stock-alert'
import { CustomerBlock } from '@/components/admin/orders/customer-block'
import { orderLabel } from '@/lib/utils/order-number'
import type { PaymentMethod, Order, DeliveryZone } from '@/lib/types/database'
import type { PaymentSplit } from '@/lib/types/cash-register'
import type { OrderItem } from '@/lib/types/orders'
import { checkStockForItems, type StockWarning } from '@/app/actions/stock'
import { printKitchenTicketAction } from '@/app/actions/print'

interface PendingOrderPayViewProps {
  order: Order
  loading: boolean
  /** Para nombrar la zona en la linea de envio. */
  deliveryZones?: DeliveryZone[]
  onBack: () => void
  onPrint: () => void
  onCancel: () => void
  onConfirm: (method: PaymentMethod, splits?: PaymentSplit[]) => void
}

export function PendingOrderPayView({
  order, loading, deliveryZones, onBack: _onBack, onPrint, onCancel, onConfirm,
}: PendingOrderPayViewProps) {
  const total = order.total
  const esWeb = order.order_source === 'web'
  const shipping = Number(order.shipping_cost ?? 0)
  const zona = deliveryZones?.find((z) => z.id === order.delivery_zone_id)?.name ?? null
  const orderItems = (order.items as OrderItem[] | null) ?? []

  const pago = usePaymentSplit(total, order.id)

  const [stockWarnings, setStockWarnings] = useState<StockWarning[]>([])
  const [stockChecking, setStockChecking] = useState(false)
  const hasStockWarnings = stockWarnings.length > 0

  useEffect(() => {
    const stockItems = orderItems
      .filter((i): i is OrderItem & { id: string } => !!i.id)
      .map((i) => ({ product_id: i.id, quantity: i.quantity }))
    if (stockItems.length === 0) { setStockWarnings([]); return }
    let cancelled = false
    const run = async () => {
      setStockChecking(true)
      try {
        const result = await checkStockForItems(stockItems)
        if (!cancelled) setStockWarnings(result.data ?? [])
      } catch { /* graceful */ }
      finally { if (!cancelled) setStockChecking(false) }
    }
    void run()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id])

  const handleConfirm = () => {
    if (!pago.isComplete || loading || pago.payments.length === 0) return
    if (pago.editing) pago.commit(pago.editing)
    if (pago.payments.length === 1) onConfirm(pago.payments[0].method)
    else onConfirm(pago.payments[0].method, pago.payments)
  }

  const etiqueta = orderLabel(order)

  return (
    <div className="flex h-full flex-col bg-[var(--admin-surface)]">

      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-[var(--admin-border)] px-5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-[15px] font-bold text-[var(--admin-text)]">
            Pedido <span className="text-[var(--admin-accent-text)]">{etiqueta}</span>
          </span>
          {esWeb && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-400">
              <Globe className="h-2.5 w-2.5" />
              Web
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => printKitchenTicketAction(order.id)
              .then((r) => { if (r.error) toast.error(r.error) })
              .catch(() => toast.error('Error al imprimir'))}
            className="cursor-pointer p-1 text-[var(--admin-text-muted)] transition-colors hover:text-orange-700 dark:hover:text-orange-400"
            aria-label="Imprimir comanda cocina"
            title="Comanda cocina"
          >
            <ChefHat className="h-4 w-4" />
          </button>
          <button
            onClick={onPrint}
            className="cursor-pointer p-1 text-[var(--admin-text-muted)] transition-colors hover:text-[var(--admin-text)]"
            aria-label="Imprimir ticket"
            title="Imprimir ticket"
          >
            <Printer className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* El pedido de mostrador esta parado enfrente; el de la web hay que
          llevarselo a alguien. Mismo bloque que el drawer de pedidos. */}
      {esWeb && (
        <div className="shrink-0">
          <CustomerBlock
            variant="plain"
            name={order.customer_name}
            phone={order.customer_phone}
            address={order.customer_address}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide px-5">
        {orderItems.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between border-b border-[var(--admin-border)] py-2.5">
            <div className="mr-3 min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[var(--admin-text)]">{item.name}</p>
              <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">{formatPrice(item.price)} c/u</p>
            </div>
            <span className="mr-3 shrink-0 text-[12px] font-semibold tabular-nums text-[var(--admin-text-muted)]">
              ×{item.quantity}
            </span>
            <p className="w-14 shrink-0 text-right text-[13px] font-semibold tabular-nums text-[var(--admin-text)]">
              {formatPrice(item.price * item.quantity)}
            </p>
          </div>
        ))}
      </div>

      <div className="h-px shrink-0 bg-[var(--admin-border)]" />

      <div className="shrink-0 space-y-2.5 px-5 py-4">
        <PaymentMethodsLabel count={pago.payments.length} />
        <PaymentMethods
          payments={pago.payments}
          editing={pago.editing}
          draft={pago.draft}
          inputRef={pago.inputRef}
          onDraftChange={pago.setDraft}
          onToggle={pago.toggle}
          onEdit={pago.edit}
          onCommit={pago.commit}
          onCancel={pago.cancel}
        />
      </div>

      <div className="h-px shrink-0 bg-[var(--admin-border)]" />

      <div className="shrink-0 px-5 py-4">
        <PaymentSummary
          total={total}
          shipping={shipping}
          shippingZone={zona}
          cashReceived={pago.cashReceived}
          change={pago.change}
          covered={pago.covered}
          isComplete={pago.isComplete}
          methodCount={pago.payments.length}
        />
      </div>

      {(stockChecking || hasStockWarnings) && (
        <div className="shrink-0 px-5 pb-3">
          <StockAlert checking={stockChecking} warnings={stockWarnings} />
        </div>
      )}

      {/* Un solo boton de imprimir: el del header. La fila de 44px que habia
          aca abajo llamaba al mismo onPrint. */}
      <button
        onClick={handleConfirm}
        disabled={!pago.isComplete || loading || pago.payments.length === 0}
        className={cn(
          'flex h-[52px] shrink-0 cursor-pointer items-center justify-center gap-2 text-base font-bold transition-all',
          'hover:opacity-90 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40',
          hasStockWarnings ? 'bg-amber-500 text-black' : 'bg-[var(--admin-accent)] text-black'
        )}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : pago.payments.length === 0 ? (
          'Seleccioná un método'
        ) : !pago.isComplete ? (
          `Faltan ${formatPrice(pago.remaining)}`
        ) : (
          <>
            <CreditCard className="h-5 w-5" />
            {`Cobrar ${formatPrice(total)}`}
          </>
        )}
      </button>

      {/* Un pendiente se puede cancelar: el cliente se fue, se cargo por error,
          o el pedido web es basura. Va debajo del boton de cobrar y en tono
          discreto — es una salida, no una accion que se busque. */}
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 border-t border-[var(--admin-border)] text-[12px] font-medium text-rose-700 transition-colors hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-400"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Cancelar pedido
      </button>
    </div>
  )
}
