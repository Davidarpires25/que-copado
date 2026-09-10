import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/server/auth'
import { getCurrentProfile, can } from '@/lib/server/profile'
import { listEmployees } from '@/app/actions/employees'
import { listRoles } from '@/app/actions/roles'
import { EmployeesDashboard } from './employees-dashboard'

export default async function EmpleadosPage() {
  const user = await getAuthUser()
  if (!user) redirect('/admin/login')

  const [me, employees, roles, puedeGestionarRoles] = await Promise.all([
    getCurrentProfile(),
    listEmployees(),
    listRoles(),
    can('roles.manage'),
  ])

  return (
    <EmployeesDashboard
      initialEmployees={employees.data ?? []}
      initialRoles={roles.data ?? []}
      loadError={employees.error ?? roles.error}
      currentUserId={me?.id ?? null}
      canManageRoles={puedeGestionarRoles}
    />
  )
}
