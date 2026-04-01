import { getRecentSessions, getCashMovements } from '@/app/actions/cash-register'
import { CajaHistorial } from '@/components/admin/caja/caja-historial'

export const dynamic = 'force-dynamic'

export default async function ArqueosPage() {
  const [{ data: sessions }, { data: movements }] = await Promise.all([
    getRecentSessions(100),
    getCashMovements(500),
  ])

  return <CajaHistorial sessions={sessions ?? []} movements={movements ?? []} />
}
