import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function HeroSection() {
  return (
    <div className="relative md:h-[400px] lg:h-[450px] rounded-3xl overflow-hidden animate-fade-in-up">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1200')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

      <div className="relative h-full flex flex-col justify-center px-6 md:px-10 lg:px-12 max-w-xl">
        <span className="text-amber-400 font-bold text-sm md:text-base mb-2 animate-fade-in-left [animation-delay:200ms]">
          Las mejores de la zona
        </span>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-3 animate-fade-in-left [animation-delay:300ms]">
          Hamburguesas{' '}
          <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
            Artesanales
          </span>
        </h1>

        <p className="text-white/80 text-sm md:text-base mb-6 max-w-md animate-fade-in-left [animation-delay:400ms]">
          Preparadas con los mejores ingredientes, directo a tu puerta.
          Proba el sabor que hace la diferencia.
        </p>

        <div className="animate-fade-in-up [animation-delay:500ms]">
          <Link href="#menu">
            <Button
              size="lg"
              className="bg-[#FEC501] hover:bg-[#E5B001] text-black font-bold shadow-warm-lg hover:shadow-warm-xl transition-all group px-6"
            >
              Pedi Ahora
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 animate-scale-in [animation-delay:600ms]">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20">
          <p className="text-white/80 text-xs md:text-sm">
            <span className="text-amber-400 font-bold">Delivery</span> en 30 min
          </p>
        </div>
      </div>
    </div>
  )
}
