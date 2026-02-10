import type { BusinessSettings } from '@/lib/types/database'

export interface BusinessStatus {
  isOpen: boolean
  isPaused: boolean
  message: string
  nextOpenTime?: string
}

/**
 * Nombres de los días de la semana en español
 */
const DAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]

/**
 * Parsea una hora en formato "HH:MM" a minutos desde medianoche
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Formatea minutos desde medianoche a "HH:MM"
 */
function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Verifica si el negocio está abierto según la configuración
 * Maneja horarios que cruzan la medianoche (ej: 21:00 - 01:00)
 */
export function checkBusinessStatus(
  settings: BusinessSettings,
  now: Date = new Date()
): BusinessStatus {
  // Si está pausado manualmente, retornar cerrado
  if (settings.is_paused) {
    return {
      isOpen: false,
      isPaused: true,
      message: settings.pause_message || 'Estamos cerrados temporalmente',
    }
  }

  const currentDay = now.getDay() // 0 = Domingo, 1 = Lunes, etc.
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const openingMinutes = parseTimeToMinutes(settings.opening_time)
  const closingMinutes = parseTimeToMinutes(settings.closing_time)

  // Verificar si hoy es día operativo
  const isOperatingDay = settings.operating_days.includes(currentDay)

  // Caso especial: horario que cruza medianoche (ej: 21:00 - 01:00)
  const crossesMidnight = closingMinutes < openingMinutes

  let isOpen = false

  if (crossesMidnight) {
    // El horario cruza medianoche
    // Estamos abiertos si:
    // - Es después de apertura (mismo día) O
    // - Es antes de cierre (día siguiente, pero verificamos el día anterior)

    if (currentMinutes >= openingMinutes) {
      // Después de apertura, verificar si hoy es día operativo
      isOpen = isOperatingDay
    } else if (currentMinutes < closingMinutes) {
      // Antes de cierre (técnicamente el día anterior abrió)
      const yesterdayDay = (currentDay + 6) % 7
      isOpen = settings.operating_days.includes(yesterdayDay)
    }
  } else {
    // Horario normal (no cruza medianoche)
    isOpen = isOperatingDay &&
             currentMinutes >= openingMinutes &&
             currentMinutes < closingMinutes
  }

  if (isOpen) {
    return {
      isOpen: true,
      isPaused: false,
      message: `Abierto hasta las ${settings.closing_time}`,
    }
  }

  // Calcular próxima apertura
  const nextOpenInfo = getNextOpenTime(settings, now)

  return {
    isOpen: false,
    isPaused: false,
    message: nextOpenInfo.message,
    nextOpenTime: nextOpenInfo.time,
  }
}

/**
 * Calcula cuándo abre el negocio próximamente
 */
function getNextOpenTime(
  settings: BusinessSettings,
  now: Date
): { time: string; message: string } {
  const currentDay = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const openingMinutes = parseTimeToMinutes(settings.opening_time)

  // Verificar si abre más tarde hoy
  if (
    settings.operating_days.includes(currentDay) &&
    currentMinutes < openingMinutes
  ) {
    return {
      time: settings.opening_time,
      message: `Abrimos hoy a las ${settings.opening_time}`,
    }
  }

  // Buscar el próximo día operativo
  for (let i = 1; i <= 7; i++) {
    const nextDay = (currentDay + i) % 7
    if (settings.operating_days.includes(nextDay)) {
      const dayName = DAY_NAMES[nextDay]
      if (i === 1) {
        return {
          time: settings.opening_time,
          message: `Abrimos mañana a las ${settings.opening_time}`,
        }
      }
      return {
        time: settings.opening_time,
        message: `Abrimos el ${dayName} a las ${settings.opening_time}`,
      }
    }
  }

  return {
    time: settings.opening_time,
    message: 'Horario no disponible',
  }
}

/**
 * Formatea los días operativos para mostrar
 */
export function formatOperatingDays(days: number[]): string {
  if (days.length === 7) {
    return 'Todos los días'
  }

  if (days.length === 0) {
    return 'Cerrado'
  }

  // Verificar si son días consecutivos
  const sortedDays = [...days].sort((a, b) => a - b)

  // Caso especial: Lunes a Viernes
  if (
    sortedDays.length === 5 &&
    sortedDays.every((d, i) => d === i + 1)
  ) {
    return 'Lunes a Viernes'
  }

  // Caso especial: Lunes a Sábado
  if (
    sortedDays.length === 6 &&
    sortedDays.every((d, i) => d === i + 1 || (i === 5 && d === 6))
  ) {
    return 'Lunes a Sábado'
  }

  // Listar días individuales
  return sortedDays.map((d) => DAY_NAMES[d]).join(', ')
}

/**
 * Formatea el horario para mostrar
 */
export function formatBusinessHours(
  openingTime: string,
  closingTime: string
): string {
  return `${openingTime} - ${closingTime}`
}
