'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getActiveComandas } from '@/app/actions/comandas'
import { ComandaCard } from './comanda-card'
import { cn } from '@/lib/utils'
import type { Comanda } from '@/lib/types/comandas'

type ComandaWithOrder = Comanda & { order_type: string | null; table_number: number | null }

interface KitchenDisplayProps {
  initialComandas: ComandaWithOrder[]
}

export function KitchenDisplay({ initialComandas }: KitchenDisplayProps) {
  const [comandas, setComandas] = useState<ComandaWithOrder[]>(initialComandas)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    const { data } = await getActiveComandas()
    if (data) {
      setComandas(data)
      setLastUpdated(new Date())
    }
    setRefreshing(false)
  }, [])

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('comandas-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comandas',
        },
        () => {
          // On any change, refetch active comandas
          void refresh()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [refresh])

  const pendingCount = comandas.filter((c) => c.status === 'pendiente').length
  const inPrepCount = comandas.filter((c) => c.status === 'en_preparacion').length

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] flex flex-col">
      {/* Header */}
      <div className="bg-[var(--admin-surface)] border-b border-[var(--admin-border)] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-[var(--admin-text)]">
            🍳 Cocina
          </h1>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">
                {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
              </span>
            )}
            {inPrepCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">
                {inPrepCount} en prep
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">

          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] bg-[var(--admin-surface-2)] hover:bg-[var(--admin-border)] transition-colors"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Actualizar
          </button>

          <span className="text-xs text-[var(--admin-text-muted)]">
            {lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Comandas grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        {comandas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--admin-text-muted)]">
            <span className="text-5xl mb-4">✅</span>
            <p className="text-lg font-semibold">Sin comandas activas</p>
            <p className="text-sm mt-1">Todas las comandas han sido preparadas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
            {comandas.map((comanda) => (
              <ComandaCard key={comanda.id} comanda={comanda} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
