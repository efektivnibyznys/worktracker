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
import { useClients } from '../hooks/useClients'
import { usePhases } from '../hooks/usePhases'
import { useSettings } from '../hooks/useSettings'
import { getTodayDate } from '@/lib/utils/date'
import { calculateDuration } from '@/lib/utils/time'
import { determineHourlyRate } from '@/lib/utils/calculations'
import { useAuthStore } from '@/lib/stores/authStore'
import { useState } from 'react'

const quickAddSchema = z.object({
  client_id: z.string().min(1, 'Vyberte klienta'),
  phase_id: z.string().optional(),
  date: z.string().min(1, 'Datum je povinné'),
  start_time: z.string().min(1, 'Čas od je povinný'),
  end_time: z.string().min(1, 'Čas do je povinný'),
  description: z.string().min(1, 'Popis je povinný'),
  hourly_rate: z.string().optional(),
})

type QuickAddFormData = z.infer<typeof quickAddSchema>

interface QuickAddFormProps {
  onSubmit: (data: any) => void | Promise<void>
  isLoading?: boolean
}

export function QuickAddForm({ onSubmit, isLoading }: QuickAddFormProps) {
  const { user } = useAuthStore()
  const { clients } = useClients()
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const { phases } = usePhases(selectedClientId)
  const { settings } = useSettings(user?.id)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<QuickAddFormData>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      date: getTodayDate(),
      start_time: '',
      end_time: '',
      description: '',
    },
  })

  const clientId = watch('client_id')
  const phaseId = watch('phase_id')
  const startTime = watch('start_time')
  const endTime = watch('end_time')
  const manualRate = watch('hourly_rate')

  const handleFormSubmit = async (data: QuickAddFormData) => {
    // Calculate duration
    const duration = calculateDuration(data.start_time, data.end_time)

    // Determine hourly rate
    const selectedClient = clients.find(c => c.id === data.client_id)
    const selectedPhase = phases.find(p => p.id === data.phase_id)

    const hourlyRate = determineHourlyRate(
      data.hourly_rate ? parseFloat(data.hourly_rate) : null,
      selectedPhase?.hourly_rate || null,
      selectedClient?.hourly_rate || null,
      settings?.default_hourly_rate || 850
    )

    await onSubmit({
      ...data,
      duration_minutes: duration,
      hourly_rate: hourlyRate,
      phase_id: data.phase_id || null,
    })

    // Reset form after successful submit
    reset({
      client_id: '',
      phase_id: '',
      date: getTodayDate(),
      start_time: '',
      end_time: '',
      description: '',
      hourly_rate: '',
    })
    setSelectedClientId('')
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="client_id">Klient *</Label>
          <Select
            value={clientId}
            onValueChange={(value) => {
              setValue('client_id', value)
              setSelectedClientId(value)
              setValue('phase_id', '') // Reset phase when client changes
            }}
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

        <div>
          <Label htmlFor="phase_id">Fáze</Label>
          <Select
            value={phaseId}
            onValueChange={(value) => setValue('phase_id', value)}
            disabled={!clientId || phases.length === 0}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={!clientId ? "Nejprve vyberte klienta" : "Volitelné"} />
            </SelectTrigger>
            <SelectContent>
              {phases.map((phase) => (
                <SelectItem key={phase.id} value={phase.id}>
                  {phase.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="date">Datum *</Label>
          <Input
            id="date"
            type="date"
            {...register('date')}
            className="mt-1"
          />
          {errors.date && (
            <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="start_time">Od *</Label>
          <Input
            id="start_time"
            type="time"
            {...register('start_time')}
            className="mt-1"
          />
          {errors.start_time && (
            <p className="text-sm text-red-600 mt-1">{errors.start_time.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="end_time">Do *</Label>
          <Input
            id="end_time"
            type="time"
            {...register('end_time')}
            className="mt-1"
          />
          {errors.end_time && (
            <p className="text-sm text-red-600 mt-1">{errors.end_time.message}</p>
          )}
          {startTime && endTime && (
            <p className="text-xs text-gray-500 mt-1">
              Doba: {Math.floor(calculateDuration(startTime, endTime) / 60)}h{' '}
              {calculateDuration(startTime, endTime) % 60}min
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="description">Popis *</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Co jste dělali..."
          rows={2}
          className="mt-1"
        />
        {errors.description && (
          <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="hourly_rate">Hodinová sazba (Kč)</Label>
        <Input
          id="hourly_rate"
          type="number"
          step="0.01"
          {...register('hourly_rate')}
          placeholder="Automaticky určená"
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Volitelné - pokud nevyplníte, použije se sazba z fáze/klienta/nastavení
        </p>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Přidávám...' : '+ Přidat záznam'}
      </Button>
    </form>
  )
}
