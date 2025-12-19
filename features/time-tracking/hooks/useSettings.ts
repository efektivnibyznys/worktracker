'use client'

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { SettingsService } from '../services/settingsService'
import { SettingsUpdate } from '../types/settings.types'

const SETTINGS_KEY = 'settings'

export function useSettings(userId?: string) {
  // Memoize supabase client and service to avoid recreation on every render
  const supabase = useMemo(() => createSupabaseClient(), [])
  const settingsService = useMemo(() => new SettingsService(supabase), [supabase])
  const queryClient = useQueryClient()

  // Get user settings
  const { data: settings, isLoading, error } = useQuery({
    queryKey: [SETTINGS_KEY, userId],
    queryFn: () => (userId ? settingsService.get(userId) : Promise.resolve(null)),
    enabled: !!userId,
  })

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: SettingsUpdate }) =>
      settingsService.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SETTINGS_KEY] })
    },
  })

  return {
    settings,
    isLoading,
    error,
    updateSettings,
  }
}
