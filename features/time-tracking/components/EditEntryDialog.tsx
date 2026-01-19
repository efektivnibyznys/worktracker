'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { calculateDuration } from '@/lib/utils/time'
import { determineHourlyRate } from '@/lib/utils/calculations'
import { useAuthStore } from '@/lib/stores/authStore'
import { EntryWithRelations } from '../types/entry.types'

const editEntrySchema = z.object({
  client_id: z.string().min(1, 'Vyberte klienta'),
  phase_id: z.string().optional(),
  date: z.string().min(1, 'Datum je povinné'),
  start_time: z.string().min(1, 'Čas od je povinný'),
  end_time: z.string().min(1, 'Čas do je povinný'),
  description: z.string().min(1, 'Popis je povinný'),
  hourly_rate: z.string()
    .optional()
    .refine((val) => !val || parseFloat(val) >= 0, {
      message: 'Hodinová sazba musí být kladné číslo',
    }),
}).refine((data) => {
  if (!data.start_time || !data.end_time) return true
  const [startHour, startMin] = data.start_time.split(':').map(Number)
  const [endHour, endMin] = data.end_time.split(':').map(Number)
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  return endMinutes > startMinutes
}, {
  message: 'Čas do musí být později než čas od',
  path: ['end_time'],
})

type EditEntryFormData = z.infer<typeof editEntrySchema>

export type EditEntrySubmitData = Omit<EditEntryFormData, 'hourly_rate' | 'phase_id'> & {
  duration_minutes: number
  hourly_rate: number
  phase_id: string | null
}

interface EditEntryDialogProps {
  entry: EntryWithRelations | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditEntrySubmitData) => void | Promise<void>
  isLoading?: boolean
}

export function EditEntryDialog({
  entry,
  open,
  onOpenChange,
  onSubmit,
  isLoading
}: EditEntryDialogProps) {
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
  } = useForm<EditEntryFormData>({
    resolver: zodResolver(editEntrySchema),
  })

  const clientId = watch('client_id')
  const phaseId = watch('phase_id')
  const startTime = watch('start_time')
  const endTime = watch('end_time')

  // Initialize form with entry data when entry changes
  useEffect(() => {
    if (entry && open) {
      setValue('client_id', entry.client_id)
      setValue('phase_id', entry.phase_id || '')
      setValue('date', entry.date)
      setValue('start_time', entry.start_time)
      setValue('end_time', entry.end_time)
      setValue('description', entry.description)
      setValue('hourly_rate', entry.hourly_rate.toString())
      setSelectedClientId(entry.client_id)
    }
  }, [entry, open, setValue])

  const handleFormSubmit = async (data: EditEntryFormData) => {
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

    const { phase_id, hourly_rate: _, ...restData } = data
    await onSubmit({
      ...restData,
      duration_minutes: duration,
      hourly_rate: hourlyRate,
      phase_id: phase_id || null,
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upravit záznam</DialogTitle>
        </DialogHeader>

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
              rows={3}
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

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Zrušit
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Ukládám...' : 'Uložit změny'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
