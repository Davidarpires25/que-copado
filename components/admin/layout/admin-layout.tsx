'use client'

import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminSidebar, MobileSidebar } from './admin-sidebar'
import { cn } from '@/lib/utils'

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed')
    if (saved !== null) {
      setSidebarCollapsed(JSON.parse(saved))
    }
  }, [])

  // Save collapsed state to localStorage
  const handleToggleCollapse = () => {
    const newValue = !sidebarCollapsed
    setSidebarCollapsed(newValue)
    localStorage.setItem('admin-sidebar-collapsed', JSON.stringify(newValue))
  }

  return (
    <div className="min-h-screen bg-[#12151a]">
      {/* Skip link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#FEC501] focus:text-black focus:font-bold focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Saltar al contenido
      </a>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar collapsed={sidebarCollapsed} onToggleCollapse={handleToggleCollapse} />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content */}
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
        )}
      >
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 h-16 bg-[#1a1d24]/95 backdrop-blur-xl border-b border-[#2a2f3a] flex items-center px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="mr-3 text-[#a8b5c9] hover:text-[#f0f2f5] hover:bg-[#252a35]"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#FEC501] rounded-lg flex items-center justify-center text-lg">
              🍔
            </div>
            <div>
              <span className="text-base font-bold text-[#f0f2f5]">
                Que <span className="text-[#FEC501]">Copado</span>
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main id="main-content" className="p-4 md:p-6 lg:p-8">
          {/* Page Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-[#f0f2f5]">{title}</h1>
            {description && (
              <p className="text-[#a8b5c9] text-sm mt-1">{description}</p>
            )}
          </div>

          {/* Page Content */}
          {children}
        </main>
      </div>
    </div>
  )
}
