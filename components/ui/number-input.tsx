'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'

/**
 * Un campo numerico que se deja escribir.
 *
 * El problema que resuelve: un `<input type="number">` controlado por un
 * numero no se puede vaciar. Al borrar el ultimo digito el campo queda en `''`,
 * eso no es un numero, y el codigo de arriba lo reemplaza por algo —el minimo,
 * un 1, o el valor anterior— antes de que la persona alcance a escribir. El
 * digito vuelve a aparecer solo.
 *
 * David, sobre la cantidad de un ingrediente en una receta: *"este se marca en
 * 1 automaticamente pero no me deja borrar el 1 para poner lo que yo quiera, lo
 * que me obliga poner un numero por delante del 1 para borrarlo"*.
 *
 * La solucion es separar **lo que se esta escribiendo** de **lo que vale**.
 * Mientras el campo tiene foco manda el texto tal cual se tipeo, aunque este
 * vacio o a medio escribir —`"1."`, `"0."`—. Cada vez que ese texto es un
 * numero valido se avisa hacia arriba; cuando no lo es, no se avisa nada y el
 * valor de antes sigue en pie.
 *
 * Al salir del campo vuelve a mostrarse el valor de afuera, que es el ultimo
 * bueno porque es el unico que llego a subir. No se inventa un minimo ni un 1:
 * si alguien borro todo y se fue, lo mas probable es que se haya arrepentido,
 * no que quiera un valor nuevo.
 *
 * Dos detalles mas, chicos y del mismo problema:
 *
 * - **Se selecciona todo al entrar**, asi escribir pisa lo que habia en vez de
 *   sumarse adelante. Es el atajo que se estaba haciendo a mano.
 * - **La rueda del mouse no cambia el numero.** Un `type="number"` con foco
 *   cambia de valor al scrollear la pagina, y una receta larga se desconfigura
 *   sola sin que nadie toque nada.
 */
interface NumberInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> {
  value: number
  onValueChange: (valor: number) => void
  /** Redondea a entero: cantidades de productos, no gramos. */
  integer?: boolean
}

export function NumberInput({
  value,
  onValueChange,
  integer = false,
  min,
  onFocus,
  onBlur,
  ...props
}: NumberInputProps) {
  // `null` = mostrar el valor de afuera. Un string = lo que se esta escribiendo.
  const [borrador, setBorrador] = useState<string | null>(null)

  const minimo = min === undefined || min === '' ? undefined : Number(min)

  const esUsable = (n: number) =>
    Number.isFinite(n) && (minimo === undefined || n >= minimo)

  return (
    <Input
      {...props}
      type="number"
      min={min}
      value={borrador ?? String(value)}
      onFocus={(e) => {
        e.target.select()
        onFocus?.(e)
      }}
      onWheel={(e) => e.currentTarget.blur()}
      onChange={(e) => {
        const texto = e.target.value
        setBorrador(texto)

        if (texto.trim() === '') return
        const n = Number(texto)
        if (!esUsable(n)) return

        onValueChange(integer ? Math.round(n) : n)
      }}
      onBlur={(e) => {
        // Soltar el borrador alcanza para que vuelva el ultimo valor bueno:
        // arriba solo llegaron numeros validos, asi que `value` ya es ese.
        setBorrador(null)
        onBlur?.(e)
      }}
    />
  )
}
