import { getDatosDeCostos } from '@/app/actions/reporte-costos'
import {
  describirVista,
  filtrarInsumos,
  filtrarProductos,
  queryAVista,
} from '@/lib/constants/reporte-costos'
import { ReporteCostosPrintLayout } from '@/components/admin/reportes/reporte-costos-print-layout'

interface Props {
  searchParams: Promise<Record<string, string | undefined>>
}

/**
 * La hoja: exactamente lo que se estaba viendo en pantalla.
 *
 * Recibe la vista por la URL y la pasa por la **misma** funcion de filtro y
 * orden que usa la tabla. No hay una segunda implementacion que pueda
 * desviarse.
 */
export default async function ReporteCostosPrintPage({ searchParams }: Props) {
  const [{ data }, params] = await Promise.all([getDatosDeCostos(), searchParams])
  const vista = queryAVista(params)

  const esProductos = vista.pestana === 'productos'
  const categorias = esProductos ? (data?.categoriasDeProductos ?? []) : (data?.categoriasDeInsumos ?? [])

  const fecha = new Date().toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <ReporteCostosPrintLayout
      vista={vista}
      descripcion={describirVista(vista, categorias)}
      productos={esProductos ? filtrarProductos(data?.productos ?? [], vista) : []}
      insumos={esProductos ? [] : filtrarInsumos(data?.insumos ?? [], vista)}
      fecha={fecha}
    />
  )
}
