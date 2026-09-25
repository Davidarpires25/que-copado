'use client'

import { useState, useEffect } from 'react'
import { AdminSidebar, MobileSidebar } from './admin-sidebar'
import { MobileTopBar } from './mobile-top-bar'
import { getStockAlerts } from '@/app/actions/stock'
import { getCurrentUserInfo, type CurrentUserInfo } from '@/app/actions/profile'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [stockAlertCount, setStockAlertCount] = useState(0)
  const [me, setMe] = useState<CurrentUserInfo | null>(null)

  // Fetch stock alert count for sidebar badge
  useEffect(() => {
    getStockAlerts().then(({ data }) => {
      setStockAlertCount(data?.length ?? 0)
    }).catch(() => { /* stock alerts are non-critical */ })
  
  }, [])

  // Quien esta trabajando. Null mientras no exista la tabla profiles.
  useEffect(() => {
    getCurrentUserInfo().then(setMe).catch(() => { /* el sidebar usa su default */ })
  }, [])


  // Sin perfil (p. ej. antes de la migracion 016) el sidebar usa sus defaults.
  const meProps = me ? { userName: me.name, userRole: me.roleLabel, permissions: me.permissions } : {}

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] admin-layout">
      {/* Skip link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--admin-accent)] focus:text-black focus:font-bold focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Saltar al contenido
      </a>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar stockAlertCount={stockAlertCount} {...meProps} />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} stockAlertCount={stockAlertCount} permissions={me?.permissions ?? null} />

      {/* Main Content */}
      {/* El margen lo maneja `.admin-contenido` en globals.css: crece
          cuando el menu se abre, sin re-renderizar nada. */}
      <div className="admin-contenido">
        <MobileTopBar
          onOpenMenu={() => setMobileMenuOpen(true)}
          stockAlertCount={stockAlertCount}
          permissions={me?.permissions ?? null}
        />

        {/* Page Content */}
        <main id="main-content" className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
