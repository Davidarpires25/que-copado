'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Lock, Trash2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deleteRole } from '@/app/actions/roles'
import type { RoleWithPermissions } from '@/lib/types/database'

const BTN = 'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'

interface Props {
  roles: RoleWithPermissions[]
  canManage: boolean
  onChanged: () => void
}

export function RolesTab({ roles, canManage, onChanged }: Props) {
  const [pending, startTransition] = useTransition()

  const handleDelete = (role: RoleWithPermissions) => {
    startTransition(async () => {
      const { error } = await deleteRole(role.key)
      if (error) { toast.error(error); return }
      toast.success('Rol eliminado')
      onChanged()
    })
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="text-sm text-[var(--admin-text-muted)]">
          {roles.length} {roles.length === 1 ? 'rol' : 'roles'} · definí qué puede hacer cada uno
        </p>
        {canManage && (
          <Link
            href="/admin/empleados/roles/nuevo"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--admin-accent)] px-3 py-2 text-sm font-semibold text-black hover:bg-[var(--admin-accent)] hover:brightness-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Nuevo rol
          </Link>
        )}
      </div>

      <div className="grid gap-3">
        {roles.map((role) => (
          <div
            key={role.key}
            className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[var(--admin-text)]">{role.name}</h3>
                  {role.is_system && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide text-[var(--admin-text-faint)] border border-[var(--admin-border)] rounded px-1.5 py-0.5">
                      <Lock className="h-2.5 w-2.5" />
                      sistema
                    </span>
                  )}
                </div>
                {role.description && (
                  <p className="text-sm text-[var(--admin-text-muted)] mt-0.5">{role.description}</p>
                )}
                <p className="text-xs text-[var(--admin-text-faint)] mt-1.5 font-mono">
                  {role.permissions.length} permisos · {role.member_count}{' '}
                  {role.member_count === 1 ? 'persona' : 'personas'}
                </p>
              </div>

              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  {role.key === 'admin' ? (
                    <span
                      title="El rol Administrador no se puede modificar"
                      className={cn(BTN, 'text-[var(--admin-text-faint)] cursor-not-allowed')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </span>
                  ) : (
                    <Link
                      href={`/admin/empleados/roles/${role.key}`}
                      className={cn(BTN, 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)]')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Link>
                  )}
                  <button
                    type="button" disabled={pending || role.is_system || role.member_count > 0}
                    onClick={() => handleDelete(role)}
                    title={
                      role.is_system ? 'Los roles del sistema no se eliminan'
                      : role.member_count > 0 ? 'Hay empleados con este rol'
                      : undefined
                    }
                    className={cn(BTN, 'text-rose-700 dark:text-rose-400 hover:bg-rose-500/10')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

    </>
  )
}
