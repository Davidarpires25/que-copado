import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { HeroSection } from '@/components/home/hero-section'
import { SideDeals } from '@/components/home/side-deals'
import { ProductGrid } from '@/components/product-grid'
import { calcElaboradoStock } from '@/lib/server/stock-deduction'
import type { Category, Product } from '@/lib/types/database'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: rawProducts }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .returns<Product[]>(),
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

  // Compute available quantities for products with stock tracking.
  // Used to: (1) show urgency badge, (2) override is_out_of_stock when DB flag
  // hasn't been synced yet (e.g. stock manually set to 0 from admin panel).
  const stockMap: Record<string, number> = {}
  await Promise.all(
    (products).map(async (p) => {
      if (p.product_type === 'reventa' && p.stock_tracking_enabled && p.current_stock !== null) {
        stockMap[p.id] = Math.max(0, Math.floor(Number(p.current_stock)))
      } else if (p.product_type === 'elaborado') {
        const qty = await calcElaboradoStock(supabase, p.id)
        if (qty !== null) stockMap[p.id] = Math.max(0, qty)
      }
    })
  )

  // Override is_out_of_stock based on real-time computed stock so the cart
  // button is always correct, even when the DB flag hasn't been synced yet.
  const productsWithStock = products.map(p =>
    p.id in stockMap && stockMap[p.id] === 0
      ? { ...p, is_out_of_stock: true }
      : p
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <Header />

      <main>
        {/* Hero Section - Desktop only */}
        <section className="hidden md:block container mx-auto px-4 py-6 lg:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <HeroSection />
            </div>
            <div className="hidden lg:block lg:col-span-4">
              <SideDeals />
            </div>
          </div>
        </section>

        {/* Menu Section */}
        <section id="menu" className="pt-3 pb-8 md:py-12 scroll-mt-24">
          <div className="container mx-auto px-4">
            <div className="mb-4 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-black text-orange-900">
                Nuestro Menú
              </h2>
              <p className="hidden md:block text-orange-700/60 text-sm mt-1">
                Explorá todas nuestras opciones
              </p>
            </div>

            <ProductGrid products={productsWithStock} categories={categories ?? []} stockMap={stockMap} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
