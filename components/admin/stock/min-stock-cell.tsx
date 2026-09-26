'use client'

import { useState, useRef } from 'react'
import { updateMinStock } from '@/app/actions/stock'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface MinStockCellProps {
  type: 'ingredient' | 'product'
  id: string
  /** El minimo actual. `null` es "sin minimo". */
  value: number | null
  /** Para mostrar al lado del numero: "kg", "u". */
  unitLabel: string
  /** El item tiene el seguimiento apagado: el minimo no aplica. */
  disabled?: boolean
  /** Se llama con el valor nuevo apenas se guarda, para que la fila se actualice. */
  onSaved: (nuevo: number | null) => void
}

/**
 * El minimo de stock, editable en su propia celda.
 *
 * Antes era texto, y el unico lugar donde se podia cambiar era el dialogo de
 * ajuste en modo "corregir" —que se niega a guardar si el stock no cambia—. O
 * sea que subir un umbral de 5 a 10 obligaba a mover stock que no se movio, y
 * eso dejaba un ajuste falso en el historial con el que despues se explica el
 * consumo.
 *
 * Se guarda al salir del foco o con Enter, y se descarta con Escape. Sin boton
 * de confirmar: es un numero que se puede volver a escribir, no una accion
 * destructiva. Solo se guarda cuando cambio y es valido.
 */
export function MinStockCell({ type, id, value, unitLabel, disabled, onSaved }: MinStockCellProps) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // El texto se toma del valor al abrir la celda, no se sincroniza con el.
  // Asi, si la fila cambia por otro camino —un ajuste de stock— la celda muestra
  // lo nuevo sin que haya que copiarlo a mano en un efecto.
  const abrir = () => {
    setTexto(value !== null ? String(value) : '')
    setEditando(true)
  }

  const cancelar = () => setEditando(false)

  const guardar = async () => {
    const limpio = texto.trim()
    const nuevo = limpio === '' ? null : Number(limpio)

    if (nuevo !== null && (!Number.isFinite(nuevo) || nuevo < 0)) {
      toast.error('El mínimo tiene que ser un número de 0 para arriba')
      cancelar()
      return
    }

    setEditando(false)

    if (nuevo === value) return

    setGuardando(true)
    onSaved(nuevo) // optimista: la fila y sus alertas se actualizan ya
    const result = await updateMinStock(type, id, nuevo)
    setGuardando(false)

    if (result.error) {
      toast.error(result.error)
      onSaved(value) // vuelve a lo que habia
      return
    }

    toast.success(nuevo === null ? 'Sin mínimo' : `Mínimo: ${nuevo} ${unitLabel}`)
  }

  if (disabled) {
    return <span className="text-[var(--admin-text-muted)] text-sm">--</span>
  }

  if (!editando) {
    return (
      <button
        type="button"
        onClick={abrir}
        title="Cambiar el mínimo"
        className={cn(
          'text-sm rounded px-1.5 py-0.5 -mx-1.5 transition-colors',
          'hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text)]',
          // Sin minimo muestra un dato ("no hay"), no un placeholder: va en terciario.
          value !== null ? 'text-[var(--admin-text-muted)]' : 'text-[var(--admin-text-faint)]',
          guardando && 'opacity-50'
        )}
      >
        {value !== null ? `${value} ${unitLabel}` : 'sin mínimo'}
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      type="number"
      min="0"
      step="0.01"
      inputMode="decimal"
      value={texto}
      autoFocus
      onChange={(e) => setTexto(e.target.value)}
      onBlur={guardar}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); void guardar() }
        if (e.key === 'Escape') { e.preventDefault(); cancelar() }
      }}
      placeholder="sin mínimo"
      aria-label="Stock mínimo"
      className="w-24 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded px-2 py-1 text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/60 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
    />
  )
}
