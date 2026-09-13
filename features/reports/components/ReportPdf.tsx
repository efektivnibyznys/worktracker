import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { EntryWithRelations } from '@/features/time-tracking/types/entry.types'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { formatTime } from '@/lib/utils/time'
import {
  getReportSummaryVisibility,
  paginateReportEntries,
  type ReportColumn,
  type ReportColumnId,
  type ReportExportStats,
} from '../lib/reportExport'

Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: '/fonts/report-roboto-400.woff',
      fontWeight: 400,
    },
    {
      src: '/fonts/report-roboto-700.woff',
      fontWeight: 700,
    },
  ],
})

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingHorizontal: 28,
    paddingBottom: 38,
    fontFamily: 'Roboto',
    fontSize: 8,
    color: '#172033',
  },
  header: {
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#d8dee9',
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 24,
  },
  metaLabel: {
    fontSize: 7,
    color: '#687386',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 9,
    fontWeight: 700,
    maxLines: 2,
    textOverflow: 'ellipsis',
  },
  summary: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryItem: {
    backgroundColor: '#f2f5f9',
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    minWidth: 100,
  },
  summaryLabel: {
    fontSize: 7,
    color: '#687386',
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: 700,
  },
  table: {
    borderWidth: 1,
    borderColor: '#d8dee9',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e8edf5',
    borderBottomWidth: 1,
    borderBottomColor: '#bcc6d6',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e7ebf1',
    height: 32,
  },
  tableCell: {
    paddingVertical: 6,
    paddingHorizontal: 5,
    maxLines: 2,
    textOverflow: 'ellipsis',
  },
  tableHeaderCell: {
    paddingVertical: 6,
    paddingHorizontal: 5,
    fontWeight: 700,
  },
  footer: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#7a8495',
    fontSize: 7,
  },
})

interface ReportPdfProps {
  entries: EntryWithRelations[]
  columns: ReportColumn[]
  stats: ReportExportStats
  clientLabel: string
  dateFrom?: string
  dateTo?: string
  fontFamily?: string
}

function formatTimeValue(value: string) {
  return value.slice(0, 5)
}

function renderCell(entry: EntryWithRelations, columnId: ReportColumnId) {
  switch (columnId) {
    case 'date':
      return formatDate(entry.date)
    case 'client':
      return entry.client?.name || '—'
    case 'project':
      return entry.project?.name || '—'
    case 'phase':
      return entry.phase?.name || '—'
    case 'timeRange':
      return `${formatTimeValue(entry.start_time)}–${formatTimeValue(entry.end_time)}`
    case 'description':
      return entry.description
    case 'duration':
      return formatTime(entry.duration_minutes)
    case 'hourlyRate':
      return formatCurrency(entry.hourly_rate)
    case 'amount':
      return formatCurrency((entry.duration_minutes / 60) * entry.hourly_rate)
  }
}

export function ReportPdf({
  entries,
  columns,
  stats,
  clientLabel,
  dateFrom,
  dateTo,
  fontFamily = 'Roboto',
}: ReportPdfProps) {
  const summaryVisibility = getReportSummaryVisibility(columns.map(column => column.id))
  const periodLabel = `${dateFrom ? formatDate(dateFrom) : 'Začátek'} – ${dateTo ? formatDate(dateTo) : 'Dnes'}`
  const pages = paginateReportEntries(entries, 6)

  return (
    <Document title={`Přehled práce – ${clientLabel}`} author="Work Tracker">
      {pages.map((pageEntries, pageIndex) => (
        <Page
          key={pageIndex}
          size="A4"
          orientation="landscape"
          wrap={false}
          style={[styles.page, { fontFamily }]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>PŘEHLED ODVEDENÉ PRÁCE</Text>
            <View style={styles.metaRow}>
              <View>
                <Text style={styles.metaLabel}>KLIENT</Text>
                <Text style={styles.metaValue}>{clientLabel}</Text>
              </View>
              <View>
                <Text style={styles.metaLabel}>OBDOBÍ</Text>
                <Text style={styles.metaValue}>{periodLabel}</Text>
              </View>
            </View>
          </View>

          {pageIndex === 0 && (
            <View style={styles.summary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>POČET ZÁZNAMŮ</Text>
                <Text style={styles.summaryValue}>{stats.count}</Text>
              </View>
              {summaryVisibility.showDuration && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>CELKEM ČASU</Text>
                  <Text style={styles.summaryValue}>{formatTime(stats.totalMinutes)}</Text>
                </View>
              )}
              {summaryVisibility.showAmount && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>CELKOVÁ ČÁSTKA</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(stats.amount)}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.table}>
            <View style={styles.tableHeader} wrap={false}>
              {columns.map(column => (
                <Text
                  key={column.id}
                  style={[
                    styles.tableHeaderCell,
                    { flex: column.width, textAlign: column.align },
                  ]}
                >
                  {column.label}
                </Text>
              ))}
            </View>
            {pageEntries.map(entry => (
              <View key={entry.id} style={styles.tableRow} wrap={false}>
                {columns.map(column => (
                  <Text
                    key={column.id}
                    style={[
                      styles.tableCell,
                      { flex: column.width, textAlign: column.align },
                    ]}
                  >
                    {renderCell(entry, column.id)}
                  </Text>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.footer} fixed>
            <Text>Vygenerováno v aplikaci Work Tracker</Text>
            <Text render={({ pageNumber, totalPages }) => `Strana ${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      ))}
    </Document>
  )
}
