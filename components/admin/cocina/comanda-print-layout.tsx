'use client'

import { useEffect } from 'react'
import { etiquetaDeMesa } from '@/lib/utils/table-label'
import type { Comanda } from '@/lib/types/comandas'
import { orderLabel as numeroDePedido } from '@/lib/utils/order-number'

interface ComandaPrintLayoutProps {
  comanda: Comanda & {
    order_type: string | null
    table_number: number | null
    /** El numero del PEDIDO, no el de la comanda: es lo que cruza cocina con caja. */
    order_number: number | null
  }
  /** Nombre de la mesa, si tiene. Sin esto se cae al numero. */
  tableLabel?: string | null
}

export function ComandaPrintLayout({ comanda, tableLabel }: ComandaPrintLayoutProps) {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 400)
    return () => clearTimeout(timer)
  }, [])

  const orderLabel =
    comanda.order_type === 'mesa' && comanda.table_number
      ? etiquetaDeMesa({ number: comanda.table_number, label: tableLabel })
      : 'Mostrador'

  const date = new Date(comanda.created_at)
  const dateStr = date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  // Sin emoji: esto es el encabezado de una comanda monoespaciada, no UI. El
  // emoji se dibuja distinto en cada sistema y no aporta nada al que la lee.
  const stationLabel = comanda.station === 'cocina' ? 'COCINA' : 'BARRA'

  return (
    <div className="w-[300px] font-mono text-sm leading-snug p-2">
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <p className="font-bold text-base">{stationLabel}</p>
        <p className="font-semibold">{orderLabel}</p>
        <p className="text-xs">{timeStr} hs · {dateStr}</p>
      </div>

      <div className="space-y-1 mb-2">
        {comanda.items.map((item) => (
          <div key={item.id}>
            <div className="flex gap-2">
              <span className="font-bold w-5 text-right shrink-0">{item.quantity}x</span>
              <span className="flex-1">{item.product_name}</span>
            </div>
            {item.notes && (
              <p className="pl-7 text-xs italic">↳ {item.notes}</p>
            )}
            {item.sale_tag && (
              <p className="pl-7 text-xs">[{item.sale_tag}]</p>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-black pt-2 text-center text-xs">
        <p>Pedido {numeroDePedido({ id: comanda.order_id, order_number: comanda.order_number })}</p>
      </div>
    </div>
  )
}
