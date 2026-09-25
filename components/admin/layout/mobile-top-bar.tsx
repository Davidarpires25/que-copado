'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Menu } from 'lucide-react'
import { isActiveRoute, visibleNavGroups } from './admin-sidebar'

/**
 * La barra de arriba del panel en el celular: menu, donde estoy, alertas.
 *
 * Antes mostraba un cuadrado amarillo con el gorro de chef —el icono de
 * "Cocina"— haciendo de logo, no decia en que seccion se estaba, y las
 * alertas de stock solo aparecian abriendo el menu. El logo del local sigue
 * en el menu lateral, que es donde esta el de verdad.
 *
 * La seccion sale de la misma lista y la misma funcion que encienden el item
 * del menu: no hay un segundo mapa de rutas a nombres que mantener. Una
 * seccion nueva en el menu queda nombrada aca sola.
 */

/** Pantallas que no estan en el menu y aun asi tienen nombre propio. */
const FUERA_DEL_MENU: Record<string, string> = {
  '/admin/mi-cuenta': 'Mi cuenta',
}

interface MobileTopBarProps {
  onOpenMenu: () => void
  stockAlertCount?: number
  permissions?: string[] | null
}

export function MobileTopBar({ onOpenMenu, stockAlertCount = 0, permissions = null }: MobileTopBarProps) {
  const pathname = usePathname()
  const items = visibleNavGroups(permissions).flatMap((g) => g.items)

  const seccion =
    items.find((item) => isActiveRoute(pathname, item.href))?.label ??
    Object.entries(FUERA_DEL_MENU).find(([href]) => pathname?.startsWith(href))?.[1] ??
    'Panel'

  // Si el rol no tiene Stock en el menu, tampoco tiene la campana: es el mismo
  // permiso. Y sin alertas no hay campana: resaltar lo normal es no resaltar.
  const veStock = items.some((item) => item.href === '/admin/stock')
  const alertas = veStock ? stockAlertCount : 0

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center gap-1 px-1.5 bg-[var(--admin-bg)]/95 backdrop-blur-xl border-b border-[var(--admin-border)] lg:hidden">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menú"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] transition-colors cursor-pointer"
      >
        <Menu className="h-5 w-5" />
      </button>

      <span className="flex-1 min-w-0 truncate text-base font-semibold text-[var(--admin-text)]">
        {seccion}
      </span>

      {alertas > 0 && (
        <Link
          href="/admin/stock"
          aria-label={`${alertas} ${alertas === 1 ? 'alerta' : 'alertas'} de stock`}
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] transition-colors"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center leading-none">
            {alertas > 99 ? '99+' : alertas}
          </span>
        </Link>
      )}
    </header>
  )
}
