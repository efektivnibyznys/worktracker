import { Database } from '@/types/database'

export type Entry = Database['public']['Tables']['entries']['Row']
export type EntryInsert = Database['public']['Tables']['entries']['Insert']
export type EntryUpdate = Database['public']['Tables']['entries']['Update']

export interface EntryWithRelations extends Entry {
  client?: {
    id: string
    name: string
  }
  phase?: {
    id: string
    name: string
  } | null
}

export interface EntryFilters {
  clientId?: string
  phaseId?: string
  dateFrom?: string
  dateTo?: string
}
