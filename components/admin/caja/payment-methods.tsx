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
          <Row key={value} on={isOn} label={label} onClick={() => onToggle(value)} multi>
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
                className="h-8 w-28 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 text-right text-[14px] font-bold tabular-nums text-[var(--admin-price)] outline-none focus:border-[var(--admin-accent)]/60"
              />
            ) : entry ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit(value) }}
                className="h-8 min-w-[76px] rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 text-[14px] font-bold tabular-nums text-[var(--admin-price)] hover:border-[var(--admin-accent)]/40 transition-colors cursor-pointer"
              >
                {formatPrice(entry.amount)}
              </button>
            ) : (
              <span className="pr-1 text-[13px] text-[var(--admin-text-muted)]">—</span>
            )}
          </Row>
        )
      })}
    </div>
  )
}

/**
 * Los cuatro medios en seleccion unica, con el monto fijo. Lo usa el cobro por
 * comensal, donde cada persona paga su parte con un solo medio.
 *
 * Tenia su propia implementacion: filas de 30px con la paleta de cada medio,
 * al lado de las de 40px en ambar de cuenta unica. Dos lenguajes visuales para
 * el mismo control en la misma pantalla.
 *
 * Y dibujaba un cuadrado con tilde, que promete poder marcar varios, cuando en
 * realidad elegir uno reemplaza al anterior. El punto redondo no miente.
 */
export function PaymentMethodPicker({
  selected, amount, onSelect,
}: {
  selected: PaymentMethod
  /** Lo que paga esta persona. No se edita: sale de lo que consumio. */
  amount: number
  onSelect: (method: PaymentMethod) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {PAYMENT_METHODS.map(({ value, label }) => {
        const on = selected === value
        return (
          <Row key={value} on={on} label={label} onClick={() => onSelect(value)}>
            <span className={cn(
              'pr-1 text-[13px] font-bold tabular-nums',
              on ? 'text-[var(--admin-price)]' : 'text-[var(--admin-text-muted)]'
            )}>
              {on ? formatPrice(amount) : '—'}
            </span>
          </Row>
        )
      })}
    </div>
  )
}

/**
 * La carcasa de la fila. El borde va a opacidad plena cuando esta activa: con
 * el relleno al 10% y el borde al 35%, la fila seleccionada quedaba en #FFF9E6,
 * mas clara que las inactivas (#F5F6FA) y casi igual al panel blanco. Elegir
 * hacia retroceder la fila.
 */
function Row({
  on, label, onClick, multi, children,
}: {
  on: boolean
  label: string
  onClick: () => void
  /** Cuadrado con tilde si se pueden combinar medios; punto redondo si es uno solo. */
  multi?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex h-10 cursor-pointer select-none items-center justify-between rounded-xl px-3 transition-colors',
        on
          ? 'bg-[var(--admin-accent)]/15 border border-[var(--admin-accent)]'
          : 'bg-[var(--admin-surface-2)] border border-[var(--admin-border)] hover:border-[var(--admin-text-placeholder)]'
      )}
    >
      {/* El control del monto va en h-8, no en h-10: la fila mide 40px y con su
          borde deja 38px adentro, asi que un hijo de 40px sobresale por arriba
          y por abajo y el pill blanco queda pegado al borde ambar. */}
      <div className="flex items-center gap-2">
        <span className={cn(
          'grid h-4 w-4 shrink-0 place-items-center transition-colors',
          multi ? 'rounded' : 'rounded-full',
          on ? 'bg-[var(--admin-accent)]' : 'border-[1.5px] border-[var(--admin-text-muted)]/40'
        )}>
          {on && (multi
            ? <Check className="h-2.5 w-2.5 text-black" strokeWidth={3} />
            : <span className="h-1.5 w-1.5 rounded-full bg-black" />
          )}
        </span>
        <span className={cn(
          'text-[13px] font-semibold',
          on ? 'text-[var(--admin-text)]' : 'text-[var(--admin-text-muted)]'
        )}>
          {label}
        </span>
      </div>
      {children}
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
