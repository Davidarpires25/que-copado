import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/server/auth'
import { AdminLayout } from '@/components/admin/layout'
import { can } from '@/lib/server/profile'
import { RoleFormPage } from '@/components/admin/roles/role-form-page'

export default async function NuevoRolPage() {
  const user = await getAuthUser()
  if (!user) redirect('/admin/login')

  // Esconder el link no alcanza: quien conozca la URL entra igual.
  if (!(await can('roles.manage'))) redirect('/admin/empleados')

  return (
    <AdminLayout title="Nuevo Rol" description="Definí qué puede hacer este rol" hidePageHeader>
      <RoleFormPage mode="create" />
    </AdminLayout>
  )
}
