'use client'

import { useState } from 'react'
import { Loader2, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AdminLayout } from '@/components/admin/layout'
import { updateBusinessSettings, toggleBusinessPause } from '@/app/actions/business-settings'
import { useThemeStore } from '@/lib/store/theme-store'
import { checkBusinessStatus, formatOperatingDays, formatBusinessHours } from '@/lib/services/business-hours'
import { toast } from 'sonner'
import { DangerZone } from '@/components/admin/settings/danger-zone'
import { cn } from '@/lib/utils'
import type { BusinessSettings } from '@/lib/types/database'

interface BusinessSettingsFormProps {
  initialSettings: BusinessSettings
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]

const TABS = [
  { key: 'horarios', label: 'Horarios' },
  { key: 'pausa', label: 'Pausa' },
  { key: 'cobros', label: 'Cobros' },
  { key: 'apariencia', label: 'Apariencia' },
  { key: 'datos', label: 'Datos' },
] as const

type TabKey = (typeof TABS)[number]['key']

// El campo comparte fondo con el panel y se define por el borde, no por un
// relleno gris: da mas contraste al texto tipeado y menos ruido de cajas.
const FIELD =
  'bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] h-12 rounded-lg ' +
  'placeholder:text-[var(--admin-text-placeholder)] ' +
  'focus:border-[var(--admin-accent)]/60 focus:ring-2 focus:ring-[var(--admin-accent)]/20'

// El titulo de seccion no usa --admin-accent-text: sobre blanco queda en 1.59:1.
// Una hora ocupa cinco caracteres; el campo no tiene por que medir media
// columna. El textarea de abajo si va a lo ancho: eso es prosa.
const TIME_W = 'w-[180px]'

const LABEL = 'block text-[15px] font-semibold text-[var(--admin-text)] mb-2.5'

export function BusinessSettingsForm({ initialSettings }: BusinessSettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [isTogglingPause, setIsTogglingPause] = useState(false)
  const [tab, setTab] = useState<TabKey>('horarios')
  const { theme, setTheme } = useThemeStore()

  const [operatingDays, setOperatingDays] = useState<number[]>(settings.operating_days)
  const [openingTime, setOpeningTime] = useState(settings.opening_time)
  const [closingTime, setClosingTime] = useState(settings.closing_time)
  const [pauseMessage, setPauseMessage] = useState(settings.pause_message || '')
  const [transferAlias, setTransferAlias] = useState(settings.transfer_alias || '')
  const [transferCbu, setTransferCbu] = useState(settings.transfer_cbu || '')

  const businessStatus = checkBusinessStatus(settings)

  // Que hay pendiente de guardar. Es global a los tabs: handleSave manda los
  // campos de Horarios y de Pausa juntos, asi que el aviso no puede ser por tab.
  const sameDays = (a: number[], b: number[]) =>
    [...a].sort((x, y) => x - y).join(',') === [...b].sort((x, y) => x - y).join(',')

  const hasChanges =
    !sameDays(operatingDays, settings.operating_days) ||
    openingTime !== settings.opening_time ||
    closingTime !== settings.closing_time ||
    pauseMessage !== (settings.pause_message || '') ||
    transferAlias !== (settings.transfer_alias || '') ||
    transferCbu !== (settings.transfer_cbu || '')

  const handleToggleDay = (day: number) => {
    setOperatingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  const handleSave = async () => {
    if (operatingDays.length === 0) {
      toast.error('Seleccioná al menos un día de operación')
      return
    }

    setIsSaving(true)
    const result = await updateBusinessSettings({
      operating_days: operatingDays,
      opening_time: openingTime,
      closing_time: closingTime,
      pause_message: pauseMessage || undefined,
      transfer_alias: transferAlias,
      transfer_cbu: transferCbu,
    })
    setIsSaving(false)

    if (result.error) {
      toast.error(result.error)
    } else if (result.data) {
      setSettings(result.data)
      toast.success('Configuración guardada')
    }
  }

  const handleTogglePause = async () => {
    setIsTogglingPause(true)
    const result = await toggleBusinessPause(!settings.is_paused, pauseMessage || undefined)
    setIsTogglingPause(false)

    if (result.error) {
      toast.error(result.error)
    } else if (result.data) {
      setSettings(result.data)
      toast.success(result.data.is_paused ? 'Pedidos pausados' : 'Pedidos reanudados')
    }
  }

  const showSave = tab === 'horarios' || tab === 'pausa' || tab === 'cobros'

  return (
    <AdminLayout
      title="Configuración"
      description="Horarios y preferencias del negocio"
      contentWidth="max-w-4xl"
    >
      {/* Tabs + estado. El chip va acá y no adentro del panel para que el
          abierto/cerrado se vea desde cualquier tab sin ocupar una seccion. */}
      <div className="flex items-center gap-6 mb-6 overflow-x-auto no-scrollbar">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-current={tab === key ? 'page' : undefined}
            className={cn(
              'pb-2 -mb-px text-sm whitespace-nowrap border-b-2 transition-colors',
              tab === key
                ? 'border-[var(--admin-accent)] text-[var(--admin-text)] font-semibold'
                : 'border-transparent text-[var(--admin-text-muted)] font-medium hover:text-[var(--admin-text)]'
            )}
          >
            {label}
          </button>
        ))}

        <span className="ml-auto flex items-center gap-2 shrink-0 text-sm text-[var(--admin-text-muted)]">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              businessStatus.isOpen ? 'bg-green-500' : 'bg-red-500'
            )}
          />
          {businessStatus.message}
        </span>
      </div>

      <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl shadow-[var(--shadow-card)]">
        <div className="p-8 md:p-10">
          {tab === 'horarios' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-semibold text-[var(--admin-text)]">Horarios de atención</h2>

              <div>
                <span className={LABEL}>Días de operación</span>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleToggleDay(value)}
                      aria-pressed={operatingDays.includes(value)}
                      className={cn(
                        'px-5 h-11 rounded-lg text-[15px] font-medium border transition-colors',
                        operatingDays.includes(value)
                          ? 'bg-[var(--admin-accent)] border-[var(--admin-accent)] text-black'
                          : 'bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-[var(--admin-text-muted)] mt-2">
                  {formatOperatingDays(operatingDays)}
                </p>
              </div>

              <div className="flex flex-wrap gap-5">
                <div>
                  <label htmlFor="apertura" className={LABEL}>Hora de apertura</label>
                  <Input
                    id="apertura"
                    type="time"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    className={cn(FIELD, TIME_W)}
                  />
                </div>
                <div>
                  <label htmlFor="cierre" className={LABEL}>Hora de cierre</label>
                  <Input
                    id="cierre"
                    type="time"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    className={cn(FIELD, TIME_W)}
                  />
                </div>
              </div>

              <p className="text-sm text-[var(--admin-text-muted)]">
                Abre {formatBusinessHours(openingTime, closingTime)}.
              </p>
            </div>
          )}

          {tab === 'pausa' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-semibold text-[var(--admin-text)]">Pausa de pedidos</h2>

              <div className="flex items-center gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--admin-text)]">
                    {settings.is_paused ? 'Pedidos pausados' : 'Recibiendo pedidos'}
                  </p>
                  <p className="text-sm text-[var(--admin-text-muted)] mt-0.5">
                    {settings.is_paused
                      ? 'Los clientes ven el mensaje de abajo en vez del carrito.'
                      : 'Pausá para dejar de recibir pedidos sin cambiar el horario.'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleTogglePause}
                  disabled={isTogglingPause}
                  className={cn(
                    'ml-auto shrink-0 h-11 text-[15px]',
                    settings.is_paused
                      ? 'border-green-600/50 text-green-700 dark:text-green-400 hover:bg-green-500/10'
                      : 'border-red-500/50 text-red-700 dark:text-red-400 hover:bg-red-500/10'
                  )}
                >
                  {isTogglingPause && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {settings.is_paused ? 'Reanudar pedidos' : 'Pausar pedidos'}
                </Button>
              </div>

              <div>
                <label htmlFor="mensaje-pausa" className={LABEL}>
                  Mensaje mientras están pausados
                </label>
                <Textarea
                  id="mensaje-pausa"
                  value={pauseMessage}
                  onChange={(e) => setPauseMessage(e.target.value)}
                  placeholder="Estamos cerrados temporalmente. Volvemos pronto!"
                  className={cn(FIELD, 'h-auto min-h-[128px] py-3.5')}
                />
              </div>
            </div>
          )}

          {tab === 'apariencia' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-semibold text-[var(--admin-text)]">Apariencia</h2>

              <div className="flex items-center gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--admin-text)]">
                    {theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}
                  </p>
                  <p className="text-sm text-[var(--admin-text-muted)] mt-0.5">
                    Se aplica al instante, no hace falta guardar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={cn(
                    'ml-auto shrink-0 relative inline-flex h-8 w-[3.75rem] items-center rounded-full transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]',
                    theme === 'dark' ? 'bg-[var(--admin-accent)]' : 'bg-[var(--admin-border)]'
                  )}
                  aria-label="Cambiar tema"
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform',
                      theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
                    )}
                  >
                    {theme === 'dark' ? (
                      <Moon className="h-3.5 w-3.5 text-[#1a1d24]" />
                    ) : (
                      <Sun className="h-3.5 w-3.5 text-amber-700" />
                    )}
                  </span>
                </button>
              </div>
            </div>
          )}

          {tab === 'cobros' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--admin-text)]">Cobros</h2>
                <p className="mt-1.5 text-sm text-[var(--admin-text-muted)]">
                  Lo que ve el cliente cuando elige transferencia en el checkout. Si lo dejás
                  vacío, no se le muestra nada y los datos se los tenés que pasar a mano.
                </p>
              </div>

              <div>
                <label htmlFor="transferAlias" className={LABEL}>Alias</label>
                <Input
                  id="transferAlias"
                  value={transferAlias}
                  onChange={(e) => setTransferAlias(e.target.value)}
                  placeholder="que.copado.mp"
                  className={cn(FIELD, 'max-w-md')}
                />
              </div>

              <div>
                <label htmlFor="transferCbu" className={LABEL}>CBU o CVU</label>
                <Input
                  id="transferCbu"
                  value={transferCbu}
                  onChange={(e) => setTransferCbu(e.target.value.replace(/[^0-9]/g, ''))}
                  inputMode="numeric"
                  placeholder="0000003100010000000001"
                  maxLength={22}
                  className={cn(FIELD, 'max-w-md font-mono tracking-wide')}
                />
                <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
                  22 dígitos. Se guarda sin espacios ni guiones.
                </p>
              </div>
            </div>
          )}

          {tab === 'datos' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-semibold text-[var(--admin-text)]">Datos</h2>
              <DangerZone />
            </div>
          )}
        </div>

        {showSave && (
          <div className="flex items-center gap-4 border-t border-[var(--admin-border)] px-8 md:px-10 py-6">
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="h-12 px-7 rounded-lg bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold disabled:opacity-100 disabled:bg-[var(--admin-surface-2)] disabled:text-[var(--admin-text-muted)]"
            >
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
            {hasChanges && (
              <p className="text-sm text-[var(--admin-text-muted)]" aria-live="polite">
                Tenés cambios sin guardar.
              </p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
