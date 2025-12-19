'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { useSettings } from '@/features/time-tracking/hooks/useSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/lib/stores/authStore'
import { useEffect, useCallback } from 'react'
import { usePageMetadata } from '@/lib/hooks/usePageMetadata'

const settingsSchema = z.object({
  default_hourly_rate: z.string()
    .min(1, 'Výchozí sazba je povinná')
    .refine((val) => parseFloat(val) >= 0, {
      message: 'Výchozí sazba musí být kladné číslo',
    }),
  currency: z.string().min(1, 'Měna je povinná'),
})

type SettingsFormData = z.infer<typeof settingsSchema>

export default function SettingsPage() {
  usePageMetadata({
    title: 'Nastavení | Work Tracker',
    description: 'Globální nastavení aplikace'
  })

  const { user } = useAuthStore()
  const { settings, isLoading, updateSettings } = useSettings(user?.id)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      default_hourly_rate: '850',
      currency: 'Kč',
    },
  })

  // Reset form when settings load
  useEffect(() => {
    if (settings) {
      reset({
        default_hourly_rate: settings.default_hourly_rate.toString(),
        currency: settings.currency,
      })
    }
  }, [settings, reset])

  const onSubmit = useCallback(async (data: SettingsFormData) => {
    if (!user) return

    try {
      await updateSettings.mutateAsync({
        userId: user.id,
        data: {
          default_hourly_rate: parseFloat(data.default_hourly_rate),
          currency: data.currency,
        },
      })
      toast.success('Nastavení bylo úspěšně uloženo')
    } catch (error) {
      toast.error('Nepodařilo se uložit nastavení')
      console.error(error)
    }
  }, [user, updateSettings])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Načítám nastavení...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Nastavení</h2>
        <p className="text-gray-600 mt-1">Spravujte globální nastavení aplikace</p>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Základní nastavení</CardTitle>
            <CardDescription>
              Výchozí hodnoty pro nové záznamy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="default_hourly_rate">
                  Výchozí hodinová sazba *
                </Label>
                <Input
                  id="default_hourly_rate"
                  type="number"
                  step="0.01"
                  {...register('default_hourly_rate')}
                  placeholder="850"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Použije se když není nastavena sazba na záznamu, fázi nebo klientovi
                </p>
                {errors.default_hourly_rate && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.default_hourly_rate.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="currency">Měna *</Label>
                <Input
                  id="currency"
                  {...register('currency')}
                  placeholder="Kč"
                  className="mt-1"
                />
                {errors.currency && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.currency.message}
                  </p>
                )}
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={updateSettings.isPending}
                >
                  {updateSettings.isPending ? 'Ukládám...' : 'Uložit nastavení'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
