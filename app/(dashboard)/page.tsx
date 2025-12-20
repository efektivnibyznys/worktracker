'use client'

import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { QuickAddForm, QuickAddSubmitData } from '@/features/time-tracking/components/QuickAddForm'
import { useDashboardEntries } from '@/features/time-tracking/hooks/useEntries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { formatTime, calculateDuration } from '@/lib/utils/time'
import { formatDate } from '@/lib/utils/date'
import { calculateStats } from '@/lib/utils/calculations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/lib/stores/authStore'
import { useEntries } from '@/features/time-tracking/hooks/useEntries'
import { useClients } from '@/features/time-tracking/hooks/useClients'
import { usePhases } from '@/features/time-tracking/hooks/usePhases'
import { EntryFilters } from '@/features/time-tracking/types/entry.types'
import { usePageMetadata } from '@/lib/hooks/usePageMetadata'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function DashboardPage() {
  usePageMetadata({
    title: 'Dashboard | Work Tracker',
    description: 'Přehled odpracované doby a rychlé přidání záznamu'
  })

  const { user } = useAuthStore()
  const { todayEntries, weekEntries, monthEntries } = useDashboardEntries()

  const [filters, setFilters] = useState<EntryFilters>({})
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [isEntriesListOpen, setIsEntriesListOpen] = useState(false)

  const { clients } = useClients()
  const { phases } = usePhases(selectedClientId)
  const { entries, createEntry, deleteEntry } = useEntries(filters)

  // Calculate stats - memoized to avoid recalculation on every render
  const todayStats = useMemo(() => calculateStats(todayEntries), [todayEntries])
  const weekStats = useMemo(() => calculateStats(weekEntries), [weekEntries])
  const monthStats = useMemo(() => calculateStats(monthEntries), [monthEntries])

  // Calculate totals for filtered entries
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

  const handleQuickAdd = useCallback(async (data: QuickAddSubmitData) => {
    try {
      await createEntry.mutateAsync({
        ...data,
        user_id: user!.id,
      })
      toast.success('Záznam byl úspěšně přidán')
    } catch (error) {
      toast.error('Nepodařilo se přidat záznam')
      logger.error('Failed to create time entry', error, {
        component: 'Dashboard',
        action: 'handleQuickAdd',
      })
    }
  }, [createEntry, user])

  const handleFilterChange = useCallback((key: keyof EntryFilters, value: string) => {
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
        component: 'Dashboard',
        action: 'handleDelete',
        metadata: { entryId: id },
      })
    } finally {
      setDeletingId(null)
    }
  }, [deleteEntry])

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Dashboard
      </h2>

      {/* Quick Add Form */}
      <Card className="mb-8">
        <CardHeader
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rychlé přidání záznamu</CardTitle>
              <CardDescription>
                Přidejte nový záznam odpracované doby
              </CardDescription>
            </div>
            {isQuickAddOpen ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </CardHeader>
        {isQuickAddOpen && (
          <CardContent>
            <QuickAddForm
              onSubmit={handleQuickAdd}
              isLoading={createEntry.isPending}
            />
          </CardContent>
        )}
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Dnes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(todayStats.totalMinutes)}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {formatCurrency(todayStats.amount)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {todayStats.count} záznamů
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tento týden</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(weekStats.totalMinutes)}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {formatCurrency(weekStats.amount)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {weekStats.count} záznamů
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tento měsíc</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(monthStats.totalMinutes)}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {formatCurrency(monthStats.amount)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {monthStats.count} záznamů
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          {(filters.clientId || filters.phaseId || filters.dateFrom || filters.dateTo) && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Vymazat filtry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary for Filtered Entries */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600">Celkem hodin</div>
            <div className="text-2xl font-bold mt-1">
              {formatTime(totalMinutes)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600">Celková částka</div>
            <div className="text-2xl font-bold mt-1">
              {formatCurrency(totalAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600">Počet záznamů</div>
            <div className="text-2xl font-bold mt-1">
              {entries.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entries List */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsEntriesListOpen(!isEntriesListOpen)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Seznam záznamů ({entries.length})</CardTitle>
              <CardDescription>
                Všechny záznamy odpovídající filtrům
              </CardDescription>
            </div>
            {isEntriesListOpen ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </CardHeader>
        {isEntriesListOpen && (
          <CardContent>
            {entries.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-600">
                  {Object.keys(filters).length > 0
                    ? 'Žádné záznamy pro vybrané filtry'
                    : 'Zatím nemáte žádné záznamy práce'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="py-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-lg">
                              {entry.client?.name || 'Neznámý klient'}
                            </span>
                            {entry.phase && (
                              <Badge variant="secondary">{entry.phase.name}</Badge>
                            )}
                          </div>
                          <p className="text-gray-700 mb-2">{entry.description}</p>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <span>📅 {formatDate(entry.date)}</span>
                            <span>🕐 {entry.start_time} - {entry.end_time}</span>
                            <span>⏱️ {formatTime(entry.duration_minutes)}</span>
                            <span>💰 {formatCurrency(entry.hourly_rate)}/h</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-2xl font-bold text-gray-900">
                            {formatCurrency((entry.duration_minutes / 60) * entry.hourly_rate)}
                          </div>
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
