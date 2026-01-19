import type { Database } from '@/types/database'

// ============================================
// BASE TYPES FROM DATABASE
// ============================================

export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']

export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']
export type InvoiceItemInsert = Database['public']['Tables']['invoice_items']['Insert']
export type InvoiceItemUpdate = Database['public']['Tables']['invoice_items']['Update']

// ============================================
// ENUMS
// ============================================

export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'paid' | 'cancelled' | 'overdue'
export type InvoiceType = 'linked' | 'standalone'
export type BillingStatus = 'unbilled' | 'billed' | 'paid'

// ============================================
// EXTENDED TYPES WITH RELATIONS
// ============================================

export interface InvoiceWithRelations extends Invoice {
  client?: {
    id: string
    name: string
  } | null
  items?: InvoiceItem[]
}

export interface InvoiceWithStats extends InvoiceWithRelations {
  itemsCount: number
  linkedEntriesCount: number
}

// ============================================
// FILTERS
// ============================================

export interface InvoiceFilters {
  clientId?: string
  status?: InvoiceStatus
  invoiceType?: InvoiceType
  dateFrom?: string
  dateTo?: string
}

// ============================================
// STATS
// ============================================

export interface InvoiceStats {
  totalCount: number
  draftCount: number
  issuedCount: number
  paidCount: number
  overdueCount: number
  totalAmount: number
  paidAmount: number
  unpaidAmount: number
}

// ============================================
// FORM INPUTS
// ============================================

// Input pro vytvoření linked faktury (z vybraných záznamů)
export interface CreateLinkedInvoiceInput {
  client_id: string
  entry_ids: string[]
  group_by: 'entry' | 'phase' | 'day'
  issue_date: string
  due_date: string
  tax_rate?: number
  notes?: string
  variable_symbol?: string
  bank_account?: string
}

// Input pro vytvoření standalone faktury (vlastní položky)
export interface CreateStandaloneInvoiceInput {
  client_id?: string
  issue_date: string
  due_date: string
  tax_rate?: number
  notes?: string
  variable_symbol?: string
  bank_account?: string
  items: StandaloneInvoiceItemInput[]
}

// Položka pro standalone fakturu
export interface StandaloneInvoiceItemInput {
  description: string
  quantity: number
  unit: string
  unit_price: number
}

// ============================================
// GROUPED ENTRY FOR INVOICE
// ============================================

// Interní typ pro seskupené záznamy
export interface GroupedEntryForInvoice {
  entry_id?: string
  phase_id?: string
  description: string
  quantity: number
  unit_price: number
}

// ============================================
// SELECTION
// ============================================

// Pro hook useEntrySelection
export interface EntrySelectionState {
  selectedIds: string[]
  selectedCount: number
  hasSelection: boolean
}

// ============================================
// STATUS CONFIG
// ============================================

export interface InvoiceStatusConfig {
  label: string
  className: string
  color: string
}

export const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, InvoiceStatusConfig> = {
  draft: {
    label: 'Koncept',
    className: 'bg-gray-100 text-gray-800',
    color: 'gray'
  },
  issued: {
    label: 'Vystavena',
    className: 'bg-blue-100 text-blue-800',
    color: 'blue'
  },
  sent: {
    label: 'Odeslána',
    className: 'bg-indigo-100 text-indigo-800',
    color: 'indigo'
  },
  paid: {
    label: 'Zaplacena',
    className: 'bg-green-100 text-green-800',
    color: 'green'
  },
  cancelled: {
    label: 'Stornována',
    className: 'bg-red-100 text-red-800',
    color: 'red'
  },
  overdue: {
    label: 'Po splatnosti',
    className: 'bg-orange-100 text-orange-800',
    color: 'orange'
  }
}

// ============================================
// BILLING STATUS CONFIG
// ============================================

export interface BillingStatusConfig {
  label: string
  className: string
}

export const BILLING_STATUS_CONFIG: Record<BillingStatus, BillingStatusConfig> = {
  unbilled: {
    label: 'Nefakturováno',
    className: 'bg-yellow-100 text-yellow-800'
  },
  billed: {
    label: 'Fakturováno',
    className: 'bg-blue-100 text-blue-800'
  },
  paid: {
    label: 'Zaplaceno',
    className: 'bg-green-100 text-green-800'
  }
}
