'use client'

import { useState } from 'react'
import { Clock, Calendar, Pause, Play, Loader2, Save, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { AdminLayout } from '@/components/admin/layout'
import { updateBusinessSettings, toggleBusinessPause } from '@/app/actions/business-settings'
import { useThemeStore } from '@/lib/store/theme-store'
import { checkBusinessStatus, formatOperatingDays, formatBusinessHours } from '@/lib/services/business-hours'
import { toast } from 'sonner'
import { DangerZone } from '@/components/admin/settings/danger-zone'
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

export function BusinessSettingsForm({ initialSettings }: BusinessSettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [isTogglingPause, setIsTogglingPause] = useState(false)
  const { theme, setTheme } = useThemeStore()

  // Form state
  const [operatingDays, setOperatingDays] = useState<number[]>(settings.operating_days)
  const [openingTime, setOpeningTime] = useState(settings.opening_time)
  const [closingTime, setClosingTime] = useState(settings.closing_time)
  const [pauseMessage, setPauseMessage] = useState(settings.pause_message || '')

  const businessStatus = checkBusinessStatus(settings)

  const handleToggleDay = (day: number) => {
    setOperatingDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort()
    )
  }

  const handleSave = async () => {
    if (operatingDays.length === 0) {
      toast.error('Selecciona al menos un día de operación')
      return
    }

    setIsSaving(true)
    const result = await updateBusinessSettings({
      operating_days: operatingDays,
      opening_time: openingTime,
      closing_time: closingTime,
      pause_message: pauseMessage || undefined,
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

  return (
    <AdminLayout title="Configuración" description="Horarios y preferencias del negocio">
      <div className="max-w-2xl space-y-6">
        {/* Status Card */}
        <div
          className={`rounded-xl p-6 border ${
            businessStatus.isOpen
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  businessStatus.isOpen ? 'bg-green-500' : 'bg-red-500'
                } animate-pulse`}
              />
              <div>
                <p className={`font-semibold ${businessStatus.isOpen ? 'text-green-400' : 'text-red-400'}`}>
                  {businessStatus.isOpen ? 'Abierto' : 'Cerrado'}
                </p>
                <p className="text-sm text-[var(--admin-text-muted)]">{businessStatus.message}</p>
              </div>
            </div>

            <Button
              variant={settings.is_paused ? 'default' : 'outline'}
              onClick={handleTogglePause}
              disabled={isTogglingPause}
              className={
                settings.is_paused
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'border-red-500/50 text-red-400 hover:bg-red-500/10'
              }
            >
              {isTogglingPause ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : settings.is_paused ? (
                <Play className="h-4 w-4 mr-2" />
              ) : (
                <Pause className="h-4 w-4 mr-2" />
              )}
              {settings.is_paused ? 'Reanudar Pedidos' : 'Pausar Pedidos'}
            </Button>
          </div>
        </div>

        {/* Business Hours */}
        <div
          className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-6 space-y-6 shadow-[var(--shadow-card)]"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[var(--admin-accent-text)]" />
            <h2 className="text-lg font-semibold text-[var(--admin-text)]">Horarios de Atención</h2>
          </div>

          {/* Days */}
          <div className="space-y-3">
            <Label className="text-[var(--admin-text-muted)]">Días de operación</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleToggleDay(value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    operatingDays.includes(value)
                      ? 'bg-[var(--admin-accent)] text-black'
                      : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)] hover:bg-[var(--admin-border)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-sm text-[var(--admin-text-muted)]">
              {formatOperatingDays(operatingDays)}
            </p>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[var(--admin-text-muted)]">Hora de apertura</Label>
              <Input
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                className="bg-[var(--admin-surface-2)] border-[var(--admin-border)] text-[var(--admin-text)] h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--admin-text-muted)]">Hora de cierre</Label>
              <Input
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                className="bg-[var(--admin-surface-2)] border-[var(--admin-border)] text-[var(--admin-text)] h-10"
              />
            </div>
          </div>
          <p className="text-sm text-[var(--admin-text-muted)]">
            Horario: {formatBusinessHours(openingTime, closingTime)}
          </p>
        </div>

        {/* Pause Message */}
        <div
          className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-6 space-y-4 shadow-[var(--shadow-card)]"
        >
          <div className="flex items-center gap-2">
            <Pause className="h-5 w-5 text-[var(--admin-accent-text)]" />
            <h2 className="text-lg font-semibold text-[var(--admin-text)]">Mensaje de Pausa</h2>
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--admin-text-muted)]">
              Mensaje cuando los pedidos están pausados
            </Label>
            <Textarea
              value={pauseMessage}
              onChange={(e) => setPauseMessage(e.target.value)}
              placeholder="Estamos cerrados temporalmente. Volvemos pronto!"
              className="bg-[var(--admin-surface-2)] border-[var(--admin-border)] text-[var(--admin-text)] min-h-[100px] placeholder:text-[var(--admin-text-muted)]"
            />
          </div>
        </div>

        {/* Apariencia */}
        <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-6 space-y-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2">
            {theme === 'dark' ? (
              <Moon className="h-5 w-5 text-[var(--admin-accent-text)]" />
            ) : (
              <Sun className="h-5 w-5 text-[var(--admin-accent-text)]" />
            )}
            <h2 className="text-lg font-semibold text-[var(--admin-text)]">Apariencia</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--admin-text)]">
                {theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}
              </p>
              <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                {theme === 'dark'
                  ? 'Interfaz oscura, ideal para ambientes con poca luz'
                  : 'Interfaz clara, ideal para ambientes bien iluminados'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`relative inline-flex h-8 w-[3.75rem] items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] ${
                theme === 'dark'
                  ? 'bg-[var(--admin-accent)]'
                  : 'bg-[var(--admin-border)]'
              }`}
              aria-label="Cambiar tema"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
                  theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
                }`}
              >
                {theme === 'dark' ? (
                  <Moon className="h-3.5 w-3.5 text-[#1a1d24]" />
                ) : (
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Configuración
              </>
            )}
          </Button>
        </div>

        <DangerZone />
      </div>
    </AdminLayout>
  )
}
