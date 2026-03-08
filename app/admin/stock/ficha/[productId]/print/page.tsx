import { getProductionSheet } from '@/app/actions/stock'
import { FichaPrintLayout } from '@/components/admin/stock/ficha-print-layout'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ productId: string }>
  searchParams: Promise<{ qty?: string }>
}

export default async function FichaPrintPage({ params, searchParams }: Props) {
  const { productId } = await params
  const { qty } = await searchParams
  const quantity = Math.max(1, parseInt(qty ?? '1') || 1)

  const { data, error } = await getProductionSheet(productId)
  if (error || !data) notFound()

  return <FichaPrintLayout sheet={data} quantity={quantity} showCosts={true} />
}
