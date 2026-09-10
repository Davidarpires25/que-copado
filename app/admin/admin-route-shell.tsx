'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AdminShell } from '@/components/admin/layout/admin-shell'
import { useThemeStore } from '@/lib/store/theme-store'

/**
 * El tema del panel se sincroniza aca, y no en cada pantalla.
 *
 * Antes lo hacian tres componentes por su cuenta —AdminShell, AdminLayout y
 * caja-dashboard— y los dos primeros ademas quitaban la clase al desmontarse,
 * para que el oscuro del panel no se colara en la tienda. El problema es que
 * desmontarse no significa salir del panel: la caja saltea el shell, asi que al
 * ir de Productos a Caja, AdminShell se desmontaba y borraba la clase:
 *
 *     AdminShell se desmonta   -> el cleanup quita admin-dark
 *     loading.tsx aparece      -> sin clase, tokens claros, skeleton blanco
 *     caja-dashboard monta     -> la vuelve a poner
 *
 * Este componente es el layout de /admin: esta montado en todas las pantallas
 * del panel y se desmonta unicamente al salir de el, que es cuando la clase
 * verdaderamente sobra.
 */
export function AdminRouteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { theme } = useThemeStore()

  useEffect(() => {
    document.documentElement.classList.toggle('admin-dark', theme === 'dark')
    return () => { document.documentElement.classList.remove('admin-dark') }
  }, [theme])

  // Rutas full-screen sin sidebar — cada una gestiona su propio layout
  const skipShell =
    pathname === '/admin/login' ||
    pathname === '/admin/caja' ||
    pathname.startsWith('/admin/caja/ticket')

  if (skipShell) return <>{children}</>
  return <AdminShell>{children}</AdminShell>
}
