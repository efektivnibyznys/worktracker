import { Database } from '@/types/database'

export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export type ProjectStatus = 'active' | 'completed' | 'paused'

export interface ProjectWithStats extends Project {
  totalHours: number
  totalAmount: number
  entriesCount: number
}
