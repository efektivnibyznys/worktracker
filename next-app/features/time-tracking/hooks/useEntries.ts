'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { EntryService } from '../services/entryService'
import { EntryInsert, EntryUpdate, EntryFilters } from '../types/entry.types'

const ENTRIES_KEY = 'entries'

export function useEntries(filters?: EntryFilters) {
  const supabase = createSupabaseClient()
  const entryService = new EntryService(supabase)
  const queryClient = useQueryClient()

  // Get all entries with filters
  const { data: entries, isLoading, error } = useQuery({
    queryKey: [ENTRIES_KEY, filters],
    queryFn: () => entryService.getAllWithFilters(filters),
  })

  // Create entry mutation
  const createEntry = useMutation({
    mutationFn: (data: EntryInsert) => entryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ENTRIES_KEY] })
    },
  })

  // Update entry mutation
  const updateEntry = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EntryUpdate }) =>
      entryService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ENTRIES_KEY] })
    },
  })

  // Delete entry mutation
  const deleteEntry = useMutation({
    mutationFn: (id: string) => entryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ENTRIES_KEY] })
    },
  })

  return {
    entries: entries || [],
    isLoading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
  }
}

// Hook for dashboard stats
export function useDashboardEntries() {
  const supabase = createSupabaseClient()
  const entryService = new EntryService(supabase)

  const { data: todayEntries } = useQuery({
    queryKey: [ENTRIES_KEY, 'today'],
    queryFn: () => entryService.getToday(),
  })

  const { data: weekEntries } = useQuery({
    queryKey: [ENTRIES_KEY, 'week'],
    queryFn: () => entryService.getThisWeek(),
  })

  const { data: monthEntries } = useQuery({
    queryKey: [ENTRIES_KEY, 'month'],
    queryFn: () => entryService.getThisMonth(),
  })

  return {
    todayEntries: todayEntries || [],
    weekEntries: weekEntries || [],
    monthEntries: monthEntries || [],
  }
}
