'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { EntryWithRelations } from '@/features/time-tracking/types/entry.types'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { formatTime } from '@/lib/utils/time'

interface ReportEntrySelectorProps {
  entries: EntryWithRelations[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onSelectAll: (ids: string[]) => void
  onClearSelection: () => void
  isLoading?: boolean
}

export function ReportEntrySelector({
  entries,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearSelection,
  isLoading,
}: ReportEntrySelectorProps) {
  const selectedSet = new Set(selectedIds)
  const allSelected = entries.length > 0 && entries.every(entry => selectedSet.has(entry.id))

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(item => (
          <div key={item} className="h-20 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return <p className="py-8 text-center text-gray-700">Žádné záznamy pro vybrané období</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 rounded-lg bg-gray-50 p-4 sm:flex-row sm:items-center">
        <label htmlFor="report-select-all" className="flex cursor-pointer items-center gap-3">
          <Checkbox
            id="report-select-all"
            checked={allSelected}
            onCheckedChange={() => {
              if (allSelected) {
                onClearSelection()
              } else {
                onSelectAll(entries.map(entry => entry.id))
              }
            }}
          />
          <span className="font-medium">{allSelected ? 'Zrušit výběr všech' : 'Vybrat vše'}</span>
          <Badge variant="secondary">{entries.length} záznamů</Badge>
        </label>
        {selectedIds.length > 0 && !allSelected && (
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Zrušit výběr
          </Button>
        )}
      </div>

      <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
        {entries.map(entry => {
          const isSelected = selectedSet.has(entry.id)
          const amount = (entry.duration_minutes / 60) * entry.hourly_rate

          return (
            <label
              key={entry.id}
              htmlFor={`report-entry-${entry.id}`}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                isSelected
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="shrink-0 pt-0.5">
                <Checkbox
                  id={`report-entry-${entry.id}`}
                  checked={isSelected}
                  onCheckedChange={() => onToggle(entry.id)}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900">{entry.description}</span>
                  {entry.client && <Badge variant="secondary">{entry.client.name}</Badge>}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600">
                  <span>{formatDate(entry.date)}</span>
                  <span>{entry.start_time.slice(0, 5)}–{entry.end_time.slice(0, 5)}</span>
                  {entry.project && <span>Projekt: {entry.project.name}</span>}
                  {entry.phase && <span>Fáze: {entry.phase.name}</span>}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="font-semibold text-gray-900">{formatCurrency(amount)}</div>
                <div className="text-sm text-gray-600">{formatTime(entry.duration_minutes)}</div>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
