import { cn } from '@/lib/utils'

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
  hidePageHeader?: boolean
  /**
   * Ancho maximo de la columna (clase Tailwind, p. ej. "max-w-3xl"). Encierra al
   * titulo junto con el contenido para que compartan el borde izquierdo: una
   * pantalla angosta centrada con el titulo suelto a la izquierda se lee como
   * desalineada. Sin la prop, la pagina ocupa todo el ancho como siempre.
   */
  contentWidth?: string
}

export function AdminLayout({
  children,
  title,
  description,
  hidePageHeader,
  contentWidth,
}: AdminLayoutProps) {
  // El menu, la barra de arriba y el fondo los pone AdminShell, desde el
  // layout de /admin. Esto es solo el titulo de la pagina.
  //
  // Hubo un modo "standalone" que dibujaba su propio menu y su propia barra
  // si la pagina se montaba fuera del shell. Ninguna lo hacia —las pantallas
  // sin shell (login, caja, impresion) no usan AdminLayout— y esa segunda
  // barra tenia su propia copia del logo falso. Dos barras son dos lugares
  // donde divergir.
  return (
    <div className={contentWidth ? cn('mx-auto', contentWidth) : undefined}>
      {!hidePageHeader && (
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--admin-text)]">{title}</h1>
          {description && (
            <p className="text-[var(--admin-text-muted)] text-sm mt-1">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
