import { SupabaseClient } from '@supabase/supabase-js'
import { Database, Json } from '@/types/database'
import { BaseService } from '@/lib/supabase/services/baseService'
import type {
  Invoice,
  InvoiceWithRelations,
  InvoiceFilters,
  InvoiceStats,
  InvoiceStatus,
  CreateLinkedInvoiceInput,
  CreateStandaloneInvoiceInput
} from '../types/invoice.types'
import type { DashboardInvoice } from '../lib/dashboardIncome'
import type { EntryWithRelations } from '@/features/time-tracking/types/entry.types'

export class InvoiceService extends BaseService<'invoices'> {
  protected readonly tableName = 'invoices' as const

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get all invoices with filters and client relation
   */
  async getAllWithFilters(filters: InvoiceFilters = {}): Promise<InvoiceWithRelations[]> {
    let query = this.supabase
      .from(this.tableName)
      .select(`
        *,
        client:clients(id, name)
      `)

    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.invoiceType) {
      query = query.eq('invoice_type', filters.invoiceType)
    }
    if (filters.dateFrom) {
      query = query.gte('issue_date', filters.dateFrom)
    }
    if (filters.dateTo) {
      query = query.lte('issue_date', filters.dateTo)
    }

    const { data, error } = await query
      .order('issue_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as InvoiceWithRelations[]
  }

  /** Financial fields only; paginate so dashboard totals include every standalone invoice. */
  async getDashboardInvoices(): Promise<DashboardInvoice[]> {
    const invoices: DashboardInvoice[] = []
    const pageSize = 1000
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await this.supabase.from(this.tableName)
        .select('id, invoice_type, status, issue_date, client_id, client_name, subtotal')
        .eq('invoice_type', 'standalone')
        .neq('status', 'cancelled')
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1)
      if (error) throw error
      invoices.push(...(data || []))
      if (!data || data.length < pageSize) return invoices
    }
  }

  /**
   * Get single invoice with items and client
   */
  async getByIdWithItems(id: string): Promise<InvoiceWithRelations | null> {
    const { data: invoice, error: invoiceError } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        client:clients(id, name)
      `)
      .eq('id', id)
      .single()

    if (invoiceError) throw invoiceError
    if (!invoice) return null

    // Fetch items separately
    const { data: items, error: itemsError } = await this.supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order', { ascending: true })

    if (itemsError) throw itemsError

    return {
      ...invoice,
      items: items || []
    } as InvoiceWithRelations
  }

  /**
   * Get invoice statistics
   */
  async getStats(): Promise<InvoiceStats> {
    const { data: invoices, error } = await this.supabase
      .from(this.tableName)
      .select('status, total_amount')

    if (error) throw error

    const stats: InvoiceStats = {
      totalCount: 0,
      draftCount: 0,
      issuedCount: 0,
      paidCount: 0,
      overdueCount: 0,
      totalAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0
    }

    invoices?.forEach(inv => {
      stats.totalCount++
      stats.totalAmount += Number(inv.total_amount)

      switch (inv.status) {
        case 'draft':
          stats.draftCount++
          break
        case 'issued':
        case 'sent':
          stats.issuedCount++
          stats.unpaidAmount += Number(inv.total_amount)
          break
        case 'paid':
          stats.paidCount++
          stats.paidAmount += Number(inv.total_amount)
          break
        case 'overdue':
          stats.overdueCount++
          stats.unpaidAmount += Number(inv.total_amount)
          break
      }
    })

    return stats
  }

  /**
   * Get unbilled entries for a client
   */
  async getUnbilledEntries(clientId?: string): Promise<EntryWithRelations[]> {
    let query = this.supabase
      .from('entries')
      .select(`
        *,
        client:clients(id, name),
        phase:phases(id, name)
      `)
      .eq('billing_status', 'unbilled')
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as EntryWithRelations[]
  }

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Each RPC is one database transaction. The database derives ownership from
   * auth.uid(), locks claimed entries, and allocates invoice numbers atomically.
   */
  async createLinkedInvoice(input: CreateLinkedInvoiceInput): Promise<Invoice> {
    const { data, error } = await this.supabase.rpc('create_linked_invoice', {
      p_input: input as unknown as Json
    })
    if (error) throw error
    if (!data) throw new Error('Fakturu se nepodařilo vytvořit')
    return data
  }

  async createStandaloneInvoice(input: CreateStandaloneInvoiceInput): Promise<Invoice> {
    const { data, error } = await this.supabase.rpc('create_standalone_invoice', {
      p_input: input as unknown as Json
    })
    if (error) throw error
    if (!data) throw new Error('Fakturu se nepodařilo vytvořit')
    return data
  }

  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    const { data, error } = await this.supabase.rpc('update_invoice_status', {
      p_invoice_id: id,
      p_status: status
    })
    if (error) throw error
    if (!data) throw new Error('Faktura nebyla nalezena')
    return data
  }

  async deleteInvoice(id: string): Promise<void> {
    const { error } = await this.supabase.rpc('delete_invoice', {
      p_invoice_id: id
    })
    if (error) throw error
  }
}
