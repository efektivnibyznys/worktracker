'use client'

import { useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { QuickAddForm, QuickAddSubmitData } from '@/features/time-tracking/components/QuickAddForm'
import { useDashboardEntries } from '@/features/time-tracking/hooks/useEntries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { formatTime, calculateDuration } from '@/lib/utils/time'
import { formatDate } from '@/lib/utils/date'
import { calculateStats } from '@/lib/utils/calculations'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/stores/authStore'
import { useEntries } from '@/features/time-tracking/hooks/useEntries'
import { usePageMetadata } from '@/lib/hooks/usePageMetadata'

export default function DashboardPage() {
  usePageMetadata({
    title: 'Dashboard | Work Tracker',
    description: 'Přehled odpracované doby a rychlé přidání záznamu'
  })

  const { user } = useAuthStore()
  const { todayEntries, weekEntries, monthEntries } = useDashboardEntries()
  const { createEntry } = useEntries()

  // Calculate stats - memoized to avoid recalculation on every render
  const todayStats = useMemo(() => calculateStats(todayEntries), [todayEntries])
  const weekStats = useMemo(() => calculateStats(weekEntries), [weekEntries])
  const monthStats = useMemo(() => calculateStats(monthEntries), [monthEntries])

  const handleQuickAdd = useCallback(async (data: QuickAddSubmitData) => {
    try {
      await createEntry.mutateAsync({
        ...data,
        user_id: user!.id,
      })
      toast.success('Záznam byl úspěšně přidán')
    } catch (error) {
      toast.error('Nepodařilo se přidat záznam')
      console.error(error)
    }
  }, [createEntry, user])

  // Get recent entries (last 5) - memoized to avoid re-sorting on every render
  const recentEntries = useMemo(() =>
    [...monthEntries]
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date)
        if (dateCompare !== 0) return dateCompare
        return b.start_time.localeCompare(a.start_time)
      })
      .slice(0, 5),
    [monthEntries]
  )

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Dashboard
      </h2>

      {/* Quick Add Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Rychlé přidání záznamu</CardTitle>
          <CardDescription>
            Přidejte nový záznam odpracované doby
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuickAddForm
            onSubmit={handleQuickAdd}
            isLoading={createEntry.isPending}
          />
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Dnes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(todayStats.totalMinutes)}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {formatCurrency(todayStats.amount)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {todayStats.count} záznamů
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tento týden</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(weekStats.totalMinutes)}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {formatCurrency(weekStats.amount)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {weekStats.count} záznamů
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tento měsíc</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(monthStats.totalMinutes)}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {formatCurrency(monthStats.amount)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {monthStats.count} záznamů
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Poslední záznamy</CardTitle>
          <CardDescription>
            5 nejnovějších záznamů
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <p className="text-gray-600 text-center py-4">
              Zatím nemáte žádné záznamy
            </p>
          ) : (
            <div className="space-y-3">
              {recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex-1">
                    <div className="font-medium">{entry.description}</div>
                    <div className="text-sm text-gray-600">
                      {formatDate(entry.date)} • {entry.start_time} - {entry.end_time}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {formatTime(entry.duration_minutes)}
                    </Badge>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency((entry.duration_minutes / 60) * entry.hourly_rate)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
