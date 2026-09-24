import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/server/auth'
import { getOpcionesDelReporte } from '@/app/actions/reporte-costos'
import { ReporteCostosSelector } from '@/components/admin/reportes/reporte-costos-selector'

/**
 * Reportes → Costos. Se arma el reporte eligiendo que entra, y se imprime.
 *
 * Vivia en Productos. Se mudo cuando empezo a incluir insumos: el argumento
 * para tenerlo alla era "se revisa donde se corrige", y el costo de un insumo
 * se corrige en Ingredientes, no en Productos. Un reporte que cruza las dos
 * cosas no tiene un lugar natural de correccion, asi que va con los reportes.
 */
export default async function ReporteCostosPage() {
  const user = await getAuthUser()
  if (!user) redirect('/admin/login')

  const { data, error } = await getOpcionesDelReporte()

  return <ReporteCostosSelector opciones={data} error={error} />
}
