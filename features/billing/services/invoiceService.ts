import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { BaseService } from '@/lib/supabase/services/baseService'
import type {
  Invoice,
  InvoiceInsert,
  InvoiceItem,
  InvoiceItemInsert,
  InvoiceWithRelations,
  InvoiceFilters,
  InvoiceStats,
  InvoiceStatus,
  CreateLinkedInvoiceInput,
  CreateStandaloneInvoiceInput,
  GroupedEntryForInvoice
} from '../types/invoice.types'
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
   * Create a linked invoice from selected entries
   */
  async createLinkedInvoice(input: CreateLinkedInvoiceInput): Promise<Invoice> {
    const { entry_ids, group_by, ...invoiceData } = input

    // 1. Fetch the entries to invoice
    const { data: entries, error: entriesError } = await this.supabase
      .from('entries')
      .select('*, phase:phases(id, name)')
      .in('id', entry_ids)
      .eq('billing_status', 'unbilled')

    if (entriesError) throw entriesError
    if (!entries?.length) {
      throw new Error('Žádné záznamy k fakturaci')
    }

    // 2. Calculate totals
    const subtotal = entries.reduce((sum, entry) => {
      const hours = entry.duration_minutes / 60
      return sum + (hours * entry.hourly_rate)
    }, 0)

    const tax_rate = invoiceData.tax_rate || 0
    const tax_amount = subtotal * (tax_rate / 100)
    const total_amount = subtotal + tax_amount

    // 3. Generate invoice number
    const invoice_number = await this.generateInvoiceNumber()

    // 4. Create the invoice
    const invoiceInsert: InvoiceInsert = {
      user_id: entries[0].user_id, // All entries have same user
      client_id: invoiceData.client_id,
      invoice_number,
      issue_date: invoiceData.issue_date,
      due_date: invoiceData.due_date,
      invoice_type: 'linked',
      status: 'draft',
      subtotal,
      tax_rate,
      tax_amount,
      total_amount,
      notes: invoiceData.notes,
      variable_symbol: invoiceData.variable_symbol,
      bank_account: invoiceData.bank_account
    }

    const { data: invoice, error: invoiceError } = await this.supabase
      .from(this.tableName)
      .insert(invoiceInsert)
      .select()
      .single()

    if (invoiceError) throw invoiceError

    // 5. Create invoice items based on grouping
    const groupedItems = this.groupEntriesForInvoice(entries, group_by)

    for (let i = 0; i < groupedItems.length; i++) {
      const item = groupedItems[i]
      const itemInsert: InvoiceItemInsert = {
        invoice_id: invoice.id,
        entry_id: item.entry_id,
        phase_id: item.phase_id,
        description: item.description,
        quantity: item.quantity,
        unit: 'hod',
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        sort_order: i
      }

      const { error: itemError } = await this.supabase
        .from('invoice_items')
        .insert(itemInsert)

      if (itemError) throw itemError
    }

    // 6. Update entries billing status
    const { error: updateError } = await this.supabase
      .from('entries')
      .update({
        billing_status: 'billed' as const,
        invoice_id: invoice.id
      })
      .in('id', entry_ids)

    if (updateError) throw updateError

    return invoice
  }

  /**
   * Create a standalone invoice with custom items
   */
  async createStandaloneInvoice(input: CreateStandaloneInvoiceInput): Promise<Invoice> {
    const { items, ...invoiceData } = input

    // 1. Calculate totals
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price)
    }, 0)

    const tax_rate = invoiceData.tax_rate || 0
    const tax_amount = subtotal * (tax_rate / 100)
    const total_amount = subtotal + tax_amount

    // 2. Generate invoice number
    const invoice_number = await this.generateInvoiceNumber()

    // 3. Get user_id from auth
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('Uživatel není přihlášen')

    // 4. Create the invoice
    const invoiceInsert: InvoiceInsert = {
      user_id: user.id,
      client_id: invoiceData.client_id || null,
      invoice_number,
      issue_date: invoiceData.issue_date,
      due_date: invoiceData.due_date,
      invoice_type: 'standalone',
      status: 'draft',
      subtotal,
      tax_rate,
      tax_amount,
      total_amount,
      notes: invoiceData.notes,
      variable_symbol: invoiceData.variable_symbol,
      bank_account: invoiceData.bank_account
    }

    const { data: invoice, error: invoiceError } = await this.supabase
      .from(this.tableName)
      .insert(invoiceInsert)
      .select()
      .single()

    if (invoiceError) throw invoiceError

    // 5. Create invoice items
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const itemInsert: InvoiceItemInsert = {
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        sort_order: i
      }

      const { error: itemError } = await this.supabase
        .from('invoice_items')
        .insert(itemInsert)

      if (itemError) throw itemError
    }

    return invoice
  }

  /**
   * Update invoice status
   */
  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    const updates: Partial<Invoice> = { status }

    // Set paid_at timestamp when marking as paid
    if (status === 'paid') {
      updates.paid_at = new Date().toISOString()
    }

    const { data: invoice, error } = await this.supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // If paid, update linked entries
    if (status === 'paid') {
      await this.supabase
        .from('entries')
        .update({ billing_status: 'paid' as const })
        .eq('invoice_id', id)
    }

    return invoice
  }

  /**
   * Delete invoice and reset linked entries
   */
  async deleteInvoice(id: string): Promise<void> {
    // First, reset billing status of linked entries
    await this.supabase
      .from('entries')
      .update({
        billing_status: 'unbilled' as const,
        invoice_id: null
      })
      .eq('invoice_id', id)

    // Delete invoice (items cascade automatically)
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Generate next invoice number for current year
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear()

    const { count, error } = await this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`)

    if (error) throw error

    const nextNumber = (count || 0) + 1
    return `${year}-${String(nextNumber).padStart(4, '0')}`
  }

  /**
   * Group entries for invoice items based on grouping strategy
   */
  private groupEntriesForInvoice(
    entries: any[],
    groupBy: 'entry' | 'phase' | 'day'
  ): GroupedEntryForInvoice[] {
    const items: GroupedEntryForInvoice[] = []

    if (groupBy === 'entry') {
      // Each entry as separate item
      entries.forEach(entry => {
        items.push({
          entry_id: entry.id,
          phase_id: entry.phase_id,
          description: entry.description || `Práce ${entry.date}`,
          quantity: entry.duration_minutes / 60,
          unit_price: entry.hourly_rate
        })
      })
    } else if (groupBy === 'phase') {
      // Group by phase
      const grouped = new Map<string, {
        phase_id: string | null
        phase_name: string
        total_minutes: number
        hourly_rate: number
      }>()

      entries.forEach(entry => {
        const key = entry.phase_id || 'no-phase'
        if (!grouped.has(key)) {
          grouped.set(key, {
            phase_id: entry.phase_id,
            phase_name: entry.phase?.name || 'Bez fáze',
            total_minutes: 0,
            hourly_rate: entry.hourly_rate
          })
        }
        const group = grouped.get(key)!
        group.total_minutes += entry.duration_minutes
      })

      grouped.forEach(group => {
        items.push({
          phase_id: group.phase_id || undefined,
          description: group.phase_name,
          quantity: group.total_minutes / 60,
          unit_price: group.hourly_rate
        })
      })
    } else if (groupBy === 'day') {
      // Group by date
      const grouped = new Map<string, {
        date: string
        total_minutes: number
        hourly_rate: number
      }>()

      entries.forEach(entry => {
        const key = entry.date
        if (!grouped.has(key)) {
          grouped.set(key, {
            date: entry.date,
            total_minutes: 0,
            hourly_rate: entry.hourly_rate
          })
        }
        const group = grouped.get(key)!
        group.total_minutes += entry.duration_minutes
      })

      grouped.forEach(group => {
        items.push({
          description: `Práce dne ${group.date}`,
          quantity: group.total_minutes / 60,
          unit_price: group.hourly_rate
        })
      })
    }

    return items
  }
}
