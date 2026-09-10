'use client'

import { Check } from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import { PAYMENT_METHODS } from '@/lib/constants/payments'
import type { ActivePayment } from '@/lib/utils/payment-split'
import type { PaymentMethod } from '@/lib/types/database'

interface PaymentMethodsProps {
  payments: ActivePayment[]
  editing: PaymentMethod | null
  draft: string
  inputRef: React.RefObject<HTMLInputElement | null>
  onDraftChange: (value: string) => void
  onToggle: (method: PaymentMethod) => void
  onEdit: (method: PaymentMethod) => void
  onCommit: (method: PaymentMethod) => void
  onCancel: () => void
}

/**
 * Los cuatro medios de pago con su monto.
 *
 * La fila se ve activa tambien mientras se la esta editando aunque todavia no
 * tenga monto: si no, al tocar un medio con el total ya cubierto la fila
 * quedaba apagada y el input no aparecia en ningun lado.
 */
export function PaymentMethods({
  payments, editing, draft, inputRef,
  onDraftChange, onToggle, onEdit, onCommit, onCancel,
}: PaymentMethodsProps) {
  return (
    <div className="flex flex-col gap-2">
      {PAYMENT_METHODS.map(({ value, label }) => {
        const entry = payments.find((p) => p.method === value)
        const isEditing = editing === value
        const isOn = !!entry || isEditing

        return (
          <div
            key={value}
            onClick={() => onToggle(value)}
            className={cn(
              'flex h-10 items-center justify-between rounded-xl px-3 cursor-pointer transition-colors select-none',
              isOn
                // El borde va a opacidad plena. Con el relleno al 10% y el
                // borde al 35%, la fila activa quedaba en #FFF9E6: mas clara
                // que las inactivas (#F5F6FA) y casi igual al panel blanco.
                // Seleccionar hacia retroceder la fila.
                ? 'bg-[var(--admin-accent)]/15 border border-[var(--admin-accent)]'
                : 'bg-[var(--admin-surface-2)] border border-[var(--admin-border)] hover:border-[var(--admin-text-placeholder)]'
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn(
                'grid h-4 w-4 shrink-0 place-items-center rounded transition-colors',
                isOn ? 'bg-[var(--admin-accent)]' : 'border-[1.5px] border-[var(--admin-text-muted)]/40'
              )}>
                {isOn && <Check className="h-2.5 w-2.5 text-black" strokeWidth={3} />}
              </span>
              <span className={cn(
                'text-[13px] font-semibold',
                isOn ? 'text-[var(--admin-text)]' : 'text-[var(--admin-text-muted)]'
              )}>
                {label}
              </span>
            </div>

            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={draft}
                placeholder="0"
                onChange={(e) => onDraftChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') onCommit(value)
                  if (e.key === 'Escape') onCancel()
                }}
                onBlur={() => onCommit(value)}
                className="h-10 w-28 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 text-right text-[14px] font-bold tabular-nums text-[var(--admin-price)] outline-none focus:border-[var(--admin-accent)]/60"
              />
            ) : entry ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit(value) }}
                className="h-10 min-w-[76px] rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 text-[14px] font-bold tabular-nums text-[var(--admin-price)] hover:border-[var(--admin-accent)]/40 transition-colors cursor-pointer"
              >
                {formatPrice(entry.amount)}
              </button>
            ) : (
              <span className="pr-1 text-[13px] text-[var(--admin-text-muted)]">—</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Etiqueta de la seccion. El contador dice cuantos medios hay, no como se llama la funcion. */
export function PaymentMethodsLabel({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
        Métodos de pago
      </span>
      {count > 1 && (
        <span className="rounded-full bg-[var(--admin-accent)]/10 px-2 py-0.5 text-xs font-bold text-[var(--admin-accent-text)]">
          {count} medios
        </span>
      )}
    </div>
  )
}
