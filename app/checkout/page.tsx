'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShoppingCart, AlertTriangle, MessageCircle, PauseCircle } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { DeliveryForm } from '@/components/checkout/delivery-form'
import { CheckoutSummary } from '@/components/checkout/checkout-summary'
import { Button } from '@/components/ui/button'
import { useCheckout } from '@/lib/hooks/use-checkout'
import { useUIStore } from '@/lib/store/ui-store'

export default function CheckoutPage() {
  const router = useRouter()
  const setCartDrawerOpen = useUIStore((s) => s.setCartDrawerOpen)
  const {
    items,
    deliveryType,
    deliveryData,
    paymentMethod,
    cashAmount,
    isLoading,
    fieldErrors,
    isAcceptingOrders,
    businessMessage,
    checkingBusiness,
    zones,
    shippingResult,
    isCalculatingShipping,
    isOutOfCoverage,
    onDeliveryDataChange,
    onDeliveryTypeChange,
    onPaymentMethodChange,
    onCashAmountChange,
    onCheckout,
    clearFieldError,
  } = useCheckout()

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FBF5E6]">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center gap-6 max-w-md mx-auto text-center">
            <div className="w-32 h-32 rounded-full bg-[#FFF9F0] flex items-center justify-center">
              <ShoppingCart className="h-16 w-16 text-[#E7E0D3]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#2D1A0E] mb-2">
                No hay productos en tu carrito
              </h1>
              <p className="text-[#78706A]">
                Agregá productos para poder realizar tu pedido
              </p>
            </div>
            <Link href="/#menu">
              <Button className="bg-[#FEC501] hover:bg-[#E5B001] text-black font-bold px-8">
                Ver Menú
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FBF5E6]">
      <Header />

      <main className="container mx-auto px-4 py-4 md:py-12">
        <div className="lg:max-w-5xl lg:mx-auto">
          {/* Page header: back button + title */}
          <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-8">
            <button
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  sessionStorage.setItem('openCartOnMenu', '1')
                  router.push('/#menu')
                } else {
                  router.back()
                }
              }}
              aria-label="Volver"
              className="w-10 h-10 rounded-xl bg-white border border-[#F0EBE1] flex items-center justify-center hover:bg-[#FFF9F0] transition-colors shrink-0"
            >
              <ArrowLeft className="h-[18px] w-[18px] text-[#2D1A0E]" />
            </button>
            <h1 className="text-[22px] md:text-[28px] font-extrabold text-[#2D1A0E] leading-tight tracking-tight">
              Checkout
            </h1>
          </div>

          {/* Orders paused warning */}
          {!checkingBusiness && !isAcceptingOrders && (
            <div className="mb-3 md:mb-6 p-3 md:p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
              <PauseCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">
                  No estamos recibiendo pedidos
                </p>
                <p className="text-sm text-red-700 mt-1">
                  {businessMessage || 'Temporalmente no estamos aceptando nuevos pedidos. Volvé más tarde.'}
                </p>
                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5491100000000'}?text=Hola! Vi que no están recibiendo pedidos. ¿Cuándo puedo hacer mi pedido?`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-green-700 hover:text-green-800"
                >
                  <MessageCircle className="h-4 w-4" />
                  Consultar por WhatsApp
                </a>
              </div>
            </div>
          )}

          {/* Out of coverage warning */}
          {isOutOfCoverage && (
            <div className="mb-3 md:mb-6 p-3 md:p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">
                  Tu ubicación está fuera de nuestra zona de cobertura
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  No podemos realizar envíos a esta dirección. Contactanos por WhatsApp para coordinar.
                </p>
                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5491100000000'}?text=Hola! Mi dirección está fuera de la zona de cobertura. ¿Pueden ayudarme?`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-green-700 hover:text-green-800"
                >
                  <MessageCircle className="h-4 w-4" />
                  Contactar por WhatsApp
                </a>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
            {/* Forms */}
            <div className="lg:col-span-7 pb-32 lg:pb-0">
              <DeliveryForm
                data={deliveryData}
                onChange={onDeliveryDataChange}
                deliveryType={deliveryType}
                onDeliveryTypeChange={onDeliveryTypeChange}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={onPaymentMethodChange}
                cashAmount={cashAmount}
                onCashAmountChange={onCashAmountChange}
                shippingResult={shippingResult}
                hasZones={zones.length > 0}
                isCalculatingShipping={isCalculatingShipping}
                fieldErrors={fieldErrors}
                clearFieldError={clearFieldError}
              />
            </div>

            {/* Summary */}
            <div className="lg:col-span-5">
              <CheckoutSummary
                onCheckout={onCheckout}
                isLoading={isLoading}
                shippingResult={shippingResult}
                isBlocked={!!isOutOfCoverage || !isAcceptingOrders}
                isPaused={!isAcceptingOrders}
                isCalculatingShipping={isCalculatingShipping}
                isPickup={deliveryType === 'pickup'}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
