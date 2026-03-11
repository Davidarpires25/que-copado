'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package,
  Tag,
  MapPin,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ClipboardList,
  Settings,
  BarChart3,
  CreditCard,
  UtensilsCrossed,
  Wheat,
  BookOpen,
  Boxes,
  ChefHat,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { signOut } from '@/app/actions/auth'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  badgeCount?: number
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: 'Operacion',
    items: [
      { href: '/admin/caja', label: 'Caja', icon: CreditCard },
      { href: '/admin/cocina', label: 'Cocina', icon: ChefHat },
      { href: '/admin/tables', label: 'Mesas', icon: UtensilsCrossed },
      { href: '/admin/orders', label: 'Pedidos', icon: ClipboardList },
    ],
  },
  {
    title: 'Catalogo',
    items: [
      { href: '/admin/products', label: 'Productos', icon: Package },
      { href: '/admin/recipes', label: 'Recetas', icon: BookOpen },
      { href: '/admin/ingredients', label: 'Ingredientes', icon: Wheat },
      { href: '/admin/categories', label: 'Categorias', icon: Tag },
      { href: '/admin/stock', label: 'Stock', icon: Boxes },
    ],
  },
  {
    title: 'Reportes',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Ajustes',
    items: [
      { href: '/admin/delivery-zones', label: 'Zonas de Envio', icon: MapPin },
      { href: '/admin/settings', label: 'Configuracion', icon: Settings },
    ],
  },
]

// ---------------------------------------------------------------------------
// Shared nav item renderer
// ---------------------------------------------------------------------------

function NavItemLink({
  item,
  isActive,
  collapsed,
  onClick,
  pyClass = 'py-2.5',
}: {
  item: NavItem
  isActive: boolean
  collapsed?: boolean
  onClick?: () => void
  pyClass?: string
}) {
  const Icon = item.icon
  const hasBadge = (item.badgeCount ?? 0) > 0
  return (
    <Link href={item.href} onClick={onClick}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={cn(
          'flex items-center gap-3 px-3 rounded-lg transition-all duration-200 group relative',
          pyClass,
          isActive
            ? 'bg-[#FEC501]/15 text-[#FEC501]'
            : 'text-[#a8b5c9] hover:text-[#f0f2f5] hover:bg-[#252a35]'
        )}
      >
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#FEC501] rounded-r-full"
          />
        )}

        <div className="relative shrink-0">
          <Icon className={cn('h-5 w-5', isActive && 'text-[#FEC501]')} />
          {hasBadge && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {(item.badgeCount ?? 0) > 99 ? '99+' : item.badgeCount}
            </span>
          )}
        </div>

        {!collapsed && (
          <span className={cn('font-medium text-sm flex-1', isActive && 'text-[#FEC501]')}>
            {item.label}
          </span>
        )}

        {!collapsed && hasBadge && (
          <span className="ml-auto min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {(item.badgeCount ?? 0) > 99 ? '99+' : item.badgeCount}
          </span>
        )}

        {collapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-[#252a35] text-[#f0f2f5] text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 border border-[#2a2f3a]">
            {item.label}
            {hasBadge && (
              <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {item.badgeCount}
              </span>
            )}
          </div>
        )}
      </motion.div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Desktop sidebar
// ---------------------------------------------------------------------------

interface AdminSidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
  stockAlertCount?: number
}

export function AdminSidebar({ collapsed = false, onToggleCollapse, stockAlertCount = 0 }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-[#1a1d24] border-r border-[#2a2f3a] transition-all duration-300 flex flex-col',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-20 flex items-center px-4 border-b border-[#2a2f3a]">
        <Link href="/admin/dashboard" className="flex items-center gap-3 flex-1 min-w-0">
          <img
            src="/logo.svg"
            alt="Que Copado"
            className={cn(
              'shrink-0 rounded-xl object-contain transition-all duration-300',
              collapsed ? 'w-11 h-11' : 'w-14 h-14'
            )}
          />
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
              <span className="block text-xs text-[#a8b5c9] font-medium">Panel Admin</span>
            </motion.div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto">
        {navGroups.map((group, groupIndex) => (
          <div key={group.title} className={cn(groupIndex > 0 && 'mt-2')}>
            {groupIndex > 0 && <div className="h-px bg-[#2a2f3a] mx-2 mb-2" />}

            {!collapsed && (
              <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-widest text-[#6b7a8d]">
                {group.title}
              </p>
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItemLink
                  key={item.href}
                  item={item.href === '/admin/stock' ? { ...item, badgeCount: stockAlertCount } : item}
                  isActive={pathname === item.href}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-[#2a2f3a] space-y-2">
        <Button
          variant="ghost"
          onClick={onToggleCollapse}
          className={cn(
            'hidden lg:flex w-full text-[#a8b5c9] hover:text-[#f0f2f5] hover:bg-[#252a35] h-10',
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

        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            className={cn(
              'w-full text-[#a8b5c9] hover:text-[#ef4444] hover:bg-[#ef4444]/10 h-10',
              collapsed ? 'justify-center px-0' : 'justify-start gap-3'
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="font-medium text-sm">Cerrar Sesion</span>}
          </Button>
        </form>
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Mobile sidebar (drawer)
// ---------------------------------------------------------------------------

interface MobileSidebarProps {
  open: boolean
  onClose: () => void
  stockAlertCount?: number
}

export function MobileSidebar({ open, onClose, stockAlertCount = 0 }: MobileSidebarProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />

          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 z-50 h-screen w-72 bg-[#1a1d24] border-r border-[#2a2f3a] flex flex-col lg:hidden"
          >
            <div className="h-20 flex items-center justify-between px-4 border-b border-[#2a2f3a]">
              <Link href="/admin/dashboard" className="flex items-center gap-3" onClick={onClose}>
                <img
                    src="/logo.svg"
                    alt="Que Copado"
                    className="w-14 h-14 shrink-0 rounded-xl object-contain"
                  />
                <div>
                  <span className="text-lg font-bold text-[#f0f2f5]">
                    Que <span className="text-[#FEC501]">Copado</span>
                  </span>
                  <span className="block text-xs text-[#a8b5c9] font-medium">Panel Admin</span>
                </div>
              </Link>

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9 text-[#a8b5c9] hover:text-[#f0f2f5] hover:bg-[#252a35]"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex-1 py-3 px-3 overflow-y-auto">
              {navGroups.map((group, groupIndex) => (
                <div key={group.title} className={cn(groupIndex > 0 && 'mt-2')}>
                  {groupIndex > 0 && <div className="h-px bg-[#2a2f3a] mx-2 mb-2" />}
                  <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-widest text-[#6b7a8d]">
                    {group.title}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <NavItemLink
                        key={item.href}
                        item={item.href === '/admin/stock' ? { ...item, badgeCount: stockAlertCount } : item}
                        isActive={pathname === item.href}
                        onClick={onClose}
                        pyClass="py-3"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <div className="p-3 border-t border-[#2a2f3a]">
              <form action={signOut}>
                <Button
                  type="submit"
                  variant="ghost"
                  className="w-full justify-start gap-3 text-[#a8b5c9] hover:text-[#ef4444] hover:bg-[#ef4444]/10 h-10"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Cerrar Sesion</span>
                </Button>
              </form>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
