import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { BaseService } from '@/lib/supabase/services/baseService'
import { Phase, PhaseWithStats } from '../types/phase.types'

export class PhaseService extends BaseService<'phases'> {
  protected readonly tableName = 'phases' as const

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  /**
   * Get all phases for a specific client
   */
  async getByClient(clientId: string): Promise<Phase[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get phase with statistics
   */
  async getWithStats(id: string): Promise<PhaseWithStats | null> {
    const phase = await this.getById(id)
    if (!phase) return null

    // Get all entries for this phase
    const { data: entries } = await this.supabase
      .from('entries')
      .select('duration_minutes, hourly_rate')
      .eq('phase_id', id)

    // Calculate statistics
    const totalMinutes = entries?.reduce((sum, e) => sum + e.duration_minutes, 0) || 0
    const totalAmount = entries?.reduce((sum, e) => {
      const hours = e.duration_minutes / 60
      return sum + (hours * e.hourly_rate)
    }, 0) || 0

    return {
      ...phase,
      totalHours: totalMinutes / 60,
      totalAmount,
      entriesCount: entries?.length || 0,
    }
  }

  /**
   * Get all phases for a client with stats
   */
  async getByClientWithStats(clientId: string): Promise<PhaseWithStats[]> {
    const phases = await this.getByClient(clientId)

    // Get all entries for these phases
    const { data: allEntries } = await this.supabase
      .from('entries')
      .select('phase_id, duration_minutes, hourly_rate')
      .eq('client_id', clientId)

    return phases.map(phase => {
      const phaseEntries = allEntries?.filter(e => e.phase_id === phase.id) || []

      const totalMinutes = phaseEntries.reduce((sum, e) => sum + e.duration_minutes, 0)
      const totalAmount = phaseEntries.reduce((sum, e) => {
        const hours = e.duration_minutes / 60
        return sum + (hours * e.hourly_rate)
      }, 0)

      return {
        ...phase,
        totalHours: totalMinutes / 60,
        totalAmount,
        entriesCount: phaseEntries.length,
      }
    })
  }
}
