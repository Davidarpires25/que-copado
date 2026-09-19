import { AdminLayout } from './admin-layout'

/**
 * El esqueleto que se ve mientras carga una pantalla del admin.
 *
 * Antes cada pantalla tenia el suyo, dibujado a mano, imitando su layout
 * exacto: 13 archivos que eran una copia de otra pantalla. Y una copia en otro
 * archivo se desactualiza sola. David: *"los skeleton estan mostrando tarjetas
 * o secciones que ya no estan, por ej la caja muestra la seccion inferior que
 * sacamos, stock sigue mostrando las tarjetas"*. Stock dibujaba tres tarjetas
 * de estadisticas que no existen, y encima escribia "Control de Stock" cuando
 * la pantalla se llama "Stock e Inventario".
 *
 * Aca no se imita nada. Un esqueleto tiene un solo trabajo --decir "esto esta
 * cargando" y reservar un espacio parecido-- y para eso no hace falta acertarle
 * a la pantalla: hace falta no mentir.
 *
 * **El titulo es una barra gris, no texto.** Escribirlo obliga a mantenerlo
 * sincronizado y ya fallo dos veces; una barra gris que se convierte en el
 * titulo de verdad no puede estar equivocada.
 */

function Barra({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--admin-skeleton)] ${className ?? ''}`} />
}

/** Las tres formas que tiene una pantalla del admin. */
type Forma = 'tabla' | 'tarjetas' | 'formulario'

export function PageSkeleton({ forma = 'tabla', filas = 8 }: { forma?: Forma; filas?: number }) {
  return (
    // El titulo lo pone este componente, no AdminLayout: va como barra gris.
    <AdminLayout title="" hidePageHeader>
      <div className="mb-6 md:mb-8 space-y-2">
        <Barra className="h-8 w-56 max-w-full" />
        <Barra className="h-4 w-80 max-w-full" />
      </div>

      {forma === 'tabla' && <Tabla filas={filas} />}
      {forma === 'tarjetas' && <Tarjetas filas={filas} />}
      {forma === 'formulario' && <Formulario />}
    </AdminLayout>
  )
}

/** Una barra de herramientas y una lista: lo que es casi todo el admin. */
function Tabla({ filas }: { filas: number }) {
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Barra className="h-9 w-full max-w-xs" />
        <Barra className="h-9 w-36 ml-auto" />
      </div>

      <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden">
        <div className="divide-y divide-[var(--admin-border)]">
          {Array.from({ length: filas }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <Barra className="h-4 flex-1" />
              <Barra className="h-4 w-24 hidden sm:block" />
              <Barra className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

/** Una grilla de fichas: productos, mesas, categorias. */
function Tarjetas({ filas }: { filas: number }) {
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Barra className="h-9 w-full max-w-xs" />
        <Barra className="h-9 w-36 ml-auto" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: filas }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl shadow-[var(--shadow-card)] p-4 space-y-3"
          >
            <Barra className="h-24 w-full" />
            <Barra className="h-4 w-3/4" />
            <Barra className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    </>
  )
}

/** Un panel con campos: ajustes, zonas de envio. */
function Formulario() {
  return (
    <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl shadow-[var(--shadow-card)] p-6 space-y-6 max-w-3xl">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Barra className="h-3.5 w-32" />
          <Barra className="h-10 w-full" />
        </div>
      ))}
      <Barra className="h-10 w-40" />
    </div>
  )
}
