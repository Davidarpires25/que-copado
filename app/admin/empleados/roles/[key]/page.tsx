import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/layout'
import { can } from '@/lib/server/profile'
import { listRoles } from '@/app/actions/roles'
import { RoleFormPage } from '@/components/admin/roles/role-form-page'

export default async function EditarRolPage({
  params,
}: {
  params: Promise<{ key: string }>
}) {
  const { key } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  if (!(await can('roles.manage'))) redirect('/admin/empleados')

  // `admin` es la salida de emergencia y no se edita: si se le pudieran quitar
  // permisos, un clic dejaria el panel sin nadie que pueda administrarlo.
  if (key === 'admin') redirect('/admin/empleados?tab=roles')

  const { data: roles } = await listRoles()
  const role = roles?.find((r) => r.key === key)
  if (!role) notFound()

  return (
    <AdminLayout title={`Editar ${role.name}`} description="Cambiá el nombre o los permisos">
      <RoleFormPage mode="edit" role={role} />
    </AdminLayout>
  )
}
