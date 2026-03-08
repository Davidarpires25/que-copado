'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SessionOpenScreen } from '@/components/admin/caja/session-open-screen'
import { PosInterface } from '@/components/admin/caja/pos-interface'
import { SessionCloseScreen } from '@/components/admin/caja/session-close-screen'
import { useThemeStore } from '@/lib/store/theme-store'
import type { Category, Product } from '@/lib/types/database'
import type { CashRegisterSession, SessionSummary } from '@/lib/types/cash-register'
import type { TableWithOrder } from '@/lib/types/tables'

type Screen = 'open' | 'pos' | 'close'

interface CajaDashboardProps {
  products: Product[]
  categories: Category[]
  initialSession: CashRegisterSession | null
  initialTables: TableWithOrder[]
}

export function CajaDashboard({
  products,
  categories,
  initialSession,
  initialTables,
}: CajaDashboardProps) {
  const [screen, setScreen] = useState<Screen>(initialSession ? 'pos' : 'open')
  const [session, setSession] = useState<CashRegisterSession | null>(initialSession)
  const [closeSummary, setCloseSummary] = useState<SessionSummary | null>(null)
  const [tables, setTables] = useState<TableWithOrder[]>(initialTables)

  // Fix 1 (CRÍTICO): Sincronizar dark mode al html cuando no hay AdminLayout
  const { theme } = useThemeStore()
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('admin-dark')
    } else {
      document.documentElement.classList.remove('admin-dark')
    }
  }, [theme])

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

  // Full-screen layout — no AdminLayout/sidebar
  return (
    // Fix 4 (MEDIO): Fade-in suave al entrar desde Dashboard
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="h-screen flex flex-col overflow-hidden admin-layout"
    >
      {/* Top bar — Fix 2 (ALTO): bg coincide con sidebar (#1a1d24) */}
      {screen !== 'close' && (
        <div className="bg-[#1a1d24] border-b border-[#2a2f3a] px-4 py-2 flex items-center gap-3 shrink-0">
          {/* Fix 3 (ALTO): "Admin" → "Dashboard" para orientación espacial clara */}
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 text-[#a8b5c9] hover:text-[#f0f2f5] transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div className="w-px h-5 bg-[#2a2f3a]" />
          <h1 className="text-sm font-bold text-[#f0f2f5] flex items-center gap-2">
            Caja
            {/* Fix 5 (MEDIO): Badge consistente con el sistema de badges del admin */}
            {session && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border text-emerald-400 bg-emerald-400/10 border-emerald-400/20">
                Abierta
              </span>
            )}
          </h1>
        </div>
      )}

      {/* Screen router */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {screen === 'open' && (
            <motion.div
              key="open"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="h-full"
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
              className="h-full"
            >
              <PosInterface
                products={products}
                categories={categories}
                session={session}
                initialTables={tables}
                onCloseSession={handleCloseSession}
                onSessionUpdate={handleSessionUpdate}
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
              className="h-full"
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
    </motion.div>
  )
}
