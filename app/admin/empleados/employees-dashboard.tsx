'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { UserPlus, KeyRound, Copy, Check, ShieldAlert } from 'lucide-react'
import { AdminLayout } from '@/components/admin/layout/admin-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  createEmployee, updateEmployeeRole, setEmployeeActive, resetEmployeePassword,
  type Employee,
} from '@/app/actions/employees'
import { APP_ROLE_LABELS, type AppRole } from '@/lib/types/database'

const ROLES: AppRole[] = ['admin', 'cajero', 'cocina']

const ROLE_STYLE: Record<AppRole, string> = {
  admin:  'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/25',
  cajero: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  cocina: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/25',
}

const ROLE_HINT: Record<AppRole, string> = {
  admin:  'Todo, incluidos reportes y ajustes',
  cajero: 'Opera la caja, cobra y cierra el turno',
  cocina: 'Solo la pantalla de comandas',
}

interface Props {
  initialEmployees: Employee[]
  loadError: string | null
  currentUserId: string | null
}

export function EmployeesDashboard({ initialEmployees, loadError, currentUserId }: Props) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [pending, startTransition] = useTransition()
  const [addOpen, setAddOpen] = useState(false)
  const [credential, setCredential] = useState<{ name: string; password: string } | null>(null)

  const [form, setForm] = useState({ fullName: '', email: '', role: 'cajero' as AppRole })

  const refresh = (updater: (prev: Employee[]) => Employee[]) => setEmployees(updater)

  const handleCreate = () => {
    startTransition(async () => {
      const { data, error } = await createEmployee(form)
      if (error || !data) { toast.error(error ?? 'No se pudo crear'); return }
      setAddOpen(false)
      setCredential({ name: form.fullName, password: data.tempPassword })
      setForm({ fullName: '', email: '', role: 'cajero' })
      toast.success('Empleado creado')
      // La lista se recarga en el próximo render del server; mientras tanto,
      // se muestra la credencial, que es lo único que no se puede recuperar.
    })
  }

  const handleRole = (id: string, role: AppRole) => {
    const previous = employees
    refresh((prev) => prev.map((e) => (e.id === id ? { ...e, role } : e)))
    startTransition(async () => {
      const { error } = await updateEmployeeRole(id, role)
      if (error) { setEmployees(previous); toast.error(error); return }
      toast.success('Rol actualizado')
    })
  }

  const handleActive = (id: string, isActive: boolean) => {
    const previous = employees
    refresh((prev) => prev.map((e) => (e.id === id ? { ...e, is_active: isActive } : e)))
    startTransition(async () => {
      const { error } = await setEmployeeActive(id, isActive)
      if (error) { setEmployees(previous); toast.error(error); return }
      toast.success(isActive ? 'Empleado reactivado' : 'Empleado dado de baja')
    })
  }

  const handleReset = (emp: Employee) => {
    startTransition(async () => {
      const { data, error } = await resetEmployeePassword(emp.id)
      if (error || !data) { toast.error(error ?? 'No se pudo generar'); return }
      setCredential({ name: emp.full_name, password: data.tempPassword })
    })
  }

  if (loadError) {
    return (
      <AdminLayout title="Equipo" description="Empleados y permisos">
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <ShieldAlert className="h-10 w-10 text-[var(--admin-text-placeholder)]" />
          <p className="text-[var(--admin-text)] font-medium">{loadError}</p>
          <p className="text-sm text-[var(--admin-text-muted)] max-w-md">
            Si todavía no aplicaste la migración <span className="font-mono">016</span> en Supabase,
            esta pantalla no tiene de dónde leer.
          </p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Equipo" description="Quién puede entrar y qué puede hacer">
      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="text-sm text-[var(--admin-text-muted)]">
          {employees.length} {employees.length === 1 ? 'persona' : 'personas'}
        </p>
        <Button onClick={() => setAddOpen(true)} className="gap-2 bg-[var(--admin-accent)] text-black hover:bg-[var(--admin-accent)] hover:brightness-95">
          <UserPlus className="h-4 w-4" />
          Agregar empleado
        </Button>
      </div>

      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--admin-border)] hover:bg-transparent">
              <TableHead className="text-[var(--admin-text-muted)]">Nombre</TableHead>
              <TableHead className="text-[var(--admin-text-muted)]">Email</TableHead>
              <TableHead className="text-[var(--admin-text-muted)]">Rol</TableHead>
              <TableHead className="text-[var(--admin-text-muted)]">Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp) => {
              const isMe = emp.id === currentUserId
              return (
                <TableRow key={emp.id} className={cn('border-[var(--admin-border)]', !emp.is_active && 'opacity-55')}>
                  <TableCell className="font-medium text-[var(--admin-text)]">
                    {emp.full_name || '—'}
                    {isMe && <span className="ml-2 text-xs text-[var(--admin-text-muted)]">(vos)</span>}
                  </TableCell>
                  <TableCell className="text-[var(--admin-text-muted)] text-sm">{emp.email}</TableCell>
                  <TableCell>
                    <select
                      value={emp.role}
                      disabled={pending}
                      onChange={(e) => handleRole(emp.id, e.target.value as AppRole)}
                      className={cn(
                        'text-xs font-semibold rounded-md border px-2 py-1 outline-none cursor-pointer',
                        ROLE_STYLE[emp.role]
                      )}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{APP_ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="text-sm">
                    {emp.is_active
                      ? <span className="text-emerald-700 dark:text-emerald-400">Activo</span>
                      : <span className="text-[var(--admin-text-faint)]">De baja</span>}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <button
                      type="button" disabled={pending}
                      onClick={() => handleReset(emp)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ',
                        'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)]'
                      )}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Nueva clave
                    </button>
                    <button
                      type="button" disabled={pending || isMe}
                      onClick={() => handleActive(emp.id, !emp.is_active)}
                      title={isMe ? 'No podés darte de baja a vos mismo' : undefined}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ',
                        emp.is_active
                          ? 'text-rose-700 dark:text-rose-400 hover:bg-rose-500/10'
                          : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
                      )}
                    >
                      {emp.is_active ? 'Dar de baja' : 'Reactivar'}
                    </button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <p className="mt-4 text-xs text-[var(--admin-text-muted)] max-w-2xl">
        Dar de baja no borra la cuenta: conserva los turnos y arqueos que esa persona cerró. Siempre
        tiene que quedar al menos un administrador activo.
      </p>

      {/* ── Alta ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] sm:max-w-md">
          <DialogHeader><DialogTitle>Agregar empleado</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="nm">Nombre y apellido</Label>
              <Input id="nm" value={form.fullName} autoFocus
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="bg-[var(--admin-bg)] border-[var(--admin-border)]" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="em">Email</Label>
              <Input id="em" type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-[var(--admin-bg)] border-[var(--admin-border)]" />
            </div>
            <div className="grid gap-2">
              <Label>Rol</Label>
              <div className="grid gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r} type="button"
                    onClick={() => setForm({ ...form, role: r })}
                    className={cn(
                      'text-left rounded-lg border px-3 py-2 transition-colors cursor-pointer',
                      form.role === r
                        ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/10'
                        : 'border-[var(--admin-border)] hover:border-[var(--admin-text-faint)]'
                    )}
                  >
                    <span className="block text-sm font-semibold">{APP_ROLE_LABELS[r]}</span>
                    <span className="block text-xs text-[var(--admin-text-muted)]">{ROLE_HINT[r]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button" onClick={() => setAddOpen(false)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ',
                'px-4 py-2 text-sm text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)]'
              )}
            >
              Cancelar
            </button>
            <Button onClick={handleCreate} disabled={pending}
              className="bg-[var(--admin-accent)] text-black hover:bg-[var(--admin-accent)] hover:brightness-95">
              {pending ? 'Creando…' : 'Crear cuenta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Credencial: se muestra una sola vez ── */}
      <Dialog open={!!credential} onOpenChange={(v) => !v && setCredential(null)}>
        <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] sm:max-w-md">
          <DialogHeader><DialogTitle>Contraseña de {credential?.name}</DialogTitle></DialogHeader>
          <p className="text-sm text-[var(--admin-text-muted)]">
            Pasásela ahora. No se vuelve a mostrar: si se pierde, generás una nueva desde el listado.
          </p>
          <CredentialBox password={credential?.password ?? ''} />
          <DialogFooter>
            <Button onClick={() => setCredential(null)}
              className="bg-[var(--admin-accent)] text-black hover:bg-[var(--admin-accent)] hover:brightness-95">Listo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

function CredentialBox({ password }: { password: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-4 py-3">
      <code className="flex-1 font-mono text-lg tracking-wider select-all">{password}</code>
      <button
        type="button" onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)]"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-700 dark:text-emerald-400" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}
