'use client'

import { useState, useMemo } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
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
import { useClients } from '@/features/time-tracking/hooks/useClients'
import { useSettings } from '@/features/time-tracking/hooks/useSettings'
import { useAuthStore } from '@/lib/stores/authStore'
import { formatCurrency } from '@/lib/utils/currency'
import type { CreateStandaloneInvoiceInput } from '../types/invoice.types'

const itemSchema = z.object({
  description: z.string().min(1, 'Popis je povinný'),
  quantity: z.string().min(1, 'Množství je povinné'),
  unit: z.string().min(1, 'Jednotka je povinná'),
  unit_price: z.string().min(1, 'Cena je povinná')
})

const standaloneInvoiceSchema = z.object({
  client_id: z.string().optional(),
  issue_date: z.string().min(1, 'Datum vystavení je povinné'),
  due_date: z.string().min(1, 'Datum splatnosti je povinné'),
  tax_rate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Přidejte alespoň jednu položku')
})

type StandaloneInvoiceFormData = z.infer<typeof standaloneInvoiceSchema>

interface StandaloneInvoiceFormProps {
  onSubmit: (input: CreateStandaloneInvoiceInput) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

/**
 * Form for creating standalone invoice with custom items
 */
export function StandaloneInvoiceForm({
  onSubmit,
  onCancel,
  isLoading
}: StandaloneInvoiceFormProps) {
  const { user } = useAuthStore()
  const { clients } = useClients()
  const { settings } = useSettings(user?.id)

  // Default dates
  const today = new Date().toISOString().split('T')[0]
  const defaultDueDays = settings?.default_due_days || 14
  const defaultDueDate = new Date(Date.now() + defaultDueDays * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<StandaloneInvoiceFormData>({
    resolver: zodResolver(standaloneInvoiceSchema),
    defaultValues: {
      client_id: '',
      issue_date: today,
      due_date: defaultDueDate,
      tax_rate: String(settings?.default_tax_rate || 0),
      notes: '',
      items: [{ description: '', quantity: '1', unit: 'ks', unit_price: '' }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  })

  const items = watch('items')
  const taxRate = parseFloat(watch('tax_rate') || '0')

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0
      const unitPrice = parseFloat(item.unit_price) || 0
      return sum + (quantity * unitPrice)
    }, 0)
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount
    return { subtotal, taxAmount, total }
  }, [items, taxRate])

  const handleFormSubmit = async (data: StandaloneInvoiceFormData) => {
    await onSubmit({
      client_id: data.client_id || undefined,
      issue_date: data.issue_date,
      due_date: data.due_date,
      tax_rate: parseFloat(data.tax_rate || '0'),
      notes: data.notes,
      items: data.items.map(item => ({
        description: item.description,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        unit_price: parseFloat(item.unit_price)
      }))
    })
  }

  const addItem = () => {
    append({ description: '', quantity: '1', unit: 'ks', unit_price: '' })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Client selection (optional) */}
      <div>
        <Label htmlFor="client_id">Klient (volitelné)</Label>
        <Select
          value={watch('client_id') || 'none'}
          onValueChange={(value) => setValue('client_id', value === 'none' ? '' : value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Bez klienta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Bez klienta</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
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

      {/* Invoice items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Položky faktury *</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            + Přidat položku
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => {
            const itemQuantity = parseFloat(items[index]?.quantity) || 0
            const itemPrice = parseFloat(items[index]?.unit_price) || 0
            const itemTotal = itemQuantity * itemPrice

            return (
              <div key={field.id} className="p-4 border rounded-lg bg-gray-50">
                <div className="grid grid-cols-12 gap-3">
                  {/* Description */}
                  <div className="col-span-12 md:col-span-5">
                    <Label className="text-xs">Popis</Label>
                    <Input
                      {...register(`items.${index}.description`)}
                      placeholder="Popis položky"
                      className="mt-1"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-4 md:col-span-2">
                    <Label className="text-xs">Množství</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`items.${index}.quantity`)}
                      className="mt-1"
                    />
                  </div>

                  {/* Unit */}
                  <div className="col-span-4 md:col-span-1">
                    <Label className="text-xs">Jedn.</Label>
                    <Input
                      {...register(`items.${index}.unit`)}
                      placeholder="ks"
                      className="mt-1"
                    />
                  </div>

                  {/* Unit price */}
                  <div className="col-span-4 md:col-span-2">
                    <Label className="text-xs">Cena/jedn.</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`items.${index}.unit_price`)}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>

                  {/* Total + delete */}
                  <div className="col-span-12 md:col-span-2 flex items-end justify-between">
                    <div className="text-right">
                      <Label className="text-xs">Celkem</Label>
                      <div className="font-semibold mt-1">
                        {formatCurrency(itemTotal)}
                      </div>
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => remove(index)}
                      >
                        Odebrat
                      </Button>
                    )}
                  </div>
                </div>
                {errors.items?.[index] && (
                  <p className="text-sm text-red-600 mt-2">
                    Vyplňte všechna pole položky
                  </p>
                )}
              </div>
            )
          })}
        </div>
        {errors.items?.message && (
          <p className="text-sm text-red-600 mt-1">{errors.items.message}</p>
        )}
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
          <span>Položek:</span>
          <span className="font-medium">{fields.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Mezisoučet:</span>
          <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
        </div>
        {taxRate > 0 && (
          <div className="flex justify-between text-sm">
            <span>DPH ({taxRate}%):</span>
            <span className="font-medium">{formatCurrency(totals.taxAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold pt-2 border-t">
          <span>Celkem:</span>
          <span>{formatCurrency(totals.total)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Zrušit
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Vytvářím...' : 'Vytvořit fakturu'}
        </Button>
      </div>
    </form>
  )
}
