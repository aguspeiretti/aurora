import {
  format,
  formatRelative,
  parseISO,
  isToday,
  isTomorrow,
  isYesterday,
  differenceInMinutes,
  differenceInDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addMinutes,
  isBefore,
  isAfter,
} from 'date-fns'
import { es } from 'date-fns/locale'

export function formatDate(date, fmt = 'dd/MM/yyyy') {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: es })
}

export function formatTime(date, fmt = 'HH:mm') {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: es })
}

export function formatDateTime(date) {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return `Hoy ${format(d, 'HH:mm')}`
  if (isTomorrow(d)) return `Mañana ${format(d, 'HH:mm')}`
  if (isYesterday(d)) return `Ayer ${format(d, 'HH:mm')}`
  return format(d, "dd/MM/yyyy HH:mm", { locale: es })
}

export function formatRelativeDate(date) {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatRelative(d, new Date(), { locale: es })
}

export function formatDuration(minutes) {
  if (!minutes) return '—'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function formatBirthday(date) {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "d 'de' MMMM", { locale: es })
}

export function getDayLabel(date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return 'Hoy'
  if (isTomorrow(d)) return 'Mañana'
  if (isYesterday(d)) return 'Ayer'
  return format(d, "EEEE d 'de' MMMM", { locale: es })
}

export {
  parseISO,
  isToday,
  isTomorrow,
  isYesterday,
  differenceInMinutes,
  differenceInDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addMinutes,
  isBefore,
  isAfter,
  format,
}
