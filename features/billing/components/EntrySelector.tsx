'use client'

import { useMemo } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/date'
import { formatTime } from '@/lib/utils/time'
import { formatCurrency } from '@/lib/utils/currency'
import type { EntryWithRelations } from '@/features/time-tracking/types/entry.types'

interface EntrySelectorProps {
  entries: EntryWithRelations[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onSelectAll: (ids: string[]) => void
  onClearSelection: () => void
  isLoading?: boolean
}

/**
 * Multi-select component for choosing entries to invoice
 */
export function EntrySelector({
  entries,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearSelection,
  isLoading
}: EntrySelectorProps) {
  // Convert to Set for O(1) lookup
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  // Calculate stats for selected entries
  const stats = useMemo(() => {
    const selected = entries.filter(e => selectedSet.has(e.id))
    const totalMinutes = selected.reduce((sum, e) => sum + e.duration_minutes, 0)
    const totalAmount = selected.reduce((sum, e) => {
      const hours = e.duration_minutes / 60
      return sum + (hours * e.hourly_rate)
    }, 0)
    return {
      count: selected.length,
      totalMinutes,
      totalAmount
    }
  }, [entries, selectedSet])

  const allSelected = entries.length > 0 && entries.every(e => selectedSet.has(e.id))
  const someSelected = entries.some(e => selectedSet.has(e.id))

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-100 h-20 rounded-lg" />
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        Žádné nefakturované záznamy
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with select all */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allSelected}
            onChange={() => {
              if (allSelected) {
                onClearSelection()
              } else {
                onSelectAll(entries.map(e => e.id))
              }
            }}
          />
          <span className="font-medium">
            {allSelected ? 'Zrušit výběr' : 'Vybrat vše'}
          </span>
          <Badge variant="secondary">{entries.length} záznamů</Badge>
        </div>
        {someSelected && (
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Zrušit výběr
          </Button>
        )}
      </div>

      {/* Entry list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {entries.map((entry) => {
          const isSelected = selectedSet.has(entry.id)
          const amount = (entry.duration_minutes / 60) * entry.hourly_rate

          return (
            <div
              key={entry.id}
              className={`
                flex items-center gap-4 p-4 rounded-lg border cursor-pointer
                transition-colors duration-150
                ${isSelected
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white hover:bg-gray-50 border-gray-200'
                }
              `}
              onClick={() => onToggle(entry.id)}
            >
              <Checkbox
                checked={isSelected}
                onChange={() => onToggle(entry.id)}
                onClick={(e) => e.stopPropagation()}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium truncate">
                    {entry.client?.name || 'Neznámý klient'}
                  </span>
                  {entry.phase && (
                    <Badge variant="secondary" className="text-xs">
                      {entry.phase.name}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {entry.description}
                </p>
                <div className="flex gap-4 text-xs text-gray-500 mt-1">
                  <span>{formatDate(entry.date)}</span>
                  <span>{entry.start_time} - {entry.end_time}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-semibold">{formatCurrency(amount)}</div>
                <div className="text-sm text-gray-600">
                  {formatTime(entry.duration_minutes)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer with selection summary */}
      {someSelected && (
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200 sticky bottom-0">
          <div className="flex items-center gap-4">
            <span className="font-medium">Vybráno:</span>
            <Badge>{stats.count} záznamů</Badge>
            <span className="text-gray-600">{formatTime(stats.totalMinutes)}</span>
          </div>
          <div className="text-xl font-bold">
            {formatCurrency(stats.totalAmount)}
          </div>
        </div>
      )}
    </div>
  )
}
