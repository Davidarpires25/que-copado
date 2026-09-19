'use client'

import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * La explicacion de un campo, guardada detras de un signo de pregunta.
 *
 * David: *"hay mensajes que podriamos dar cuando el mouse se posicione en ese
 * campo sin necesidad de mostrarlo abajo"*. Tiene razon en el fondo --una
 * aclaracion que se lee una vez no merece un renglon fijo para siempre-- con
 * una correccion: si aparece solo al pasar el mouse **por el campo**, nadie la
 * encuentra nunca, porque nada indica que este ahi. Por eso hay un icono
 * chiquito al lado de la etiqueta: ocupa lo mismo que una letra y avisa que
 * hay algo.
 *
 * Es un `<button>` y no un `<span>` a proposito: asi tambien se abre con el
 * teclado al tabular, y en una pantalla tactil al tocarlo. Un tooltip que solo
 * responde al mouse no existe para quien usa el sistema con el dedo.
 *
 * **Que va aca y que no.** Aca va lo que se lee una vez y despues estorba: que
 * 0 de merma significa sin merma, que un insumo inactivo desaparece al armar
 * recetas. **No** va lo que hay que saber antes de actuar --el limite de 2MB de
 * una imagen-- ni lo que avisa de un problema: un error o una advertencia se
 * muestran, no se esconden detras de un icono.
 */
export function AyudaCampo({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Ver ayuda de este campo"
            className="inline-flex align-middle text-[var(--admin-text-faint)] hover:text-[var(--admin-text-muted)] focus-visible:outline-none focus-visible:text-[var(--admin-text-muted)] transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
