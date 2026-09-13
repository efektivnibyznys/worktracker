'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { REPORT_COLUMNS, type ReportColumnId } from '../lib/reportExport'

interface ReportColumnDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedColumnIds: ReportColumnId[]
  onSelectedColumnIdsChange: (columnIds: ReportColumnId[]) => void
  onGenerate: () => void
  isGenerating: boolean
}

export function ReportColumnDialog({
  open,
  onOpenChange,
  selectedColumnIds,
  onSelectedColumnIdsChange,
  onGenerate,
  isGenerating,
}: ReportColumnDialogProps) {
  const selectedSet = new Set(selectedColumnIds)

  const toggleColumn = (columnId: ReportColumnId) => {
    if (selectedSet.has(columnId)) {
      onSelectedColumnIdsChange(selectedColumnIds.filter(id => id !== columnId))
    } else {
      onSelectedColumnIdsChange([...selectedColumnIds, columnId])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-xl">
        <DialogHeader>
          <DialogTitle>Sloupce PDF reportu</DialogTitle>
          <DialogDescription>
            Zvolte informace, které uvidí klient. Výběr platí pouze pro tento export.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
          {REPORT_COLUMNS.map(column => (
            <label
              key={column.id}
              htmlFor={`report-column-${column.id}`}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
            >
              <Checkbox
                id={`report-column-${column.id}`}
                checked={selectedSet.has(column.id)}
                onCheckedChange={() => toggleColumn(column.id)}
              />
              <span className="font-medium text-gray-900">{column.label}</span>
            </label>
          ))}
        </div>

        {selectedColumnIds.length === 0 && (
          <p className="text-sm text-red-600">Vyberte alespoň jeden sloupec.</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Zrušit
          </Button>
          <Button onClick={onGenerate} disabled={selectedColumnIds.length === 0 || isGenerating}>
            {isGenerating ? 'Generuji PDF…' : 'Stáhnout PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
