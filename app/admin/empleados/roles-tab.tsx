'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Lock, Trash2, Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  PERMISSION_GROUPS, permissionsByGroup, impliedView, type PermissionKey,
} from '@/lib/constants/permissions'
import { createRole, updateRole, deleteRole } from '@/app/actions/roles'
import type { RoleWithPermissions } from '@/lib/types/database'

const BTN = 'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'

interface Props {
  roles: RoleWithPermissions[]
  canManage: boolean
  onChanged: () => void
}

export function RolesTab({ roles, canManage, onChanged }: Props) {
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState<RoleWithPermissions | null>(null)
  const [creating, setCreating] = useState(false)

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
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--admin-accent)] px-3 py-2 text-sm font-semibold text-black hover:bg-[var(--admin-accent)] hover:brightness-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nuevo rol
          </button>
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
                  <button
                    type="button" disabled={pending || role.key === 'admin'}
                    onClick={() => setEditing(role)}
                    title={role.key === 'admin' ? 'El rol Administrador no se puede modificar' : undefined}
                    className={cn(BTN, 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)]')}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
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

      {(creating || editing) && (
        <RoleDialog
          role={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { setCreating(false); setEditing(null); onChanged() }}
        />
      )}
    </>
  )
}

// ─── Diálogo de alta y edición ───────────────────────────────────────────────

function RoleDialog({
  role, onClose, onSaved,
}: {
  role: RoleWithPermissions | null
  onClose: () => void
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissions ?? []))

  const toggle = (key: PermissionKey) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        // Sacar el view arrastra su manage: no tiene sentido editar sin ver.
        const manage = key.endsWith('.view') ? key.replace('.view', '.manage') : null
        if (manage) next.delete(manage)
      } else {
        next.add(key)
        // Marcar manage marca su view: quien edita necesita ver.
        const view = impliedView(key)
        if (view) next.add(view)
      }
      return next
    })
  }

  const save = () => {
    startTransition(async () => {
      const permisos = [...selected]
      if (role) {
        const { error } = await updateRole(role.key, { name, description, permissions: permisos })
        if (error) { toast.error(error); return }
        toast.success('Rol actualizado')
      } else {
        const { error } = await createRole({ name, description, permissions: permisos })
        if (error) { toast.error(error); return }
        toast.success('Rol creado')
      }
      onSaved()
    })
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? `Editar ${role.name}` : 'Nuevo rol'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="rname">Nombre</Label>
            <Input
              id="rname" value={name} autoFocus
              placeholder="Mozo, Encargado de turno…"
              onChange={(e) => setName(e.target.value)}
              className="bg-[var(--admin-bg)] border-[var(--admin-border)]"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rdesc">Descripción <span className="text-[var(--admin-text-faint)]">(opcional)</span></Label>
            <Input
              id="rdesc" value={description}
              placeholder="Qué hace esta persona en el local"
              onChange={(e) => setDescription(e.target.value)}
              className="bg-[var(--admin-bg)] border-[var(--admin-border)]"
            />
          </div>

          <div className="grid gap-3">
            <div>
              <Label>Permisos</Label>
              <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                Marcar un permiso de edición activa también el de ver.
              </p>
            </div>

            {PERMISSION_GROUPS.map((group) => (
              <div key={group} className="rounded-lg border border-[var(--admin-border)] overflow-hidden">
                <p className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-[var(--admin-text-faint)] bg-[var(--admin-bg)] border-b border-[var(--admin-border)]">
                  {group}
                </p>
                <div className="divide-y divide-[var(--admin-border)]">
                  {permissionsByGroup(group).map((p) => (
                    <label
                      key={p.key}
                      className="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--admin-hover)] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(p.key)}
                        onChange={() => toggle(p.key)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--admin-accent)] cursor-pointer"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm text-[var(--admin-text)]">{p.label}</span>
                        {p.hint && (
                          <span className="block text-xs text-[var(--admin-text-muted)]">{p.hint}</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <button
            type="button" onClick={onClose}
            className={cn(BTN, 'px-4 py-2 text-sm text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)]')}
          >
            Cancelar
          </button>
          <button
            type="button" onClick={save} disabled={pending || !name.trim()}
            className="inline-flex items-center rounded-md bg-[var(--admin-accent)] px-4 py-2 text-sm font-semibold text-black hover:bg-[var(--admin-accent)] hover:brightness-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pending ? 'Guardando…' : role ? 'Guardar cambios' : 'Crear rol'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
