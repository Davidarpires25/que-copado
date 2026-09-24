import { getReporteDeCostos } from '@/app/actions/reporte-costos'
import { queryASeleccion } from '@/lib/constants/reporte-costos'
import { ReporteCostosPrintLayout } from '@/components/admin/reportes/reporte-costos-print-layout'

interface Props {
  searchParams: Promise<Record<string, string | undefined>>
}

/**
 * El reporte de costos, listo para imprimir.
 *
 * Lo elegido viaja por la URL --`?insumo=<id>,<id>`-- asi un reporte armado,
 * "solo las carnes", se guarda como favorito y se reimprime cuando llega la
 * factura del carnicero.
 */
export default async function ReporteCostosPrintPage({ searchParams }: Props) {
  const seleccion = queryASeleccion(await searchParams)
  const { data } = await getReporteDeCostos(seleccion)

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
