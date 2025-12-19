import { Database } from '@/types/database'

export type Client = Database['public']['Tables']['clients']['Row']
export type ClientInsert = Database['public']['Tables']['clients']['Insert']
export type ClientUpdate = Database['public']['Tables']['clients']['Update']

export interface ClientWithStats extends Client {
  totalHours: number
  totalAmount: number
  entriesCount: number
  phasesCount: number
}
