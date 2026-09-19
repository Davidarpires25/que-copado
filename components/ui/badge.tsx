import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Un badge es para **estado**, no para cualquier dato.
 *
 * La regla, en una linea: *si no cambia segun lo que pase, no lleva color.*
 *
 * Estado es algo que puede cambiar con lo que ocurre en el negocio y que
 * alguien necesita detectar sin leer la fila entera: Agotado, Bajo, Negativo,
 * Sin seguimiento, Inactiva. Ahi el color hace trabajo real --te lleva el ojo a
 * la fila con problema-- y paga su costo: un borde, un relleno, y texto mas
 * chico para que entre.
 *
 * Un atributo no. La categoria de un insumo, su unidad de medida, un total
 * calculado: describen que es una cosa y no cambian solos. Van como texto.
 *
 * El motivo no es estetico. El resalte es un recurso que se gasta: si todas las
 * filas tienen algo resaltado, el resalte deja de senalar. La tabla de insumos
 * llego a tener, en la fila de un agotado, el badge rojo del estado mas el de
 * la categoria mas el circulo de la unidad. Solo uno de los tres importaba.
 *
 * David, que fue quien lo noto: *"el dato descartable y unidad los cierran
 * circulos con colores, me hace sentir que es muy IA y no se ve bien"*.
 */

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
