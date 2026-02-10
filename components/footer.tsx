'use client'

import Link from 'next/link'
import { Phone, MapPin, Clock, Instagram, Facebook } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  const quickLinks = [
    { href: '/', label: 'Inicio' },
    { href: '/#menu', label: 'Menú' },
    { href: '/cart', label: 'Mi Pedido' },
  ]

  const legalLinks = [
    { href: '#', label: 'Términos y Condiciones' },
    { href: '#', label: 'Política de Privacidad' },
  ]

  return (
    <footer className="bg-gradient-to-br from-orange-900 via-orange-800 to-amber-900 text-white">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#FEC501] flex items-center justify-center shadow-lg">
                <span className="text-2xl">🍔</span>
              </div>
              <div>
                <span className="text-xl font-black text-white leading-tight block">
                  Que <span className="text-amber-400">Copado</span>
                </span>
              </div>
            </div>
            <p className="text-orange-200/80 text-sm leading-relaxed mb-4">
              Las mejores hamburguesas artesanales de la zona. Ingredientes frescos,
              sabor único y mucho amor en cada preparación.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-amber-400">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-orange-200/80 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-amber-400">Contacto</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-orange-200/80 text-sm">
                  Av. Corrientes 1234, CABA
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-amber-400 shrink-0" />
                <span className="text-orange-200/80 text-sm">
                  11 1234-5678
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-orange-200/80 text-sm">
                  <p>Lun - Vie: 11:00 - 23:00</p>
                  <p>Sáb - Dom: 12:00 - 00:00</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-amber-400">Legal</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-orange-200/80 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-orange-700/50 mt-10 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-orange-200/60 text-sm text-center md:text-left">
              © {currentYear} Que Copado. Todos los derechos reservados.
            </p>
            <p className="text-orange-200/40 text-xs">
              Hecho con 🧡 para los amantes de las buenas burgers
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
