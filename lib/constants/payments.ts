import { Banknote, CreditCard, Landmark, QrCode } from 'lucide-react'
import type { PaymentMethod } from '@/lib/types/database'

/**
 * Fuente unica de los metodos de pago.
 *
 * Antes esto vivia duplicado en tres lugares con paletas distintas:
 * `table-pay-view.tsx` pintaba Transferencia de ambar y Mercado Pago de violeta,
 * `pos-historial-tab.tsx` los pintaba de violeta y celeste, y ademas colapsaba
 * Mercado Pago dentro de la etiqueta "Transferencia". El resultado era que un
 * mismo cobro cambiaba de color y de nombre segun la pantalla.
 *
 * La escala evita el ambar (`--admin-accent`), que en el resto del admin
 * significa "accion", y usa cuatro tonos distinguibles entre si en ambos temas.
 */

export interface PaymentMethodConfig {
  value: PaymentMethod
  /** Nombre completo. El que se usa por defecto. */
  label: string
  /** Version corta para espacios angostos (chips, columnas de tabla). */
  shortLabel: string
  icon: React.ElementType
  /**
   * Color del texto/icono. Regla del repo: `-700` en claro, `-400` en oscuro.
   * Los tonos `-600` no llegan a 4.5:1 sobre blanco (emerald-600 da 3.77:1).
   */
  textClass: string
  bgClass: string
  borderClass: string
  /** Fondo solido para puntos e indicadores. Evita derivarlo de textClass. */
  dotClass: string
}

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    value: 'cash',
    label: 'Efectivo',
    shortLabel: 'Efectivo',
    icon: Banknote,
    textClass: 'text-emerald-700 dark:text-emerald-400',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/25',
    dotClass: 'bg-emerald-500',
  },
  {
    value: 'card',
    label: 'Tarjeta',
    shortLabel: 'Tarjeta',
    icon: CreditCard,
    textClass: 'text-sky-700 dark:text-sky-400',
    bgClass: 'bg-sky-500/10',
    borderClass: 'border-sky-500/25',
    dotClass: 'bg-sky-500',
  },
  {
    value: 'transfer',
    label: 'Transferencia',
    shortLabel: 'Transf.',
    icon: Landmark,
    textClass: 'text-violet-700 dark:text-violet-400',
    bgClass: 'bg-violet-500/10',
    borderClass: 'border-violet-500/25',
    dotClass: 'bg-violet-500',
  },
  {
    value: 'mercadopago',
    label: 'Mercado Pago',
    shortLabel: 'M. Pago',
    icon: QrCode,
    textClass: 'text-cyan-700 dark:text-cyan-400',
    bgClass: 'bg-cyan-500/10',
    borderClass: 'border-cyan-500/25',
    dotClass: 'bg-cyan-500',
  },
]

export const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, PaymentMethodConfig> =
  Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m])) as Record<
    PaymentMethod,
    PaymentMethodConfig
  >

/**
 * Etiqueta de un metodo de pago. Cada metodo tiene la suya: nunca colapsar
 * Mercado Pago dentro de Transferencia, son medios distintos y el arqueo los
 * separa.
 */
export function paymentMethodLabel(method: PaymentMethod | string): string {
  return PAYMENT_METHOD_CONFIG[method as PaymentMethod]?.label ?? '—'
}

export function paymentMethodShortLabel(method: PaymentMethod | string): string {
  return PAYMENT_METHOD_CONFIG[method as PaymentMethod]?.shortLabel ?? '—'
}
