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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="h-10 w-10 text-red-400" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Error en el panel
          </h2>
          <p className="text-slate-400">
            Ocurrió un error inesperado. Podés intentar de nuevo o volver al dashboard.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Intentar de nuevo
          </button>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg border border-slate-700 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
