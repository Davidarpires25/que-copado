'use client'

import { useState } from 'react'
import { Printer, Clock, ChefHat, GlassWater } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateComandaStatus } from '@/app/actions/comandas'
import { toast } from 'sonner'
import type { Comanda, ComandaStatus } from '@/lib/types/comandas'

interface ComandaCardProps {
  comanda: Comanda & { order_type: string | null; table_number: number | null }
}

const STATUS_CONFIG: Record<ComandaStatus, { label: string; next: ComandaStatus | null; nextLabel: string | null; color: string }> = {
  pendiente: { label: 'Pendiente', next: 'en_preparacion', nextLabel: 'En prep', color: 'border-amber-500/40 bg-amber-500/5' },
  en_preparacion: { label: 'En prep', next: 'listo', nextLabel: '✓ Listo', color: 'border-blue-500/40 bg-blue-500/5' },
  listo: { label: 'Listo', next: null, nextLabel: null, color: 'border-green-500/40 bg-green-500/5' },
}

const STATION_ICONS: Record<string, React.ReactNode> = {
  cocina: <ChefHat className="h-4 w-4" />,
  barra: <GlassWater className="h-4 w-4" />,
}

function formatElapsed(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '< 1 min'
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}min`
}

export function ComandaCard({ comanda }: ComandaCardProps) {
  const [status, setStatus] = useState<ComandaStatus>(comanda.status)
  const [loading, setLoading] = useState(false)

  const config = STATUS_CONFIG[status]

  const handleAdvance = async () => {
    if (!config.next || loading) return
    setLoading(true)
    const { error } = await updateComandaStatus(comanda.id, config.next)
    setLoading(false)

    if (error) {
      toast.error(error)
    } else {
      setStatus(config.next)
      if (config.next === 'listo') {
        toast.success('Comanda lista')
      }
    }
  }

  const orderLabel =
    comanda.order_type === 'mesa' && comanda.table_number
      ? `Mesa ${comanda.table_number}`
      : 'Mostrador'

  return (
    <div
      className={cn(
        'rounded-xl border-2 flex flex-col overflow-hidden transition-all duration-300',
        config.color,
        status === 'listo' && 'opacity-60'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-[var(--admin-accent-text)]">
            {STATION_ICONS[comanda.station] ?? null}
          </span>
          <span className="font-bold text-[var(--admin-text)] uppercase tracking-wide text-sm">
            {comanda.station === 'cocina' ? 'Cocina' : 'Barra'}
          </span>
          <span className="text-sm text-[var(--admin-text-muted)] font-medium">
            — {orderLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)]">
          <Clock className="h-3.5 w-3.5" />
          {formatElapsed(comanda.created_at)}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 px-4 py-3 space-y-2">
        {comanda.items.map((item) => (
          <div key={item.id} className="flex items-start gap-2">
            <span className="text-base font-bold text-[var(--admin-accent-text)] shrink-0 w-6 text-right">
              {item.quantity}×
            </span>
            <div className="flex-1">
              <span className="text-sm font-semibold text-[var(--admin-text)]">
                {item.product_name}
              </span>
              {item.notes && (
                <p className="text-xs text-[var(--admin-text-muted)] italic mt-0.5">
                  ↳ {item.notes}
                </p>
              )}
              {item.sale_tag && (
                <span className="inline-block text-xs px-1.5 py-0.5 rounded-full bg-[var(--admin-accent)]/15 text-[var(--admin-accent-text)] font-medium mt-0.5">
                  {item.sale_tag}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-3 py-2.5 border-t border-white/10">
        <button
          onClick={() => window.open(`/admin/cocina/comanda/${comanda.id}/print`, '_blank')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] bg-[var(--admin-surface-2)] hover:bg-[var(--admin-border)] transition-colors"
        >
          <Printer className="h-3.5 w-3.5" />
          Imprimir
        </button>

        {config.next && (
          <button
            onClick={handleAdvance}
            disabled={loading}
            className={cn(
              'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95',
              status === 'pendiente'
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-green-600 hover:bg-green-500 text-white',
              loading && 'opacity-60 cursor-wait'
            )}
          >
            {config.nextLabel}
          </button>
        )}

        {status === 'listo' && (
          <div className="flex-1 py-1.5 rounded-lg text-xs font-bold text-center text-green-400 bg-green-500/10">
            ✓ Listo
          </div>
        )}
      </div>
    </div>
  )
}
