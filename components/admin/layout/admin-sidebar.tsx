'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package,
  Tag,
  MapPin,
  LogOut,
  X,
  LayoutDashboard,
  ClipboardList,
  Settings,
  BarChart3,
  Receipt,
  ScanLine,
  Table2,
  Wheat,
  BookOpen,
  Boxes,
  ChefHat,
  Scale,
  Users,
  UserCog,
  } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { signOut } from '@/app/actions/auth'
import type { PermissionKey } from '@/lib/constants/permissions'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  badgeCount?: number
  /**
   * Permiso que habilita este item. Sin declarar = lo ven todos.
   *
   * Esconder un link NO es seguridad: quien conozca la URL entra igual. Lo que
   * protege son las policies de RLS y las guardas de las server actions. Esto
   * es para que cada uno vea una herramienta acorde a su trabajo, no un menu
   * de 16 opciones de las que usa tres.
   */
  permission?: PermissionKey
}

interface NavGroup {
  title?: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
    ],
  },
  {
    title: 'Operación',
    items: [
      { href: '/admin/caja', label: 'Caja', icon: ScanLine, permission: 'caja.view' },
      { href: '/admin/caja/arqueos', label: 'Arqueos', icon: Scale, permission: 'caja.view' },
      { href: '/admin/tables', label: 'Mesas', icon: Table2, permission: 'mesas.view' },
      { href: '/admin/orders', label: 'Pedidos', icon: ClipboardList, permission: 'pedidos.view' },
      { href: '/admin/cocina', label: 'Cocina', icon: ChefHat, permission: 'cocina.view' },
      { href: '/admin/stock', label: 'Stock', icon: Boxes, permission: 'stock.view' },
    ],
  },
  {
    title: 'Catálogo',
    items: [
      { href: '/admin/products', label: 'Productos', icon: Package, permission: 'productos.view' },
      { href: '/admin/categories', label: 'Categorías', icon: Tag, permission: 'categorias.view' },
      { href: '/admin/recipes', label: 'Recetas', icon: BookOpen, permission: 'recetas.view' },
      { href: '/admin/ingredients', label: 'Ingredientes', icon: Wheat, permission: 'ingredientes.view' },
    ],
  },
  {
    title: 'Reportes',
    items: [
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, permission: 'analytics.view' },
      { href: '/admin/reportes/costos', label: 'Costos', icon: Receipt, permission: 'analytics.view' },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { href: '/admin/empleados', label: 'Equipo', icon: Users, permission: 'users.view' },
      { href: '/admin/delivery-zones', label: 'Zonas de Envío', icon: MapPin, permission: 'delivery_zones.view' },
      { href: '/admin/settings', label: 'Ajustes', icon: Settings, permission: 'settings.view' },
    ],
  },
]

/**
 * Marca activo el item de navegacion que corresponde a la ruta actual.
 *
 * Antes se comparaba con igualdad exacta (`pathname === item.href`), asi que en
 * cualquier subruta —/admin/products/new, /admin/stock/ficha/[id]— no quedaba
 * ningun item marcado y se perdia la referencia de donde estabas.
 *
 * Coincide por prefijo, pero gana el href mas largo: estando en
 * /admin/caja/arqueos se enciende "Arqueos" y no "Caja".
 */
/**
 * Deja los grupos que el rol puede ver, y descarta los que quedan vacios.
 *
 * Con `role` null —sesion sin perfil, o antes de aplicar la migracion 016— se
 * muestra todo: es el comportamiento de siempre y evita dejar a alguien sin
 * menu por un problema de configuracion.
 */
export function visibleNavGroups(permissions: string[] | null | undefined): NavGroup[] {
  // Sin permisos cargados —sesion sin perfil, o migraciones sin aplicar— se
  // muestra todo: es el comportamiento de siempre y evita dejar a alguien sin
  // menu por un problema de configuracion.
  if (!permissions) return navGroups
  const tiene = new Set(permissions)
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || tiene.has(item.permission)),
    }))
    .filter((group) => group.items.length > 0)
}

export function isActiveRoute(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false

  const matches = (candidate: string) =>
    pathname === candidate || pathname.startsWith(candidate + '/')

  if (!matches(href)) return false

  const longestMatch = navGroups
    .flatMap((group) => group.items)
    .map((item) => item.href)
    .filter(matches)
    .reduce((best, current) => (current.length > best.length ? current : best), '')

  return longestMatch === href
}

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
    <Link href={item.href} onClick={onClick} aria-current={isActive ? 'page' : undefined}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={cn(
          'flex items-center gap-3 px-3 rounded-lg transition-all duration-200 group relative',
          pyClass,
          isActive
            ? 'bg-[var(--admin-accent)]/15 text-[var(--admin-accent-text)]'
            : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)]'
        )}
      >
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--admin-accent)] rounded-r-full"
          />
        )}

        <div className="relative shrink-0">
          <Icon className={cn('h-5 w-5', isActive && 'text-[var(--admin-accent-text)]')} />
          {/* Solo colapsado: expandido el badge va al final de la fila, y
              mostrar los dos deja el numero repetido sobre el mismo item. */}
          {hasBadge && (
            <span
              className={cn(
                'absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none transition-opacity duration-200',
                collapsed ? 'opacity-100' : 'opacity-0'
              )}
            >
              {(item.badgeCount ?? 0) > 99 ? '99+' : item.badgeCount}
            </span>
          )}
        </div>

        <span
          className={cn(
            'font-medium text-sm flex-1 whitespace-nowrap transition-opacity duration-200',
            collapsed ? 'opacity-0' : 'opacity-100',
            isActive && 'text-[var(--admin-accent-text)]'
          )}
        >
          {item.label}
        </span>

        {hasBadge && (
          <span
            className={cn(
              'ml-auto min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center transition-opacity duration-200',
              collapsed ? 'opacity-0' : 'opacity-100'
            )}
          >
            {(item.badgeCount ?? 0) > 99 ? '99+' : item.badgeCount}
          </span>
        )}

      </motion.div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Desktop sidebar
// ---------------------------------------------------------------------------

interface AdminSidebarProps {
  stockAlertCount?: number
  userName?: string
  userRole?: string
  /** Permisos del empleado; filtran el menu. Null = se muestra todo. */
  permissions?: string[] | null
}

export function AdminSidebar({ stockAlertCount = 0, userName = 'Admin', userRole = 'Administrador', permissions = null }: AdminSidebarProps) {
  const groups = visibleNavGroups(permissions)
  const pathname = usePathname()

  /**
   * El menu vive angosto y se abre al pasar el puntero.
   *
   * Antes ocupaba 256px fijos y habia un boton para plegarlo, escondido hasta
   * que se pasaba por encima del borde. David: *"no es necesario el boton.
   * cuando el cliente pasa el puntero sobre el navbar me gustaria que se
   * expanda de lo contrario no, asi damos mas espacio"*.
   *
   * Abierto **se superpone** al contenido en vez de correrlo: el margen de la
   * pagina queda clavado en los 72px de la barra angosta. Si empujara, cada
   * pasada del mouse reacomodaria la pantalla entera --tablas que saltan,
   * texto que se reparte de nuevo-- y eso marea mas de lo que ayuda.
   *
   * `onFocus`/`onBlur` y no solo el mouse: quien se mueve con el teclado
   * tambien tiene que ver donde esta parado. En React estos eventos burbujean,
   * asi que alcanzan para todo lo que haya adentro.
   */
  const [expandido, setExpandido] = useState(false)
  const collapsed = !expandido

  /**
   * Se abre con una demora corta; se cierra al instante.
   *
   * El menu vive contra el borde izquierdo, asi que el mouse lo cruza sin
   * querer todo el tiempo --yendo a la primera columna de una tabla, volviendo
   * de la barra lateral del navegador--. Ahora que el contenido se corre, cada
   * roce accidental reacomodaba la pagina entera: medido, cinco pasadas del
   * mouse daban 0,768 de corrimiento acumulado.
   *
   * 180ms es el numero: por debajo no filtra nada, por encima se siente que el
   * menu tarda. Quien va al menu a proposito deja el mouse ahi mas que eso sin
   * notarlo; quien solo pasa, no.
   *
   * Cerrar no espera. Una demora al salir deja el menu abierto tapando lo que
   * la persona ya esta mirando, que es el problema que vinimos a resolver.
   */
  const demora = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelarDemora = () => {
    if (demora.current) {
      clearTimeout(demora.current)
      demora.current = null
    }
  }

  const abrir = useCallback(() => {
    cancelarDemora()
    demora.current = setTimeout(() => setExpandido(true), 180)
  }, [])

  const cerrar = useCallback(() => {
    cancelarDemora()
    setExpandido(false)
  }, [])

  // Si el componente se va con la demora corriendo, el timeout queda vivo.
  useEffect(() => cancelarDemora, [])

  /**
   * Con el teclado, pasar de un item al siguiente dispara un blur y despues un
   * focus. Sin mirar a donde se fue el foco, la barra se pliega y se vuelve a
   * abrir en cada Tab. Si el destino sigue adentro, no pasa nada.
   */
  const alSalirElFoco = useCallback((e: React.FocusEvent<HTMLElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    cancelarDemora()
    setExpandido(false)
  }, [])

  /**
   * Dejar a la vista la seccion en la que uno esta parado.
   *
   * El menu scrollea --no entran los 15 items de un administrador en una
   * netbook-- asi que entrar directo a una URL del final, como Ajustes, lo
   * mostraba arrancado desde arriba y con el item resaltado fuera de vista.
   * `nearest` no mueve nada si ya se veia.
   */
  const menuRef = useRef<HTMLElement>(null)

  useEffect(() => {
    menuRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
  }, [pathname])
    // No mostrar en checkout, cart o páginas de admin
  const hiddenRoutes = ['/admin/stock/ficha/']
  const shouldHide = hiddenRoutes.some(route => pathname?.startsWith(route))

  return (
    <>
    {!shouldHide && (
       <aside
      onMouseEnter={abrir}
      onMouseLeave={cerrar}
      onFocus={() => {
        cancelarDemora()
        setExpandido(true)
      }}
      onBlur={alSalirElFoco}
      className={cn(
        // Solo el ancho se anima, y con una curva que arranca rapido y frena
        // suave. `transition-all` tambien animaba colores y sombras en cada
        // pasada del mouse, que es trabajo de mas para el mismo efecto.
        'group/sidebar fixed left-0 top-0 z-40 h-screen bg-[var(--admin-sidebar-bg)] border-r border-[var(--admin-sidebar-border)] flex flex-col overflow-hidden',
        'transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
        collapsed ? 'w-[72px]' : 'w-64 shadow-[var(--shadow-card-md)]'
      )}
    >
      {/* Logo */}
      <div className="h-20 flex items-center px-4 border-b border-[var(--admin-sidebar-border)]">
        <Link href="/admin/dashboard" className="flex items-center gap-3 flex-1 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- Logo SVG vectorial: next/image no lo optimiza sin dangerouslyAllowSVG. */}
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
              <span className="text-lg font-bold text-[var(--admin-text)]">
                Que <span className="text-[var(--admin-accent-text)]">Copado</span>
              </span>
              <span className="block text-xs text-[var(--admin-text-muted)] font-medium">Panel Admin</span>
            </motion.div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      {/*
        `overflow-y-auto` no es un adorno: sin el, el menu no se achica.

        Un hijo de un contenedor flex no baja de su alto de contenido, asi que
        con los 15 items de un administrador el <nav> reclamaba 772px, empujaba
        "Mi cuenta" y "Cerrar Sesion" fuera de la pantalla, y el
        `overflow-hidden` del <aside> los cortaba. En la netbook de 768px el
        boton de salir quedaba 122px por debajo del borde: no habia forma de
        cerrar sesion desde el menu. Un contenedor scrolleable, en cambio, si
        puede achicarse --su minimo automatico es 0--, asi que lo que sobra
        scrollea y el pie se queda donde tiene que estar.

        `overscroll-contain` para que al llegar al final del menu no se ponga a
        scrollear la pagina de atras.
      */}
      <nav
        ref={menuRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain py-3 px-3"
      >
        {groups.map((group, groupIndex) => (
          <div key={group.title ?? groupIndex} className={cn(groupIndex > 0 && 'mt-2')}>
            {groupIndex > 0 && <div className="h-px bg-[var(--admin-sidebar-border)] mx-2 mb-2" />}

            {group.title && (
              <p
                className={cn(
                  'px-3 mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--admin-text-muted)] whitespace-nowrap transition-opacity duration-200',
                  collapsed ? 'opacity-0' : 'opacity-100'
                )}
              >
                {group.title}
              </p>
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItemLink
                  key={item.href}
                  item={item.href === '/admin/stock' ? { ...item, badgeCount: stockAlertCount } : item}
                  isActive={isActiveRoute(pathname, item.href)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[var(--admin-sidebar-border)]">
        {/* User profile — entrada a la cuenta propia */}
        <Link
          href="/admin/mi-cuenta"
          title="Mi cuenta"
          className={cn(
            'flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--admin-surface-2)] group',
            collapsed && 'justify-center px-3',
            pathname === '/admin/mi-cuenta' && 'bg-[var(--admin-surface-2)]'
          )}
        >
          <div className="w-8 h-8 rounded-full bg-[var(--admin-accent)] flex items-center justify-center shrink-0 text-sm font-bold text-black">
            {userName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--admin-text)] truncate">{userName}</p>
                <p className="text-xs text-[var(--admin-text-muted)] truncate">{userRole}</p>
              </div>
              <UserCog className="h-4 w-4 shrink-0 text-[var(--admin-text-faint)] group-hover:text-[var(--admin-accent-text)] transition-colors" />
            </>
          )}
        </Link>

        <div className="px-3 pb-3">
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              className={cn(
                'w-full text-[var(--admin-text-muted)] hover:text-red-700 dark:hover:text-red-500 hover:bg-red-500/10 h-9',
                collapsed ? 'justify-center px-0' : 'justify-start gap-3'
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="font-medium text-sm">Cerrar Sesión</span>}
            </Button>
          </form>
        </div>
      </div>
    </aside>
    
    
    
    
    
    
    
    
    
    
    
    )}
   </>
  )



}

// ---------------------------------------------------------------------------
// Mobile sidebar (drawer)
// ---------------------------------------------------------------------------

interface MobileSidebarProps {
  open: boolean
  onClose: () => void
  stockAlertCount?: number
  permissions?: string[] | null
}

export function MobileSidebar({ open, onClose, stockAlertCount = 0, permissions = null }: MobileSidebarProps) {
  const groups = visibleNavGroups(permissions)
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
            className="fixed left-0 top-0 z-50 h-screen w-72 bg-[var(--admin-sidebar-bg)] border-r border-[var(--admin-sidebar-border)] flex flex-col lg:hidden"
          >
            <div className="h-20 flex items-center justify-between px-4 border-b border-[var(--admin-sidebar-border)]">
              <Link href="/admin/dashboard" className="flex items-center gap-3" onClick={onClose}>
                {/* eslint-disable-next-line @next/next/no-img-element -- Logo SVG vectorial: next/image no lo optimiza sin dangerouslyAllowSVG. */}
                <img
                    src="/logo.svg"
                    alt="Que Copado"
                    className="w-14 h-14 shrink-0 rounded-xl object-contain"
                  />
                <div>
                  <span className="text-lg font-bold text-[var(--admin-text)]">
                    Que <span className="text-[var(--admin-accent-text)]">Copado</span>
                  </span>
                  <span className="block text-xs text-[var(--admin-text-muted)] font-medium">Panel Admin</span>
                </div>
              </Link>

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)]"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex-1 py-3 px-3 overflow-y-auto">
              {groups.map((group, groupIndex) => (
                <div key={group.title ?? groupIndex} className={cn(groupIndex > 0 && 'mt-2')}>
                  {groupIndex > 0 && <div className="h-px bg-[var(--admin-sidebar-border)] mx-2 mb-2" />}
                  {group.title && (
                    <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--admin-text-muted)]">
                      {group.title}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <NavItemLink
                        key={item.href}
                        item={item.href === '/admin/stock' ? { ...item, badgeCount: stockAlertCount } : item}
                        isActive={isActiveRoute(pathname, item.href)}
                        onClick={onClose}
                        pyClass="py-3"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <div className="p-3 border-t border-[var(--admin-sidebar-border)]">
              <form action={signOut}>
                <Button
                  type="submit"
                  variant="ghost"
                  className="w-full justify-start gap-3 text-[var(--admin-text-muted)] hover:text-red-700 dark:hover:text-red-500 hover:bg-red-500/10 h-10"
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
