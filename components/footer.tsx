'use client'

import Link from 'next/link'
import { Phone, MapPin, Clock, Instagram, Facebook } from 'lucide-react'
import { WhatsAppIcon } from './icons'

export function Footer() {
  const currentYear = new Date().getFullYear()
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5491154997700'

  const quickLinks = [
    { href: '/', label: 'Inicio' },
    { href: '/#menu', label: 'Menú' },
    { href: '/cart', label: 'Mi Pedido' },
  ]

  return (
    <footer className="bg-black text-white border-t border-[#FEC501] mt-16">
      <div className="container mx-auto px-4 py-10 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#FEC501] flex items-center justify-center">
                <span className="text-xl">🍔</span>
              </div>
              <span className="text-xl font-black text-white">
                Que <span className="text-[#FEC501]">Copado</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Las mejores hamburguesas artesanales. Ingredientes frescos y mucho sabor en cada preparación.
            </p>
            {/* Redes Sociales — configurar URLs reales cuando estén disponibles */}
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center" aria-label="Instagram">
                <Instagram className="h-4 w-4 text-gray-600" />
              </div>
              <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center" aria-label="Facebook">
                <Facebook className="h-4 w-4 text-gray-600" />
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Enlaces</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-[#FEC501] transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Horarios */}
          <div>
            <h3 className="font-semibold text-white mb-4">Horarios</h3>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-[#FEC501] shrink-0 mt-0.5" />
              <div className="text-gray-400 text-sm">
                <p className="font-medium text-white">Todos los días</p>
                <p>21:00 a 01:00 hs</p>
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="font-semibold text-white mb-4">Contacto</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-[#FEC501] shrink-0 mt-0.5" />
                <span className="text-gray-400 text-sm">
                  Av. Güemes Oeste y Avellaneda
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-[#FEC501] shrink-0" />
                <a
                  href="tel:+54154997700"
                  className="text-gray-400 hover:text-[#FEC501] transition-colors text-sm"
                >
                  154 997 700
                </a>
              </li>
              <li className="flex items-center gap-3">
                <WhatsAppIcon size={20} className="text-[#FEC501] shrink-0" />
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[#FEC501] transition-colors text-sm"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-6 items-center text-center">
          <p className="text-gray-500 text-xs text-center">
            © {currentYear} Que Copado. Todos los derechos reservados.
           
          </p>
          <p className="text-orange-200/40 text-xs">
              Hecho con 🧡 para los amantes de las buenas burgers
            </p>
        </div>
      </div>
    </footer>
  )
}
