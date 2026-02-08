'use client'

import { motion } from 'framer-motion'
import { Sparkles, Flame } from 'lucide-react'

export function SideDeals() {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Deal Card 1 - 2x1 */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.02 }}
        className="flex-1 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-3xl p-6 cursor-pointer group overflow-hidden relative"
      >
        <div className="absolute -right-8 -bottom-8 opacity-20">
          <Sparkles className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <span className="inline-block bg-white/30 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
            OFERTA ESPECIAL
          </span>
          <h3 className="text-2xl font-black text-white mb-2 group-hover:translate-x-1 transition-transform">
            2x1 en Burgers
          </h3>
          <p className="text-white/80 text-sm">
            Todos los martes y jueves
          </p>
        </div>
      </motion.div>

      {/* Deal Card 2 - Combo del Día */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.02 }}
        className="flex-1 bg-gradient-to-br from-orange-900 to-amber-900 rounded-3xl p-6 cursor-pointer group overflow-hidden relative"
      >
        <div className="absolute -right-8 -bottom-8 opacity-20">
          <Flame className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <span className="inline-block bg-orange-500/50 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
            COMBO DEL DÍA
          </span>
          <h3 className="text-2xl font-black text-white mb-2 group-hover:translate-x-1 transition-transform">
            Burger + Papas + Bebida
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400">$8.990</span>
            <span className="text-white/50 line-through text-sm">$12.500</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
