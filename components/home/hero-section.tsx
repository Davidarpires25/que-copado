'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function HeroSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative h-[300px] md:h-[400px] lg:h-[450px] rounded-3xl overflow-hidden"
    >
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1200')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-center px-6 md:px-10 lg:px-12 max-w-xl">
        <motion.span
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="text-amber-400 font-bold text-sm md:text-base mb-2"
        >
          Las mejores de la zona
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-3"
        >
          Hamburguesas{' '}
          <span className="text-gradient-hero bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
            Artesanales
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="text-white/80 text-sm md:text-base mb-6 max-w-md"
        >
          Preparadas con los mejores ingredientes, directo a tu puerta.
          Probá el sabor que hace la diferencia.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link href="#menu">
            <Button
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold shadow-warm-lg hover:shadow-warm-xl transition-all group px-6"
            >
              Pedí Ahora
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Decorative Elements */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, type: 'spring' }}
        className="absolute bottom-4 right-4 md:bottom-6 md:right-6"
      >
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20">
          <p className="text-white/80 text-xs md:text-sm">
            <span className="text-amber-400 font-bold">Delivery</span> en 30 min
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
