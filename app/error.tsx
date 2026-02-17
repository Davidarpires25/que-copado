'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-orange-900 mb-2">
            Algo salió mal
          </h2>
          <p className="text-orange-600/70">
            Ocurrió un error inesperado. Podés intentar de nuevo o volver al inicio.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#FEC501] hover:bg-[#E5B001] text-black font-bold rounded-lg transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-orange-50 text-orange-900 font-bold rounded-lg border border-orange-200 transition-colors"
          >
            <Home className="h-4 w-4" />
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
