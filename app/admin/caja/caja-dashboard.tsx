'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SessionOpenScreen } from '@/components/admin/caja/session-open-screen'
import { PosInterface } from '@/components/admin/caja/pos-interface'
import { SessionCloseScreen } from '@/components/admin/caja/session-close-screen'
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
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      {screen !== 'close' && (
        <div className="bg-[#1a1d24] border-b border-[#2a2f3a] px-4 py-2 flex items-center gap-3 shrink-0">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 text-[#a8b5c9] hover:text-[#f0f2f5] transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
          <div className="w-px h-5 bg-[#2a2f3a]" />
          <h1 className="text-sm font-bold text-[#f0f2f5]">
            Caja
            {session && (
              <span className="ml-2 text-xs font-normal text-green-400">
                Abierta
              </span>
            )}
          </h1>
        </div>
      )}

      {/* Screen router */}
      <div className="flex-1 min-h-0">
        {screen === 'open' && (
          <SessionOpenScreen onSessionOpened={handleSessionOpened} />
        )}

        {screen === 'pos' && session && (
          <PosInterface
            products={products}
            categories={categories}
            session={session}
            initialTables={tables}
            onCloseSession={handleCloseSession}
            onSessionUpdate={handleSessionUpdate}
          />
        )}

        {screen === 'close' && closeSummary && (
          <SessionCloseScreen
            summary={closeSummary}
            openTablesCount={openTablesCount}
            onBack={() => setScreen('pos')}
            onClosed={handleSessionClosed}
          />
        )}
      </div>
    </div>
  )
}
