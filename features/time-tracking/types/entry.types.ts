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
  project?: {
    id: string
    name: string
  } | null
}

export type BillingStatus = 'unbilled' | 'billed' | 'paid'

export interface EntryFilters {
  clientId?: string
  phaseId?: string
  projectId?: string
  dateFrom?: string
  dateTo?: string
  billingStatus?: BillingStatus
  year?: number
}

export interface YearlyStats {
  year: number
  totalMinutes: number
  totalAmount: number
  entryCount: number
}
