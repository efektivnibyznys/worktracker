'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useSettings } from '@/features/time-tracking/hooks/useSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/lib/stores/authStore'
import { useEffect, useCallback } from 'react'
import { usePageMetadata } from '@/lib/hooks/usePageMetadata'

const settingsSchema = z.object({
  // Základní nastavení
  default_hourly_rate: z.string()
    .min(1, 'Výchozí sazba je povinná')
    .refine((val) => parseFloat(val) >= 0, {
      message: 'Výchozí sazba musí být kladné číslo',
    }),
  currency: z.string().min(1, 'Měna je povinná'),
  // Fakturační údaje
  company_name: z.string().optional(),
  company_address: z.string().optional(),
  company_ico: z.string().optional(),
  company_dic: z.string().optional(),
  bank_account: z.string().optional(),
  default_due_days: z.string().optional(),
  default_tax_rate: z.string().optional(),
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
      company_name: '',
      company_address: '',
      company_ico: '',
      company_dic: '',
      bank_account: '',
      default_due_days: '14',
      default_tax_rate: '21',
    },
  })

  // Reset form when settings load
  useEffect(() => {
    if (settings) {
      reset({
        default_hourly_rate: settings.default_hourly_rate.toString(),
        currency: settings.currency,
        company_name: settings.company_name || '',
        company_address: settings.company_address || '',
        company_ico: settings.company_ico || '',
        company_dic: settings.company_dic || '',
        bank_account: settings.bank_account || '',
        default_due_days: settings.default_due_days?.toString() || '14',
        default_tax_rate: settings.default_tax_rate?.toString() || '21',
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
          company_name: data.company_name || null,
          company_address: data.company_address || null,
          company_ico: data.company_ico || null,
          company_dic: data.company_dic || null,
          bank_account: data.bank_account || null,
          default_due_days: data.default_due_days ? parseInt(data.default_due_days) : 14,
          default_tax_rate: data.default_tax_rate ? parseFloat(data.default_tax_rate) : 21,
        },
      })
      toast.success('Nastavení bylo úspěšně uloženo')
    } catch (error) {
      toast.error('Nepodařilo se uložit nastavení')
      logger.error('Failed to update settings', error, {
        component: 'SettingsPage',
        action: 'onSubmit',
        metadata: { userId: user?.id },
      })
    }
  }, [user, updateSettings])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-700 text-lg">Načítám nastavení...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl md:text-4xl font-bold mb-2">Nastavení</h2>
        <p className="text-lg text-gray-700">Spravujte globální nastavení aplikace</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
        {/* Základní nastavení */}
        <Card className="bg-white p-8 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-2xl font-bold">Základní nastavení</CardTitle>
            <CardDescription className="text-gray-700 mt-1">
              Výchozí hodnoty pro nové záznamy
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
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
              <p className="text-sm text-gray-600 mt-1">
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
          </CardContent>
        </Card>

        {/* Fakturační údaje */}
        <Card className="bg-white p-8 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-2xl font-bold">Fakturační údaje</CardTitle>
            <CardDescription className="text-gray-700 mt-1">
              Údaje pro vystavování faktur
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <div>
              <Label htmlFor="company_name">Název firmy / Jméno</Label>
              <Input
                id="company_name"
                {...register('company_name')}
                placeholder="Vaše firma s.r.o."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="company_address">Adresa</Label>
              <Textarea
                id="company_address"
                {...register('company_address')}
                placeholder="Ulice 123&#10;123 45 Město"
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_ico">IČO</Label>
                <Input
                  id="company_ico"
                  {...register('company_ico')}
                  placeholder="12345678"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="company_dic">DIČ</Label>
                <Input
                  id="company_dic"
                  {...register('company_dic')}
                  placeholder="CZ12345678"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bank_account">Bankovní účet</Label>
              <Input
                id="bank_account"
                {...register('bank_account')}
                placeholder="123456789/0100"
                className="mt-1"
              />
              <p className="text-sm text-gray-600 mt-1">
                Zobrazí se na fakturách jako platební údaje
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Výchozí nastavení faktur */}
        <Card className="bg-white p-8 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-2xl font-bold">Výchozí nastavení faktur</CardTitle>
            <CardDescription className="text-gray-700 mt-1">
              Předvyplněné hodnoty pro nové faktury
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="default_due_days">Výchozí splatnost (dny)</Label>
                <Input
                  id="default_due_days"
                  type="number"
                  min="1"
                  {...register('default_due_days')}
                  placeholder="14"
                  className="mt-1"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Počet dní od vystavení faktury
                </p>
              </div>

              <div>
                <Label htmlFor="default_tax_rate">Výchozí sazba DPH (%)</Label>
                <Input
                  id="default_tax_rate"
                  type="number"
                  min="0"
                  step="0.1"
                  {...register('default_tax_rate')}
                  placeholder="21"
                  className="mt-1"
                />
                <p className="text-sm text-gray-600 mt-1">
                  0 pro neplátce DPH
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <Button
            type="submit"
            disabled={updateSettings.isPending}
            size="lg"
          >
            {updateSettings.isPending ? 'Ukládám...' : 'Uložit nastavení'}
          </Button>
        </div>
      </form>
    </div>
  )
}
