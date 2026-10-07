'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { EntryService } from '../services/entryService'

import { calculateDashboardStats, getDashboardYears } from '@/features/billing/lib/dashboardIncome'
import type { DashboardInvoice } from '@/features/billing/lib/dashboardIncome'

const ENTRIES_KEY = 'entries'

/**
 * Hook for fetching entries by year
 */
export function useYearlyEntries(year?: number) {
    const selectedYear = year ?? new Date().getFullYear()

    const supabase = useMemo(() => createSupabaseClient(), [])
    const entryService = useMemo(() => new EntryService(supabase), [supabase])

    const { data: entries, isLoading, error } = useQuery({
        queryKey: [ENTRIES_KEY, 'year', selectedYear],
        queryFn: () => entryService.getByYear(selectedYear),
    })

    return {
        entries: entries || [],
        isLoading,
        error,
        selectedYear,
    }
}

/**
 * Hook for fetching list of available years
 */
export function useAvailableYears() {
    const supabase = useMemo(() => createSupabaseClient(), [])
    const entryService = useMemo(() => new EntryService(supabase), [supabase])

    const { data: years, isLoading } = useQuery({
        queryKey: [ENTRIES_KEY, 'available-years'],
        queryFn: () => entryService.getAvailableYears(),
        staleTime: 5 * 60 * 1000, // 5 minut - roky se nemění často
    })

    return {
        years: years || [new Date().getFullYear()],
        isLoading,
    }
}

/**
 * Hook for archive - yearly stats for all available years
 */
export function useArchiveStats(invoices: DashboardInvoice[] = []) {
    const supabase = useMemo(() => createSupabaseClient(), [])
    const entryService = useMemo(() => new EntryService(supabase), [supabase])
    const { years } = useAvailableYears()

    const currentYear = new Date().getFullYear()
    const pastYears = getDashboardYears(years, invoices, currentYear).filter(y => y < currentYear)

    const { data: archiveStats, isLoading, error } = useQuery({
        queryKey: [ENTRIES_KEY, 'archive-stats', pastYears],
        queryFn: async () => {
            const stats = await Promise.all(
                pastYears.map(year => entryService.getYearlyStats(year))
            )
            return stats
        },
        enabled: pastYears.length > 0,
    })

    return {
        archiveStats: (archiveStats || []).map(stat => {
            const standalone = calculateDashboardStats([], invoices, `${stat.year}-01-01`, `${stat.year}-12-31`)
            return { ...stat, totalAmount: stat.totalAmount + standalone.amount, invoiceCount: standalone.invoiceCount }
        }),
        error,
        yearCount: pastYears.length,
        hasArchive: pastYears.length > 0,
        isLoading,
    }
}
