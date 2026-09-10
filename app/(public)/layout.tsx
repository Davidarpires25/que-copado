import { Rubik } from 'next/font/google'

/**
 * Rubik se carga aca y no en el layout raiz.
 *
 * Es la tipografia del sitio publico y el panel no la usa nunca —el admin va en
 * Inter—, pero al estar en la raiz se precargaba en cada pantalla del admin.
 * Una caja que se abre al empezar el turno descargaba una fuente que no iba a
 * dibujar jamas, y el navegador lo avisaba en consola.
 *
 * El grupo `(public)` no cambia ninguna URL: es solo una forma de darle un
 * layout propio a las pantallas que ve el cliente.
 *
 * El envoltorio va con `display: contents` para no meter una caja en el layout.
 */
const rubik = Rubik({
  variable: '--font-rubik',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${rubik.variable} contents`}>{children}</div>
}
