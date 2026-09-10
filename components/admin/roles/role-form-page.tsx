'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronRight, Loader2, ShieldCheck, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  PERMISSION_GROUPS, permissionsByGroup, impliedView, type PermissionKey,
} from '@/lib/constants/permissions'
import { createRole, updateRole } from '@/app/actions/roles'
import type { RoleWithPermissions } from '@/lib/types/database'

const VOLVER = '/admin/empleados?tab=roles'

interface Props {
  mode: 'create' | 'edit'
  role?: RoleWithPermissions
}

export function RoleFormPage({ mode, role }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissions ?? []))

  const toggle = (key: PermissionKey) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        // Sacar el "ver" arrastra su "editar": no tiene sentido editar a ciegas.
        const manage = key.endsWith('.view') ? key.replace('.view', '.manage') : null
        if (manage) next.delete(manage)
      } else {
        next.add(key)
        // Marcar "editar" marca su "ver".
        const view = impliedView(key)
        if (view) next.add(view)
      }
      return next
    })
  }

  const toggleGrupo = (group: string) => {
    const claves = permissionsByGroup(group).map((p) => p.key)
    const todosPuestos = claves.every((k) => selected.has(k))
    setSelected((prev) => {
      const next = new Set(prev)
      for (const k of claves) {
        if (todosPuestos) next.delete(k)
        else next.add(k)
      }
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const permissions = [...selected]

      if (mode === 'edit' && role) {
        const { error } = await updateRole(role.key, { name, description, permissions })
        if (error) { toast.error(error); return }
        toast.success('Rol actualizado')
      } else {
        const { error } = await createRole({ name, description, permissions })
        if (error) { toast.error(error); return }
        toast.success('Rol creado')
      }

      router.push(VOLVER)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-[1200px] mx-auto space-y-6">
      <div className="space-y-4">
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href={VOLVER}
            className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors"
          >
            Equipo
          </Link>
          <ChevronRight className="h-4 w-4 text-[var(--admin-text-muted)]/50" />
          <span className="text-[var(--admin-text)] font-medium">
            {mode === 'edit' && role ? role.name : 'Nuevo Rol'}
          </span>
        </nav>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--admin-text)]">
            {mode === 'edit' ? 'Editar Rol' : 'Nuevo Rol'}
          </h1>
          <div className="flex items-center gap-3">
            <Link href={VOLVER}>
              <Button
                type="button"
                variant="outline"
                className="border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] bg-transparent hover:bg-[var(--admin-surface)]"
              >
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isPending || !name.trim()}
              className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </span>
              ) : mode === 'edit' ? 'Guardar Cambios' : 'Guardar Rol'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
        <div className="space-y-6">
          {/* ── Identidad ── */}
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-[var(--admin-text)]">Identidad</h2>
              <p className="text-sm text-[var(--admin-text-muted)]">Cómo lo van a ver al asignarlo</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Nombre <span className="text-[var(--admin-accent-text)]">*</span>
                </Label>
                <Input
                  id="name" value={name} autoFocus
                  placeholder="Mozo, Encargado de turno…"
                  onChange={(e) => setName(e.target.value)}
                  className="bg-[var(--admin-bg)] border-[var(--admin-border)]"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">
                  Descripción <span className="text-[var(--admin-text-faint)]">(opcional)</span>
                </Label>
                <Input
                  id="description" value={description}
                  placeholder="Qué hace esta persona en el local"
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-[var(--admin-bg)] border-[var(--admin-border)]"
                />
              </div>
            </div>
          </div>

          {/* ── Permisos ── */}
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-[var(--admin-text)]">Permisos</h2>
              <p className="text-sm text-[var(--admin-text-muted)]">
                Qué puede hacer alguien con este rol. Marcar un permiso de edición activa también el de ver.
              </p>
            </div>

            <div className="space-y-4">
              {PERMISSION_GROUPS.map((group) => {
                const claves = permissionsByGroup(group).map((p) => p.key)
                const puestos = claves.filter((k) => selected.has(k)).length
                return (
                  <div key={group} className="rounded-lg border border-[var(--admin-border)] overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[var(--admin-bg)] border-b border-[var(--admin-border)]">
                      <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--admin-text-muted)]">
                        {group}
                        <span className="ml-2 text-[var(--admin-text-faint)]">{puestos}/{claves.length}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleGrupo(group)}
                        className="text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer"
                      >
                        {puestos === claves.length ? 'Quitar todos' : 'Marcar todos'}
                      </button>
                    </div>

                    {/* Dos columnas: con 27 permisos, una sola lista obliga a
                        scrollear de mas y separa el ver de su editar. */}
                    <div className="grid sm:grid-cols-2">
                      {permissionsByGroup(group).map((p) => {
                        const on = selected.has(p.key)
                        return (
                          <label
                            key={p.key}
                            className="flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-[var(--admin-hover)] transition-colors border-b border-[var(--admin-border)] last:border-b-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
                          >
                            <span
                              className={cn(
                                'mt-0.5 h-4 w-4 shrink-0 rounded border grid place-items-center transition-colors',
                                on
                                  ? 'bg-[var(--admin-accent)] border-[var(--admin-accent)]'
                                  : 'border-[var(--admin-border)] bg-[var(--admin-bg)]'
                              )}
                            >
                              {on && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
                            </span>
                            <input
                              type="checkbox" checked={on} onChange={() => toggle(p.key)}
                              className="sr-only"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm text-[var(--admin-text)]">{p.label}</span>
                              {p.hint && (
                                <span className="block text-xs text-[var(--admin-text-muted)] leading-snug">{p.hint}</span>
                              )}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Resumen ── */}
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 space-y-4 lg:sticky lg:top-6">
          <div className="flex items-center gap-2 text-[var(--admin-text)]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--admin-text-muted)]" />
            <h2 className="font-semibold">
              {selected.size} {selected.size === 1 ? 'permiso' : 'permisos'}
            </h2>
          </div>

          <div className="space-y-1.5">
            {PERMISSION_GROUPS.map((group) => {
              const claves = permissionsByGroup(group).map((p) => p.key)
              const puestos = claves.filter((k) => selected.has(k)).length
              return (
                <div key={group} className="flex items-center justify-between text-xs">
                  <span className={puestos ? 'text-[var(--admin-text)]' : 'text-[var(--admin-text-faint)]'}>
                    {group}
                  </span>
                  <span className="font-mono text-[var(--admin-text-faint)]">
                    {puestos}/{claves.length}
                  </span>
                </div>
              )
            })}
          </div>

          <p className="text-xs text-[var(--admin-text-muted)] pt-1 border-t border-[var(--admin-border)]">
            El menú lateral se arma con esto: cada persona ve solo las secciones que puede usar.
          </p>
        </div>
      </div>
    </form>
  )
}
