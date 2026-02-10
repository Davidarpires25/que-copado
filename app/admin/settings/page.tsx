import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBusinessSettings } from '@/app/actions/business-settings'
import { BusinessSettingsForm } from './business-settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { data: settings } = await getBusinessSettings()

  return <BusinessSettingsForm initialSettings={settings!} />
}
