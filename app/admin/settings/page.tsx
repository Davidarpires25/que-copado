import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/server/auth'
import { getBusinessSettings } from '@/app/actions/business-settings'
import { BusinessSettingsForm } from './business-settings-form'

export default async function SettingsPage() {
  const user = await getAuthUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { data: settings } = await getBusinessSettings()

  return <BusinessSettingsForm initialSettings={settings!} />
}
