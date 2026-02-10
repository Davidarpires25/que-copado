'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Calendar, Pause, Play, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { AdminLayout } from '@/components/admin/layout'
import { updateBusinessSettings, toggleBusinessPause } from '@/app/actions/business-settings'
import { checkBusinessStatus, formatOperatingDays, formatBusinessHours } from '@/lib/services/business-hours'
import { toast } from 'sonner'
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
                <p className="text-sm text-[#8b9ab0]">{businessStatus.message}</p>
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
        </motion.div>

        {/* Business Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1a1d24] border border-[#2a2f3a] rounded-xl p-6 space-y-6"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#FEC501]" />
            <h2 className="text-lg font-semibold text-[#f0f2f5]">Horarios de Atención</h2>
          </div>

          {/* Days */}
          <div className="space-y-3">
            <Label className="text-[#c4cdd9]">Días de operación</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleToggleDay(value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    operatingDays.includes(value)
                      ? 'bg-[#FEC501] text-black'
                      : 'bg-[#252a35] text-[#8b9ab0] hover:bg-[#2a2f3a]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-sm text-[#8b9ab0]">
              {formatOperatingDays(operatingDays)}
            </p>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#c4cdd9]">Hora de apertura</Label>
              <Input
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                className="bg-[#252a35] border-[#2a2f3a] text-[#f0f2f5] h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#c4cdd9]">Hora de cierre</Label>
              <Input
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                className="bg-[#252a35] border-[#2a2f3a] text-[#f0f2f5] h-11"
              />
            </div>
          </div>
          <p className="text-sm text-[#8b9ab0]">
            Horario: {formatBusinessHours(openingTime, closingTime)}
          </p>
        </motion.div>

        {/* Pause Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1a1d24] border border-[#2a2f3a] rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Pause className="h-5 w-5 text-[#FEC501]" />
            <h2 className="text-lg font-semibold text-[#f0f2f5]">Mensaje de Pausa</h2>
          </div>

          <div className="space-y-2">
            <Label className="text-[#c4cdd9]">
              Mensaje cuando los pedidos están pausados
            </Label>
            <Textarea
              value={pauseMessage}
              onChange={(e) => setPauseMessage(e.target.value)}
              placeholder="Estamos cerrados temporalmente. Volvemos pronto!"
              className="bg-[#252a35] border-[#2a2f3a] text-[#f0f2f5] min-h-[100px] placeholder:text-[#8b9ab0] placeholder:italic"
            />
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 bg-[#FEC501] hover:bg-[#E5B001] text-black font-semibold"
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
        </motion.div>
      </div>
    </AdminLayout>
  )
}
