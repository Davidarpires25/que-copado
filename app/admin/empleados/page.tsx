import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/server/profile'
import { listEmployees } from '@/app/actions/employees'
import { EmployeesDashboard } from './employees-dashboard'

export default async function EmpleadosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const [me, employees] = await Promise.all([getCurrentProfile(), listEmployees()])

  return (
    <EmployeesDashboard
      initialEmployees={employees.data ?? []}
      loadError={employees.error}
      currentUserId={me?.id ?? null}
    />
  )
}
