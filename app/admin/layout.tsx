import { Inter } from 'next/font/google'
import { AdminRouteShell } from './admin-route-shell'

/**
 * Inter se carga aca y no en el layout raiz.
 *
 * Es la fuente del panel y no la usa ninguna pantalla publica, pero al estar en
 * el layout raiz se descargaba y se precargaba tambien en la home, el carrito y
 * el checkout — las paginas que ve el cliente y donde el peso importa. El
 * navegador avisaba: "recurso precargado que no se uso en unos pocos segundos".
 *
 * El envoltorio va con `display: contents` para que la variable CSS baje por
 * herencia sin meter una caja en el layout: `h-screen` y `min-h-screen` de las
 * pantallas de adentro siguen midiendo contra el viewport.
 *
 * Los dialogos salen por portal a <body>, fuera de este arbol, y no heredaban
 * la variable: salian con la letra de la tienda. Por eso tambien se le pasa a
 * AdminRouteShell, que la pone en el <html> junto con `admin-panel`; la regla
 * `html.admin-panel body` de globals.css la aplica a los portales. Este div la
 * sigue teniendo para el primer pintado, antes de que el efecto corra.
 */
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} contents`}>
      <AdminRouteShell fuente={inter.variable}>{children}</AdminRouteShell>
    </div>
  )
}
