import { Database } from '@/types/database'

export type Phase = Database['public']['Tables']['phases']['Row']
export type PhaseInsert = Database['public']['Tables']['phases']['Insert']
export type PhaseUpdate = Database['public']['Tables']['phases']['Update']

export type PhaseStatus = 'active' | 'completed' | 'paused'

export interface PhaseWithStats extends Phase {
  totalHours: number
  totalAmount: number
  entriesCount: number
}
