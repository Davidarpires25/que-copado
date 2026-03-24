import { getRecentSessions } from '@/app/actions/cash-register'
import { ArqueosTable } from '@/components/admin/caja/arqueos-table'

export const dynamic = 'force-dynamic'

export default async function ArqueosPage() {
  const { data: sessions } = await getRecentSessions(100)

  return <ArqueosTable sessions={sessions ?? []} />
}
