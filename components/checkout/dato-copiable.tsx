'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Un dato para copiar de un toque.
 *
 * El cliente esta por transferir desde el telefono: tipear 22 digitos a mano
 * mirando otra pantalla es como se equivoca la gente. El boton dice "Copiado"
 * un segundo y vuelve, que es la unica confirmacion que hace falta.
 *
 * Lo usan el checkout y la pantalla de confirmacion, que muestran los mismos
 * datos en dos momentos distintos: al elegir el medio de pago y al momento de
 * pagar.
 */
export function DatoCopiable({
  etiqueta,
  valor,
  mono,
}: {
  etiqueta: string
  valor: string
  mono?: boolean
}) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    } catch {
      // Sin permiso de portapapeles el dato sigue estando a la vista para
      // copiarlo a mano. No vale la pena un cartel de error por esto.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-[#B0A99F]">{etiqueta}</p>
        <p className={cn('text-[15px] font-semibold text-[#2D1A0E] break-all', mono && 'font-mono tracking-tight')}>
          {valor}
        </p>
      </div>
      <button
        type="button"
        onClick={copiar}
        className="shrink-0 rounded-lg border border-[#E7E0D3] px-3 py-1.5 text-xs font-semibold text-[#2D1A0E] transition-colors hover:bg-[#FBF5E6]"
      >
        {copiado ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}
