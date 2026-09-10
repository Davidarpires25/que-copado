'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronRight, Loader2, Copy, Check, KeyRound, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { createEmployee } from '@/app/actions/employees'
import type { RoleWithPermissions } from '@/lib/types/database'

const VOLVER = '/admin/empleados'

interface Props {
  roles: RoleWithPermissions[]
}

export function EmployeeFormPage({ roles }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState(roles[0]?.key ?? '')

  /** La clave solo existe en memoria y no se puede recuperar despues. */
  const [credencial, setCredencial] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const { data, error } = await createEmployee({ fullName, email, role })
      if (error || !data) { toast.error(error ?? 'No se pudo crear'); return }
      setCredencial(data.tempPassword)
      toast.success('Empleado creado')
      router.refresh()
    })
  }

  // Pantalla de exito: la contraseña se muestra una sola vez, asi que ocupa
  // toda la atencion en vez de vivir en un dialogo que se cierra sin querer.
  if (credencial) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm">
          <Link href={VOLVER} className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors">
            Equipo
          </Link>
          <ChevronRight className="h-4 w-4 text-[var(--admin-text-muted)]/50" />
          <span className="text-[var(--admin-text)] font-medium">{fullName}</span>
        </nav>

        <div className="max-w-xl rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 space-y-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/12">
              <Check className="h-5 w-5 text-emerald-700 dark:text-emerald-400" strokeWidth={2.5} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[var(--admin-text)]">
                Cuenta creada para {fullName}
              </h2>
              <p className="text-sm text-[var(--admin-text-muted)]">
                Pasale la contraseña ahora. No se vuelve a mostrar: si se pierde, generás una nueva
                desde el listado.
              </p>
            </div>
          </div>

          <CredentialBox password={credencial} />

          <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] p-4 space-y-1.5">
            <p className="text-sm text-[var(--admin-text-muted)]">
              Entra con <span className="font-medium text-[var(--admin-text)]">{email}</span> y esa
              contraseña.
            </p>
            <p className="text-xs text-[var(--admin-text-faint)]">
              Conviene que la cambie en el primer ingreso.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href={VOLVER}>
              <Button className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold">
                Volver al equipo
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => {
                setCredencial(null)
                setFullName(''); setEmail(''); setRole(roles[0]?.key ?? '')
              }}
              className="text-sm text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer"
            >
              Agregar otro
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <nav className="flex items-center gap-2 text-sm">
          <Link href={VOLVER} className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors">
            Equipo
          </Link>
          <ChevronRight className="h-4 w-4 text-[var(--admin-text-muted)]/50" />
          <span className="text-[var(--admin-text)] font-medium">Nuevo Empleado</span>
        </nav>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--admin-text)]">Nuevo Empleado</h1>
          <div className="flex items-center gap-3">
            <Link href={VOLVER}>
              <Button
                type="button" variant="outline"
                className="border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] bg-transparent hover:bg-[var(--admin-surface)]"
              >
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isPending || !fullName.trim() || !email.trim() || !role}
              className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando...
                </span>
              ) : 'Crear Cuenta'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
        {/* ── Rol ── */}
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-[var(--admin-text)]">Rol</h2>
            <p className="text-sm text-[var(--admin-text-muted)]">
              Define qué secciones ve y qué puede hacer.{' '}
              <Link href="/admin/empleados/roles/nuevo" className="text-[var(--admin-accent-text)] hover:underline">
                Crear un rol nuevo
              </Link>
            </p>
          </div>

          <div className="grid gap-2">
            {roles.map((r) => (
              <button
                key={r.key} type="button"
                onClick={() => setRole(r.key)}
                className={cn(
                  'text-left rounded-lg border px-4 py-3 transition-colors cursor-pointer',
                  role === r.key
                    ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/10'
                    : 'border-[var(--admin-border)] hover:border-[var(--admin-text-faint)]'
                )}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-sm text-[var(--admin-text)]">{r.name}</span>
                  <span className="text-xs font-mono text-[var(--admin-text-faint)] shrink-0">
                    {r.permissions.length} permisos
                  </span>
                </span>
                {r.description && (
                  <span className="block text-xs text-[var(--admin-text-muted)] mt-0.5">
                    {r.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Datos ── */}
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 space-y-5 lg:sticky lg:top-6">
          <div>
            <h2 className="font-semibold text-[var(--admin-text)]">Datos</h2>
            <p className="text-sm text-[var(--admin-text-muted)]">Con qué entra al panel</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fullName">
              Nombre y apellido <span className="text-[var(--admin-accent-text)]">*</span>
            </Label>
            <Input
              id="fullName" value={fullName} autoFocus
              onChange={(e) => setFullName(e.target.value)}
              className="bg-[var(--admin-bg)] border-[var(--admin-border)]"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">
              Email <span className="text-[var(--admin-accent-text)]">*</span>
            </Label>
            <Input
              id="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[var(--admin-bg)] border-[var(--admin-border)]"
            />
          </div>

          <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] p-4">
            <div className="flex items-center gap-2 text-[var(--admin-text-muted)]">
              <KeyRound className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">Contraseña automática</span>
            </div>
            <p className="text-xs text-[var(--admin-text-muted)] mt-2">
              Se genera una al crear la cuenta y se muestra una sola vez, para que se la dictes.
              No hace falta que el empleado reciba ningún mail.
            </p>
          </div>
        </div>
      </div>
    </form>
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
      <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--admin-text-faint)]" />
      <code className="flex-1 font-mono text-lg tracking-wider select-all break-all text-[var(--admin-text)]">
        {password}
      </code>
      <button
        type="button" onClick={copy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)] transition-colors cursor-pointer"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-700 dark:text-emerald-400" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}
