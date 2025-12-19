import { Database } from '@/types/database'

type Entry = Database['public']['Tables']['entries']['Row']

export interface Stats {
  hours: number
  minutes: number
  totalMinutes: number
  amount: number
  count: number
}

/**
 * Calculate statistics from entries
 * @param entries Array of time entries
 * @returns Statistics object with hours, minutes, amount, count
 */
export function calculateStats(entries: Entry[]): Stats {
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration_minutes, 0)
  const amount = entries.reduce((sum, entry) => {
    const hours = entry.duration_minutes / 60
    return sum + (hours * entry.hourly_rate)
  }, 0)

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return {
    hours,
    minutes,
    totalMinutes,
    amount,
    count: entries.length,
  }
}

/**
 * Determine hourly rate with priority: entry > phase > client > default
 */
export function determineHourlyRate(
  entryRate: number | null,
  phaseRate: number | null,
  clientRate: number | null,
  defaultRate: number
): number {
  return entryRate ?? phaseRate ?? clientRate ?? defaultRate
}
