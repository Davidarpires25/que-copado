'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Home, UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CartDrawer } from './cart-drawer'
import { BurgerIcon } from '@/components/icons'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const scrollToMenu = () => {
    if (pathname !== '/') {
      router.push('/#menu')
    } else {
      const menuElement = document.getElementById('menu')
      if (menuElement) {
        menuElement.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const navLinks = [
    { href: '/', label: 'Inicio', icon: Home, action: null },
    { href: '/#menu', label: 'Menú', icon: UtensilsCrossed, action: scrollToMenu },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800 bg-black shadow-md">
      <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/">
          <motion.div
            className="flex items-center gap-2 md:gap-3"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <img
              src="/logo.svg"
              alt="Que Copado"
              className="w-10 h-10 md:w-12 md:h-12 shrink-0 object-contain drop-shadow-lg"
            />
            <div className="flex flex-col">
              <span className="text-lg md:text-xl font-black text-white leading-tight">
                Que <span className="text-[#FEC501]">Copado</span>
              </span>
              <span className="hidden sm:block text-[10px] md:text-xs text-white/60 font-medium -mt-0.5">
                Las mejores burgers
              </span>
            </div>
          </motion.div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            link.action ? (
              <Button
                key={link.href}
                variant="ghost"
                className="text-white hover:text-[#FEC501] hover:bg-white/10 font-semibold"
                onClick={link.action}
              >
                <link.icon className="h-4 w-4 mr-2" />
                {link.label}
              </Button>
            ) : (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="ghost"
                  className="text-white hover:text-[#FEC501] hover:bg-white/10 font-semibold"
                >
                  <link.icon className="h-4 w-4 mr-2" />
                  {link.label}
                </Button>
              </Link>
            )
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Cart Drawer */}
          <CartDrawer />

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white hover:bg-white/10"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-neutral-800 bg-black overflow-hidden"
          >
            <nav className="container mx-auto px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                link.action ? (
                  <motion.div
                    key={link.href}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => {
                      link.action()
                      setIsMenuOpen(false)
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#FEC501] flex items-center justify-center">
                      <link.icon className="h-5 w-5 text-black" />
                    </div>
                    <span className="font-semibold text-white">{link.label}</span>
                  </motion.div>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#FEC501] flex items-center justify-center">
                        <link.icon className="h-5 w-5 text-black" />
                      </div>
                      <span className="font-semibold text-white">{link.label}</span>
                    </motion.div>
                  </Link>
                )
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
