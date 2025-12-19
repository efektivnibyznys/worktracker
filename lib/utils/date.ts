import { format, startOfWeek, startOfMonth } from 'date-fns'
import { cs } from 'date-fns/locale'

/**
 * Format date to Czech locale format (dd.mm.yyyy)
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'dd.MM.yyyy', { locale: cs })
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayDate(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/**
 * Get the start of current week (Monday)
 */
export function getWeekStart(): string {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }) // 1 = Monday
  return format(weekStart, 'yyyy-MM-dd')
}

/**
 * Get the start of current month
 */
export function getMonthStart(): string {
  const monthStart = startOfMonth(new Date())
  return format(monthStart, 'yyyy-MM-dd')
}
