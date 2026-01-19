'use client'

import { useState, useMemo, useEffect } from 'react'
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
import { formatDate } from '@/lib/utils/date'
import type { CreateLinkedInvoiceInput } from '../types/invoice.types'
import type { EntryWithRelations } from '@/features/time-tracking/types/entry.types'

const linkedInvoiceSchema = z.object({
  client_id: z.string().optional(), // Validated manually when not preselected
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
  preselectedEntries?: EntryWithRelations[]
}

/**
 * Form for creating invoice from selected time entries
 */
export function LinkedInvoiceForm({
  onSubmit,
  onCancel,
  isLoading,
  preselectedEntryIds = [],
  preselectedEntries = []
}: LinkedInvoiceFormProps) {
  const { user } = useAuthStore()
  const { clients } = useClients()
  const { settings } = useSettings(user?.id)

  // Check if we have preselected entries with data
  const hasPreselectedEntries = preselectedEntries.length > 0

  // Get client from preselected entries (they should all be from the same client)
  // Try client_id first, fallback to client.id if available
  const preselectedClientId = useMemo(() => {
    if (!hasPreselectedEntries) return ''
    const entry = preselectedEntries[0]
    return entry.client_id || entry.client?.id || ''
  }, [hasPreselectedEntries, preselectedEntries])

  // Check if all preselected entries are from the same client
  const allSameClient = useMemo(() => {
    if (!hasPreselectedEntries) return true
    return preselectedEntries.every(e => e.client_id === preselectedClientId)
  }, [hasPreselectedEntries, preselectedEntries, preselectedClientId])

  // For manual selection mode, track selected client
  const [manualClientId, setManualClientId] = useState<string>('')

  // Use preselected client or manual selection
  const selectedClientId = hasPreselectedEntries ? preselectedClientId : manualClientId

  // Entry selection - only used when no preselected entries
  const {
    selectedIds,
    toggle,
    selectAll,
    clearSelection,
    hasSelection: hasManualSelection
  } = useEntrySelection(preselectedEntryIds)

  // Fetch unbilled entries for selected client - only when no preselected entries
  const { data: unbilledEntries = [], isLoading: entriesLoading } =
    useUnbilledEntries(!hasPreselectedEntries ? selectedClientId || undefined : undefined)

  // Use preselected entries or selected from EntrySelector
  const effectiveEntries = useMemo(() => {
    if (hasPreselectedEntries) {
      return preselectedEntries
    }
    return unbilledEntries.filter(e => selectedIds.includes(e.id))
  }, [hasPreselectedEntries, preselectedEntries, unbilledEntries, selectedIds])

  const effectiveEntryIds = useMemo(() => {
    if (hasPreselectedEntries) {
      return preselectedEntries.map(e => e.id)
    }
    return selectedIds
  }, [hasPreselectedEntries, preselectedEntries, selectedIds])

  const hasSelection = hasPreselectedEntries || hasManualSelection

  // Calculate totals from effective entries
  const totals = useMemo(() => {
    const totalMinutes = effectiveEntries.reduce((sum, e) => sum + e.duration_minutes, 0)
    const subtotal = effectiveEntries.reduce((sum, e) => {
      const hours = e.duration_minutes / 60
      return sum + (hours * e.hourly_rate)
    }, 0)
    return { totalMinutes, subtotal, count: effectiveEntries.length }
  }, [effectiveEntries])

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
      client_id: preselectedClientId || '',
      group_by: 'entry',
      issue_date: today,
      due_date: defaultDueDate,
      tax_rate: String(settings?.default_tax_rate || 0),
      notes: ''
    }
  })

  // Update form client_id when preselected
  useEffect(() => {
    if (hasPreselectedEntries && preselectedClientId) {
      setValue('client_id', preselectedClientId)
    }
  }, [hasPreselectedEntries, preselectedClientId, setValue])

  const taxRate = parseFloat(watch('tax_rate') || '0')
  const taxAmount = totals.subtotal * (taxRate / 100)
  const totalAmount = totals.subtotal + taxAmount

  const handleClientChange = (clientId: string) => {
    setManualClientId(clientId)
    setValue('client_id', clientId)
    clearSelection() // Reset selection when client changes
  }

  const handleFormSubmit = async (data: LinkedInvoiceFormData) => {
    if (effectiveEntryIds.length === 0) {
      return
    }

    // Use preselected client or form data
    const clientId = hasPreselectedEntries ? preselectedClientId : data.client_id

    // Validate client_id
    if (!clientId) {
      return
    }

    await onSubmit({
      client_id: clientId,
      entry_ids: effectiveEntryIds,
      group_by: data.group_by,
      issue_date: data.issue_date,
      due_date: data.due_date,
      tax_rate: parseFloat(data.tax_rate || '0'),
      notes: data.notes
    })
  }

  // Direct submit handler that bypasses react-hook-form validation for preselected entries
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!hasPreselectedEntries) {
      // Use react-hook-form validation for manual selection
      handleSubmit(handleFormSubmit)(e)
      return
    }

    // For preselected entries, submit directly with form values
    const formData = {
      client_id: preselectedClientId,
      group_by: watch('group_by'),
      issue_date: watch('issue_date'),
      due_date: watch('due_date'),
      tax_rate: watch('tax_rate'),
      notes: watch('notes')
    }

    await handleFormSubmit(formData as LinkedInvoiceFormData)
  }

  // Get client name for display - prefer from preselected entries, fallback to clients list
  const clientName = useMemo(() => {
    if (hasPreselectedEntries && preselectedEntries[0]?.client?.name) {
      return preselectedEntries[0].client.name
    }
    const client = clients.find(c => c.id === selectedClientId)
    return client?.name || ''
  }, [hasPreselectedEntries, preselectedEntries, clients, selectedClientId])

  // Show warning if entries are from different clients
  if (hasPreselectedEntries && !allSameClient) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 font-medium">
            Vybrané záznamy jsou od různých klientů
          </p>
          <p className="text-amber-700 text-sm mt-1">
            Pro vytvoření faktury vyberte záznamy pouze od jednoho klienta.
          </p>
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Zavřít
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleDirectSubmit} className="space-y-6">
      {/* Client - show as read-only when preselected */}
      {hasPreselectedEntries ? (
        <div>
          <Label>Klient</Label>
          <div className="mt-1 p-3 bg-gray-50 rounded-md border">
            <span className="font-medium">{clientName}</span>
          </div>
        </div>
      ) : (
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
      )}

      {/* Show preselected entries summary or entry selector */}
      {hasPreselectedEntries ? (
        <div>
          <Label>Vybrané záznamy ({effectiveEntries.length})</Label>
          <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
            {effectiveEntries.map(entry => (
              <div key={entry.id} className="p-3 border-b last:border-b-0 text-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium">{formatDate(entry.date)}</span>
                    {entry.phase?.name && (
                      <span className="text-gray-500 ml-2">• {entry.phase.name}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{formatTime(entry.duration_minutes)}</span>
                    <span className="text-gray-500 ml-2">
                      {formatCurrency((entry.duration_minutes / 60) * entry.hourly_rate)}
                    </span>
                  </div>
                </div>
                {entry.description && (
                  <p className="text-gray-600 mt-1 truncate">{entry.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        selectedClientId && (
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
            {!hasManualSelection && (
              <p className="text-sm text-amber-600 mt-1">
                Vyberte alespoň jeden záznam
              </p>
            )}
          </div>
        )
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
