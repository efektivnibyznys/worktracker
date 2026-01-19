import {
  format,
  parseISO,
  startOfWeek,
  startOfMonth,
  differenceInDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  endOfWeek,
  endOfMonth,
  isSameDay,
  isSameWeek,
  isSameMonth
} from 'date-fns'
import { cs } from 'date-fns/locale'
import { Database } from '@/types/database'

type Entry = Database['public']['Tables']['entries']['Row']

export interface TimelineDataPoint {
  date: string          // Formátované datum pro zobrazení
  dateKey: string       // ISO datum pro klíč
  hours: number         // Hodiny odpracované
  amount: number        // Výnosy v Kč
  count: number         // Počet záznamů
}

export type DistributionDataPoint = {
  name: string          // Název klienta nebo fáze
  value: number         // Hodiny (pro size)
  amount: number        // Výnosy v Kč
  count: number         // Počet záznamů
  percentage: number    // Procento z celku
  color: string         // Barva pro graf
} & Record<string, any>  // Index signature pro Recharts kompatibilitu

export type TimelineGrouping = 'day' | 'week' | 'month'

/**
 * Určí vhodné seskupení pro timeline graf podle rozsahu dat
 */
export function determineTimelineGrouping(dateFrom?: string, dateTo?: string): TimelineGrouping {
  if (!dateFrom || !dateTo) {
    // Pokud nejsou nastaveny filtry, použij týdenní pohled
    return 'week'
  }

  const from = parseISO(dateFrom)
  const to = parseISO(dateTo)
  const daysDiff = differenceInDays(to, from)

  if (daysDiff <= 7) return 'day'
  if (daysDiff <= 60) return 'week'
  return 'month'
}

/**
 * Příprava dat pro Timeline graf (hodiny a výnosy v čase)
 * @param entries Pole time entries
 * @param groupBy Seskupení: 'day' | 'week' | 'month'
 * @param dateFrom Počáteční datum (optional)
 * @param dateTo Koncové datum (optional)
 * @returns Pole datových bodů pro timeline graf
 */
export function prepareTimelineData(
  entries: Entry[],
  groupBy: TimelineGrouping = 'day',
  dateFrom?: string,
  dateTo?: string
): TimelineDataPoint[] {
  if (entries.length === 0) return []

  // Určíme časový rozsah
  const dates = entries.map(e => parseISO(e.date))
  const minDate = dateFrom ? parseISO(dateFrom) : new Date(Math.min(...dates.map(d => d.getTime())))
  const maxDate = dateTo ? parseISO(dateTo) : new Date(Math.max(...dates.map(d => d.getTime())))

  // Vytvoříme interval podle groupBy
  let intervals: Date[]

  if (groupBy === 'day') {
    intervals = eachDayOfInterval({ start: minDate, end: maxDate })
  } else if (groupBy === 'week') {
    intervals = eachWeekOfInterval(
      { start: minDate, end: maxDate },
      { weekStartsOn: 1 } // Pondělí
    )
  } else {
    intervals = eachMonthOfInterval({ start: minDate, end: maxDate })
  }

  // Agregujeme data pro každý interval
  const dataPoints: TimelineDataPoint[] = intervals.map(intervalDate => {
    // Filtrujeme entries pro tento interval
    const entriesInInterval = entries.filter(entry => {
      const entryDate = parseISO(entry.date)

      if (groupBy === 'day') {
        return isSameDay(entryDate, intervalDate)
      } else if (groupBy === 'week') {
        return isSameWeek(entryDate, intervalDate, { weekStartsOn: 1 })
      } else {
        return isSameMonth(entryDate, intervalDate)
      }
    })

    // Počítáme statistiky
    const totalMinutes = entriesInInterval.reduce((sum, e) => sum + e.duration_minutes, 0)
    const hours = totalMinutes / 60
    const amount = entriesInInterval.reduce((sum, e) => {
      const entryHours = e.duration_minutes / 60
      return sum + (entryHours * e.hourly_rate)
    }, 0)

    // Formátování data podle groupBy
    let dateLabel: string
    let dateKey: string

    if (groupBy === 'day') {
      dateLabel = format(intervalDate, 'd.M.', { locale: cs })
      dateKey = format(intervalDate, 'yyyy-MM-dd')
    } else if (groupBy === 'week') {
      const weekEnd = endOfWeek(intervalDate, { weekStartsOn: 1 })
      dateLabel = `${format(intervalDate, 'd.M.')} - ${format(weekEnd, 'd.M.', { locale: cs })}`
      dateKey = format(intervalDate, 'yyyy-MM-dd')
    } else {
      dateLabel = format(intervalDate, 'LLLL yyyy', { locale: cs })
      dateKey = format(intervalDate, 'yyyy-MM')
    }

    return {
      date: dateLabel,
      dateKey,
      hours: Math.round(hours * 100) / 100, // Zaokrouhlíme na 2 desetinná místa
      amount: Math.round(amount),
      count: entriesInInterval.length
    }
  })

  return dataPoints
}

/**
 * Paleta barev pro Distribution graf
 */
const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
  '#a855f7', // purple-500
]

/**
 * Příprava dat pro Distribution graf (klienti nebo fáze)
 * @param entries Pole time entries
 * @param groupBy 'client' | 'phase'
 * @param topN Kolik top položek zobrazit (ostatní seskupit do "Ostatní")
 * @returns Pole datových bodů pro doughnut chart
 */
export function prepareDistributionData(
  entries: Entry[],
  groupBy: 'client' | 'phase',
  topN: number = 8
): DistributionDataPoint[] {
  if (entries.length === 0) return []

  // Seskupíme entries podle client_id nebo phase_id
  const grouped = new Map<string, { name: string; entries: Entry[] }>()

  entries.forEach(entry => {
    const key = groupBy === 'client' ? entry.client_id : (entry.phase_id || 'no-phase')

    if (!grouped.has(key)) {
      grouped.set(key, {
        name: key, // Později nahradíme skutečným jménem
        entries: []
      })
    }

    grouped.get(key)!.entries.push(entry)
  })

  // Počítáme statistiky pro každou skupinu
  const items = Array.from(grouped.entries()).map(([key, data]) => {
    const totalMinutes = data.entries.reduce((sum, e) => sum + e.duration_minutes, 0)
    const hours = totalMinutes / 60
    const amount = data.entries.reduce((sum, e) => {
      const entryHours = e.duration_minutes / 60
      return sum + (entryHours * e.hourly_rate)
    }, 0)

    return {
      id: key,
      name: data.name,
      value: Math.round(hours * 100) / 100,
      amount: Math.round(amount),
      count: data.entries.length,
      percentage: 0 // Dopočítáme později
    }
  })

  // Seřadíme podle hodin (value) sestupně
  items.sort((a, b) => b.value - a.value)

  // Vezmeme top N a ostatní dáme do "Ostatní"
  let finalItems = items.slice(0, topN)
  const others = items.slice(topN)

  if (others.length > 0) {
    const othersTotal = others.reduce((sum, item) => ({
      value: sum.value + item.value,
      amount: sum.amount + item.amount,
      count: sum.count + item.count
    }), { value: 0, amount: 0, count: 0 })

    finalItems.push({
      id: 'others',
      name: 'Ostatní',
      ...othersTotal,
      percentage: 0
    })
  }

  // Dopočítáme procenta a přiřadíme barvy
  const totalHours = finalItems.reduce((sum, item) => sum + item.value, 0)
  const result = finalItems.map((item, index) => ({
    ...item,
    percentage: totalHours > 0 ? Math.round((item.value / totalHours) * 100) : 0,
    color: index < CHART_COLORS.length ? CHART_COLORS[index] : '#94a3b8' // gray-400 fallback
  })) as DistributionDataPoint[]

  return result
}

/**
 * Obohacení distribution dat o skutečná jména klientů/fází
 * @param data Distribution data
 * @param nameMap Mapa ID -> jméno
 * @returns Obohacená data
 */
export function enrichDistributionDataWithNames(
  data: DistributionDataPoint[],
  nameMap: Map<string, string>
): DistributionDataPoint[] {
  return data.map(item => {
    if (item.name === 'Ostatní') return item

    const actualName = nameMap.get(item.name) || item.name
    return {
      ...item,
      name: actualName
    }
  })
}
