import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { BaseService } from '@/lib/supabase/services/baseService'
import { Client, ClientWithStats } from '../types/client.types'

export class ClientService extends BaseService<'clients'> {
  protected readonly tableName = 'clients' as const

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  /**
   * Get client with statistics (hours, amount, entries count, phases count)
   */
  async getWithStats(id: string): Promise<ClientWithStats | null> {
    const client = await this.getById(id)
    if (!client) return null

    // Get all entries for this client
    const { data: entries } = await this.supabase
      .from('entries')
      .select('duration_minutes, hourly_rate')
      .eq('client_id', id)

    // Get phases count
    const { count: phasesCount } = await this.supabase
      .from('phases')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', id)

    // Calculate statistics
    const totalMinutes = entries?.reduce((sum, e) => sum + e.duration_minutes, 0) || 0
    const totalAmount = entries?.reduce((sum, e) => {
      const hours = e.duration_minutes / 60
      return sum + (hours * e.hourly_rate)
    }, 0) || 0

    return {
      ...client,
      totalHours: totalMinutes / 60,
      totalAmount,
      entriesCount: entries?.length || 0,
      phasesCount: phasesCount || 0,
    }
  }

  /**
   * Get all clients with basic stats
   *
   * NOTE: This implementation uses 3 separate queries (clients, all entries, all phases)
   * and filters in JavaScript for simplicity. While this could be optimized with SQL
   * aggregation/JOINs, the current approach is acceptable for most use cases:
   *
   * Pros:
   * - Simple, maintainable code
   * - Works well with small-to-medium datasets
   * - No complex SQL queries
   *
   * Cons:
   * - Not optimal for large datasets (1000+ clients)
   * - More data transferred over network
   *
   * For optimization, consider creating a materialized view or using RPC functions
   * if performance becomes an issue.
   */
  async getAllWithStats(): Promise<ClientWithStats[]> {
    const clients = await this.getAll()

    // Get all entries and phases for stats
    // Using separate queries is more maintainable than complex JOINs
    const { data: allEntries } = await this.supabase
      .from('entries')
      .select('client_id, duration_minutes, hourly_rate')

    const { data: allPhases } = await this.supabase
      .from('phases')
      .select('client_id')

    // In-memory aggregation is fast for typical dataset sizes
    return clients.map(client => {
      const clientEntries = allEntries?.filter(e => e.client_id === client.id) || []
      const clientPhases = allPhases?.filter(p => p.client_id === client.id) || []

      const totalMinutes = clientEntries.reduce((sum, e) => sum + e.duration_minutes, 0)
      const totalAmount = clientEntries.reduce((sum, e) => {
        const hours = e.duration_minutes / 60
        return sum + (hours * e.hourly_rate)
      }, 0)

      return {
        ...client,
        totalHours: totalMinutes / 60,
        totalAmount,
        entriesCount: clientEntries.length,
        phasesCount: clientPhases.length,
      }
    })
  }
}
