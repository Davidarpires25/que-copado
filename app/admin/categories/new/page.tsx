import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/server/auth'
import { AdminLayout } from '@/components/admin/layout'
import { CategoryFormPage } from '@/components/admin/categories/category-form-page'

export default async function NewCategoryPage() {
  const user = await getAuthUser()
  if (!user) redirect('/admin/login')

  return (
    <AdminLayout title="Nueva Categoría" description="Agregá una nueva categoría al catálogo" hidePageHeader>
      <CategoryFormPage mode="create" />
    </AdminLayout>
  )
}
