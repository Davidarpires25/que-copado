import { getPlanillaDeConteo } from '@/app/actions/stock'
import { PlanillaConteoPrintLayout } from '@/components/admin/stock/planilla-conteo-print-layout'

interface Props {
  searchParams: Promise<{ categorias?: string }>
}

/**
 * La planilla de conteo, lista para imprimir.
 *
 * Las categorias elegidas viajan por la URL: asi la hoja del freezer se puede
 * guardar como favorito y reimprimir cada semana sin volver a elegir.
 */
export default async function PlanillaPrintPage({ searchParams }: Props) {
  const { categorias } = await searchParams
  const elegidas = categorias ? categorias.split(',').filter(Boolean) : []

  const { data } = await getPlanillaDeConteo(elegidas)

  const fecha = new Date().toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return <PlanillaConteoPrintLayout grupos={data ?? []} fecha={fecha} />
}
