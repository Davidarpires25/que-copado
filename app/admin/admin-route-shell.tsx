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

  // `admin-panel` marca que estamos en el panel, para lo que no depende del
  // tema: los tamaños tactiles (variante `tactil:` en globals.css). Va en
  // <html> por la misma razon que `admin-dark`: los dialogos y selects salen
  // por portal a <body>, fuera de este arbol. Y se va al salir, para que la
  // tienda —que comparte los componentes base— no la herede.
  useEffect(() => {
    document.documentElement.classList.add('admin-panel')
    return () => { document.documentElement.classList.remove('admin-panel') }
  }, [])

  // Rutas full-screen sin sidebar — cada una gestiona su propio layout.
  //
  // Toda pagina de impresion entra por la regla y no por la lista: lo que sale
  // impreso es el papel, no el panel. El ticket de caja estaba contemplado por
  // su prefijo, pero la ficha tecnica, la comanda de cocina y la planilla de
  // conteo salian con el encabezado del admin --el boton de menu y "Que
  // Copado"-- pegado arriba de la hoja.
  //
  // Por regla y no agregando cuatro rutas a mano: la proxima pagina de
  // impresion que se agregue ya sale limpia. Es el mismo olvido que dejo el
  // combo sin tope en tres caminos.
  const esImpresion = pathname.endsWith('/print')

  const skipShell =
    esImpresion ||
    pathname === '/admin/login' ||
    pathname === '/admin/caja' ||
    pathname.startsWith('/admin/caja/ticket')

  if (skipShell) return <>{children}</>
  return <AdminShell>{children}</AdminShell>
}
