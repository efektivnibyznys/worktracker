'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Phase, PhaseStatus } from '../types/phase.types'

const phaseSchema = z.object({
  name: z.string().min(1, 'Název fáze je povinný'),
  description: z.string().optional(),
  hourly_rate: z.string()
    .optional()
    .refine((val) => !val || parseFloat(val) >= 0, {
      message: 'Hodinová sazba musí být kladné číslo',
    }),
  status: z.enum(['active', 'completed', 'paused']),
})

type PhaseFormData = z.infer<typeof phaseSchema>

interface PhaseFormProps {
  phase?: Phase
  onSubmit: (data: PhaseFormData) => void | Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function PhaseForm({ phase, onSubmit, onCancel, isLoading }: PhaseFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PhaseFormData>({
    resolver: zodResolver(phaseSchema),
    defaultValues: {
      name: phase?.name || '',
      description: phase?.description || '',
      hourly_rate: phase?.hourly_rate?.toString() || '',
      status: phase?.status || 'active',
    },
  })

  const status = watch('status')

  const handleFormSubmit = async (data: PhaseFormData) => {
    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Název fáze *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Např. Úvodní analýza"
          className="mt-1"
        />
        {errors.name && (
          <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Popis</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Volitelný popis fáze..."
          rows={2}
          className="mt-1"
        />
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
          Volitelné - použije se pokud není nastavena sazba na záznamu
        </p>
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          value={status}
          onValueChange={(value) => setValue('status', value as PhaseStatus)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">✅ Aktivní</SelectItem>
            <SelectItem value="completed">☑️ Dokončeno</SelectItem>
            <SelectItem value="paused">⏸️ Pozastaveno</SelectItem>
          </SelectContent>
        </Select>
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
          {isLoading ? 'Ukládám...' : phase ? 'Uložit změny' : 'Přidat fázi'}
        </Button>
      </div>
    </form>
  )
}
