import { NEGOCIO } from '@/lib/negocio'

/**
 * El nombre del local con la última palabra resaltada: "Que **Copado**".
 *
 * Cada lugar pasa su color (la tienda y el panel usan distintos): el
 * componente parte el nombre, no decide la marca. Un nombre de una sola
 * palabra sale sin resaltar.
 */
export function NombreDelLocal({ resaltado }: { resaltado: string }) {
  const corte = NEGOCIO.nombre.lastIndexOf(' ')
  if (corte === -1) return <>{NEGOCIO.nombre}</>
  return (
    <>
      {NEGOCIO.nombre.slice(0, corte)} <span className={resaltado}>{NEGOCIO.nombre.slice(corte + 1)}</span>
    </>
  )
}
