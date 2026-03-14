'use client'

import { useEffect } from 'react'
import type { Comanda } from '@/lib/types/comandas'

interface ComandaPrintLayoutProps {
  comanda: Comanda & { order_type: string | null; table_number: number | null }
}

export function ComandaPrintLayout({ comanda }: ComandaPrintLayoutProps) {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 400)
    return () => clearTimeout(timer)
  }, [])

  const orderLabel =
    comanda.order_type === 'mesa' && comanda.table_number
      ? `Mesa ${comanda.table_number}`
      : 'Mostrador'

  const date = new Date(comanda.created_at)
  const dateStr = date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const stationLabel = comanda.station === 'cocina' ? '🍳 COCINA' : '🍹 BARRA'

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
        <p>Pedido #{comanda.id.slice(-6).toUpperCase()}</p>
      </div>
    </div>
  )
}
