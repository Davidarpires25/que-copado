import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/layout'
import { CategoryFormPage } from '@/components/admin/categories/category-form-page'

export default async function NewCategoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <AdminLayout title="Nueva Categoría" description="Agregá una nueva categoría al catálogo">
      <CategoryFormPage mode="create" />
    </AdminLayout>
  )
}
