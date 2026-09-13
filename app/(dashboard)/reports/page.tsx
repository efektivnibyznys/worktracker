'use client'

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useEntries } from '@/features/time-tracking/hooks/useEntries'
import { useClients } from '@/features/time-tracking/hooks/useClients'
import { usePhases } from '@/features/time-tracking/hooks/usePhases'
import { useEntrySelection } from '@/features/billing/hooks/useEntrySelection'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { formatTime } from '@/lib/utils/time'
import { calculateStats } from '@/lib/utils/calculations'
import type { EntryFilters } from '@/features/time-tracking/types/entry.types'
import { usePageMetadata } from '@/lib/hooks/usePageMetadata'
import { logger } from '@/lib/utils/logger'
import { ReportColumnDialog } from '@/features/reports/components/ReportColumnDialog'
import { ReportEntrySelector } from '@/features/reports/components/ReportEntrySelector'
import {
  createReportFileName,
  createReportExport,
  DEFAULT_REPORT_COLUMN_IDS,
  type ReportColumnId,
} from '@/features/reports/lib/reportExport'

export default function ReportsPage() {
  usePageMetadata({
    title: 'Reporty | Work Tracker',
    description: 'Generování reportů a export do PDF nebo Notionu',
  })

  const [filters, setFilters] = useState<EntryFilters>({})
  const [showReport, setShowReport] = useState(false)
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [selectedColumnIds, setSelectedColumnIds] = useState<ReportColumnId[]>(
    [...DEFAULT_REPORT_COLUMN_IDS],
  )

  const { clients } = useClients()
  const { phases } = usePhases(filters.clientId)
  const { entries, isLoading, error: entriesError, refetch } = useEntries(filters)
  const {
    selectedIds,
    selectedCount,
    toggle,
    selectAll,
    clearSelection,
  } = useEntrySelection()

  const handleFilterChange = useCallback((key: keyof EntryFilters, value: string) => {
    setFilters(previous => ({
      ...previous,
      [key]: value || undefined,
      ...(key === 'clientId' ? { phaseId: undefined } : {}),
    }))
    setShowReport(false)
    clearSelection()
  }, [clearSelection])

  const generateReport = useCallback(() => {
    selectAll(entries.map(entry => entry.id))
    setShowReport(true)
  }, [entries, selectAll])

  const selectedEntries = useMemo(() => {
    const selectedSet = new Set(selectedIds)
    return entries.filter(entry => selectedSet.has(entry.id))
  }, [entries, selectedIds])

  const stats = useMemo(() => calculateStats(selectedEntries), [selectedEntries])

  const clientLabel = useMemo(() => {
    if (filters.clientId) {
      return clients.find(client => client.id === filters.clientId)?.name || 'Vybraný klient'
    }

    const clientNames = [...new Set(
      selectedEntries
        .map(entry => entry.client?.name)
        .filter((name): name is string => Boolean(name)),
    )]

    if (clientNames.length === 1) return clientNames[0]
    if (clientNames.length > 1) return 'Více klientů'
    return 'Bez klienta'
  }, [clients, filters.clientId, selectedEntries])

  const exportToNotion = useCallback(async () => {
    if (selectedEntries.length === 0) {
      toast.error('Vyberte alespoň jeden záznam.')
      return
    }

    const selectedStats = calculateStats(selectedEntries)
    let notionText = '# 📊 Report odpracované doby\n\n'
    notionText += `**Období:** ${filters.dateFrom ? formatDate(filters.dateFrom) : 'Začátek'} - ${filters.dateTo ? formatDate(filters.dateTo) : 'Dnes'}\n\n`
    notionText += `**Klient:** ${clientLabel}\n\n`

    if (filters.phaseId) {
      const phase = phases.find(item => item.id === filters.phaseId)
      notionText += `**Fáze:** ${phase?.name}\n\n`
    }

    notionText += '## Souhrn\n\n'
    notionText += `- **Celkem hodin:** ${formatTime(selectedStats.totalMinutes)}\n`
    notionText += `- **K fakturaci:** ${formatCurrency(selectedStats.amount)}\n`
    notionText += `- **Počet záznamů:** ${selectedStats.count}\n\n`
    notionText += '## Detaily\n\n'
    notionText += '| Datum | Čas | Popis | Hodiny | Částka |\n'
    notionText += '|-------|-----|-------|--------|--------|\n'

    selectedEntries.forEach(entry => {
      notionText += `| ${formatDate(entry.date)} | ${entry.start_time.slice(0, 5)}-${entry.end_time.slice(0, 5)} | ${entry.description} | ${formatTime(entry.duration_minutes)} | ${formatCurrency((entry.duration_minutes / 60) * entry.hourly_rate)} |\n`
    })

    try {
      await navigator.clipboard.writeText(notionText)
      toast.success('Report byl zkopírován do schránky.')
    } catch (error) {
      toast.error('Report se nepodařilo zkopírovat.')
      logger.error('Failed to copy report to clipboard', error, {
        component: 'ReportsPage',
        action: 'exportToNotion',
      })
    }
  }, [clientLabel, filters, phases, selectedEntries])

  const downloadPdf = useCallback(async () => {
    setIsGeneratingPdf(true)

    try {
      const report = createReportExport(entries, selectedIds, selectedColumnIds)
      const [{ pdf }, { ReportPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/features/reports/components/ReportPdf'),
      ])
      const blob = await pdf(
        <ReportPdf
          entries={report.entries}
          columns={report.columns}
          stats={report.stats}
          clientLabel={clientLabel}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
        />,
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = createReportFileName(clientLabel, filters)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setIsColumnDialogOpen(false)
      toast.success('PDF report byl vygenerován.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PDF se nepodařilo vygenerovat.'
      toast.error(message)
      logger.error('Failed to generate report PDF', error, {
        component: 'ReportsPage',
        action: 'downloadPdf',
      })
    } finally {
      setIsGeneratingPdf(false)
    }
  }, [clientLabel, entries, filters, selectedColumnIds, selectedIds])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-3xl font-bold md:text-4xl">Reporty</h2>
        <p className="text-lg text-gray-700">Generování reportů odpracované doby</p>
      </div>

      <Card className="bg-white p-8 shadow-md transition-shadow duration-200 hover:shadow-lg">
        <CardHeader className="mb-6 p-0">
          <CardTitle className="text-2xl font-bold">Parametry reportu</CardTitle>
          <CardDescription className="mt-1 text-gray-700">
            Vyberte období a klienta pro generování reportu
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="client">Klient</Label>
              <Select
                value={filters.clientId || 'all'}
                onValueChange={value => handleFilterChange('clientId', value === 'all' ? '' : value)}
              >
                <SelectTrigger id="client" className="mt-1">
                  <SelectValue placeholder="Všichni klienti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všichni klienti</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="phase">Fáze</Label>
              <Select
                value={filters.phaseId || 'all'}
                onValueChange={value => handleFilterChange('phaseId', value === 'all' ? '' : value)}
                disabled={!filters.clientId || phases.length === 0}
              >
                <SelectTrigger id="phase" className="mt-1">
                  <SelectValue placeholder={!filters.clientId ? 'Nejprve vyberte klienta' : 'Všechny fáze'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny fáze</SelectItem>
                  {phases.map(phase => (
                    <SelectItem key={phase.id} value={phase.id}>{phase.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateFrom">Od data</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom || ''}
                onChange={event => handleFilterChange('dateFrom', event.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="dateTo">Do data</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo || ''}
                onChange={event => handleFilterChange('dateTo', event.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Button onClick={generateReport} disabled={isLoading || Boolean(entriesError)}>
              {isLoading ? 'Načítám…' : '📊 Zobrazit záznamy'}
            </Button>
          </div>
          {entriesError && (
            <div className="mt-4 flex flex-wrap items-center gap-3" role="alert">
              <p className="text-sm text-red-600">Záznamy se nepodařilo načíst.</p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Zkusit znovu
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showReport && (
        <>
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="bg-white p-6 shadow-md">
              <CardContent className="p-0">
                <div className="mb-2 text-sm font-medium text-gray-600">Vybraný čas</div>
                <div className="text-3xl font-bold">{formatTime(stats.totalMinutes)}</div>
              </CardContent>
            </Card>
            <Card className="bg-white p-6 shadow-md">
              <CardContent className="p-0">
                <div className="mb-2 text-sm font-medium text-gray-600">Vybraná částka</div>
                <div className="text-3xl font-bold">{formatCurrency(stats.amount)}</div>
              </CardContent>
            </Card>
            <Card className="bg-white p-6 shadow-md">
              <CardContent className="p-0">
                <div className="mb-2 text-sm font-medium text-gray-600">Vybrané záznamy</div>
                <div className="text-3xl font-bold">{selectedCount}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white p-8 shadow-md">
            <CardHeader className="mb-6 p-0">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <CardTitle className="text-2xl font-bold">Záznamy v reportu</CardTitle>
                  <CardDescription className="mt-1 text-gray-700">
                    Vyberte záznamy, které chcete předat klientovi
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={exportToNotion}
                    disabled={selectedCount === 0}
                  >
                    📋 Export pro Notion
                  </Button>
                  <Button
                    onClick={() => setIsColumnDialogOpen(true)}
                    disabled={selectedCount === 0}
                  >
                    📄 Připravit PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ReportEntrySelector
                entries={entries}
                selectedIds={selectedIds}
                onToggle={toggle}
                onSelectAll={selectAll}
                onClearSelection={clearSelection}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </>
      )}

      <ReportColumnDialog
        open={isColumnDialogOpen}
        onOpenChange={setIsColumnDialogOpen}
        selectedColumnIds={selectedColumnIds}
        onSelectedColumnIdsChange={setSelectedColumnIds}
        onGenerate={downloadPdf}
        isGenerating={isGeneratingPdf}
      />
    </div>
  )
}
