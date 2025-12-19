'use client'

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { PhaseService } from '../services/phaseService'
import { PhaseInsert, PhaseUpdate } from '../types/phase.types'

const PHASES_KEY = 'phases'

export function usePhases(clientId?: string) {
  // Memoize supabase client and service to avoid recreation on every render
  const supabase = useMemo(() => createSupabaseClient(), [])
  const phaseService = useMemo(() => new PhaseService(supabase), [supabase])
  const queryClient = useQueryClient()

  // Get phases for a specific client with stats
  const { data: phases, isLoading, error } = useQuery({
    queryKey: [PHASES_KEY, clientId],
    queryFn: () =>
      clientId
        ? phaseService.getByClientWithStats(clientId)
        : Promise.resolve([]),
    enabled: !!clientId,
  })

  // Create phase mutation
  const createPhase = useMutation({
    mutationFn: (data: PhaseInsert) => phaseService.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PHASES_KEY, variables.client_id] })
    },
  })

  // Update phase mutation
  const updatePhase = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PhaseUpdate }) =>
      phaseService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PHASES_KEY] })
    },
  })

  // Delete phase mutation
  const deletePhase = useMutation({
    mutationFn: (id: string) => phaseService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PHASES_KEY] })
    },
  })

  return {
    phases: phases || [],
    isLoading,
    error,
    createPhase,
    updatePhase,
    deletePhase,
  }
}
