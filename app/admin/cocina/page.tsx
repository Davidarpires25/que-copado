import { getActiveComandas } from '@/app/actions/comandas'
import { KitchenDisplay } from '@/components/admin/cocina/kitchen-display'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

export default async function CocinaPage() {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) redirect('/admin/login')

  const { data: comandas } = await getActiveComandas()

  return <KitchenDisplay initialComandas={comandas ?? []} />
}
