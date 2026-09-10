import type { PaymentMethod } from '@/lib/types/database'

/** Tolerancia en pesos. Los montos son enteros pero los totales pasan por numeric. */
const HYBRID_EPS = 0.02

export interface ActivePayment {
  method: PaymentMethod
  amount: number
}

/**
 * Valida splits de pago híbrido: no duplicar el total entre medios (salvo vuelto en efectivo).
 *
 * Es la autoridad. `applyPaymentAmount` existe para que la interfaz no pueda
 * armar una combinacion que esto rechace.
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
 * Fija el monto de un medio y reacomoda los demas.
 *
 * Antes, poner un monto cuando el total ya estaba cubierto no hacia nada: el
 * medio nuevo se recortaba a cero y desaparecia sin decir por que. Aca el medio
 * que acabas de tocar manda y los otros ceden, del mas grande al mas chico.
 *
 * Las reglas son las de validateHybridPaymentSplits, aplicadas al escribir en
 * vez de al confirmar:
 *   - el efectivo puede superar el total (eso es el vuelto)
 *   - el resto de los medios, entre todos, nunca supera el total
 *   - si esos ya cubren el total, el efectivo no tiene lugar y se saca
 *
 * Al tocar un medio que no es efectivo, el efectivo cede lo que ese medio se
 * lleva: poner "10.000 en transferencia" significa que esos 10.000 salen del
 * efectivo, no que el cliente pago de mas. Editar el efectivo a mano nunca lo
 * recorta — ese es el camino del vuelto.
 */
export function applyPaymentAmount(
  payments: ActivePayment[],
  method: PaymentMethod,
  rawAmount: number,
  orderTotal: number
): ActivePayment[] {
  const amount = Math.max(0, rawAmount)
  if (amount <= 0) return payments.filter((p) => p.method !== method)

  const isCash = method === 'cash'
  const monto = isCash ? amount : Math.min(amount, orderTotal)

  // Copias frescas: mas abajo se descuenta sobre estos objetos.
  let next: ActivePayment[] = payments.some((p) => p.method === method)
    ? payments.map((p) => (p.method === method ? { ...p, amount: monto } : { ...p }))
    : [...payments.map((p) => ({ ...p })), { method, amount: monto }]

  if (!isCash) {
    let sobra = sumNonCash(next) - orderTotal
    while (sobra > HYBRID_EPS) {
      const cede = next
        .filter((p) => p.method !== 'cash' && p.method !== method && p.amount > 0)
        .sort((a, b) => b.amount - a.amount)[0]
      if (!cede) break
      const quita = Math.min(cede.amount, sobra)
      cede.amount -= quita
      sobra -= quita
    }
    const efectivo = next.find((p) => p.method === 'cash')
    if (efectivo) {
      const lugar = Math.max(0, orderTotal - sumNonCash(next))
      if (efectivo.amount > lugar) efectivo.amount = lugar
    }

    next = next.filter((p) => p.method === method || p.amount > HYBRID_EPS)
  }

  // El efectivo no entra donde ya no hay lugar.
  if (sumNonCash(next) >= orderTotal - HYBRID_EPS) {
    next = next.filter((p) => p.method !== 'cash')
  }

  return next
}

function sumNonCash(payments: ActivePayment[]): number {
  return payments.filter((p) => p.method !== 'cash').reduce((s, p) => s + p.amount, 0)
}
