'use client'

import { useState } from 'react'
import { DollarSign, Loader2, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { closeSession } from '@/app/actions/cash-register'
import { toast } from 'sonner'
import { formatPrice } from '@/lib/utils'
import type { SessionSummary } from '@/lib/types/cash-register'

interface SessionCloseScreenProps {
  summary: SessionSummary
  openTablesCount?: number
  onBack: () => void
  onClosed: () => void
}

export function SessionCloseScreen({
  summary,
  openTablesCount = 0,
  onBack,
  onClosed,
}: SessionCloseScreenProps) {
  const hasOpenTables = openTablesCount > 0
  const [actualCash, setActualCash] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const expectedCash = summary.currentCash
  const enteredCash = parseFloat(actualCash) || 0
  const difference = enteredCash - expectedCash
  const hasEntered = actualCash !== ''

  const handleClose = async () => {
    if (!hasEntered) {
      toast.error('Ingresa el efectivo contado')
      return
    }

    setLoading(true)
    const { error } = await closeSession(summary.session.id, {
      actual_cash: enteredCash,
      notes: notes || undefined,
    })
    setLoading(false)

    if (error) {
      toast.error(error)
      return
    }

    toast.success('Caja cerrada correctamente')
    onClosed()
  }

  return (
    <div className="h-full bg-[#1a1d24] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-[#1a1d24] border border-[#2a2f3a] flex items-center justify-center text-[#a8b5c9] hover:text-[#f0f2f5] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#f0f2f5]">Cerrar Caja</h1>
            <p className="text-sm text-[#a8b5c9]">Arqueo de cierre</p>
          </div>
        </div>

        {/* Session summary */}
        <div className="bg-[#1a1d24] border border-[#2a2f3a] rounded-xl p-5 mb-4 space-y-3">
          <h3 className="text-sm font-semibold text-[#a8b5c9] uppercase tracking-wider">
            Resumen del turno
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <SummaryItem label="Ventas totales" value={formatPrice(summary.session.total_sales)} />
            <SummaryItem label="Cantidad de ventas" value={summary.session.total_orders.toString()} />
            <SummaryItem label="Efectivo" value={formatPrice(summary.session.total_cash_sales)} icon="💵" />
            <SummaryItem label="Tarjeta" value={formatPrice(summary.session.total_card_sales)} icon="💳" />
            <SummaryItem label="Transferencia" value={formatPrice(summary.session.total_transfer_sales)} icon="🏦" />
            <SummaryItem label="Retiros" value={`-${formatPrice(summary.session.total_withdrawals)}`} negative />
            <SummaryItem label="Ingresos" value={`+${formatPrice(summary.session.total_deposits)}`} positive />
            <SummaryItem label="Apertura" value={formatPrice(summary.session.opening_balance)} />
          </div>
        </div>

        {/* Open tables warning */}
        {hasOpenTables && (
          <div className="bg-orange-950/30 border border-orange-500/30 rounded-xl p-4 mb-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-400">
                Hay {openTablesCount} {openTablesCount === 1 ? 'mesa abierta' : 'mesas abiertas'}
              </p>
              <p className="text-xs text-orange-400/70 mt-1">
                Cobra o cancela todas las mesas antes de cerrar la caja
              </p>
            </div>
          </div>
        )}

        {/* Cash count */}
        <div className="bg-[#1a1d24] border border-[#2a2f3a] rounded-xl p-5 space-y-4">
          <div className="text-center py-2 bg-[#12151a] rounded-lg">
            <p className="text-xs text-[#a8b5c9]">Efectivo esperado</p>
            <p className="text-2xl font-bold text-[#FEC501]">
              {formatPrice(expectedCash)}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-[#a8b5c9]">
              Efectivo contado
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#a8b5c9]" />
              <Input
                type="number"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                placeholder="0"
                className="bg-[#12151a] border-[#2a2f3a] text-[#f0f2f5] text-xl h-16 pl-10 text-center font-bold placeholder:text-[#3a3f4a] focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20"
                autoFocus
              />
            </div>
          </div>

          {/* Difference */}
          {hasEntered && (
            <div
              className={`text-center py-3 rounded-lg flex items-center justify-center gap-2 ${
                difference === 0
                  ? 'bg-green-950/30 text-green-400'
                  : difference > 0
                    ? 'bg-blue-950/30 text-blue-400'
                    : 'bg-red-950/30 text-red-400'
              }`}
            >
              {difference === 0 ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
              <div>
                <p className="text-sm">
                  {difference === 0
                    ? 'Sin diferencia'
                    : difference > 0
                      ? 'Sobrante'
                      : 'Faltante'}
                </p>
                {difference !== 0 && (
                  <p className="text-xl font-bold">
                    {difference > 0 ? '+' : ''}{formatPrice(difference)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-[#a8b5c9]">
              Notas (opcional)
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones del turno..."
              className="bg-[#12151a] border-[#2a2f3a] text-[#f0f2f5] text-sm h-10 placeholder:text-[#a8b5c9] focus:border-[#FEC501]/50"
            />
          </div>

          <Button
            onClick={handleClose}
            disabled={loading || !hasEntered || hasOpenTables}
            className="w-full h-12 bg-red-600 hover:bg-red-500 text-white font-bold text-base disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Cerrar Caja'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function SummaryItem({
  label,
  value,
  icon,
  positive,
  negative,
}: {
  label: string
  value: string
  icon?: string
  positive?: boolean
  negative?: boolean
}) {
  return (
    <div className="bg-[#12151a] rounded-lg px-3 py-2">
      <p className="text-[10px] text-[#a8b5c9] flex items-center gap-1">
        {icon && <span>{icon}</span>}
        {label}
      </p>
      <p
        className={`text-sm font-bold ${
          positive
            ? 'text-green-400'
            : negative
              ? 'text-red-400'
              : 'text-[#f0f2f5]'
        }`}
      >
        {value}
      </p>
    </div>
  )
}
