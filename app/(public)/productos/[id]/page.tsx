import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductDetailView } from '@/components/product-detail-view'
import type { Product } from '@/lib/types/database'

interface ProductPageProps {
  params: Promise<{ id: string }>
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single<Product>()

  if (!product) notFound()

  return <ProductDetailView product={product} />
}
