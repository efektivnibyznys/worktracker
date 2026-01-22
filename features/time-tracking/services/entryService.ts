import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { BaseService } from '@/lib/supabase/services/baseService'
import { Entry, EntryWithRelations, EntryFilters } from '../types/entry.types'

export class EntryService extends BaseService<'entries'> {
  protected readonly tableName = 'entries' as const

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  /**
   * Get all entries with filters and relations
   */
  async getAllWithFilters(filters: EntryFilters = {}): Promise<EntryWithRelations[]> {
    let query = this.supabase
      .from(this.tableName)
      .select(`
        *,
        client:clients(id, name),
        phase:phases(id, name)
      `)

    // Apply filters
    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId)
    }
    if (filters.phaseId) {
      query = query.eq('phase_id', filters.phaseId)
    }
    if (filters.dateFrom) {
      query = query.gte('date', filters.dateFrom)
    }
    if (filters.dateTo) {
      query = query.lte('date', filters.dateTo)
    }
    if (filters.billingStatus) {
      query = query.eq('billing_status', filters.billingStatus)
    }

    const { data, error } = await query
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })

    if (error) throw error
    return (data || []) as EntryWithRelations[]
  }

  /**
   * Get entries for a specific date range
   */
  async getByDateRange(dateFrom: string, dateTo: string): Promise<Entry[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get entries for today
   */
  async getToday(): Promise<Entry[]> {
    const today = new Date().toISOString().split('T')[0]
    return this.getByDateRange(today, today)
  }

  /**
   * Get entries for current week
   */
  async getThisWeek(): Promise<Entry[]> {
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))

    const dateFrom = monday.toISOString().split('T')[0]
    const dateTo = new Date().toISOString().split('T')[0]

    return this.getByDateRange(dateFrom, dateTo)
  }

  /**
   * Get entries for current month
   */
  async getThisMonth(): Promise<Entry[]> {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)

    const dateFrom = firstDay.toISOString().split('T')[0]
    const dateTo = new Date().toISOString().split('T')[0]

    return this.getByDateRange(dateFrom, dateTo)
  }
  /**
   * Get entries for a specific year
   */
  async getByYear(year: number): Promise<Entry[]> {
    const dateFrom = `${year}-01-01`
    const dateTo = `${year}-12-31`
    return this.getByDateRange(dateFrom, dateTo)
  }

  /**
   * Get entries for current year
   */
  async getThisYear(): Promise<Entry[]> {
    const currentYear = new Date().getFullYear()
    return this.getByYear(currentYear)
  }

  /**
   * Get list of years that have entries (for archive dropdown)
   */
  async getAvailableYears(): Promise<number[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('date')
      .order('date', { ascending: false })

    if (error) throw error

    const years = [...new Set(data?.map(e => new Date(e.date).getFullYear()) || [])]
    return years.sort((a, b) => b - a) // sestupně - nejnovější první
  }

  /**
   * Get yearly statistics summary for archive view
   */
  async getYearlyStats(year: number): Promise<{
    year: number
    totalMinutes: number
    totalAmount: number
    entryCount: number
  }> {
    const entries = await this.getByYear(year)

    const totalMinutes = entries.reduce((sum, e) => sum + e.duration_minutes, 0)
    const totalAmount = entries.reduce((sum, e) => {
      const hours = e.duration_minutes / 60
      return sum + (hours * e.hourly_rate)
    }, 0)

    return {
      year,
      totalMinutes,
      totalAmount,
      entryCount: entries.length
    }
  }
}
