import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { BaseService } from '@/lib/supabase/services/baseService'
import { Project, ProjectWithStats } from '../types/project.types'

export class ProjectService extends BaseService<'projects'> {
  protected readonly tableName = 'projects' as const

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  /**
   * Get all projects for a specific client
   */
  async getByClient(clientId: string): Promise<Project[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get project with statistics
   */
  async getWithStats(id: string): Promise<ProjectWithStats | null> {
    const project = await this.getById(id)
    if (!project) return null

    // Get all entries for this project
    const { data: entries } = await this.supabase
      .from('entries')
      .select('duration_minutes, hourly_rate')
      .eq('project_id', id)

    // Calculate statistics
    const totalMinutes = entries?.reduce((sum, e) => sum + e.duration_minutes, 0) || 0
    const totalAmount = entries?.reduce((sum, e) => {
      const hours = e.duration_minutes / 60
      return sum + (hours * e.hourly_rate)
    }, 0) || 0

    return {
      ...project,
      totalHours: totalMinutes / 60,
      totalAmount,
      entriesCount: entries?.length || 0,
    }
  }

  /**
   * Get all projects for a client with stats
   */
  async getByClientWithStats(clientId: string): Promise<ProjectWithStats[]> {
    const projects = await this.getByClient(clientId)

    // Get all entries for these projects
    const { data: allEntries } = await this.supabase
      .from('entries')
      .select('project_id, duration_minutes, hourly_rate')
      .eq('client_id', clientId)

    return projects.map(project => {
      const projectEntries = allEntries?.filter(e => e.project_id === project.id) || []

      const totalMinutes = projectEntries.reduce((sum, e) => sum + e.duration_minutes, 0)
      const totalAmount = projectEntries.reduce((sum, e) => {
        const hours = e.duration_minutes / 60
        return sum + (hours * e.hourly_rate)
      }, 0)

      return {
        ...project,
        totalHours: totalMinutes / 60,
        totalAmount,
        entriesCount: projectEntries.length,
      }
    })
  }
}
