import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_REPORT_COLUMN_IDS,
  createReportFileName,
  createReportExport,
  getReportSummaryVisibility,
  paginateReportEntries,
} from './reportExport.ts'

const entries = [
  {
    id: 'entry-1',
    duration_minutes: 90,
    hourly_rate: 1000,
  },
  {
    id: 'entry-2',
    duration_minutes: 30,
    hourly_rate: 800,
  },
  {
    id: 'entry-3',
    duration_minutes: 60,
    hourly_rate: 1200,
  },
]

test('připraví export pouze z vybraných záznamů v pořadí reportu', () => {
  const result = createReportExport(entries, ['entry-2', 'entry-1'], ['amount', 'date'])

  assert.deepEqual(result.entries.map(entry => entry.id), ['entry-1', 'entry-2'])
  assert.deepEqual(result.columns.map(column => column.id), ['date', 'amount'])
  assert.deepEqual(result.stats, {
    count: 2,
    totalMinutes: 120,
    amount: 1900,
  })
})

test('odmítne export bez vybraného záznamu', () => {
  assert.throws(
    () => createReportExport(entries, [], ['date']),
    { message: 'Vyberte alespoň jeden záznam.' },
  )
})

test('odmítne export bez vybraného sloupce', () => {
  assert.throws(
    () => createReportExport(entries, ['entry-1'], []),
    { message: 'Vyberte alespoň jeden sloupec.' },
  )
})

test('výchozí export obsahuje klientské sloupce bez hodinové sazby', () => {
  assert.deepEqual(DEFAULT_REPORT_COLUMN_IDS, [
    'date',
    'project',
    'phase',
    'description',
    'duration',
    'amount',
  ])
})

test('finanční souhrn se zobrazí jen při vybraném sloupci částka', () => {
  assert.deepEqual(getReportSummaryVisibility(['date', 'duration']), {
    showDuration: true,
    showAmount: false,
  })
  assert.deepEqual(getReportSummaryVisibility(['hourlyRate', 'amount']), {
    showDuration: false,
    showAmount: true,
  })
})

test('vytvoří bezpečný název PDF z klienta a období', () => {
  assert.equal(
    createReportFileName('Žluťoučký klient, s.r.o.', {
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    }),
    'prehled-prace-zlutoucky-klient-s-r-o-2026-08-01_2026-08-31.pdf',
  )
})

test('rozdělí delší report na stránky bez ztráty pořadí záznamů', () => {
  const longReport = Array.from({ length: 27 }, (_, index) => ({ id: `entry-${index + 1}` }))

  const pages = paginateReportEntries(longReport, 12)

  assert.deepEqual(pages.map(page => page.length), [12, 12, 3])
  assert.deepEqual(
    pages.flat().map(entry => entry.id),
    longReport.map(entry => entry.id),
  )
})
