import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/server/auth'
import { createClient } from '@/lib/supabase/server'
import { ProductsDashboard } from './products-dashboard'

export default async function ProductsPage() {
  const supabase = await createClient()

  const user = await getAuthUser()
  if (!user) {
    redirect('/admin/login')
  }

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select('*, categories(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true }),
  ])

  return (
    <ProductsDashboard
      initialProducts={products ?? []}
      categories={categories ?? []}
    />
  )
}
