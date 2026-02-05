'use client'

import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useEntries } from '@/features/time-tracking/hooks/useEntries'
import { useClients } from '@/features/time-tracking/hooks/useClients'
import { usePhases } from '@/features/time-tracking/hooks/usePhases'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { formatTime } from '@/lib/utils/time'
import { EntryFilters, EntryWithRelations, BillingStatus } from '@/features/time-tracking/types/entry.types'
import { usePageMetadata } from '@/lib/hooks/usePageMetadata'
import { EditEntryDialog, EditEntrySubmitData } from '@/features/time-tracking/components/EditEntryDialog'
import { BillingStatusBadge, CreateInvoiceDialog } from '@/features/billing/components'
import { useEntrySelection } from '@/features/billing/hooks/useEntrySelection'
import { YearSelector } from '@/features/time-tracking/components/YearSelector'

const BILLING_STATUS_OPTIONS: { value: BillingStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Všechny stavy' },
  { value: 'unbilled', label: 'Nefakturováno' },
  { value: 'billed', label: 'Fakturováno' },
  { value: 'paid', label: 'Zaplaceno' },
]

export default function EntriesPage() {
  usePageMetadata({
    title: 'Záznamy práce | Work Tracker',
    description: 'Přehled všech odpracovaných hodin s filtry'
  })

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [filters, setFilters] = useState<EntryFilters>({})
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false)

  const { clients } = useClients()
  const { phases } = usePhases(selectedClientId)

  const entriesFilters = useMemo(() => ({
    ...filters,
    year: selectedYear
  }), [filters, selectedYear])

  const { entries, isLoading, deleteEntry, updateEntry } = useEntries(entriesFilters)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<EntryWithRelations | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Entry selection for invoicing
  const {
    selectedIds,
    selectedCount,
    hasSelection,
    toggle,
    selectAll,
    clearSelection,
    isSelected,
    areAllSelected
  } = useEntrySelection()

  // Get only unbilled entries for selection
  const unbilledEntries = useMemo(
    () => entries.filter(e => e.billing_status === 'unbilled'),
    [entries]
  )

  const handleFilterChange = useCallback((key: keyof EntryFilters, value: string) => {
    // Validace, že dateFrom/dateTo jsou v rámci selectedYear
    if (key === 'dateFrom' || key === 'dateTo') {
      const date = new Date(value)
      if (!isNaN(date.getTime()) && date.getFullYear() !== selectedYear) {
        toast.warning('Datum musí být v rámci vybraného roku')
        return
      }
    }

    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }))

    if (key === 'clientId') {
      setSelectedClientId(value)
      // Reset phase filter when client changes
      setFilters(prev => ({ ...prev, phaseId: undefined }))
    }
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
    setSelectedClientId('')
  }, [])

  const handleEdit = useCallback((entry: EntryWithRelations) => {
    setEditingEntry(entry)
    setIsEditDialogOpen(true)
  }, [])

  const handleEditSubmit = useCallback(async (data: EditEntrySubmitData) => {
    if (!editingEntry) return

    try {
      await updateEntry.mutateAsync({
        id: editingEntry.id,
        data: {
          client_id: data.client_id,
          phase_id: data.phase_id,
          project_id: data.project_id,
          date: data.date,
          start_time: data.start_time,
          end_time: data.end_time,
          duration_minutes: data.duration_minutes,
          description: data.description,
          hourly_rate: data.hourly_rate,
        }
      })
      toast.success('Záznam byl úspěšně upraven')
      setIsEditDialogOpen(false)
      setEditingEntry(null)
    } catch (error) {
      toast.error('Nepodařilo se upravit záznam')
      logger.error('Failed to update entry', error, {
        component: 'EntriesPage',
        action: 'handleEditSubmit',
        metadata: { entryId: editingEntry.id },
      })
    }
  }, [editingEntry, updateEntry])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Opravdu chcete smazat tento záznam?')) {
      return
    }
    setDeletingId(id)
    try {
      await deleteEntry.mutateAsync(id)
      toast.success('Záznam byl úspěšně smazán')
    } catch (error) {
      toast.error('Nepodařilo se smazat záznam')
      logger.error('Failed to delete entry', error, {
        component: 'EntriesPage',
        action: 'handleDelete',
        metadata: { entryId: id },
      })
    } finally {
      setDeletingId(null)
    }
  }, [deleteEntry])

  // Get selected entries with full data (moved up for use in handleSelectAllUnbilled)
  const selectedEntries = useMemo(
    () => entries.filter(e => selectedIds.includes(e.id)),
    [entries, selectedIds]
  )

  // Get client from selected entries (for restricting selection to same client)
  const selectedClientId_forInvoice = useMemo(() => {
    if (selectedEntries.length === 0) return null
    return selectedEntries[0].client_id
  }, [selectedEntries])

  const handleSelectAllUnbilled = useCallback(() => {
    // Filter to same client if already have selection
    const targetClientId = selectedClientId_forInvoice || (unbilledEntries[0]?.client_id ?? null)
    const sameClientUnbilled = unbilledEntries.filter(e => e.client_id === targetClientId)
    const unbilledIds = sameClientUnbilled.map(e => e.id)

    if (areAllSelected(unbilledIds)) {
      clearSelection()
    } else {
      selectAll(unbilledIds)
    }
  }, [unbilledEntries, areAllSelected, clearSelection, selectAll, selectedClientId_forInvoice])

  const handleCreateInvoice = useCallback(() => {
    setIsCreateInvoiceOpen(true)
  }, [])

  const handleInvoiceCreated = useCallback(() => {
    clearSelection()
    setIsCreateInvoiceOpen(false)
  }, [clearSelection])

  // Calculate totals - memoized to avoid recalculation on every render
  const totalMinutes = useMemo(
    () => entries.reduce((sum, e) => sum + e.duration_minutes, 0),
    [entries]
  )
  const totalAmount = useMemo(
    () => entries.reduce((sum, e) => {
      const hours = e.duration_minutes / 60
      return sum + (hours * e.hourly_rate)
    }, 0),
    [entries]
  )

  // Calculate selected totals
  const selectedTotals = useMemo(() => {
    const minutes = selectedEntries.reduce((sum, e) => sum + e.duration_minutes, 0)
    const amount = selectedEntries.reduce((sum, e) => {
      const hours = e.duration_minutes / 60
      return sum + (hours * e.hourly_rate)
    }, 0)
    return { minutes, amount }
  }, [selectedEntries])

  // Wrapper for toggle that enforces same-client selection
  const handleEntryToggle = useCallback((entryId: string) => {
    const entry = entries.find(e => e.id === entryId)
    if (!entry) return

    // If already selected, allow deselection
    if (isSelected(entryId)) {
      toggle(entryId)
      return
    }

    // If no selection yet, allow any entry
    if (!selectedClientId_forInvoice) {
      toggle(entryId)
      return
    }

    // Only allow selecting entries from the same client
    if (entry.client_id === selectedClientId_forInvoice) {
      toggle(entryId)
    } else {
      toast.error('Pro fakturu lze vybrat pouze záznamy od jednoho klienta')
    }
  }, [entries, isSelected, selectedClientId_forInvoice, toggle])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-700 text-lg">Načítám záznamy...</p>
      </div>
    )
  }

  const hasActiveFilters = filters.clientId || filters.phaseId || filters.dateFrom || filters.dateTo || filters.billingStatus

  return (
    <div className="space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Záznamy práce</h2>
          <p className="text-lg text-gray-700">Přehled všech odpracovaných hodin</p>
        </div>
        <YearSelector value={selectedYear} onChange={setSelectedYear} />
      </div>

      {/* Filters */}
      <Card className="bg-white p-8 shadow-md hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="p-0 mb-6">
          <CardTitle className="text-2xl font-bold">Filtry</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="client">Klient</Label>
              <Select
                value={filters.clientId || 'all'}
                onValueChange={(value) => handleFilterChange('clientId', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Všichni klienti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všichni klienti</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="phase">Fáze</Label>
              <Select
                value={filters.phaseId || 'all'}
                onValueChange={(value) => handleFilterChange('phaseId', value === 'all' ? '' : value)}
                disabled={!selectedClientId || phases.length === 0}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={!selectedClientId ? "Nejprve vyberte klienta" : "Všechny fáze"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny fáze</SelectItem>
                  {phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="billingStatus">Stav fakturace</Label>
              <Select
                value={filters.billingStatus || 'all'}
                onValueChange={(value) => handleFilterChange('billingStatus', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Všechny stavy" />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
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
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="dateTo">Do data</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Vymazat filtry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-8 md:grid-cols-3">
        <Card className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-0">
            <div className="text-sm text-gray-600 font-medium mb-2">Celkem hodin</div>
            <div className="text-3xl font-bold">
              {formatTime(totalMinutes)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-0">
            <div className="text-sm text-gray-600 font-medium mb-2">Celková částka</div>
            <div className="text-3xl font-bold">
              {formatCurrency(totalAmount)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-0">
            <div className="text-sm text-gray-600 font-medium mb-2">Počet záznamů</div>
            <div className="text-3xl font-bold">
              {entries.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selection header */}
      {unbilledEntries.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <Checkbox
            checked={areAllSelected(unbilledEntries.map(e => e.id))}
            onCheckedChange={handleSelectAllUnbilled}
          />
          <span className="text-sm text-gray-600">
            Vybrat všechny nefakturované ({unbilledEntries.length})
          </span>
        </div>
      )}

      {/* Entries List */}
      {entries.length === 0 ? (
        <Card className="bg-white p-8 shadow-md">
          <CardContent className="p-0 py-8 text-center">
            <p className="text-gray-700 text-lg">
              {hasActiveFilters
                ? 'Žádné záznamy pro vybrané filtry'
                : 'Zatím nemáte žádné záznamy práce'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const isUnbilled = entry.billing_status === 'unbilled'
            const entrySelected = isSelected(entry.id)

            return (
              <Card
                key={entry.id}
                className={`bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200 ${entrySelected ? 'ring-2 ring-primary' : ''
                  }`}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Checkbox for unbilled entries */}
                    <div className="flex items-start gap-4">
                      {isUnbilled && (
                        <div className="pt-1">
                          <Checkbox
                            checked={entrySelected}
                            onCheckedChange={() => handleEntryToggle(entry.id)}
                          />
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-bold text-xl">
                            {entry.client?.name || 'Neznámý klient'}
                          </span>
                          {entry.phase && (
                            <Badge variant="secondary">{entry.phase.name}</Badge>
                          )}
                          {entry.project && (
                            <Badge variant="outline">{entry.project.name}</Badge>
                          )}
                          <BillingStatusBadge status={entry.billing_status} />
                        </div>
                        <p className="text-gray-700 mb-3">{entry.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <span>{formatDate(entry.date)}</span>
                          <span>{entry.start_time} - {entry.end_time}</span>
                          <span>{formatTime(entry.duration_minutes)}</span>
                          <span>{formatCurrency(entry.hourly_rate)}/h</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-3xl font-bold">
                        {formatCurrency((entry.duration_minutes / 60) * entry.hourly_rate)}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(entry)}
                        >
                          Upravit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(entry.id)}
                          disabled={deletingId === entry.id}
                        >
                          {deletingId === entry.id ? 'Mazání...' : 'Smazat'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Floating action bar for selection */}
      {hasSelection && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-40">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="font-semibold">
                Vybráno: {selectedCount} záznamů
              </span>
              <span className="text-gray-600">
                {formatTime(selectedTotals.minutes)} | {formatCurrency(selectedTotals.amount)}
              </span>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={clearSelection}>
                Zrušit výběr
              </Button>
              <Button onClick={handleCreateInvoice}>
                Vytvořit fakturu
              </Button>
            </div>
          </div>
        </div>
      )}

      <EditEntryDialog
        entry={editingEntry}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleEditSubmit}
        isLoading={updateEntry.isPending}
      />

      <CreateInvoiceDialog
        open={isCreateInvoiceOpen}
        onOpenChange={setIsCreateInvoiceOpen}
        preselectedEntryIds={selectedIds}
        preselectedEntries={selectedEntries}
        onSuccess={handleInvoiceCreated}
      />
    </div>
  )
}
