import type { PaymentMethod } from '@/lib/types/database'

const HYBRID_EPS = 0.02

/**
 * Valida splits de pago híbrido: no duplicar el total entre medios (salvo vuelto en efectivo).
 */
export function validateHybridPaymentSplits(
  splits: Array<{ amount: number; method: PaymentMethod }>,
  orderTotal: number
): string | null {
  if (splits.length < 2) return null
  if (splits.some((s) => s.amount <= 0)) return 'Los montos deben ser mayores a cero'
  const nonCashSum = splits
    .filter((s) => s.method !== 'cash')
    .reduce((s, p) => s + p.amount, 0)
  const cashSum = splits
    .filter((s) => s.method === 'cash')
    .reduce((s, p) => s + p.amount, 0)
  const total = nonCashSum + cashSum

  if (nonCashSum > orderTotal + HYBRID_EPS) {
    return 'Los medios distintos de efectivo no pueden superar el total del pedido'
  }
  if (total < orderTotal - HYBRID_EPS) {
    return 'La suma de los medios es menor al total del pedido'
  }
  if (nonCashSum >= orderTotal - HYBRID_EPS && cashSum > HYBRID_EPS) {
    return 'El total ya está cubierto; quitá el efectivo o ajustá los montos'
  }
  return null
}

/**
 * En pago dividido, efectivo puede superar el restante (vuelto).
 * El resto de medios no puede hacer que la suma supere el total del pedido.
 */
export function clampAmountForSplitMethod(
  method: PaymentMethod,
  amount: number,
  otherMethodsSum: number,
  orderTotal: number
): number {
  if (amount <= 0) return 0
  if (method === 'cash') return amount
  const cap = Math.max(0, orderTotal - otherMethodsSum)
  return Math.min(amount, cap)
}
