import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductsDashboard } from './products-dashboard'

export default async function ProductsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
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
