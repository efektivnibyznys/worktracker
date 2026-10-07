import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareBillingStatusData, prepareMonthlyRevenueData, prepareTopClientsData } from '../../../lib/utils/chartData.ts'
import { calculateDashboardStats, getDashboardPeriodRanges, getDashboardYears } from './dashboardIncome.ts'
import { createClient } from '@supabase/supabase-js'
import { InvoiceService } from '../services/invoiceService.ts'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRequire } from 'node:module'
import { useArchiveStats } from '../../time-tracking/hooks/useYearlyEntries.ts'
const entry = (overrides = {}) => ({
  id: 'entry-1', client_id: 'client-1', date: '2026-10-07',
  duration_minutes: 60, hourly_rate: 850, billing_status: 'paid', ...overrides,
})
const invoice = (overrides = {}) => ({
  id: 'invoice-1', invoice_type: 'standalone', status: 'paid', issue_date: '2026-10-07',
  client_id: 'client-1', client_name: 'Klient', subtotal: 2000, total_amount: 2420,
  ...overrides,
})
const clients = [{ id: 'client-1', name: 'Klient' }]

test('dashboard billing includes standalone invoices without counting linked invoices twice or inventing hours', () => {
  const data = prepareBillingStatusData([entry()], [invoice(), invoice({ invoice_type: 'linked' })])
  const paid = data.find(row => row.status === 'paid')
  assert.equal(paid.amount, 2850)
  assert.equal(paid.hours, 1)
  assert.equal(paid.count, 1)
  assert.equal(paid.invoiceCount, 1)
})

test('monthly revenue includes an invoice-only month, uses subtotal, and excludes cancelled and other-year invoices', () => {
  const invoices = [invoice({ issue_date: '2026-09-30' }), invoice({ status: 'cancelled' }), invoice({ issue_date: '2025-10-07' })]
  const result = prepareMonthlyRevenueData([entry()], clients, 2026, 5, invoices)
  assert.equal(result.data.find(row => row.monthKey === '2026-09')['client-1'], 2000)
  assert.equal(result.data.find(row => row.monthKey === '2026-10')['client-1'], 850)
})

test('top clients includes clients with only standalone invoices and preserves entry count and hours', () => {
  const data = prepareTopClientsData([], clients, 8, [invoice()])
  assert.equal(data.length, 1)
  assert.equal(data[0].amount, 2000)
  assert.equal(data[0].hours, 0)
  assert.equal(data[0].count, 0)
  assert.equal(data[0].invoiceCount, 1)
})

test('monthly revenue accounts for standalone invoices without a saved client', () => {
  const result = prepareMonthlyRevenueData([], [], 2026, 5, [invoice({ client_id: null })])
  assert.equal(result.clientKeys.length, 1)
  assert.equal(result.clientKeys[0].name, 'Bez klienta')
  assert.equal(result.data[9][result.clientKeys[0].id], 2000)
})


process.env.TZ = 'Europe/Prague'

test('summary includes drafts and each unpaid status, excludes cancellations, and retains entry-only hours', () => {
  const invoices = ['draft', 'issued', 'sent', 'overdue', 'paid', 'cancelled'].map(status => invoice({ status }))
  const summary = calculateDashboardStats([entry()], invoices, '2026-10-01', '2026-10-31')
  assert.deepEqual(summary, { totalMinutes: 60, count: 1, amount: 10850, invoiceCount: 5 })
  const billing = prepareBillingStatusData([entry()], invoices)
  assert.equal(billing.find(row => row.status === 'unbilled').amount, 2000)
  assert.equal(billing.find(row => row.status === 'billed').amount, 6000)
  assert.equal(billing.find(row => row.status === 'paid').amount, 2850)
})

test('summary uses inclusive issue dates rather than creation or payment dates', () => {
  const invoices = [invoice({ issue_date: '2026-10-01' }), invoice({ issue_date: '2026-10-07' }), invoice({ issue_date: '2026-09-30' }), invoice({ issue_date: '2026-10-08' })]
  assert.equal(calculateDashboardStats([], invoices, '2026-10-01', '2026-10-07').amount, 4000)
  assert.equal(calculateDashboardStats([], invoices, '2026-10-07', '2026-10-07').invoiceCount, 1)
})

test('invoice-only archive years are selectable and cancelled or linked invoices cannot introduce years', () => {
  assert.deepEqual(getDashboardYears([2024], [invoice({ issue_date: '2025-01-01' }), invoice({ issue_date: '2023-01-01', status: 'cancelled' }), invoice({ issue_date: '2022-01-01', invoice_type: 'linked' })], 2026), [2026, 2025, 2024])
})

test('periods follow the local calendar near midnight and the week starts on Monday', () => {
  const ranges = getDashboardPeriodRanges(2026, new Date('2026-10-07T00:15:00+02:00'))
  assert.deepEqual(ranges.today, ['2026-10-07', '2026-10-07'])
  assert.deepEqual(ranges.week, ['2026-10-05', '2026-10-07'])
  assert.deepEqual(ranges.month, ['2026-10-01', '2026-10-07'])
  assert.deepEqual(ranges.year, ['2026-01-01', '2026-12-31'])
})

test('standalone invoices influence top client selection and the other-client series', () => {
  const result = prepareMonthlyRevenueData([entry()], clients, 2026, 1, [invoice({ client_id: 'client-2', client_name: 'Druhý klient', subtotal: 5000 })])
  assert.deepEqual(result.clientKeys.map(row => row.name), ['Druhý klient', 'Ostatní'])
  assert.equal(result.data[9]['client-2'], 5000)
  assert.equal(result.data[9].others, 850)
})

test('dashboard service retrieves more than one Supabase page using standalone and cancellation filters', async () => {
  const rows = Array.from({ length: 1001 }, (_, i) => invoice({ id: String(i).padStart(4, '0') }))
  const urls = []
  const supabase = createClient('https://test.supabase.co', 'test-public-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (url) => {
      const parsed = new URL(url)
      urls.push(parsed)
      const offset = Number(parsed.searchParams.get('offset'))
      const limit = Number(parsed.searchParams.get('limit'))
      return new Response(JSON.stringify(rows.slice(offset, offset + limit)), { status: 200, headers: { 'Content-Type': 'application/json' } })
    } },
  })
  const result = await new InvoiceService(supabase).getDashboardInvoices()
  assert.equal(result.length, 1001)
  assert.equal(new Set(result.map(row => row.id)).size, 1001)
  assert.deepEqual(urls.map(url => url.searchParams.get('offset')), ['0', '1000'])
  assert.ok(urls.every(url => url.searchParams.get('invoice_type') === 'eq.standalone' && url.searchParams.get('status') === 'neq.cancelled'))
})

test('dashboard service propagates fetch errors instead of returning incomplete amounts', async () => {
  const supabase = createClient('https://test.supabase.co', 'test-public-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async () => new Response(JSON.stringify({ message: 'Access denied', code: '42501' }), { status: 403, headers: { 'Content-Type': 'application/json' } }) },
  })
  await assert.rejects(() => new InvoiceService(supabase).getDashboardInvoices(), error => error.message === 'Access denied')
})

test('the week spanning New Year includes December entries and invoices without moving them into January year totals', () => {
  const ranges = getDashboardPeriodRanges(2027, new Date('2027-01-01T12:00:00+01:00'))
  assert.deepEqual(ranges.week, ['2026-12-28', '2027-01-01'])
  const entries = [entry({ date: '2026-12-31' })]
  const invoices = [invoice({ issue_date: '2026-12-31' }), invoice({ issue_date: '2027-01-01' })]
  assert.equal(calculateDashboardStats(entries, invoices, ...ranges.week).amount, 4850)
  assert.equal(calculateDashboardStats(entries, invoices, ...ranges.year).amount, 2000)
})

// TSX compiles the hook to CJS in this repository; use the same query context.
const { QueryClient, QueryClientProvider } = createRequire(import.meta.url)('@tanstack/react-query')

for (const cached of [false, true]) {
  test(`archive exposes fetch errors ${cached ? 'with cached entry totals' : 'before any totals are loaded'}`, () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-public-key'
    const q = new QueryClient({ defaultOptions: { queries: { enabled: false, retry: false, retryOnMount: false } } })
    const year = new Date().getFullYear() - 1
    const key = ['entries', 'archive-stats', [year]]
    q.setQueryData(['entries', 'available-years'], [year])
    q.setQueryData(key, cached ? [{ year, totalMinutes: 60, totalAmount: 850, entryCount: 1 }] : [])
    q.getQueryCache().find({ queryKey: key }).setState({ data: cached ? q.getQueryData(key) : undefined, status: 'error', error: new Error('Archive unavailable') })
    let observed
    function Probe() { observed = useArchiveStats([]); return React.createElement('span', null, observed.error?.message) }
    const rendered = renderToStaticMarkup(React.createElement(QueryClientProvider, { client: q }, React.createElement(Probe)))
    assert.ok(rendered.includes('Archive unavailable'))
    assert.equal(observed.error.message, 'Archive unavailable')
    q.clear()
  })
}
