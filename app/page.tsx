import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { HeroSection } from '@/components/home/hero-section'
import { SideDeals } from '@/components/home/side-deals'
import { ProductGrid } from '@/components/product-grid'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true }),
  ])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <Header />

      <main>
        {/* Hero + Side Deals Layout - Hidden on mobile */}
        <section className="hidden md:block container mx-auto px-4 py-6 md:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Hero Section */}
            <div className="lg:col-span-8">
              <HeroSection />
            </div>

            {/* Side Deals - Only visible on desktop */}
            <div className="hidden lg:block lg:col-span-4">
              <SideDeals />
            </div>
          </div>
        </section>

        {/* Menu Section */}
        <section id="menu" className="pt-4 pb-8 md:py-12 scroll-mt-24">
          <div className="container mx-auto px-4">
            <div className="mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-black text-orange-900">
                Nuestro Menú
              </h2>
              <p className="text-orange-700/60 text-sm mt-1">
                Explorá todas nuestras opciones
              </p>
            </div>

            <ProductGrid products={products ?? []} categories={categories ?? []} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
