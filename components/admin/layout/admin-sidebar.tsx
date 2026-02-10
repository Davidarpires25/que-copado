'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package,
  Tag,
  MapPin,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ClipboardList,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { signOut } from '@/app/actions/auth'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Pedidos', icon: ClipboardList },
  { href: '/admin/products', label: 'Productos', icon: Package },
  { href: '/admin/categories', label: 'Categorías', icon: Tag },
  { href: '/admin/delivery-zones', label: 'Zonas de Envío', icon: MapPin },
  { href: '/admin/settings', label: 'Configuración', icon: Settings },
]

interface AdminSidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function AdminSidebar({ collapsed = false, onToggleCollapse }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-[#1a1d24] border-r border-[#2a2f3a] transition-all duration-300 flex flex-col',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-[#2a2f3a]">
        <Link href="/admin/dashboard" className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-[#FEC501] rounded-xl flex items-center justify-center text-xl shrink-0">
            🍔
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="min-w-0"
            >
              <span className="text-lg font-bold text-[#f0f2f5]">
                Que <span className="text-[#FEC501]">Copado</span>
              </span>
              <span className="block text-[10px] text-[#8b9ab0] font-medium">Panel Admin</span>
            </motion.div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                  isActive
                    ? 'bg-[#FEC501]/15 text-[#FEC501]'
                    : 'text-[#8b9ab0] hover:text-[#f0f2f5] hover:bg-[#252a35]'
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#FEC501] rounded-r-full"
                  />
                )}

                <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-[#FEC501]')} />

                {!collapsed && (
                  <span className={cn('font-medium text-sm', isActive && 'text-[#FEC501]')}>
                    {item.label}
                  </span>
                )}

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[#252a35] text-[#f0f2f5] text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 border border-[#2a2f3a]">
                    {item.label}
                  </div>
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-[#2a2f3a] space-y-2">
        {/* Collapse button */}
        <Button
          variant="ghost"
          onClick={onToggleCollapse}
          className={cn(
            'hidden lg:flex w-full text-[#8b9ab0] hover:text-[#f0f2f5] hover:bg-[#252a35] h-10',
            collapsed ? 'justify-center px-0' : 'justify-start gap-3'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span className="font-medium text-sm">Contraer</span>
            </>
          )}
        </Button>

        {/* Logout */}
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            className={cn(
              'w-full text-[#8b9ab0] hover:text-[#ef4444] hover:bg-[#ef4444]/10 h-10',
              collapsed ? 'justify-center px-0' : 'justify-start gap-3'
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="font-medium text-sm">Cerrar Sesión</span>}
          </Button>
        </form>
      </div>
    </aside>
  )
}

// Mobile sidebar (drawer)
interface MobileSidebarProps {
  open: boolean
  onClose: () => void
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 z-50 h-screen w-72 bg-[#1a1d24] border-r border-[#2a2f3a] flex flex-col lg:hidden"
          >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-[#2a2f3a]">
              <Link href="/admin/dashboard" className="flex items-center gap-3" onClick={onClose}>
                <div className="w-10 h-10 bg-[#FEC501] rounded-xl flex items-center justify-center text-xl">
                  🍔
                </div>
                <div>
                  <span className="text-lg font-bold text-[#f0f2f5]">
                    Que <span className="text-[#FEC501]">Copado</span>
                  </span>
                  <span className="block text-[10px] text-[#8b9ab0] font-medium">Panel Admin</span>
                </div>
              </Link>

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9 text-[#8b9ab0] hover:text-[#f0f2f5] hover:bg-[#252a35]"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link key={item.href} href={item.href} onClick={onClose}>
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 relative',
                        isActive
                          ? 'bg-[#FEC501]/15 text-[#FEC501]'
                          : 'text-[#8b9ab0] hover:text-[#f0f2f5] hover:bg-[#252a35]'
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#FEC501] rounded-r-full" />
                      )}
                      <Icon className={cn('h-5 w-5', isActive && 'text-[#FEC501]')} />
                      <span className={cn('font-medium', isActive && 'text-[#FEC501]')}>
                        {item.label}
                      </span>
                    </motion.div>
                  </Link>
                )
              })}
            </nav>

            {/* Bottom section */}
            <div className="p-3 border-t border-[#2a2f3a]">
              <form action={signOut}>
                <Button
                  type="submit"
                  variant="ghost"
                  className="w-full justify-start gap-3 text-[#8b9ab0] hover:text-[#ef4444] hover:bg-[#ef4444]/10 h-10"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Cerrar Sesión</span>
                </Button>
              </form>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
