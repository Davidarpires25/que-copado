'use client'

import { usePathname } from 'next/navigation'
import { AdminShell } from '@/components/admin/layout/admin-shell'

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Rutas full-screen sin sidebar — cada una gestiona su propio layout
  const skipShell =
    pathname === '/admin/login' ||
    pathname === '/admin/caja' ||
    pathname.startsWith('/admin/caja/ticket')

  if (skipShell) return <>{children}</>
  return <AdminShell>{children}</AdminShell>
}
