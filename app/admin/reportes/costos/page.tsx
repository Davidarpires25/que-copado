import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/server/auth'
import { getDatosDeCostos } from '@/app/actions/reporte-costos'
import { queryAVista } from '@/lib/constants/reporte-costos'
import { ReporteCostosTabla } from '@/components/admin/reportes/reporte-costos-tabla'

interface Props {
  searchParams: Promise<Record<string, string | undefined>>
}

/**
 * Reportes → Costos.
 *
 * Vivia en Productos y se mudo cuando empezo a incluir insumos: el argumento
 * para tenerlo alla era "se revisa donde se corrige", y el costo de un insumo
 * se corrige en Ingredientes. Un reporte que cruza las dos cosas va con los
 * reportes.
 *
 * La vista arranca de la URL, asi un favorito --"las carnes, por nombre"--
 * abre exactamente eso.
 */
export default async function ReporteCostosPage({ searchParams }: Props) {
  const user = await getAuthUser()
  if (!user) redirect('/admin/login')

  const [{ data, error }, params] = await Promise.all([getDatosDeCostos(), searchParams])

  return <ReporteCostosTabla datos={data} error={error} vistaInicial={queryAVista(params)} />
}
