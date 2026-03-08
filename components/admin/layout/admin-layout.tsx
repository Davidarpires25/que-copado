'use client'

import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminSidebar, MobileSidebar } from './admin-sidebar'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/lib/store/theme-store'
import { getStockAlerts } from '@/app/actions/stock'

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [stockAlertCount, setStockAlertCount] = useState(0)
  const { theme } = useThemeStore()

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed')
    if (saved !== null) {
      setSidebarCollapsed(JSON.parse(saved))
    }
  }, [])

  // Fetch stock alert count for sidebar badge
  useEffect(() => {
    getStockAlerts().then(({ data }) => {
      if (data) setStockAlertCount(data.length)
    })
  }, [])

  // Sync dark mode to html element so portals (Dialog, Select, etc.) inherit the variables
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('admin-dark')
    } else {
      document.documentElement.classList.remove('admin-dark')
    }
    return () => {
      document.documentElement.classList.remove('admin-dark')
    }
  }, [theme])

  // Save collapsed state to localStorage
  const handleToggleCollapse = () => {
    const newValue = !sidebarCollapsed
    setSidebarCollapsed(newValue)
    localStorage.setItem('admin-sidebar-collapsed', JSON.stringify(newValue))
  }

  return (
    <div className={cn('min-h-screen bg-[var(--admin-bg)] admin-layout', theme === 'dark' && 'dark')}>
      {/* Skip link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--admin-accent)] focus:text-black focus:font-bold focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Saltar al contenido
      </a>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar collapsed={sidebarCollapsed} onToggleCollapse={handleToggleCollapse} stockAlertCount={stockAlertCount} />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} stockAlertCount={stockAlertCount} />

      {/* Main Content */}
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
        )}
      >
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 h-16 bg-[var(--admin-bg)]/95 backdrop-blur-xl border-b border-[var(--admin-border)] flex items-center px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="mr-3 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--admin-accent)] rounded-lg flex items-center justify-center text-lg">
              🍔
            </div>
            <div>
              <span className="text-base font-bold text-[var(--admin-text)]">
                Que <span className="text-[var(--admin-accent-text)]">Copado</span>
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main id="main-content" className="p-4 md:p-6 lg:p-8">
          {/* Page Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--admin-text)]">{title}</h1>
            {description && (
              <p className="text-[var(--admin-text-muted)] text-sm mt-1">{description}</p>
            )}
          </div>

          {/* Page Content */}
          {children}
        </main>
      </div>
    </div>
  )
}
