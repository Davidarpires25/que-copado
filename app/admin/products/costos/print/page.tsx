import { getReporteDeCostos, type GrupoDeCosto } from '@/app/actions/reporte-costos'
import { ReporteCostosPrintLayout } from '@/components/admin/products/reporte-costos-print-layout'

interface Props {
  searchParams: Promise<{ grupos?: string }>
}

/**
 * El reporte de costos, listo para imprimir.
 *
 * Los grupos elegidos viajan por la URL, igual que las categorias de la
 * planilla de conteo: asi el reporte de "solo reventa" se puede guardar como
 * favorito y reimprimir cuando llega la lista del proveedor.
 */
export default async function ReporteCostosPrintPage({ searchParams }: Props) {
  const { grupos } = await searchParams
  const elegidos = (grupos ? grupos.split(',').filter(Boolean) : []) as GrupoDeCosto[]

  const { data } = await getReporteDeCostos(elegidos)

  const fecha = new Date().toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <ReporteCostosPrintLayout
      secciones={data?.secciones ?? []}
      resumen={
        data?.resumen ?? {
          productos: 0, productosSinCosto: 0, margenPromedio: null, insumos: 0, insumosSinCosto: 0,
        }
      }
      fecha={fecha}
    />
  )
}
