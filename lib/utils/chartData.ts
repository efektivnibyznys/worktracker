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

/**
 * Barvy pro billing status
 */
const BILLING_STATUS_COLORS = {
  paid: '#10b981',     // green-500
  billed: '#f59e0b',   // amber-500
  unbilled: '#ef4444', // red-500
}

export interface BillingStatusDataPoint {
  status: 'paid' | 'billed' | 'unbilled'
  label: string
  amount: number
  hours: number
  count: number
  color: string
}

/**
 * Příprava dat pro graf stavu fakturace
 * @param entries Pole time entries
 * @returns Pole datových bodů pro billing status chart
 */
export function prepareBillingStatusData(
  entries: Entry[]
): BillingStatusDataPoint[] {
  // Seskupíme podle billing_status
  const grouped = new Map<string, Entry[]>()

  entries.forEach(entry => {
    const status = entry.billing_status || 'unbilled'
    if (!grouped.has(status)) {
      grouped.set(status, [])
    }
    grouped.get(status)!.push(entry)
  })

  // Připravíme data pro každý status
  const statuses: Array<{ status: 'paid' | 'billed' | 'unbilled'; label: string }> = [
    { status: 'paid', label: 'Zaplaceno' },
    { status: 'billed', label: 'Fakturováno' },
    { status: 'unbilled', label: 'Nefakturováno' },
  ]

  return statuses.map(({ status, label }) => {
    const statusEntries = grouped.get(status) || []
    const totalMinutes = statusEntries.reduce((sum, e) => sum + e.duration_minutes, 0)
    const hours = totalMinutes / 60
    const amount = statusEntries.reduce((sum, e) => {
      const entryHours = e.duration_minutes / 60
      return sum + (entryHours * e.hourly_rate)
    }, 0)

    return {
      status,
      label,
      amount: Math.round(amount),
      hours: Math.round(hours * 100) / 100,
      count: statusEntries.length,
      color: BILLING_STATUS_COLORS[status]
    }
  })
}

export interface MonthlyHoursDataPoint {
  month: string       // Zkrácený název měsíce (Led, Úno, ...)
  monthKey: string    // ISO formát YYYY-MM
  hours: number
  count: number
}

/**
 * Příprava dat pro měsíční přehled hodin (12 měsíců)
 * @param entries Pole time entries
 * @param year Rok pro zobrazení
 * @returns Pole datových bodů pro monthly hours chart
 */
export function prepareMonthlyHoursData(
  entries: Entry[],
  year: number
): MonthlyHoursDataPoint[] {
  // Vytvoříme 12 měsíců pro daný rok
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(year, i, 1)
    return {
      month: format(date, 'LLL', { locale: cs }),
      monthKey: format(date, 'yyyy-MM'),
      date
    }
  })

  return months.map(({ month, monthKey, date }) => {
    // Filtrujeme entries pro tento měsíc
    const monthEntries = entries.filter(entry => {
      const entryDate = parseISO(entry.date)
      return isSameMonth(entryDate, date)
    })

    const totalMinutes = monthEntries.reduce((sum, e) => sum + e.duration_minutes, 0)
    const hours = totalMinutes / 60

    return {
      month,
      monthKey,
      hours: Math.round(hours * 100) / 100,
      count: monthEntries.length
    }
  })
}

export interface TopClientDataPoint {
  id: string
  name: string
  hours: number
  amount: number
  count: number
  color: string
}

/**
 * Příprava dat pro top klienty podle výnosů
 * @param entries Pole time entries
 * @param clients Pole klientů (pro jména)
 * @param topN Kolik top klientů zobrazit
 * @returns Pole datových bodů pro top clients chart
 */
export function prepareTopClientsData(
  entries: Entry[],
  clients: { id: string; name: string }[],
  topN: number = 8
): TopClientDataPoint[] {
  if (entries.length === 0) return []

  // Vytvoříme mapu pro jména klientů
  const clientNameMap = new Map<string, string>()
  clients.forEach(client => clientNameMap.set(client.id, client.name))

  // Seskupíme podle client_id
  const grouped = new Map<string, Entry[]>()

  entries.forEach(entry => {
    if (!grouped.has(entry.client_id)) {
      grouped.set(entry.client_id, [])
    }
    grouped.get(entry.client_id)!.push(entry)
  })

  // Počítáme statistiky pro každého klienta
  const clientStats = Array.from(grouped.entries()).map(([clientId, clientEntries]) => {
    const totalMinutes = clientEntries.reduce((sum, e) => sum + e.duration_minutes, 0)
    const hours = totalMinutes / 60
    const amount = clientEntries.reduce((sum, e) => {
      const entryHours = e.duration_minutes / 60
      return sum + (entryHours * e.hourly_rate)
    }, 0)

    return {
      id: clientId,
      name: clientNameMap.get(clientId) || 'Neznámý klient',
      hours: Math.round(hours * 100) / 100,
      amount: Math.round(amount),
      count: clientEntries.length
    }
  })

  // Seřadíme podle výnosů sestupně a vezmeme top N
  clientStats.sort((a, b) => b.amount - a.amount)
  const topClients = clientStats.slice(0, topN)

  // Přiřadíme barvy
  return topClients.map((client, index) => ({
    ...client,
    color: index < CHART_COLORS.length ? CHART_COLORS[index] : '#94a3b8'
  }))
}

export interface MonthlyRevenueDataPoint {
  month: string
  monthKey: string
  [clientId: string]: number | string  // Dynamické klíče pro jednotlivé klienty
}

/**
 * Příprava dat pro měsíční výnosy (stacked by clients)
 * @param entries Pole time entries
 * @param clients Pole klientů
 * @param year Rok pro zobrazení
 * @param topN Kolik top klientů zobrazit (ostatní seskupit)
 * @returns Pole datových bodů pro monthly revenue chart
 */
export function prepareMonthlyRevenueData(
  entries: Entry[],
  clients: { id: string; name: string }[],
  year: number,
  topN: number = 5
): {
  data: MonthlyRevenueDataPoint[]
  clientKeys: Array<{ id: string; name: string; color: string }>
} {
  // Nejprve zjistíme top klienty podle celkových výnosů
  const clientRevenues = new Map<string, number>()

  entries.forEach(entry => {
    const revenue = (entry.duration_minutes / 60) * entry.hourly_rate
    clientRevenues.set(
      entry.client_id,
      (clientRevenues.get(entry.client_id) || 0) + revenue
    )
  })

  // Seřadíme klienty podle výnosů
  const sortedClients = Array.from(clientRevenues.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)

  const topClientIds = new Set(sortedClients.slice(0, topN))

  // Vytvoříme mapu pro jména klientů
  const clientNameMap = new Map<string, string>()
  clients.forEach(client => clientNameMap.set(client.id, client.name))

  // Připravíme client keys s barvami
  const clientKeys: Array<{ id: string; name: string; color: string }> = []
  sortedClients.slice(0, topN).forEach((clientId, index) => {
    clientKeys.push({
      id: clientId,
      name: clientNameMap.get(clientId) || 'Neznámý klient',
      color: index < CHART_COLORS.length ? CHART_COLORS[index] : '#94a3b8'
    })
  })

  // Přidáme "Ostatní" pokud je více klientů než topN
  if (sortedClients.length > topN) {
    clientKeys.push({
      id: 'others',
      name: 'Ostatní',
      color: '#94a3b8'
    })
  }

  // Vytvoříme 12 měsíců
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(year, i, 1)
    return {
      month: format(date, 'LLL', { locale: cs }),
      monthKey: format(date, 'yyyy-MM'),
      date
    }
  })

  // Připravíme data pro každý měsíc
  const data: MonthlyRevenueDataPoint[] = months.map(({ month, monthKey, date }) => {
    const dataPoint: MonthlyRevenueDataPoint = {
      month,
      monthKey
    }

    // Inicializujeme všechny klienty na 0
    clientKeys.forEach(({ id }) => {
      dataPoint[id] = 0
    })

    // Filtrujeme entries pro tento měsíc
    const monthEntries = entries.filter(entry => {
      const entryDate = parseISO(entry.date)
      return isSameMonth(entryDate, date)
    })

    // Agregujeme výnosy pro každého klienta
    monthEntries.forEach(entry => {
      const revenue = Math.round((entry.duration_minutes / 60) * entry.hourly_rate)

      if (topClientIds.has(entry.client_id)) {
        // Top klient
        dataPoint[entry.client_id] = (dataPoint[entry.client_id] as number || 0) + revenue
      } else {
        // Ostatní
        dataPoint['others'] = (dataPoint['others'] as number || 0) + revenue
      }
    })

    return dataPoint
  })

  return { data, clientKeys }
}

export interface WeeklyActivityDataPoint {
  day: string         // Název dne (Po, Út, ...)
  dayIndex: number    // 0 = Po, 6 = Ne
  hours: number
  count: number
}

/**
 * Příprava dat pro denní aktivitu v týdnu
 * @param entries Pole time entries
 * @returns Pole datových bodů pro weekly activity chart
 */
export function prepareWeeklyActivityData(
  entries: Entry[]
): WeeklyActivityDataPoint[] {
  const dayNames = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

  // Seskupíme podle dne v týdnu
  const grouped = new Map<number, Entry[]>()

  entries.forEach(entry => {
    const entryDate = parseISO(entry.date)
    // getDay() vrací 0 = neděle, 1 = pondělí, ... 6 = sobota
    // Chceme 0 = pondělí, 6 = neděle
    const dayIndex = (entryDate.getDay() + 6) % 7

    if (!grouped.has(dayIndex)) {
      grouped.set(dayIndex, [])
    }
    grouped.get(dayIndex)!.push(entry)
  })

  // Vytvoříme data pro každý den
  return Array.from({ length: 7 }, (_, dayIndex) => {
    const dayEntries = grouped.get(dayIndex) || []
    const totalMinutes = dayEntries.reduce((sum, e) => sum + e.duration_minutes, 0)

    // Pokud máme data, spočítáme průměr (celkové hodiny / počet různých datumů)
    const uniqueDates = new Set(dayEntries.map(e => e.date))
    const avgMinutes = uniqueDates.size > 0 ? totalMinutes / uniqueDates.size : 0
    const avgHours = avgMinutes / 60

    return {
      day: dayNames[dayIndex],
      dayIndex,
      hours: Math.round(avgHours * 100) / 100,
      count: dayEntries.length
    }
  })
}

export interface AverageRateDataPoint {
  month: string
  monthKey: string
  averageRate: number
  totalHours: number
  count: number
}

/**
 * Příprava dat pro průměrnou hodinovou sazbu v čase
 * @param entries Pole time entries
 * @param year Rok pro zobrazení
 * @param defaultRate Výchozí hodinová sazba (pro referenční čáru)
 * @returns Pole datových bodů pro average rate chart
 */
export function prepareAverageRateData(
  entries: Entry[],
  year: number,
  defaultRate?: number
): {
  data: AverageRateDataPoint[]
  defaultRate?: number
} {
  // Vytvoříme 12 měsíců
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(year, i, 1)
    return {
      month: format(date, 'LLL', { locale: cs }),
      monthKey: format(date, 'yyyy-MM'),
      date
    }
  })

  const data = months.map(({ month, monthKey, date }) => {
    // Filtrujeme entries pro tento měsíc
    const monthEntries = entries.filter(entry => {
      const entryDate = parseISO(entry.date)
      return isSameMonth(entryDate, date)
    })

    if (monthEntries.length === 0) {
      return {
        month,
        monthKey,
        averageRate: 0,
        totalHours: 0,
        count: 0
      }
    }

    // Vážený průměr: (suma (hours * rate)) / (suma hours)
    const totalMinutes = monthEntries.reduce((sum, e) => sum + e.duration_minutes, 0)
    const weightedSum = monthEntries.reduce((sum, e) => {
      const hours = e.duration_minutes / 60
      return sum + (hours * e.hourly_rate)
    }, 0)

    const totalHours = totalMinutes / 60
    const averageRate = totalHours > 0 ? weightedSum / totalHours : 0

    return {
      month,
      monthKey,
      averageRate: Math.round(averageRate),
      totalHours: Math.round(totalHours * 100) / 100,
      count: monthEntries.length
    }
  })

  return { data, defaultRate }
}
