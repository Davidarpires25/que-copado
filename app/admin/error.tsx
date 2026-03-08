'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[var(--admin-surface)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[var(--admin-bg)] border border-red-500/30 rounded-xl p-8 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="h-10 w-10 text-red-400" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-[var(--admin-text)] mb-2">
            Algo salio mal
          </h2>
          <p className="text-[var(--admin-text-muted)] text-sm">
            Ocurrio un error inesperado. Podes intentar de nuevo o volver al dashboard.
          </p>
          {error.message && (
            <p className="text-xs text-red-400/70 mt-3 font-mono bg-red-950/20 rounded-lg px-3 py-2 break-all">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-bold rounded-lg transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reintentar
          </button>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--admin-surface-2)] hover:bg-[var(--admin-border)] text-[var(--admin-text)] font-bold rounded-lg border border-[var(--admin-border)] transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Ir al Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
