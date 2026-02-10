import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DeliveryZonesDashboard } from './delivery-zones-dashboard'
import type { DeliveryZone } from '@/lib/types/database'

export default async function DeliveryZonesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/admin/login')
  }

  // Use admin client to fetch ALL zones (including inactive ones)
  const adminSupabase = await createAdminClient()
  const { data: zones } = await adminSupabase
    .from('delivery_zones')
    .select('*')
    .order('sort_order', { ascending: true })

  return <DeliveryZonesDashboard initialZones={(zones as DeliveryZone[]) ?? []} />
}
