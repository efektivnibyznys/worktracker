export const REPORT_COLUMNS = [
  { id: 'date', label: 'Datum', width: 1.15, align: 'left' },
  { id: 'client', label: 'Klient', width: 1.35, align: 'left' },
  { id: 'project', label: 'Projekt', width: 1.35, align: 'left' },
  { id: 'phase', label: 'Fáze', width: 1.25, align: 'left' },
  { id: 'timeRange', label: 'Čas', width: 1.15, align: 'left' },
  { id: 'description', label: 'Popis', width: 2.5, align: 'left' },
  { id: 'duration', label: 'Délka', width: 1, align: 'right' },
  { id: 'hourlyRate', label: 'Hodinová sazba', width: 1.2, align: 'right' },
  { id: 'amount', label: 'Částka', width: 1.2, align: 'right' },
] as const

export type ReportColumnId = typeof REPORT_COLUMNS[number]['id']
export type ReportColumn = typeof REPORT_COLUMNS[number]

export const DEFAULT_REPORT_COLUMN_IDS: ReportColumnId[] = [
  'date',
  'project',
  'phase',
  'description',
  'duration',
  'amount',
]

interface ReportEntryLike {
  id: string
  duration_minutes: number
  hourly_rate: number
}

export interface ReportExportStats {
  count: number
  totalMinutes: number
  amount: number
}

export function createReportExport<T extends ReportEntryLike>(
  entries: readonly T[],
  selectedEntryIds: readonly string[],
  selectedColumnIds: readonly ReportColumnId[],
): {
  entries: T[]
  columns: ReportColumn[]
  stats: ReportExportStats
} {
  const selectedEntryIdSet = new Set(selectedEntryIds)
  const selectedColumnIdSet = new Set(selectedColumnIds)
  const selectedEntries = entries.filter(entry => selectedEntryIdSet.has(entry.id))
  const columns = REPORT_COLUMNS.filter(column => selectedColumnIdSet.has(column.id))

  if (selectedEntries.length === 0) {
    throw new Error('Vyberte alespoň jeden záznam.')
  }

  if (columns.length === 0) {
    throw new Error('Vyberte alespoň jeden sloupec.')
  }

  const stats = selectedEntries.reduce<ReportExportStats>(
    (result, entry) => ({
      count: result.count + 1,
      totalMinutes: result.totalMinutes + entry.duration_minutes,
      amount: result.amount + (entry.duration_minutes / 60) * entry.hourly_rate,
    }),
    { count: 0, totalMinutes: 0, amount: 0 },
  )

  return { entries: selectedEntries, columns, stats }
}

export function getReportSummaryVisibility(selectedColumnIds: readonly ReportColumnId[]) {
  const selectedColumnIdSet = new Set(selectedColumnIds)

  return {
    showDuration: selectedColumnIdSet.has('duration'),
    showAmount: selectedColumnIdSet.has('amount'),
  }
}

export function createReportFileName(
  clientLabel: string,
  period: { dateFrom?: string; dateTo?: string },
) {
  const clientSlug = clientLabel
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const periodSlug = [period.dateFrom, period.dateTo].filter(Boolean).join('_')
  return `prehled-prace-${clientSlug || 'klient'}${periodSlug ? `-${periodSlug}` : ''}.pdf`
}

export function paginateReportEntries<T>(entries: readonly T[], pageSize: number): T[][] {
  const pages: T[][] = []
  for (let index = 0; index < entries.length; index += pageSize) {
    pages.push(entries.slice(index, index + pageSize))
  }
  return pages
}
