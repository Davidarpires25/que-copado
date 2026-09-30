import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/server/auth'
import { getBusinessSettings } from '@/app/actions/business-settings'
import { leerFacturacion } from '@/app/actions/facturas'
import { BusinessSettingsForm } from './business-settings-form'

export default async function SettingsPage() {
  const user = await getAuthUser()

  if (!user) {
    redirect('/admin/login')
  }

  const [{ data: settings }, facturacion] = await Promise.all([getBusinessSettings(), leerFacturacion()])

  return (
    <BusinessSettingsForm
      initialSettings={settings!}
      // Sin permiso de ajustes la acción devuelve un error: la pestaña no se muestra.
      facturacion={'error' in facturacion ? null : facturacion}
    />
  )
}
