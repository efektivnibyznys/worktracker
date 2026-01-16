'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { EntrySelector } from './EntrySelector'
import { useUnbilledEntries } from '../hooks/useInvoices'
import { useEntrySelection } from '../hooks/useEntrySelection'
import { useClients } from '@/features/time-tracking/hooks/useClients'
import { useSettings } from '@/features/time-tracking/hooks/useSettings'
import { useAuthStore } from '@/lib/stores/authStore'
import { formatCurrency } from '@/lib/utils/currency'
import { formatTime } from '@/lib/utils/time'
import type { CreateLinkedInvoiceInput } from '../types/invoice.types'

const linkedInvoiceSchema = z.object({
  client_id: z.string().min(1, 'Vyberte klienta'),
  group_by: z.enum(['entry', 'phase', 'day']),
  issue_date: z.string().min(1, 'Datum vystavení je povinné'),
  due_date: z.string().min(1, 'Datum splatnosti je povinné'),
  tax_rate: z.string().optional(),
  notes: z.string().optional()
})

type LinkedInvoiceFormData = z.infer<typeof linkedInvoiceSchema>

interface LinkedInvoiceFormProps {
  onSubmit: (input: CreateLinkedInvoiceInput) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  preselectedEntryIds?: string[]
}

/**
 * Form for creating invoice from selected time entries
 */
export function LinkedInvoiceForm({
  onSubmit,
  onCancel,
  isLoading,
  preselectedEntryIds = []
}: LinkedInvoiceFormProps) {
  const { user } = useAuthStore()
  const { clients } = useClients()
  const { settings } = useSettings(user?.id)

  const [selectedClientId, setSelectedClientId] = useState<string>('')

  // Entry selection
  const {
    selectedIds,
    toggle,
    selectAll,
    clearSelection,
    hasSelection
  } = useEntrySelection(preselectedEntryIds)

  // Fetch unbilled entries for selected client
  const { data: unbilledEntries = [], isLoading: entriesLoading } =
    useUnbilledEntries(selectedClientId || undefined)

  // Calculate totals from selected entries
  const totals = useMemo(() => {
    const selectedEntries = unbilledEntries.filter(e => selectedIds.includes(e.id))
    const totalMinutes = selectedEntries.reduce((sum, e) => sum + e.duration_minutes, 0)
    const subtotal = selectedEntries.reduce((sum, e) => {
      const hours = e.duration_minutes / 60
      return sum + (hours * e.hourly_rate)
    }, 0)
    return { totalMinutes, subtotal, count: selectedEntries.length }
  }, [unbilledEntries, selectedIds])

  // Default dates
  const today = new Date().toISOString().split('T')[0]
  const defaultDueDays = settings?.default_due_days || 14
  const defaultDueDate = new Date(Date.now() + defaultDueDays * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<LinkedInvoiceFormData>({
    resolver: zodResolver(linkedInvoiceSchema),
    defaultValues: {
      client_id: '',
      group_by: 'entry',
      issue_date: today,
      due_date: defaultDueDate,
      tax_rate: String(settings?.default_tax_rate || 0),
      notes: ''
    }
  })

  const taxRate = parseFloat(watch('tax_rate') || '0')
  const taxAmount = totals.subtotal * (taxRate / 100)
  const totalAmount = totals.subtotal + taxAmount

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId)
    setValue('client_id', clientId)
    clearSelection() // Reset selection when client changes
  }

  const handleFormSubmit = async (data: LinkedInvoiceFormData) => {
    if (selectedIds.length === 0) {
      return
    }

    await onSubmit({
      client_id: data.client_id,
      entry_ids: selectedIds,
      group_by: data.group_by,
      issue_date: data.issue_date,
      due_date: data.due_date,
      tax_rate: parseFloat(data.tax_rate || '0'),
      notes: data.notes
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Client selection */}
      <div>
        <Label htmlFor="client_id">Klient *</Label>
        <Select
          value={selectedClientId}
          onValueChange={handleClientChange}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Vyberte klienta" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.client_id && (
          <p className="text-sm text-red-600 mt-1">{errors.client_id.message}</p>
        )}
      </div>

      {/* Entry selector - only show when client is selected */}
      {selectedClientId && (
        <div>
          <Label>Vyberte záznamy k fakturaci *</Label>
          <div className="mt-2 border rounded-lg">
            <EntrySelector
              entries={unbilledEntries}
              selectedIds={selectedIds}
              onToggle={toggle}
              onSelectAll={selectAll}
              onClearSelection={clearSelection}
              isLoading={entriesLoading}
            />
          </div>
          {!hasSelection && (
            <p className="text-sm text-amber-600 mt-1">
              Vyberte alespoň jeden záznam
            </p>
          )}
        </div>
      )}

      {/* Grouping strategy */}
      {hasSelection && (
        <>
          <div>
            <Label htmlFor="group_by">Seskupení položek</Label>
            <Select
              value={watch('group_by')}
              onValueChange={(value: 'entry' | 'phase' | 'day') =>
                setValue('group_by', value)
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Každý záznam zvlášť</SelectItem>
                <SelectItem value="phase">Seskupit podle fáze</SelectItem>
                <SelectItem value="day">Seskupit podle dne</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issue_date">Datum vystavení *</Label>
              <Input
                id="issue_date"
                type="date"
                {...register('issue_date')}
                className="mt-1"
              />
              {errors.issue_date && (
                <p className="text-sm text-red-600 mt-1">{errors.issue_date.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="due_date">Datum splatnosti *</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
                className="mt-1"
              />
              {errors.due_date && (
                <p className="text-sm text-red-600 mt-1">{errors.due_date.message}</p>
              )}
            </div>
          </div>

          {/* Tax rate */}
          <div>
            <Label htmlFor="tax_rate">DPH (%)</Label>
            <Input
              id="tax_rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register('tax_rate')}
              className="mt-1 w-32"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Poznámka na fakturu</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Vybraných záznamů:</span>
              <span className="font-medium">{totals.count}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Celkem hodin:</span>
              <span className="font-medium">{formatTime(totals.totalMinutes)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Mezisoučet:</span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between text-sm">
                <span>DPH ({taxRate}%):</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Celkem:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Zrušit
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !hasSelection}
        >
          {isLoading ? 'Vytvářím...' : 'Vytvořit fakturu'}
        </Button>
      </div>
    </form>
  )
}
