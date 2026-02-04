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
import { Project, ProjectStatus } from '../types/project.types'

const projectSchema = z.object({
  name: z.string().min(1, 'Název projektu je povinný'),
  description: z.string().optional(),
  hourly_rate: z.string()
    .optional()
    .refine((val) => !val || parseFloat(val) >= 0, {
      message: 'Hodinová sazba musí být kladné číslo',
    }),
  status: z.enum(['active', 'completed', 'paused']),
})

export type ProjectFormData = z.infer<typeof projectSchema>

interface ProjectFormProps {
  project?: Project
  onSubmit: (data: ProjectFormData) => void | Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function ProjectForm({ project, onSubmit, onCancel, isLoading }: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name || '',
      description: project?.description || '',
      hourly_rate: project?.hourly_rate?.toString() || '',
      status: project?.status || 'active',
    },
  })

  const status = watch('status')

  const handleFormSubmit = async (data: ProjectFormData) => {
    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Název projektu *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Např. Redesign webu"
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
          placeholder="Volitelný popis projektu..."
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
          onValueChange={(value) => setValue('status', value as ProjectStatus)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktivní</SelectItem>
            <SelectItem value="completed">Dokončeno</SelectItem>
            <SelectItem value="paused">Pozastaveno</SelectItem>
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
          {isLoading ? 'Ukládám...' : project ? 'Uložit změny' : 'Přidat projekt'}
        </Button>
      </div>
    </form>
  )
}
