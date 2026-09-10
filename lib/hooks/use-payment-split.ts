'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { applyPaymentAmount, type ActivePayment } from '@/lib/utils/payment-split'
import { parseARS } from '@/lib/utils/currency'
import type { PaymentMethod } from '@/lib/types/database'

const EPS = 0.02

/**
 * El mecanismo de cobrar: que medios estan puestos, cuanto cubre cada uno,
 * cuanto falta y cuanto es el vuelto.
 *
 * Vivia escrito dos veces —`pending-order-pay-view` y `table-pay-view` repetian
 * los cinco estados y las mismas cuentas— asi que cada arreglo habia que
 * hacerlo dos veces.
 */
export function usePaymentSplit(total: number, resetKey: string) {
  const [payments, setPayments] = useState<ActivePayment[]>([])
  const [editing, setEditing] = useState<PaymentMethod | null>(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setPayments([])
    setEditing(null)
    setDraft('')
  }, [])

  // Reset al cambiar de pedido, ajustando el estado durante el render en vez de
  // en un efecto: asi no hay un primer render con los montos del pedido
  // anterior todavia puestos.
  const [claveAnterior, setClaveAnterior] = useState(resetKey)
  if (claveAnterior !== resetKey) {
    setClaveAnterior(resetKey)
    setPayments([])
    setEditing(null)
    setDraft('')
  }

  // Seleccionar y no solo enfocar: el monto viene sugerido y casi siempre se
  // reemplaza entero.
  useEffect(() => {
    if (!editing) return
    const id = setTimeout(() => inputRef.current?.select(), 30)
    return () => clearTimeout(id)
  }, [editing])

  const covered = payments.reduce((s, p) => s + p.amount, 0)
  const remaining = Math.max(0, total - covered)
  const isComplete = covered >= total - EPS
  const cashReceived = payments.find((p) => p.method === 'cash')?.amount ?? 0
  const change = cashReceived > 0 && isComplete ? Math.max(0, covered - total) : 0

  const commit = useCallback((method: PaymentMethod) => {
    const monto = parseARS(draft) ?? 0
    setPayments((prev) => applyPaymentAmount(prev, method, monto, total))
    setEditing(null)
    setDraft('')
  }, [draft, total])

  const cancel = useCallback(() => {
    setEditing(null)
    setDraft('')
  }, [])

  const toggle = useCallback((method: PaymentMethod) => {
    if (editing && editing !== method) commit(editing)

    if (payments.some((p) => p.method === method)) {
      setPayments((prev) => prev.filter((p) => p.method !== method))
      if (editing === method) cancel()
      return
    }

    // Con el total ya cubierto esto hacia `return` en silencio y el clic moria.
    // Ahora abre el monto en blanco y `applyPaymentAmount` reacomoda el resto.
    const sugerido = Math.round(remaining)
    if (sugerido > 0) {
      setPayments((prev) => applyPaymentAmount(prev, method, sugerido, total))
      setDraft(String(sugerido))
    } else {
      setDraft('')
    }
    setEditing(method)
  }, [editing, commit, payments, remaining, total, cancel])

  const edit = useCallback((method: PaymentMethod) => {
    if (editing === method) return
    if (editing) commit(editing)
    const entry = payments.find((p) => p.method === method)
    setDraft(entry ? String(Math.round(entry.amount)) : '')
    setEditing(method)
  }, [editing, commit, payments])

  return {
    payments, editing, draft, inputRef,
    covered, remaining, isComplete, change, cashReceived,
    setDraft, toggle, edit, commit, cancel, reset,
  }
}
