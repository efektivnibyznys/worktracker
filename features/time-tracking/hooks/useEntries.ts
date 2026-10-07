'use client'

import { useMemo } from 'react'
import { format, startOfWeek } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { EntryService } from '../services/entryService'
import { EntryInsert, EntryUpdate, EntryFilters } from '../types/entry.types'
import { Entry } from '../types/entry.types'

const ENTRIES_KEY = 'entries'

// Helper functions for client-side filtering
function filterToday(entries: Entry[]): Entry[] {
  const today = format(new Date(), 'yyyy-MM-dd')
  return entries.filter(entry => entry.date === today)
}

function filterThisWeek(entries: Entry[]): Entry[] {
  const now = new Date()
  const mondayStr = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const todayStr = format(now, 'yyyy-MM-dd')

  return entries.filter(entry => entry.date >= mondayStr && entry.date <= todayStr)
}

export function useEntries(filters?: EntryFilters) {
  // Memoize supabase client and service to avoid recreation on every render
  const supabase = useMemo(() => createSupabaseClient(), [])
  const entryService = useMemo(() => new EntryService(supabase), [supabase])
  const queryClient = useQueryClient()

  // Get all entries with filters
  const { data: entries, isLoading, error, refetch } = useQuery({
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
    refetch,
    createEntry,
    updateEntry,
    deleteEntry,
  }
}

// Hook for dashboard stats - OPTIMIZED: Single query instead of 3
export function useDashboardEntries(year?: number) {
  const selectedYear = year ?? new Date().getFullYear()

  // Memoize supabase client and service to avoid recreation on every render
  const supabase = useMemo(() => createSupabaseClient(), [])
  const entryService = useMemo(() => new EntryService(supabase), [supabase])

  // Fetch entries for selected year (single DB query)
  const { data: yearEntries, isLoading, error } = useQuery({
    queryKey: [ENTRIES_KEY, 'year', selectedYear],
    queryFn: () => entryService.getByYear(selectedYear),
  })

  // The first week of January can contain December work entries.
  const now = new Date()
  const isCurrentYear = selectedYear === now.getFullYear()
  const weekStartYear = startOfWeek(now, { weekStartsOn: 1 }).getFullYear()
  const crossesYear = isCurrentYear && weekStartYear < selectedYear
  const { data: previousYearEntries, isLoading: previousYearLoading, error: previousYearError } = useQuery({
    queryKey: [ENTRIES_KEY, 'year', selectedYear - 1],
    queryFn: () => entryService.getByYear(selectedYear - 1),
    enabled: crossesYear,
  })

  const todayEntries = useMemo(
    () => isCurrentYear ? filterToday(yearEntries || []) : [],
    [yearEntries, isCurrentYear]
  )

  const weekEntries = useMemo(
    () => isCurrentYear ? filterThisWeek([...(yearEntries || []), ...(crossesYear ? previousYearEntries || [] : [])]) : [],
    [yearEntries, previousYearEntries, crossesYear, isCurrentYear]
  )

  const monthEntries = useMemo(
    () => isCurrentYear ? filterThisMonth(yearEntries || []) : [],
    [yearEntries, isCurrentYear]
  )

  return {
    todayEntries,
    weekEntries,
    monthEntries,
    isLoading: isLoading || (crossesYear && previousYearLoading),
    error: error || (crossesYear ? previousYearError : null),
    yearEntries: yearEntries || [],
    selectedYear,
    isCurrentYear,
  }
}

// Helper function for month filtering
function filterThisMonth(entries: Entry[]): Entry[] {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const firstDayStr = format(firstDay, 'yyyy-MM-dd')
  const todayStr = format(now, 'yyyy-MM-dd')

  return entries.filter(entry => entry.date >= firstDayStr && entry.date <= todayStr)
}
