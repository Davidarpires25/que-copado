'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SessionOpenScreen } from '@/components/admin/caja/session-open-screen'
import { PosInterface } from '@/components/admin/caja/pos-interface'
import { SessionCloseScreen } from '@/components/admin/caja/session-close-screen'
import { AdminSidebar, MobileSidebar } from '@/components/admin/layout/admin-sidebar'
import { MobileTopBar } from '@/components/admin/layout/mobile-top-bar'
import type { Category, ProductWithHalfConfig, Order, DeliveryZone } from '@/lib/types/database'
import type { CashRegisterSession, SessionSummary } from '@/lib/types/cash-register'
import type { TableWithOrder } from '@/lib/types/tables'
import type { OrderWithSplits } from '@/lib/types/cash-register'
import type { CurrentUserInfo } from '@/app/actions/profile'

type Screen = 'open' | 'pos' | 'close'

interface CajaDashboardProps {
  products: ProductWithHalfConfig[]
  categories: Category[]
  initialSession: CashRegisterSession | null
  initialTables: TableWithOrder[]
  initialPendingOrders: Order[]
  initialDeliveryZones: DeliveryZone[]
  initialSessionOrders: OrderWithSplits[]
  stockAlertCount: number
  currentUser: CurrentUserInfo | null
}

export function CajaDashboard({
  products,
  categories,
  initialSession,
  initialTables,
  initialPendingOrders,
  initialDeliveryZones,
  initialSessionOrders,
  stockAlertCount,
  currentUser,
}: CajaDashboardProps) {
  const [screen, setScreen] = useState<Screen>(initialSession ? 'pos' : 'open')
  const [session, setSession] = useState<CashRegisterSession | null>(initialSession)
  const [closeSummary, setCloseSummary] = useState<SessionSummary | null>(null)
  // Sin estado local: PosInterface llama a router.refresh() tras cada cambio de
  // mesa, asi que la prop del server ya trae el dato fresco. Copiarla a
  // useState congelaba `openTablesCount` hasta recargar la pagina.
  const tables = initialTables
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const openTablesCount = tables.filter((t) => t.status !== 'libre').length

  const handleSessionOpened = (newSession: CashRegisterSession) => {
    setSession(newSession)
    setScreen('pos')
  }

  const handleCloseSession = (summary: SessionSummary) => {
    setCloseSummary(summary)
    setScreen('close')
  }

  const handleSessionClosed = () => {
    setSession(null)
    setCloseSummary(null)
    setScreen('open')
  }

  const handleSessionUpdate = (updatedSession: CashRegisterSession) => {
    setSession(updatedSession)
  }


  // Sin perfil (p. ej. antes de la migracion 016) el sidebar usa sus defaults.
  const meProps = currentUser ? { userName: currentUser.name, userRole: currentUser.roleLabel, permissions: currentUser.permissions } : {}

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="h-screen overflow-hidden admin-layout"
    >
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar stockAlertCount={stockAlertCount} {...meProps} />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} stockAlertCount={stockAlertCount} {...meProps} />

      {/* Main content — shifted right by sidebar width */}
      {/* Clavado en los 72px de la barra angosta: el menu abierto se
          superpone en vez de correr la pagina. */}
      <div className="h-full flex flex-col admin-contenido admin-contenido--caja">
        {/* Con turno abierto el menu lo pone ShiftBar; si esta banda tambien
            aparecia, el celular mostraba dos barras con dos botones de menu.
            Queda solo para abrir turno, y es la misma barra que el resto del
            panel. En escritorio no aparece (MobileTopBar es lg:hidden). */}
        {screen === 'open' && (
          <div className="shrink-0">
            <MobileTopBar
              onOpenMenu={() => setMobileMenuOpen(true)}
              stockAlertCount={stockAlertCount}
              permissions={currentUser?.permissions ?? null}
            />
          </div>
        )}

        {/* Screen router */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {screen === 'open' && (
              <motion.div
                key="open"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute inset-0"
              >
                <SessionOpenScreen onSessionOpened={handleSessionOpened} />
              </motion.div>
            )}

            {screen === 'pos' && session && (
              <motion.div
                key="pos"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute inset-0"
              >
                <PosInterface
                  products={products}
                  categories={categories}
                  session={session}
                  initialTables={tables}
                  initialPendingOrders={initialPendingOrders}
                  initialDeliveryZones={initialDeliveryZones}
                  initialSessionOrders={initialSessionOrders}
                  onCloseSession={handleCloseSession}
                  onSessionUpdate={handleSessionUpdate}
                  onOpenMenu={() => setMobileMenuOpen(true)}
                />
              </motion.div>
            )}

            {screen === 'close' && closeSummary && (
              <motion.div
                key="close"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute inset-0"
              >
                <SessionCloseScreen
                  summary={closeSummary}
                  openTablesCount={openTablesCount}
                  onBack={() => setScreen('pos')}
                  onClosed={handleSessionClosed}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
