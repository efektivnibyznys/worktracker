'use client'

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { EntryService } from '../services/entryService'
import { EntryInsert, EntryUpdate, EntryFilters } from '../types/entry.types'
import { Entry } from '../types/entry.types'

const ENTRIES_KEY = 'entries'

// Helper functions for client-side filtering
function filterToday(entries: Entry[]): Entry[] {
  const today = new Date().toISOString().split('T')[0]
  return entries.filter(entry => entry.date === today)
}

function filterThisWeek(entries: Entry[]): Entry[] {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
  const mondayStr = monday.toISOString().split('T')[0]
  const todayStr = now.toISOString().split('T')[0]

  return entries.filter(entry => entry.date >= mondayStr && entry.date <= todayStr)
}

export function useEntries(filters?: EntryFilters) {
  // Memoize supabase client and service to avoid recreation on every render
  const supabase = useMemo(() => createSupabaseClient(), [])
  const entryService = useMemo(() => new EntryService(supabase), [supabase])
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

// Hook for dashboard stats - OPTIMIZED: Single query instead of 3
export function useDashboardEntries() {
  // Memoize supabase client and service to avoid recreation on every render
  const supabase = useMemo(() => createSupabaseClient(), [])
  const entryService = useMemo(() => new EntryService(supabase), [supabase])

  // Fetch month entries once (single DB query)
  const { data: monthEntries } = useQuery({
    queryKey: [ENTRIES_KEY, 'month'],
    queryFn: () => entryService.getThisMonth(),
  })

  // Filter on client side (memoized for performance)
  const todayEntries = useMemo(
    () => filterToday(monthEntries || []),
    [monthEntries]
  )

  const weekEntries = useMemo(
    () => filterThisWeek(monthEntries || []),
    [monthEntries]
  )

  return {
    todayEntries,
    weekEntries,
    monthEntries: monthEntries || [],
  }
}
