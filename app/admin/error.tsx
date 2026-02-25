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
    <div className="min-h-screen bg-[#12151a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1a1d24] border border-red-500/30 rounded-xl p-8 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="h-10 w-10 text-red-400" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-[#f0f2f5] mb-2">
            Algo salio mal
          </h2>
          <p className="text-[#a8b5c9] text-sm">
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
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#FEC501] hover:bg-[#E5B001] text-black font-bold rounded-lg transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reintentar
          </button>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#252a35] hover:bg-[#2a2f3a] text-[#f0f2f5] font-bold rounded-lg border border-[#2a2f3a] transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Ir al Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
