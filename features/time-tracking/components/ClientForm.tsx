'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Client } from '../types/client.types'

const clientSchema = z.object({
  name: z.string().min(1, 'Jméno klienta je povinné'),
  hourly_rate: z.string()
    .optional()
    .refine((val) => !val || parseFloat(val) >= 0, {
      message: 'Hodinová sazba musí být kladné číslo',
    }),
  note: z.string().optional(),
})

export type ClientFormData = z.infer<typeof clientSchema>

interface ClientFormProps {
  client?: Client
  onSubmit: (data: ClientFormData) => void | Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function ClientForm({ client, onSubmit, onCancel, isLoading }: ClientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name || '',
      hourly_rate: client?.hourly_rate?.toString() || '',
      note: client?.note || '',
    },
  })

  const handleFormSubmit = async (data: ClientFormData) => {
    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Jméno klienta *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Např. Anna Marešová"
          className="mt-1"
        />
        {errors.name && (
          <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="hourly_rate">Hodinová sazba (Kč)</Label>
        <Input
          id="hourly_rate"
          type="number"
          step="0.01"
          {...register('hourly_rate')}
          placeholder="Např. 850"
          className="mt-1"
        />
        <p className="text-sm text-gray-500 mt-1">
          Volitelné - použije se pokud není nastavena sazba na fázi nebo záznamu
        </p>
        {errors.hourly_rate && (
          <p className="text-sm text-red-600 mt-1">{errors.hourly_rate.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="note">Poznámka</Label>
        <Textarea
          id="note"
          {...register('note')}
          placeholder="Volitelná poznámka o klientovi..."
          rows={3}
          className="mt-1"
        />
        {errors.note && (
          <p className="text-sm text-red-600 mt-1">{errors.note.message}</p>
        )}
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Zrušit
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Ukládám...' : client ? 'Uložit změny' : 'Přidat klienta'}
        </Button>
      </div>
    </form>
  )
}
