import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { ProductGrid } from '@/components/product-grid'
import type { Category, ProductWithHalfConfig } from '@/lib/types/database'

export const revalidate = 300

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: rawProducts }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select('*, product_half_configs(*)')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .returns<ProductWithHalfConfig[]>(),
    supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .returns<Category[]>(),
  ])

  // Sort products by category sort_order first, then by name
  const catSortMap = new Map((categories ?? []).map(c => [c.id, c.sort_order]))
  const products = (rawProducts ?? []).sort((a, b) => {
    const catA = catSortMap.get(a.category_id) ?? 999
    const catB = catSortMap.get(b.category_id) ?? 999
    if (catA !== catB) return catA - catB
    return a.name.localeCompare(b.name)
  })

  // Build stockMap from already-fetched data (no extra queries).
  // - reventa: use current_stock column directly
  // - elaborado: is_out_of_stock is kept in sync by syncElaboradoAvailability
  //   after every POS sale, so no per-product queries needed here.
  const stockMap: Record<string, number> = {}
  for (const p of products) {
    if (p.product_type === 'reventa' && p.stock_tracking_enabled && p.current_stock !== null) {
      stockMap[p.id] = Math.max(0, Math.floor(Number(p.current_stock)))
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF5E6]">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-6 pb-2 md:pt-10 md:pb-4">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-4xl font-black text-[#2D1A0E] leading-tight">
              ¿Qué vas a pedir hoy?
            </h1>
            <p className="text-[#78706A] text-sm md:text-base mt-1">
              Las mejores burgers de la zona, a un clic de tu mesa
            </p>
          </div>
        </section>

        {/* Menu Section */}
        <section id="menu" className="pt-3 pb-8 md:py-8 scroll-mt-24">
          <div className="container mx-auto px-4">
            <ProductGrid products={products} categories={categories ?? []} stockMap={stockMap} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
