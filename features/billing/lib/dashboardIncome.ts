import { format, startOfWeek } from 'date-fns'
import type { Entry } from '@/features/time-tracking/types/entry.types'
import type { Invoice } from '../types/invoice.types'

export type DashboardInvoice = Pick<Invoice,
  'id' | 'invoice_type' | 'status' | 'issue_date' | 'client_id' | 'client_name' | 'subtotal'
>

export interface DashboardFinancialRecord {
  date: string
  clientId: string
  clientName?: string
  amount: number
  totalMinutes: number
  entryCount: number
  invoiceCount: number
  status: 'unbilled' | 'billed' | 'paid'
}

export function getDashboardFinancialRecords(
  entries: Entry[],
  invoices: DashboardInvoice[] = []
): DashboardFinancialRecord[] {
  return [
    ...entries.map((entry): DashboardFinancialRecord => ({
      date: entry.date,
      clientId: entry.client_id,
      amount: entry.duration_minutes / 60 * entry.hourly_rate,
      totalMinutes: entry.duration_minutes,
      entryCount: 1,
      invoiceCount: 0,
      status: entry.billing_status || 'unbilled',
    })),
    ...invoices.filter(invoice => invoice.invoice_type === 'standalone' && invoice.status !== 'cancelled')
      .map((invoice): DashboardFinancialRecord => ({
        date: invoice.issue_date,
        clientId: invoice.client_id ?? 'standalone-without-client',
        clientName: invoice.client_id ? invoice.client_name ?? undefined : 'Bez klienta',
        amount: Number(invoice.subtotal),
        totalMinutes: 0,
        entryCount: 0,
        invoiceCount: 1,
        status: invoice.status === 'paid' ? 'paid' : invoice.status === 'draft' ? 'unbilled' : 'billed',
      })),
  ]
}

export function calculateDashboardStats(
  entries: Entry[],
  invoices: DashboardInvoice[],
  dateFrom: string,
  dateTo: string
) {
  const records = getDashboardFinancialRecords(entries, invoices)
    .filter(record => record.date >= dateFrom && record.date <= dateTo)
  return {
    totalMinutes: records.reduce((sum, record) => sum + record.totalMinutes, 0),
    amount: records.reduce((sum, record) => sum + record.amount, 0),
    count: records.reduce((sum, record) => sum + record.entryCount, 0),
    invoiceCount: records.reduce((sum, record) => sum + record.invoiceCount, 0),
  }
}

export function getDashboardPeriodRanges(year: number, now: Date = new Date()) {
  const today = format(now, 'yyyy-MM-dd')
  return {
    today: [today, today],
    week: [format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), today],
    month: [format(now, 'yyyy-MM-01'), today],
    year: [`${year}-01-01`, `${year}-12-31`],
  } as const
}

export function getDashboardYears(entryYears: number[], invoices: DashboardInvoice[], currentYear: number) {
  const invoiceYears = getDashboardFinancialRecords([], invoices).map(record => Number(record.date.slice(0, 4)))
  return [...new Set([...entryYears, ...invoiceYears, currentYear])].sort((a, b) => b - a)
}
