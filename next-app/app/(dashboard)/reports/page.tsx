'use client'

import { useState } from 'react'
import { useEntries } from '@/features/time-tracking/hooks/useEntries'
import { useClients } from '@/features/time-tracking/hooks/useClients'
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
import { EntryFilters } from '@/features/time-tracking/types/entry.types'

export default function ReportsPage() {
  const [filters, setFilters] = useState<EntryFilters>({})
  const [showReport, setShowReport] = useState(false)

  const { clients } = useClients()
  const { entries, isLoading } = useEntries(filters)

  const handleFilterChange = (key: keyof EntryFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }))
  }

  const generateReport = () => {
    setShowReport(true)
  }

  const exportToNotion = () => {
    const stats = calculateStats(entries)

    let notionText = '# 📊 Report odpracované doby\n\n'
    notionText += `**Období:** ${filters.dateFrom ? formatDate(filters.dateFrom) : 'Začátek'} - ${filters.dateTo ? formatDate(filters.dateTo) : 'Dnes'}\n\n`

    if (filters.clientId) {
      const client = clients.find(c => c.id === filters.clientId)
      notionText += `**Klient:** ${client?.name}\n\n`
    }

    notionText += '## Souhrn\n\n'
    notionText += `- **Celkem hodin:** ${formatTime(stats.totalMinutes)}\n`
    notionText += `- **K fakturaci:** ${formatCurrency(stats.amount)}\n`
    notionText += `- **Počet záznamů:** ${stats.count}\n\n`

    notionText += '## Detaily\n\n'
    notionText += '| Datum | Čas | Klient | Popis | Hodiny | Částka |\n'
    notionText += '|-------|-----|--------|-------|--------|--------|\n'

    entries.forEach(entry => {
      notionText += `| ${formatDate(entry.date)} | ${entry.start_time}-${entry.end_time} | ${entry.client?.name || '-'} | ${entry.description} | ${formatTime(entry.duration_minutes)} | ${formatCurrency((entry.duration_minutes / 60) * entry.hourly_rate)} |\n`
    })

    // Copy to clipboard
    navigator.clipboard.writeText(notionText)
    alert('Report zkopírován do schránky! Můžete ho vložit do Notionu.')
  }

  const stats = calculateStats(entries)

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Reporty</h2>
        <p className="text-gray-600 mt-1">Generování reportů odpracované doby</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Parametry reportu</CardTitle>
          <CardDescription>
            Vyberte období a klienta pro generování reportu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="client">Klient</Label>
              <Select
                value={filters.clientId || ''}
                onValueChange={(value) => handleFilterChange('clientId', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Všichni klienti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Všichni klienti</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateFrom">Od data *</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="dateTo">Do data *</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Button onClick={generateReport}>
              📊 Vygenerovat report
            </Button>
            {showReport && entries.length > 0 && (
              <Button variant="outline" onClick={exportToNotion}>
                📋 Export pro Notion
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {showReport && (
        <>
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600">Celkem hodin</div>
                <div className="text-3xl font-bold mt-1">
                  {formatTime(stats.totalMinutes)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600">K fakturaci</div>
                <div className="text-3xl font-bold mt-1">
                  {formatCurrency(stats.amount)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600">Počet záznamů</div>
                <div className="text-3xl font-bold mt-1">
                  {stats.count}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detaily</CardTitle>
              <CardDescription>
                Kompletní seznam záznamů v reportu
              </CardDescription>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <p className="text-gray-600 text-center py-4">
                  Žádné záznamy pro vybrané období
                </p>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{entry.description}</div>
                        <div className="text-sm text-gray-600">
                          {formatDate(entry.date)} • {entry.start_time} - {entry.end_time}
                          {entry.client && ` • ${entry.client.name}`}
                          {entry.phase && ` • ${entry.phase.name}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatCurrency((entry.duration_minutes / 60) * entry.hourly_rate)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatTime(entry.duration_minutes)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
