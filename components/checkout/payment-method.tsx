'use client'

import { CreditCard, Banknote, Smartphone, DollarSign } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type PaymentMethodType = 'cash' | 'transfer' | 'mercadopago'

interface PaymentMethodProps {
  selected: PaymentMethodType
  onSelect: (method: PaymentMethodType) => void
  cashAmount: string
  onCashAmountChange: (amount: string) => void
}

const paymentMethods = [
  {
    id: 'cash' as const,
    label: 'Efectivo',
    description: 'Pagá al recibir tu pedido',
    icon: Banknote,
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'transfer' as const,
    label: 'Transferencia',
    description: 'CBU/CVU al confirmar',
    icon: Smartphone,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'mercadopago' as const,
    label: 'Mercado Pago',
    description: 'Link de pago seguro',
    icon: CreditCard,
    color: 'from-sky-500 to-blue-500',
  },
]

export function PaymentMethodSelector({
  selected,
  onSelect,
  cashAmount,
  onCashAmountChange,
}: PaymentMethodProps) {
  return (
    <div className="bg-white rounded-2xl border border-orange-100 shadow-warm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-orange-100 bg-orange-50/50">
        <div className="w-10 h-10 rounded-full bg-[#FEC501] flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-black" />
        </div>
        <div>
          <h2 className="font-bold text-orange-900">Método de Pago</h2>
          <p className="text-sm text-orange-600/70">
            Elegí cómo querés pagar
          </p>
        </div>
      </div>

      {/* Payment Options */}
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon
            const isSelected = selected === method.id

            return (
              <button
                key={method.id}
                onClick={() => onSelect(method.id)}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50 shadow-warm'
                    : 'border-orange-200 hover:border-orange-300 bg-white'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#FEC501] flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-black"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-r ${method.color} flex items-center justify-center mb-3`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <p className="font-bold text-orange-900">{method.label}</p>
                <p className="text-xs text-orange-600/70 mt-0.5">
                  {method.description}
                </p>
              </button>
            )
          })}
        </div>

        {/* Cash Amount Input */}
        {selected === 'cash' && (
          <div className="bg-orange-50 rounded-xl p-4 mt-4">
            <Label
              htmlFor="cashAmount"
              className="text-orange-800 font-semibold flex items-center gap-2 mb-2"
            >
              <DollarSign className="h-4 w-4" />
              ¿Con cuánto pagás? (opcional)
            </Label>
            <Input
              id="cashAmount"
              type="text"
              placeholder="Monto con el que vas a pagar"
              value={cashAmount}
              onChange={(e) => onCashAmountChange(e.target.value)}
              className="input-large border-orange-200 focus:border-orange-400 bg-white"
            />
            <p className="text-xs text-orange-600/60 mt-2">
              Así preparamos el vuelto exacto
            </p>
          </div>
        )}

        {/* Transfer Info */}
        {selected === 'transfer' && (
          <div className="bg-blue-50 rounded-xl p-4 mt-4">
            <p className="text-blue-800 font-medium text-sm">
              Te enviaremos los datos de la cuenta por WhatsApp para que puedas transferir.
            </p>
          </div>
        )}

        {/* Mercado Pago Info */}
        {selected === 'mercadopago' && (
          <div className="bg-sky-50 rounded-xl p-4 mt-4">
            <p className="text-sky-800 font-medium text-sm">
              Recibirás un link de pago de Mercado Pago por WhatsApp.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
