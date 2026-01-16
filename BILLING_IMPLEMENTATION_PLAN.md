# Implementační plán fakturačního modulu

Tento dokument obsahuje konkrétní kroky implementace fakturačního modulu pro aplikaci Worktracker. Plán respektuje stávající architekturu, vzory a vzhled aplikace.

---

## Fáze 1: Databáze a typy

### 1.1 SQL migrace

**Soubor:** `supabase/migrations/002_billing.sql`

```sql
-- ============================================
-- BILLING MODULE - Database Schema
-- ============================================

-- Hlavní tabulka faktur
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

    invoice_number TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,

    invoice_type TEXT NOT NULL DEFAULT 'standalone'
        CHECK (invoice_type IN ('linked', 'standalone')),

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'issued', 'sent', 'paid', 'cancelled', 'overdue')),

    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5, 2) DEFAULT 0,
    tax_amount NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'CZK',

    variable_symbol TEXT,
    bank_account TEXT,
    notes TEXT,
    internal_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Položky faktury
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    entry_id UUID REFERENCES entries(id) ON DELETE SET NULL,
    phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,

    description TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'hod',
    unit_price NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL,
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rozšíření entries o billing_status
ALTER TABLE entries ADD COLUMN IF NOT EXISTS
    billing_status TEXT DEFAULT 'unbilled'
    CHECK (billing_status IN ('unbilled', 'billed', 'paid'));

ALTER TABLE entries ADD COLUMN IF NOT EXISTS
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Rozšíření settings o firemní údaje
ALTER TABLE settings ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS company_ico TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS company_dic TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_due_days INTEGER DEFAULT 14;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_tax_rate NUMERIC(5, 2) DEFAULT 0;

-- Indexy
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_entries_billing_status ON entries(billing_status);
CREATE INDEX IF NOT EXISTS idx_entries_invoice_id ON entries(invoice_id);

-- RLS pro invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own invoices" ON invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invoices" ON invoices
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own invoices" ON invoices
    FOR DELETE USING (auth.uid() = user_id);

-- RLS pro invoice_items
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage invoice items" ON invoice_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_items.invoice_id
            AND invoices.user_id = auth.uid()
        )
    );

-- Trigger pro updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE invoice_items;
```

### 1.2 Aktualizace TypeScript typů

**Soubor:** `types/database.ts` - přegenerovat pomocí Supabase CLI:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

### 1.3 Nové typy pro billing

**Soubor:** `features/billing/types/invoice.types.ts`

```typescript
import type { Database } from '@/types/database'

// Base types from database
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']
export type InvoiceItemInsert = Database['public']['Tables']['invoice_items']['Insert']

// Enums
export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'paid' | 'cancelled' | 'overdue'
export type InvoiceType = 'linked' | 'standalone'
export type BillingStatus = 'unbilled' | 'billed' | 'paid'

// Extended types
export interface InvoiceWithRelations extends Invoice {
  client?: { id: string; name: string } | null
  items?: InvoiceItem[]
}

export interface InvoiceWithStats extends InvoiceWithRelations {
  itemsCount: number
  linkedEntriesCount: number
}

// Filters
export interface InvoiceFilters {
  clientId?: string
  status?: InvoiceStatus
  invoiceType?: InvoiceType
  dateFrom?: string
  dateTo?: string
}

// Stats
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

// Form inputs
export interface CreateLinkedInvoiceInput {
  client_id: string
  entry_ids: string[]
  group_by: 'entry' | 'phase' | 'day'
  issue_date: string
  due_date: string
  tax_rate?: number
  notes?: string
}

export interface CreateStandaloneInvoiceInput {
  client_id?: string
  issue_date: string
  due_date: string
  tax_rate?: number
  notes?: string
  items: {
    description: string
    quantity: number
    unit: string
    unit_price: number
  }[]
}
```

---

## Fáze 2: Services

### 2.1 Invoice Service

**Soubor:** `features/billing/services/invoiceService.ts`

```typescript
import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type {
  Invoice,
  InvoiceInsert,
  InvoiceUpdate,
  InvoiceItem,
  InvoiceWithRelations,
  InvoiceFilters,
  InvoiceStats,
  CreateLinkedInvoiceInput,
  CreateStandaloneInvoiceInput,
  InvoiceStatus
} from '../types/invoice.types'

export class InvoiceService {
  constructor(private supabase: SupabaseClient<Database>) {}

  // ==================== QUERIES ====================

  async getAll(filters?: InvoiceFilters): Promise<InvoiceWithRelations[]> {
    let query = this.supabase
      .from('invoices')
      .select(`
        *,
        client:clients(id, name)
      `)
      .order('issue_date', { ascending: false })

    if (filters?.clientId) query = query.eq('client_id', filters.clientId)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.invoiceType) query = query.eq('invoice_type', filters.invoiceType)
    if (filters?.dateFrom) query = query.gte('issue_date', filters.dateFrom)
    if (filters?.dateTo) query = query.lte('issue_date', filters.dateTo)

    const { data, error } = await query
    if (error) throw error
    return (data || []) as InvoiceWithRelations[]
  }

  async getById(id: string): Promise<InvoiceWithRelations | null> {
    const { data: invoice, error } = await this.supabase
      .from('invoices')
      .select(`
        *,
        client:clients(id, name)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!invoice) return null

    // Fetch items
    const { data: items } = await this.supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order')

    return {
      ...invoice,
      items: items || []
    } as InvoiceWithRelations
  }

  async getStats(): Promise<InvoiceStats> {
    const { data: invoices, error } = await this.supabase
      .from('invoices')
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

  async getUnbilledEntries(clientId?: string) {
    let query = this.supabase
      .from('entries')
      .select(`
        *,
        client:clients(id, name),
        phase:phases(id, name)
      `)
      .eq('billing_status', 'unbilled')
      .order('date', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  // ==================== MUTATIONS ====================

  async createLinkedInvoice(input: CreateLinkedInvoiceInput): Promise<Invoice> {
    const { entry_ids, group_by, ...invoiceData } = input

    // 1. Fetch entries
    const { data: entries, error: entriesError } = await this.supabase
      .from('entries')
      .select('*, phase:phases(id, name)')
      .in('id', entry_ids)
      .eq('billing_status', 'unbilled')

    if (entriesError) throw entriesError
    if (!entries?.length) throw new Error('Žádné záznamy k fakturaci')

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

    // 4. Create invoice
    const { data: invoice, error: invoiceError } = await this.supabase
      .from('invoices')
      .insert({
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
        notes: invoiceData.notes
      })
      .select()
      .single()

    if (invoiceError) throw invoiceError

    // 5. Create items based on grouping
    const items = this.groupEntriesForInvoice(entries, group_by)

    for (let i = 0; i < items.length; i++) {
      await this.supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoice.id,
          entry_id: items[i].entry_id,
          phase_id: items[i].phase_id,
          description: items[i].description,
          quantity: items[i].quantity,
          unit: 'hod',
          unit_price: items[i].unit_price,
          total_price: items[i].quantity * items[i].unit_price,
          sort_order: i
        })
    }

    // 6. Update entries billing status
    await this.supabase
      .from('entries')
      .update({
        billing_status: 'billed',
        invoice_id: invoice.id
      })
      .in('id', entry_ids)

    return invoice
  }

  async createStandaloneInvoice(input: CreateStandaloneInvoiceInput): Promise<Invoice> {
    const { items, ...invoiceData } = input

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    const tax_rate = invoiceData.tax_rate || 0
    const tax_amount = subtotal * (tax_rate / 100)
    const total_amount = subtotal + tax_amount

    const invoice_number = await this.generateInvoiceNumber()

    const { data: invoice, error } = await this.supabase
      .from('invoices')
      .insert({
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
        notes: invoiceData.notes
      })
      .select()
      .single()

    if (error) throw error

    for (let i = 0; i < items.length; i++) {
      await this.supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoice.id,
          description: items[i].description,
          quantity: items[i].quantity,
          unit: items[i].unit,
          unit_price: items[i].unit_price,
          total_price: items[i].quantity * items[i].unit_price,
          sort_order: i
        })
    }

    return invoice
  }

  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    const updates: InvoiceUpdate = { status }

    if (status === 'paid') {
      updates.paid_at = new Date().toISOString()
    }

    const { data: invoice, error } = await this.supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Update linked entries if paid
    if (status === 'paid') {
      await this.supabase
        .from('entries')
        .update({ billing_status: 'paid' })
        .eq('invoice_id', id)
    }

    return invoice
  }

  async delete(id: string): Promise<void> {
    // Reset entries billing status
    await this.supabase
      .from('entries')
      .update({ billing_status: 'unbilled', invoice_id: null })
      .eq('invoice_id', id)

    const { error } = await this.supabase
      .from('invoices')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ==================== HELPERS ====================

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear()

    const { count } = await this.supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`)

    const nextNumber = (count || 0) + 1
    return `${year}-${String(nextNumber).padStart(4, '0')}`
  }

  private groupEntriesForInvoice(
    entries: any[],
    groupBy: 'entry' | 'phase' | 'day'
  ) {
    const items: any[] = []

    if (groupBy === 'entry') {
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
      const grouped = new Map()
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
        grouped.get(key).total_minutes += entry.duration_minutes
      })

      grouped.forEach(group => {
        items.push({
          phase_id: group.phase_id,
          description: group.phase_name,
          quantity: group.total_minutes / 60,
          unit_price: group.hourly_rate
        })
      })
    } else if (groupBy === 'day') {
      const grouped = new Map()
      entries.forEach(entry => {
        const key = entry.date
        if (!grouped.has(key)) {
          grouped.set(key, {
            date: entry.date,
            total_minutes: 0,
            hourly_rate: entry.hourly_rate
          })
        }
        grouped.get(key).total_minutes += entry.duration_minutes
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
```

---

## Fáze 3: React Hooks

### 3.1 useInvoices Hook

**Soubor:** `features/billing/hooks/useInvoices.ts`

```typescript
import { useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { InvoiceService } from '../services/invoiceService'
import type {
  InvoiceFilters,
  CreateLinkedInvoiceInput,
  CreateStandaloneInvoiceInput,
  InvoiceStatus
} from '../types/invoice.types'
import { toast } from 'sonner'

const INVOICES_KEY = 'invoices'

function createSupabaseClient() {
  return createClient()
}

export function useInvoices(filters?: InvoiceFilters) {
  const supabase = useMemo(() => createSupabaseClient(), [])
  const invoiceService = useMemo(() => new InvoiceService(supabase), [supabase])
  const queryClient = useQueryClient()

  const {
    data: invoices = [],
    isLoading,
    error
  } = useQuery({
    queryKey: [INVOICES_KEY, filters],
    queryFn: () => invoiceService.getAll(filters)
  })

  const { data: stats } = useQuery({
    queryKey: [INVOICES_KEY, 'stats'],
    queryFn: () => invoiceService.getStats()
  })

  const createLinkedInvoice = useMutation({
    mutationFn: (input: CreateLinkedInvoiceInput) =>
      invoiceService.createLinkedInvoice(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] })
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      toast.success('Faktura byla vytvořena')
    },
    onError: (error: Error) => {
      toast.error(`Chyba: ${error.message}`)
    }
  })

  const createStandaloneInvoice = useMutation({
    mutationFn: (input: CreateStandaloneInvoiceInput) =>
      invoiceService.createStandaloneInvoice(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] })
      toast.success('Faktura byla vytvořena')
    },
    onError: (error: Error) => {
      toast.error(`Chyba: ${error.message}`)
    }
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      invoiceService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] })
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      toast.success('Stav faktury byl aktualizován')
    },
    onError: (error: Error) => {
      toast.error(`Chyba: ${error.message}`)
    }
  })

  const deleteInvoice = useMutation({
    mutationFn: (id: string) => invoiceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] })
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      toast.success('Faktura byla smazána')
    },
    onError: (error: Error) => {
      toast.error(`Chyba: ${error.message}`)
    }
  })

  return {
    invoices,
    stats,
    isLoading,
    error,
    createLinkedInvoice,
    createStandaloneInvoice,
    updateStatus,
    deleteInvoice
  }
}

export function useInvoice(id: string) {
  const supabase = useMemo(() => createSupabaseClient(), [])
  const invoiceService = useMemo(() => new InvoiceService(supabase), [supabase])

  return useQuery({
    queryKey: [INVOICES_KEY, id],
    queryFn: () => invoiceService.getById(id),
    enabled: !!id
  })
}

export function useUnbilledEntries(clientId?: string) {
  const supabase = useMemo(() => createSupabaseClient(), [])
  const invoiceService = useMemo(() => new InvoiceService(supabase), [supabase])

  return useQuery({
    queryKey: ['entries', 'unbilled', clientId],
    queryFn: () => invoiceService.getUnbilledEntries(clientId)
  })
}
```

### 3.2 useEntrySelection Hook

**Soubor:** `features/billing/hooks/useEntrySelection.ts`

```typescript
import { useState, useCallback, useMemo } from 'react'

export function useEntrySelection(initialIds: string[] = []) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialIds)
  )

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const selectMultiple = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })
  }, [])

  const deselectMultiple = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.delete(id))
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  )

  const selectedArray = useMemo(
    () => Array.from(selectedIds),
    [selectedIds]
  )

  return {
    selectedIds: selectedArray,
    selectedCount: selectedIds.size,
    toggle,
    selectAll,
    selectMultiple,
    deselectMultiple,
    clearSelection,
    isSelected,
    hasSelection: selectedIds.size > 0
  }
}
```

---

## Fáze 4: UI Komponenty

### 4.1 Struktura souborů

```
features/billing/components/
├── InvoiceList.tsx           # Seznam faktur
├── InvoiceCard.tsx           # Karta faktury
├── InvoiceStatusBadge.tsx    # Badge stavu
├── InvoiceStats.tsx          # Statistiky
├── InvoiceFilters.tsx        # Filtry
├── CreateInvoiceDialog.tsx   # Dialog vytvoření
├── LinkedInvoiceForm.tsx     # Formulář linked
├── StandaloneInvoiceForm.tsx # Formulář standalone
├── EntrySelector.tsx         # Multi-select záznamů
├── InvoiceDetail.tsx         # Detail faktury
└── InvoiceItemsTable.tsx     # Tabulka položek
```

### 4.2 InvoiceStatusBadge

**Soubor:** `features/billing/components/InvoiceStatusBadge.tsx`

```typescript
import { Badge } from '@/components/ui/badge'
import type { InvoiceStatus } from '../types/invoice.types'

const statusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: { label: 'Koncept', className: 'bg-gray-100 text-gray-800' },
  issued: { label: 'Vystavena', className: 'bg-blue-100 text-blue-800' },
  sent: { label: 'Odeslána', className: 'bg-indigo-100 text-indigo-800' },
  paid: { label: 'Zaplacena', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Stornována', className: 'bg-red-100 text-red-800' },
  overdue: { label: 'Po splatnosti', className: 'bg-orange-100 text-orange-800' }
}

interface Props {
  status: InvoiceStatus
}

export function InvoiceStatusBadge({ status }: Props) {
  const config = statusConfig[status]
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  )
}
```

### 4.3 InvoiceStats

**Soubor:** `features/billing/components/InvoiceStats.tsx`

```typescript
import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { InvoiceStats } from '../types/invoice.types'

interface Props {
  stats: InvoiceStats | undefined
  isLoading: boolean
}

export function InvoiceStatsCards({ stats, isLoading }: Props) {
  if (isLoading) {
    return <div className="text-gray-600">Načítám...</div>
  }

  return (
    <div className="grid gap-8 md:grid-cols-4">
      <Card className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="p-0 mb-4">
          <CardDescription className="text-sm text-gray-600 font-medium">
            Celkem faktur
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-3xl font-bold">{stats?.totalCount || 0}</div>
          <p className="text-lg text-gray-700 mt-2">
            {formatCurrency(stats?.totalAmount || 0)}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="p-0 mb-4">
          <CardDescription className="text-sm text-gray-600 font-medium">
            Nezaplacené
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-3xl font-bold text-orange-600">
            {(stats?.issuedCount || 0) + (stats?.overdueCount || 0)}
          </div>
          <p className="text-lg text-gray-700 mt-2">
            {formatCurrency(stats?.unpaidAmount || 0)}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="p-0 mb-4">
          <CardDescription className="text-sm text-gray-600 font-medium">
            Zaplacené
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-3xl font-bold text-green-600">
            {stats?.paidCount || 0}
          </div>
          <p className="text-lg text-gray-700 mt-2">
            {formatCurrency(stats?.paidAmount || 0)}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="p-0 mb-4">
          <CardDescription className="text-sm text-gray-600 font-medium">
            Po splatnosti
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-3xl font-bold text-red-600">
            {stats?.overdueCount || 0}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {stats?.draftCount || 0} konceptů
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 4.4 EntrySelector (Multi-select)

**Soubor:** `features/billing/components/EntrySelector.tsx`

```typescript
'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/date'
import { formatTime } from '@/lib/utils/time'
import { formatCurrency } from '@/lib/utils/currency'
import type { EntryWithRelations } from '@/features/time-tracking/types/entry.types'

interface Props {
  entries: EntryWithRelations[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onSelectAll: (ids: string[]) => void
  onClearSelection: () => void
  isLoading?: boolean
}

export function EntrySelector({
  entries,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearSelection,
  isLoading
}: Props) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const stats = useMemo(() => {
    const selected = entries.filter(e => selectedSet.has(e.id))
    const totalMinutes = selected.reduce((sum, e) => sum + e.duration_minutes, 0)
    const totalAmount = selected.reduce((sum, e) => {
      const hours = e.duration_minutes / 60
      return sum + (hours * e.hourly_rate)
    }, 0)
    return { count: selected.length, totalMinutes, totalAmount }
  }, [entries, selectedSet])

  const allSelected = entries.length > 0 && entries.every(e => selectedSet.has(e.id))
  const someSelected = entries.some(e => selectedSet.has(e.id))

  if (isLoading) {
    return <div className="text-gray-600 p-4">Načítám záznamy...</div>
  }

  if (entries.length === 0) {
    return (
      <div className="text-gray-600 p-4 text-center">
        Žádné nefakturované záznamy
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header s "Vybrat vše" */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => {
              if (checked) {
                onSelectAll(entries.map(e => e.id))
              } else {
                onClearSelection()
              }
            }}
          />
          <span className="font-medium">
            {allSelected ? 'Zrušit výběr' : 'Vybrat vše'}
          </span>
          <Badge variant="secondary">{entries.length} záznamů</Badge>
        </div>
        {someSelected && (
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Zrušit výběr
          </Button>
        )}
      </div>

      {/* Seznam záznamů */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {entries.map((entry) => {
          const isSelected = selectedSet.has(entry.id)
          const amount = (entry.duration_minutes / 60) * entry.hourly_rate

          return (
            <div
              key={entry.id}
              className={`
                flex items-center gap-4 p-4 rounded-lg border cursor-pointer
                transition-colors duration-150
                ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50'}
              `}
              onClick={() => onToggle(entry.id)}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggle(entry.id)}
                onClick={(e) => e.stopPropagation()}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium truncate">
                    {entry.client?.name || 'Neznámý'}
                  </span>
                  {entry.phase && (
                    <Badge variant="secondary" className="text-xs">
                      {entry.phase.name}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {entry.description}
                </p>
                <div className="flex gap-4 text-xs text-gray-500 mt-1">
                  <span>{formatDate(entry.date)}</span>
                  <span>{entry.start_time} - {entry.end_time}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="font-semibold">{formatCurrency(amount)}</div>
                <div className="text-sm text-gray-600">
                  {formatTime(entry.duration_minutes)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer se shrnutím */}
      {someSelected && (
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-4">
            <span className="font-medium">Vybráno:</span>
            <Badge>{stats.count} záznamů</Badge>
            <span className="text-gray-600">{formatTime(stats.totalMinutes)}</span>
          </div>
          <div className="text-xl font-bold">
            {formatCurrency(stats.totalAmount)}
          </div>
        </div>
      )}
    </div>
  )
}
```

### 4.5 InvoiceCard

**Soubor:** `features/billing/components/InvoiceCard.tsx`

```typescript
'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import type { InvoiceWithRelations, InvoiceStatus } from '../types/invoice.types'

interface Props {
  invoice: InvoiceWithRelations
  onView: (invoice: InvoiceWithRelations) => void
  onStatusChange: (id: string, status: InvoiceStatus) => void
  onDelete: (id: string) => void
  isDeleting?: boolean
}

export function InvoiceCard({
  invoice,
  onView,
  onStatusChange,
  onDelete,
  isDeleting
}: Props) {
  return (
    <Card className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="p-0 mb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold mb-1">
              {invoice.invoice_number}
            </CardTitle>
            <CardDescription>
              {invoice.client?.name || 'Bez klienta'}
            </CardDescription>
          </div>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Vystaveno:</span>
            <span>{formatDate(invoice.issue_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Splatnost:</span>
            <span>{formatDate(invoice.due_date)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t mt-2">
            <span className="text-gray-600">Celkem:</span>
            <span className="text-2xl font-bold">
              {formatCurrency(invoice.total_amount)}
            </span>
          </div>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">
              {invoice.invoice_type === 'linked' ? 'Ze záznamů' : 'Vlastní'}
            </Badge>
            {invoice.tax_rate > 0 && (
              <Badge variant="secondary">DPH {invoice.tax_rate}%</Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onView(invoice)}
          >
            Detail
          </Button>
          {invoice.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(invoice.id, 'issued')}
            >
              Vystavit
            </Button>
          )}
          {(invoice.status === 'issued' || invoice.status === 'sent') && (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600"
              onClick={() => onStatusChange(invoice.id, 'paid')}
            >
              Zaplaceno
            </Button>
          )}
          {invoice.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600"
              onClick={() => onDelete(invoice.id)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Mazání...' : 'Smazat'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Fáze 5: Stránky

### 5.1 Seznam faktur

**Soubor:** `app/(dashboard)/invoices/page.tsx`

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

import { useInvoices } from '@/features/billing/hooks/useInvoices'
import { useClients } from '@/features/time-tracking/hooks/useClients'
import { InvoiceStatsCards } from '@/features/billing/components/InvoiceStats'
import { InvoiceCard } from '@/features/billing/components/InvoiceCard'
import { CreateInvoiceDialog } from '@/features/billing/components/CreateInvoiceDialog'
import type { InvoiceFilters, InvoiceStatus, InvoiceWithRelations } from '@/features/billing/types/invoice.types'

export default function InvoicesPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<InvoiceFilters>({})
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { invoices, stats, isLoading, updateStatus, deleteInvoice } = useInvoices(filters)
  const { clients } = useClients()

  const handleFilterChange = useCallback((key: keyof InvoiceFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  const handleView = useCallback((invoice: InvoiceWithRelations) => {
    router.push(`/invoices/${invoice.id}`)
  }, [router])

  const handleStatusChange = useCallback(async (id: string, status: InvoiceStatus) => {
    await updateStatus.mutateAsync({ id, status })
  }, [updateStatus])

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id)
    try {
      await deleteInvoice.mutateAsync(id)
    } finally {
      setDeletingId(null)
    }
  }, [deleteInvoice])

  const hasFilters = filters.clientId || filters.status || filters.dateFrom || filters.dateTo

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Faktury</h2>
          <p className="text-lg text-gray-700">
            Správa a přehled vašich faktur
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          + Nová faktura
        </Button>
      </div>

      {/* Stats */}
      <InvoiceStatsCards stats={stats} isLoading={isLoading} />

      {/* Filters */}
      <Card className="bg-white p-8 shadow-md">
        <CardHeader className="p-0 mb-6">
          <CardTitle className="text-2xl font-bold">Filtry</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="client">Klient</Label>
              <Select
                value={filters.clientId || 'all'}
                onValueChange={(value) => handleFilterChange('clientId', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Všichni klienti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všichni klienti</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Stav</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Všechny stavy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny stavy</SelectItem>
                  <SelectItem value="draft">Koncept</SelectItem>
                  <SelectItem value="issued">Vystavena</SelectItem>
                  <SelectItem value="sent">Odeslána</SelectItem>
                  <SelectItem value="paid">Zaplacena</SelectItem>
                  <SelectItem value="overdue">Po splatnosti</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateFrom">Od data</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="dateTo">Do data</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {hasFilters && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Vymazat filtry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice List */}
      {isLoading ? (
        <div className="text-gray-600">Načítám faktury...</div>
      ) : invoices.length === 0 ? (
        <Card className="bg-white p-8 shadow-md text-center">
          <p className="text-gray-600 mb-4">Zatím nemáte žádné faktury</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            Vytvořit první fakturu
          </Button>
        </Card>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {invoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onView={handleView}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              isDeleting={deletingId === invoice.id}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateInvoiceDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  )
}
```

### 5.2 Aktualizace navigace

**Soubor:** `components/layout/Header.tsx` - přidat link:

```typescript
const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/clients', label: 'Klienti' },
  { href: '/entries', label: 'Záznamy' },
  { href: '/invoices', label: 'Faktury' },  // <- Přidat
  { href: '/reports', label: 'Reporty' },
  { href: '/settings', label: 'Nastavení' },
]
```

---

## Fáze 6: Rozšíření stránky Záznamy

### 6.1 Přidání multi-select do Entries

**Soubor:** `app/(dashboard)/entries/page.tsx` - rozšíření:

```typescript
// Přidat importy
import { useEntrySelection } from '@/features/billing/hooks/useEntrySelection'
import { CreateInvoiceDialog } from '@/features/billing/components/CreateInvoiceDialog'
import { Checkbox } from '@/components/ui/checkbox'

// Přidat state
const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false)
const {
  selectedIds,
  toggle,
  selectAll,
  clearSelection,
  isSelected,
  hasSelection,
  selectedCount
} = useEntrySelection()

// Přidat filter pro billing_status
const [billingStatusFilter, setBillingStatusFilter] = useState<string>('')

// V renderování přidat checkbox ke každému záznamu

// Přidat floating action bar
{hasSelection && (
  <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50
                  bg-white border rounded-lg shadow-lg p-4
                  flex items-center gap-4">
    <span className="text-sm text-gray-600">
      Vybráno: {selectedCount} záznamů
    </span>
    <span className="font-medium">
      {/* totalSelectedHours */} h | {/* totalSelectedAmount */}
    </span>
    <Button variant="ghost" size="sm" onClick={clearSelection}>
      Zrušit výběr
    </Button>
    <Button onClick={() => setIsInvoiceDialogOpen(true)}>
      Vytvořit fakturu
    </Button>
  </div>
)}

// Přidat dialog
<CreateInvoiceDialog
  open={isInvoiceDialogOpen}
  onOpenChange={setIsInvoiceDialogOpen}
  preselectedEntryIds={selectedIds}
  onSuccess={() => {
    clearSelection()
    setIsInvoiceDialogOpen(false)
  }}
/>
```

---

## Fáze 7: Nastavení

### 7.1 Rozšíření Settings page

**Soubor:** `app/(dashboard)/settings/page.tsx` - přidat sekci:

```typescript
{/* Firemní údaje pro faktury */}
<Card className="bg-white p-8 shadow-md">
  <CardHeader className="p-0 mb-6">
    <CardTitle className="text-2xl font-bold">Fakturační údaje</CardTitle>
    <CardDescription className="text-gray-700 mt-1">
      Údaje zobrazované na fakturách
    </CardDescription>
  </CardHeader>
  <CardContent className="p-0">
    <form className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="company_name">Název firmy / Jméno</Label>
          <Input id="company_name" {...register('company_name')} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="company_ico">IČO</Label>
          <Input id="company_ico" {...register('company_ico')} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="company_dic">DIČ</Label>
          <Input id="company_dic" {...register('company_dic')} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="bank_account">Číslo účtu</Label>
          <Input id="bank_account" {...register('bank_account')} className="mt-1" />
        </div>
      </div>
      <div>
        <Label htmlFor="company_address">Adresa</Label>
        <Textarea id="company_address" {...register('company_address')} className="mt-1" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="default_due_days">Výchozí splatnost (dny)</Label>
          <Input
            id="default_due_days"
            type="number"
            {...register('default_due_days')}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="default_tax_rate">Výchozí DPH (%)</Label>
          <Input
            id="default_tax_rate"
            type="number"
            step="0.01"
            {...register('default_tax_rate')}
            className="mt-1"
          />
        </div>
      </div>
      <Button type="submit">Uložit fakturační údaje</Button>
    </form>
  </CardContent>
</Card>
```

---

## Shrnutí implementačních kroků

| Fáze | Popis | Soubory |
|------|-------|---------|
| 1 | Databáze a typy | SQL migrace, database.ts, invoice.types.ts |
| 2 | Services | invoiceService.ts |
| 3 | Hooks | useInvoices.ts, useEntrySelection.ts |
| 4 | UI komponenty | 10+ komponent v features/billing/components/ |
| 5 | Stránky | /invoices, /invoices/[id] |
| 6 | Integrace Entries | Rozšíření /entries s multi-select |
| 7 | Nastavení | Rozšíření /settings o firemní údaje |

---

## Pořadí implementace (doporučené)

1. **SQL migrace** - vytvořit tabulky v Supabase
2. **Typy** - invoice.types.ts
3. **Service** - invoiceService.ts
4. **Hooks** - useInvoices.ts, useEntrySelection.ts
5. **UI komponenty** (v pořadí):
   - InvoiceStatusBadge
   - InvoiceStats
   - InvoiceCard
   - EntrySelector
   - InvoiceFilters
   - LinkedInvoiceForm
   - StandaloneInvoiceForm
   - CreateInvoiceDialog
   - InvoiceDetail
   - InvoiceItemsTable
6. **Stránky**:
   - /invoices/page.tsx
   - /invoices/[id]/page.tsx
7. **Navigace** - přidat link do Header.tsx
8. **Integrace** - rozšířit /entries o multi-select
9. **Nastavení** - přidat firemní údaje do /settings
