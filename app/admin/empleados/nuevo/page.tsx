import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/layout'
import { can } from '@/lib/server/profile'
import { listRoles } from '@/app/actions/roles'
import { EmployeeFormPage } from '@/components/admin/empleados/employee-form-page'

export default async function NuevoEmpleadoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  // Esconder el boton no alcanza: quien conozca la URL entra igual.
  if (!(await can('users.manage'))) redirect('/admin/empleados')

  const { data: roles } = await listRoles()

  return (
    <AdminLayout title="Nuevo Empleado" description="Dale acceso al panel y elegí su rol" hidePageHeader>
      <EmployeeFormPage roles={roles ?? []} />
    </AdminLayout>
  )
}
