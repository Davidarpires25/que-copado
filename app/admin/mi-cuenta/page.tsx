import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/server/auth'
import { getMyAccount } from '@/app/actions/account'
import { MiCuentaForm } from './mi-cuenta-form'

/**
 * Cuenta propia. A proposito no pide ningun permiso: cualquier rol tiene que
 * poder cambiar su contraseña, y `cajero` y `cocina` no tienen permisos
 * `settings.*`, asi que esto no podia vivir dentro de /admin/settings.
 */
export default async function MiCuentaPage() {
  const user = await getAuthUser()

  if (!user) {
    redirect('/admin/login')
  }

  const cuenta = await getMyAccount()

  if (!cuenta) {
    redirect('/admin/login')
  }

  return <MiCuentaForm initialAccount={cuenta} />
}
