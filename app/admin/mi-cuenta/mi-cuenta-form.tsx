'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminLayout } from '@/components/admin/layout'
import { updateMyName, updateMyEmail, updateMyPassword, type MyAccount } from '@/app/actions/account'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface MiCuentaFormProps {
  initialAccount: MyAccount
}

// Todos los campos comparten ancho: en una pila vertical los anchos distintos
// dejan un borde derecho dentado que se lee como descuido. 360px es el ancho
// del dato mas largo —el email—, asi que ninguno queda corto.
const FIELD_BASE =
  'w-full h-12 rounded-lg border-[var(--admin-border)] text-[var(--admin-text)] ' +
  'placeholder:text-[var(--admin-text-placeholder)] ' +
  'focus:border-[var(--admin-accent)]/60 focus:ring-2 focus:ring-[var(--admin-accent)]/20'
const FIELD = `${FIELD_BASE} bg-[var(--admin-surface)]`
// Solo lectura: el fondo apagado dice "esto todavia no se toca".
const FIELD_RO = `${FIELD_BASE} bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)]`
// En una fila con el lapiz al lado, el campo se queda con el resto.
const GROW = 'flex-1 min-w-0'

const LABEL = 'block text-[15px] font-semibold text-[var(--admin-text)] mb-2.5'
const ICON_BTN =
  'h-12 w-12 shrink-0 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] ' +
  'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] transition-colors'
const PRIMARY =
  'h-12 px-7 rounded-lg bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold ' +
  'disabled:opacity-100 disabled:bg-[var(--admin-surface-2)] disabled:text-[var(--admin-text-muted)]'

/** "el nombre y el email" — para contar que entro cuando entro solo una parte. */
function listar(partes: string[]) {
  if (partes.length === 1) return partes[0]
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
}

export function MiCuentaForm({ initialAccount }: MiCuentaFormProps) {
  const router = useRouter()
  const [emailActual, setEmailActual] = useState(initialAccount.email)

  const [nombre, setNombre] = useState(initialAccount.fullName)

  // Email y contraseña se abren a pedido. Mientras estan cerrados no piden
  // nada, asi que cambiar solo el nombre no obliga a tipear la contraseña.
  const [abriEmail, setAbriEmail] = useState(false)
  const [emailNuevo, setEmailNuevo] = useState('')
  const [emailRepetido, setEmailRepetido] = useState('')

  const [abriPassword, setAbriPassword] = useState(false)
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordRepetida, setPasswordRepetida] = useState('')

  const [passwordActual, setPasswordActual] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState<string[] | null>(null)

  const nombreCambio = nombre.trim() !== initialAccount.fullName && nombre.trim() !== ''
  const cambiaEmail = abriEmail && emailNuevo.trim() !== ''
  const cambiaPassword = abriPassword && passwordNueva !== ''

  const emailsCoinciden =
    emailNuevo.trim().toLowerCase() === emailRepetido.trim().toLowerCase()
  const passwordsCoinciden = passwordNueva === passwordRepetida

  // La contraseña actual la exige el servidor para email y para contraseña.
  // Se pide UNA vez al pie y no una por bloque.
  //
  // Mostrar y exigir no son lo mismo: el campo aparece al ABRIR el bloque —si
  // esperara a que tipees, el pie saltaria mientras escribis— pero solo bloquea
  // el guardado cuando hay un cambio de verdad. Abrir el email y arrepentirse
  // no tiene que impedirte guardar el nombre.
  const muestraConfirmacion = abriEmail || abriPassword
  const exigeConfirmacion = cambiaEmail || cambiaPassword

  const pendientes = [nombreCambio, cambiaEmail, cambiaPassword].filter(Boolean).length
  const puedeGuardar =
    pendientes > 0 &&
    (!cambiaEmail || emailsCoinciden) &&
    (!cambiaPassword || passwordsCoinciden) &&
    (!exigeConfirmacion || passwordActual !== '')

  const tocar = () => setGuardado(null)

  const cerrarEmail = () => {
    setAbriEmail(false)
    setEmailNuevo('')
    setEmailRepetido('')
  }

  const cerrarPassword = () => {
    setAbriPassword(false)
    setPasswordNueva('')
    setPasswordRepetida('')
  }

  const handleSave = async () => {
    if (cambiaEmail && !emailsCoinciden) {
      toast.error('Los dos emails tienen que coincidir')
      return
    }
    if (cambiaPassword && !passwordsCoinciden) {
      toast.error('Las dos contraseñas nuevas tienen que coincidir')
      return
    }

    setGuardando(true)
    setGuardado(null)

    const hechos: string[] = []
    let fallo: string | null = null

    // El orden no es cosmetico. updateMyEmail y updateMyPassword confirman la
    // identidad con signInWithPassword usando la contraseña ACTUAL; si la
    // contraseña se cambiara primero, el email siguiente fallaria con
    // "credencial invalida". Por eso la contraseña va ultima.
    if (nombreCambio) {
      const { error } = await updateMyName(nombre)
      if (error) fallo = error
      else hechos.push('el nombre')
    }

    if (!fallo && cambiaEmail) {
      const { error } = await updateMyEmail(emailNuevo, passwordActual)
      if (error) {
        fallo = error
      } else {
        setEmailActual(emailNuevo.trim().toLowerCase())
        hechos.push('el email')
        cerrarEmail()
      }
    }

    if (!fallo && cambiaPassword) {
      const { error } = await updateMyPassword(passwordActual, passwordNueva)
      if (error) {
        fallo = error
      } else {
        hechos.push('la contraseña')
        cerrarPassword()
      }
    }

    setGuardando(false)
    setPasswordActual('')

    if (hechos.length > 0) {
      setGuardado(hechos)
      router.refresh()
    }

    // Un guardado parcial no se reporta como un error a secas: hay que decir
    // que si entro, o el usuario vuelve a cargar todo.
    if (fallo) {
      toast.error(
        hechos.length > 0 ? `${fallo}. Sí se guardó ${listar(hechos)}.` : fallo
      )
    }
  }

  return (
    <AdminLayout
      title="Mi cuenta"
      description={
        initialAccount.roleLabel
          ? `Tu rol es ${initialAccount.roleLabel} y sólo lo puede cambiar un administrador.`
          : 'Cambiá tu nombre, tu email y tu contraseña'
      }
      contentWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {guardado && (
          <div
            className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3.5"
            role="status"
          >
            <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-green-700 dark:text-green-400" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Guardamos {listar(guardado)}.
            </p>
          </div>
        )}

        <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl shadow-[var(--shadow-card)]">
          <div className="p-8 md:p-10 flex flex-col gap-8">
            {/* Nombre — editable directo: cambiarlo no tiene consecuencia */}
            <div>
              <label htmlFor="nombre" className={LABEL}>Nombre completo</label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => { setNombre(e.target.value); tocar() }}
                maxLength={80}
                placeholder="Tu nombre"
                className={FIELD}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor={abriEmail ? 'email-nuevo' : 'email-actual'} className={LABEL}>
                {abriEmail ? 'Email nuevo' : 'Email'}
              </label>
              <div className="flex items-center gap-3">
                {abriEmail ? (
                  <Input
                    id="email-nuevo"
                    type="email"
                    autoComplete="off"
                    autoFocus
                    value={emailNuevo}
                    onChange={(e) => { setEmailNuevo(e.target.value); tocar() }}
                    placeholder="nombre@ejemplo.com"
                    className={cn(FIELD, GROW)}
                  />
                ) : (
                  <Input id="email-actual" value={emailActual} readOnly tabIndex={-1} className={cn(FIELD_RO, GROW)} />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (abriEmail) cerrarEmail()
                    else setAbriEmail(true)
                    tocar()
                  }}
                  className={ICON_BTN}
                  aria-label={abriEmail ? 'Cancelar el cambio de email' : 'Cambiar el email'}
                >
                  {abriEmail ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                </Button>
              </div>

              {abriEmail && (
                <div className="mt-3 flex flex-col gap-3">
                  <div>
                    <label htmlFor="email-repetido" className={LABEL}>Repetí el email nuevo</label>
                    <Input
                      id="email-repetido"
                      type="email"
                      autoComplete="off"
                      value={emailRepetido}
                      onChange={(e) => { setEmailRepetido(e.target.value); tocar() }}
                      placeholder="nombre@ejemplo.com"
                      className={FIELD}
                    />
                    {emailRepetido !== '' && !emailsCoinciden && (
                      <p className="mt-1.5 text-sm text-red-700 dark:text-red-400">Los emails no coinciden.</p>
                    )}
                  </div>
                  <p className="text-sm text-[var(--admin-text-muted)]">Hoy entrás con {emailActual}</p>
                </div>
              )}
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor={abriPassword ? 'pass-nueva' : 'pass-actual-ro'} className={LABEL}>
                {abriPassword ? 'Contraseña nueva' : 'Contraseña'}
              </label>
              <div className="flex items-center gap-3">
                {abriPassword ? (
                  <Input
                    id="pass-nueva"
                    type="password"
                    autoComplete="new-password"
                    autoFocus
                    value={passwordNueva}
                    onChange={(e) => { setPasswordNueva(e.target.value); tocar() }}
                    className={cn(FIELD, GROW)}
                  />
                ) : (
                  <Input
                    id="pass-actual-ro"
                    value="••••••••••"
                    readOnly
                    tabIndex={-1}
                    className={cn(FIELD_RO, GROW, 'tracking-[0.12em]')}
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (abriPassword) cerrarPassword()
                    else setAbriPassword(true)
                    tocar()
                  }}
                  className={ICON_BTN}
                  aria-label={abriPassword ? 'Cancelar el cambio de contraseña' : 'Cambiar la contraseña'}
                >
                  {abriPassword ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                </Button>
              </div>

              {abriPassword && (
                <div className="mt-3 flex flex-col gap-3">
                  <div>
                    <label htmlFor="pass-repetida" className={LABEL}>Repetí la contraseña nueva</label>
                    <Input
                      id="pass-repetida"
                      type="password"
                      autoComplete="new-password"
                      value={passwordRepetida}
                      onChange={(e) => { setPasswordRepetida(e.target.value); tocar() }}
                      className={FIELD}
                    />
                    {passwordRepetida !== '' && !passwordsCoinciden && (
                      <p className="mt-1.5 text-sm text-red-700 dark:text-red-400">Las contraseñas no coinciden.</p>
                    )}
                  </div>
                  <p className="text-sm text-[var(--admin-text-muted)]">Al menos 8 caracteres.</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-[var(--admin-border)] px-8 md:px-10 py-6 flex flex-col gap-5">
            {muestraConfirmacion && (
              <div>
                <label htmlFor="pass-confirma" className={LABEL}>Confirmá con tu contraseña actual</label>
                <Input
                  id="pass-confirma"
                  type="password"
                  autoComplete="current-password"
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  className={FIELD}
                />
              </div>
            )}

            <div className="flex items-center gap-4">
              <Button onClick={handleSave} disabled={guardando || !puedeGuardar} className={PRIMARY}>
                {guardando ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
                ) : (
                  'Guardar cambios'
                )}
              </Button>
              {pendientes > 0 && (
                <p className="text-sm text-[var(--admin-text-muted)]" aria-live="polite">
                  {pendientes === 1 ? '1 cambio sin guardar.' : `${pendientes} cambios sin guardar.`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
