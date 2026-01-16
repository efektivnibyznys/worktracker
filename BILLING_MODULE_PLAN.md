# Plán implementace fakturačního modulu

## Přehled

Fakturační modul rozšíří aplikaci Work Tracker o možnost vystavování faktur ve dvou variantách:

1. **Faktury navázané na záznamy/fáze** - automatické generování z odpracovaných hodin
2. **Samostatné faktury** - ruční vytváření bez vazby na záznamy času

---

## 1. Databázové schéma

### 1.1 Nové tabulky

```sql
-- Hlavní tabulka faktur
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

    -- Základní údaje
    invoice_number TEXT NOT NULL,           -- Číslo faktury (např. "2024-001")
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,

    -- Typ faktury
    invoice_type TEXT NOT NULL DEFAULT 'standalone'
        CHECK (invoice_type IN ('linked', 'standalone')),
        -- 'linked' = navázaná na záznamy/fáze
        -- 'standalone' = samostatná

    -- Stav faktury
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'issued', 'sent', 'paid', 'cancelled', 'overdue')),

    -- Finanční údaje
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,     -- Mezisoučet bez DPH
    tax_rate NUMERIC(5, 2) DEFAULT 0,               -- Sazba DPH (%)
    tax_amount NUMERIC(12, 2) DEFAULT 0,            -- Částka DPH
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Celková částka
    currency TEXT NOT NULL DEFAULT 'CZK',

    -- Platební údaje
    payment_method TEXT,                    -- Způsob platby
    variable_symbol TEXT,                   -- Variabilní symbol
    bank_account TEXT,                      -- Číslo účtu

    -- Poznámky
    notes TEXT,                             -- Poznámka na faktuře
    internal_notes TEXT,                    -- Interní poznámka

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE        -- Datum zaplacení
);

-- Položky faktury (pro obě varianty)
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

    -- Vazba na záznamy (pro linked faktury)
    entry_id UUID REFERENCES entries(id) ON DELETE SET NULL,
    phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,

    -- Popis položky
    description TEXT NOT NULL,

    -- Množství a cena
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,     -- Množství (hodiny nebo kusy)
    unit TEXT DEFAULT 'hod',                         -- Jednotka
    unit_price NUMERIC(12, 2) NOT NULL,             -- Cena za jednotku
    total_price NUMERIC(12, 2) NOT NULL,            -- Celková cena položky

    -- Pořadí
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vazební tabulka pro propojení faktur se záznamy (many-to-many)
CREATE TABLE invoice_entries (
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    PRIMARY KEY (invoice_id, entry_id)
);

-- Přidání sloupce do entries pro sledování stavu fakturace
ALTER TABLE entries ADD COLUMN
    billing_status TEXT DEFAULT 'unbilled'
    CHECK (billing_status IN ('unbilled', 'billed', 'paid'));

ALTER TABLE entries ADD COLUMN
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
```

### 1.2 Indexy

```sql
-- Indexy pro rychlé vyhledávání
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_entries_entry_id ON invoice_entries(entry_id);
CREATE INDEX idx_entries_billing_status ON entries(billing_status);
CREATE INDEX idx_entries_invoice_id ON entries(invoice_id);
```

### 1.3 RLS politiky

```sql
-- Row Level Security pro invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own invoices" ON invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" ON invoices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices" ON invoices
    FOR DELETE USING (auth.uid() = user_id);

-- Row Level Security pro invoice_items
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage invoice items" ON invoice_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_items.invoice_id
            AND invoices.user_id = auth.uid()
        )
    );

-- Row Level Security pro invoice_entries
ALTER TABLE invoice_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage invoice entries" ON invoice_entries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_entries.invoice_id
            AND invoices.user_id = auth.uid()
        )
    );
```

### 1.4 Trigger pro aktualizaci updated_at

```sql
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
```

---

## 2. TypeScript typy

### 2.1 Nový soubor: `features/billing/types/invoice.types.ts`

```typescript
// Stav faktury
export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'paid' | 'cancelled' | 'overdue';

// Typ faktury
export type InvoiceType = 'linked' | 'standalone';

// Stav fakturace záznamu
export type BillingStatus = 'unbilled' | 'billed' | 'paid';

// Základní faktura
export interface Invoice {
    id: string;
    user_id: string;
    client_id: string | null;
    invoice_number: string;
    issue_date: string;
    due_date: string;
    invoice_type: InvoiceType;
    status: InvoiceStatus;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total_amount: number;
    currency: string;
    payment_method: string | null;
    variable_symbol: string | null;
    bank_account: string | null;
    notes: string | null;
    internal_notes: string | null;
    created_at: string;
    updated_at: string;
    paid_at: string | null;
}

// Faktura s relacemi
export interface InvoiceWithRelations extends Invoice {
    client?: {
        id: string;
        name: string;
    } | null;
    items?: InvoiceItem[];
    linked_entries?: EntryWithRelations[];
}

// Položka faktury
export interface InvoiceItem {
    id: string;
    invoice_id: string;
    entry_id: string | null;
    phase_id: string | null;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
    sort_order: number;
    created_at: string;
}

// Pro vytvoření faktury
export interface CreateInvoiceInput {
    client_id?: string;
    invoice_type: InvoiceType;
    issue_date: string;
    due_date: string;
    tax_rate?: number;
    payment_method?: string;
    variable_symbol?: string;
    bank_account?: string;
    notes?: string;
    internal_notes?: string;
}

// Pro vytvoření položky
export interface CreateInvoiceItemInput {
    invoice_id: string;
    entry_id?: string;
    phase_id?: string;
    description: string;
    quantity: number;
    unit?: string;
    unit_price: number;
}

// Pro linked fakturu - výběr záznamů
export interface LinkedInvoiceInput extends CreateInvoiceInput {
    invoice_type: 'linked';
    entry_ids: string[];      // Jednotlivé záznamy
    phase_ids?: string[];     // Nebo celé fáze
    group_by?: 'entry' | 'phase' | 'day';  // Jak seskupit položky
}

// Pro standalone fakturu
export interface StandaloneInvoiceInput extends CreateInvoiceInput {
    invoice_type: 'standalone';
    items: Omit<CreateInvoiceItemInput, 'invoice_id'>[];
}

// Filtry pro seznam faktur
export interface InvoiceFilters {
    clientId?: string;
    status?: InvoiceStatus;
    invoiceType?: InvoiceType;
    dateFrom?: string;
    dateTo?: string;
}

// Statistiky faktur
export interface InvoiceStats {
    totalCount: number;
    draftCount: number;
    issuedCount: number;
    paidCount: number;
    overdueCount: number;
    totalAmount: number;
    paidAmount: number;
    unpaidAmount: number;
}
```

---

## 3. Services

### 3.1 Nový soubor: `features/billing/services/invoiceService.ts`

```typescript
import { createClient } from '@/lib/supabase/client';
import type {
    Invoice,
    InvoiceWithRelations,
    InvoiceItem,
    CreateInvoiceInput,
    CreateInvoiceItemInput,
    LinkedInvoiceInput,
    StandaloneInvoiceInput,
    InvoiceFilters,
    InvoiceStats
} from '../types/invoice.types';

class InvoiceService {
    private supabase = createClient();

    // Získat všechny faktury s filtry
    async getAll(filters?: InvoiceFilters): Promise<InvoiceWithRelations[]> {
        let query = this.supabase
            .from('invoices')
            .select(`
                *,
                client:clients(id, name)
            `)
            .order('issue_date', { ascending: false });

        if (filters?.clientId) {
            query = query.eq('client_id', filters.clientId);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.invoiceType) {
            query = query.eq('invoice_type', filters.invoiceType);
        }
        if (filters?.dateFrom) {
            query = query.gte('issue_date', filters.dateFrom);
        }
        if (filters?.dateTo) {
            query = query.lte('issue_date', filters.dateTo);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    // Získat fakturu s položkami
    async getById(id: string): Promise<InvoiceWithRelations | null> {
        const { data: invoice, error: invoiceError } = await this.supabase
            .from('invoices')
            .select(`
                *,
                client:clients(id, name)
            `)
            .eq('id', id)
            .single();

        if (invoiceError) throw invoiceError;
        if (!invoice) return null;

        // Načíst položky
        const { data: items, error: itemsError } = await this.supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', id)
            .order('sort_order');

        if (itemsError) throw itemsError;

        // Pro linked faktury načíst propojené záznamy
        if (invoice.invoice_type === 'linked') {
            const { data: linkedEntries, error: entriesError } = await this.supabase
                .from('entries')
                .select(`
                    *,
                    client:clients(id, name),
                    phase:phases(id, name)
                `)
                .eq('invoice_id', id);

            if (entriesError) throw entriesError;

            return {
                ...invoice,
                items: items || [],
                linked_entries: linkedEntries || []
            };
        }

        return {
            ...invoice,
            items: items || []
        };
    }

    // Vytvořit linked fakturu (z existujících záznamů)
    async createLinkedInvoice(input: LinkedInvoiceInput): Promise<Invoice> {
        const { entry_ids, phase_ids, group_by, ...invoiceData } = input;

        // Získat záznamy k fakturaci
        let entries;
        if (entry_ids?.length) {
            const { data, error } = await this.supabase
                .from('entries')
                .select('*, phase:phases(id, name)')
                .in('id', entry_ids)
                .eq('billing_status', 'unbilled');

            if (error) throw error;
            entries = data;
        } else if (phase_ids?.length) {
            const { data, error } = await this.supabase
                .from('entries')
                .select('*, phase:phases(id, name)')
                .in('phase_id', phase_ids)
                .eq('billing_status', 'unbilled');

            if (error) throw error;
            entries = data;
        }

        if (!entries?.length) {
            throw new Error('Žádné záznamy k fakturaci');
        }

        // Spočítat celkovou částku
        const subtotal = entries.reduce((sum, entry) => {
            const hours = entry.duration_minutes / 60;
            return sum + (hours * entry.hourly_rate);
        }, 0);

        const tax_amount = subtotal * ((invoiceData.tax_rate || 0) / 100);
        const total_amount = subtotal + tax_amount;

        // Generovat číslo faktury
        const invoice_number = await this.generateInvoiceNumber();

        // Vytvořit fakturu
        const { data: invoice, error: invoiceError } = await this.supabase
            .from('invoices')
            .insert({
                ...invoiceData,
                invoice_number,
                subtotal,
                tax_amount,
                total_amount,
                invoice_type: 'linked'
            })
            .select()
            .single();

        if (invoiceError) throw invoiceError;

        // Vytvořit položky podle group_by
        const items = this.groupEntriesForInvoice(entries, group_by || 'entry');

        for (const item of items) {
            await this.supabase
                .from('invoice_items')
                .insert({
                    invoice_id: invoice.id,
                    ...item
                });
        }

        // Aktualizovat záznamy - označit jako fakturované
        await this.supabase
            .from('entries')
            .update({
                billing_status: 'billed',
                invoice_id: invoice.id
            })
            .in('id', entries.map(e => e.id));

        return invoice;
    }

    // Vytvořit standalone fakturu
    async createStandaloneInvoice(input: StandaloneInvoiceInput): Promise<Invoice> {
        const { items, ...invoiceData } = input;

        // Spočítat celkovou částku
        const subtotal = items.reduce((sum, item) => {
            return sum + (item.quantity * item.unit_price);
        }, 0);

        const tax_amount = subtotal * ((invoiceData.tax_rate || 0) / 100);
        const total_amount = subtotal + tax_amount;

        // Generovat číslo faktury
        const invoice_number = await this.generateInvoiceNumber();

        // Vytvořit fakturu
        const { data: invoice, error: invoiceError } = await this.supabase
            .from('invoices')
            .insert({
                ...invoiceData,
                invoice_number,
                subtotal,
                tax_amount,
                total_amount,
                invoice_type: 'standalone'
            })
            .select()
            .single();

        if (invoiceError) throw invoiceError;

        // Vytvořit položky
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            await this.supabase
                .from('invoice_items')
                .insert({
                    invoice_id: invoice.id,
                    description: item.description,
                    quantity: item.quantity,
                    unit: item.unit || 'ks',
                    unit_price: item.unit_price,
                    total_price: item.quantity * item.unit_price,
                    sort_order: i
                });
        }

        return invoice;
    }

    // Aktualizovat fakturu
    async update(id: string, updates: Partial<Invoice>): Promise<Invoice> {
        // Přepočítat částky pokud se mění sazba DPH
        if (updates.tax_rate !== undefined) {
            const { data: current } = await this.supabase
                .from('invoices')
                .select('subtotal')
                .eq('id', id)
                .single();

            if (current) {
                updates.tax_amount = current.subtotal * (updates.tax_rate / 100);
                updates.total_amount = current.subtotal + updates.tax_amount;
            }
        }

        const { data, error } = await this.supabase
            .from('invoices')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Změnit stav faktury
    async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
        const updates: Partial<Invoice> = { status };

        if (status === 'paid') {
            updates.paid_at = new Date().toISOString();
        }

        const invoice = await this.update(id, updates);

        // Pokud je faktura zaplacena, aktualizovat záznamy
        if (status === 'paid' && invoice.invoice_type === 'linked') {
            await this.supabase
                .from('entries')
                .update({ billing_status: 'paid' })
                .eq('invoice_id', id);
        }

        return invoice;
    }

    // Smazat fakturu
    async delete(id: string): Promise<void> {
        // Nejprve vrátit záznamy do stavu 'unbilled'
        await this.supabase
            .from('entries')
            .update({
                billing_status: 'unbilled',
                invoice_id: null
            })
            .eq('invoice_id', id);

        // Smazat fakturu (položky se smažou kaskádově)
        const { error } = await this.supabase
            .from('invoices')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // Získat statistiky
    async getStats(): Promise<InvoiceStats> {
        const { data: invoices, error } = await this.supabase
            .from('invoices')
            .select('status, total_amount');

        if (error) throw error;

        const stats: InvoiceStats = {
            totalCount: invoices?.length || 0,
            draftCount: 0,
            issuedCount: 0,
            paidCount: 0,
            overdueCount: 0,
            totalAmount: 0,
            paidAmount: 0,
            unpaidAmount: 0
        };

        invoices?.forEach(inv => {
            stats.totalAmount += inv.total_amount;

            switch (inv.status) {
                case 'draft':
                    stats.draftCount++;
                    break;
                case 'issued':
                case 'sent':
                    stats.issuedCount++;
                    stats.unpaidAmount += inv.total_amount;
                    break;
                case 'paid':
                    stats.paidCount++;
                    stats.paidAmount += inv.total_amount;
                    break;
                case 'overdue':
                    stats.overdueCount++;
                    stats.unpaidAmount += inv.total_amount;
                    break;
            }
        });

        return stats;
    }

    // Získat nefakturované záznamy
    async getUnbilledEntries(clientId?: string, phaseId?: string) {
        let query = this.supabase
            .from('entries')
            .select(`
                *,
                client:clients(id, name),
                phase:phases(id, name)
            `)
            .eq('billing_status', 'unbilled')
            .order('date', { ascending: false });

        if (clientId) {
            query = query.eq('client_id', clientId);
        }
        if (phaseId) {
            query = query.eq('phase_id', phaseId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    // Pomocné metody
    private async generateInvoiceNumber(): Promise<string> {
        const year = new Date().getFullYear();

        const { count, error } = await this.supabase
            .from('invoices')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', `${year}-01-01`);

        if (error) throw error;

        const nextNumber = (count || 0) + 1;
        return `${year}-${String(nextNumber).padStart(4, '0')}`;
    }

    private groupEntriesForInvoice(entries: any[], groupBy: 'entry' | 'phase' | 'day') {
        const items: CreateInvoiceItemInput[] = [];

        if (groupBy === 'entry') {
            // Každý záznam jako samostatná položka
            entries.forEach((entry, index) => {
                const hours = entry.duration_minutes / 60;
                items.push({
                    invoice_id: '', // bude doplněno
                    entry_id: entry.id,
                    phase_id: entry.phase_id,
                    description: entry.description || `Práce ${entry.date}`,
                    quantity: hours,
                    unit: 'hod',
                    unit_price: entry.hourly_rate
                });
            });
        } else if (groupBy === 'phase') {
            // Seskupit podle fáze
            const grouped = new Map();
            entries.forEach(entry => {
                const key = entry.phase_id || 'no-phase';
                if (!grouped.has(key)) {
                    grouped.set(key, {
                        phase_id: entry.phase_id,
                        phase_name: entry.phase?.name || 'Bez fáze',
                        entries: [],
                        total_minutes: 0,
                        hourly_rate: entry.hourly_rate
                    });
                }
                const group = grouped.get(key);
                group.entries.push(entry);
                group.total_minutes += entry.duration_minutes;
            });

            grouped.forEach((group, key) => {
                const hours = group.total_minutes / 60;
                items.push({
                    invoice_id: '',
                    phase_id: group.phase_id,
                    description: group.phase_name,
                    quantity: hours,
                    unit: 'hod',
                    unit_price: group.hourly_rate
                });
            });
        } else if (groupBy === 'day') {
            // Seskupit podle dne
            const grouped = new Map();
            entries.forEach(entry => {
                const key = entry.date;
                if (!grouped.has(key)) {
                    grouped.set(key, {
                        date: entry.date,
                        entries: [],
                        total_minutes: 0,
                        hourly_rate: entry.hourly_rate
                    });
                }
                const group = grouped.get(key);
                group.entries.push(entry);
                group.total_minutes += entry.duration_minutes;
            });

            grouped.forEach((group, key) => {
                const hours = group.total_minutes / 60;
                items.push({
                    invoice_id: '',
                    description: `Práce dne ${group.date}`,
                    quantity: hours,
                    unit: 'hod',
                    unit_price: group.hourly_rate
                });
            });
        }

        return items;
    }
}

export const invoiceService = new InvoiceService();
```

---

## 4. React Hooks

### 4.1 Nový soubor: `features/billing/hooks/useInvoices.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceService } from '../services/invoiceService';
import type {
    InvoiceFilters,
    LinkedInvoiceInput,
    StandaloneInvoiceInput,
    InvoiceStatus
} from '../types/invoice.types';
import { toast } from 'sonner';

const INVOICES_KEY = 'invoices';

export function useInvoices(filters?: InvoiceFilters) {
    const queryClient = useQueryClient();

    // Získat seznam faktur
    const {
        data: invoices = [],
        isLoading,
        error
    } = useQuery({
        queryKey: [INVOICES_KEY, filters],
        queryFn: () => invoiceService.getAll(filters)
    });

    // Získat statistiky
    const {
        data: stats
    } = useQuery({
        queryKey: [INVOICES_KEY, 'stats'],
        queryFn: () => invoiceService.getStats()
    });

    // Vytvořit linked fakturu
    const createLinkedInvoice = useMutation({
        mutationFn: (input: LinkedInvoiceInput) =>
            invoiceService.createLinkedInvoice(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
            queryClient.invalidateQueries({ queryKey: ['entries'] });
            toast.success('Faktura byla vytvořena');
        },
        onError: (error: Error) => {
            toast.error(`Chyba: ${error.message}`);
        }
    });

    // Vytvořit standalone fakturu
    const createStandaloneInvoice = useMutation({
        mutationFn: (input: StandaloneInvoiceInput) =>
            invoiceService.createStandaloneInvoice(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
            toast.success('Faktura byla vytvořena');
        },
        onError: (error: Error) => {
            toast.error(`Chyba: ${error.message}`);
        }
    });

    // Aktualizovat stav
    const updateStatus = useMutation({
        mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
            invoiceService.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
            queryClient.invalidateQueries({ queryKey: ['entries'] });
            toast.success('Stav faktury byl aktualizován');
        },
        onError: (error: Error) => {
            toast.error(`Chyba: ${error.message}`);
        }
    });

    // Smazat fakturu
    const deleteInvoice = useMutation({
        mutationFn: (id: string) => invoiceService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
            queryClient.invalidateQueries({ queryKey: ['entries'] });
            toast.success('Faktura byla smazána');
        },
        onError: (error: Error) => {
            toast.error(`Chyba: ${error.message}`);
        }
    });

    return {
        invoices,
        stats,
        isLoading,
        error,
        createLinkedInvoice,
        createStandaloneInvoice,
        updateStatus,
        deleteInvoice
    };
}

// Hook pro detail faktury
export function useInvoice(id: string) {
    return useQuery({
        queryKey: [INVOICES_KEY, id],
        queryFn: () => invoiceService.getById(id),
        enabled: !!id
    });
}

// Hook pro nefakturované záznamy
export function useUnbilledEntries(clientId?: string, phaseId?: string) {
    return useQuery({
        queryKey: ['entries', 'unbilled', clientId, phaseId],
        queryFn: () => invoiceService.getUnbilledEntries(clientId, phaseId)
    });
}
```

---

## 5. UI Komponenty

### 5.1 Struktura komponent

```
features/billing/components/
├── InvoiceList.tsx           # Seznam faktur s filtry
├── InvoiceCard.tsx           # Karta faktury v seznamu
├── InvoiceDetail.tsx         # Detail faktury
├── InvoiceStatusBadge.tsx    # Badge se stavem faktury
├── CreateInvoiceDialog.tsx   # Dialog pro vytvoření faktury
├── LinkedInvoiceForm.tsx     # Formulář pro linked fakturu
├── StandaloneInvoiceForm.tsx # Formulář pro standalone fakturu
├── InvoiceItemsTable.tsx     # Tabulka položek faktury
├── EntrySelector.tsx         # Výběr záznamů k fakturaci
├── InvoicePreview.tsx        # Náhled faktury před tiskem
└── InvoiceStats.tsx          # Statistiky faktur
```

### 5.2 Klíčové komponenty

#### InvoiceList.tsx
```typescript
// Seznam faktur s filtry (klient, stav, datum)
// Zobrazuje karty faktur s klíčovými údaji
// Quick actions: změna stavu, mazání
```

#### CreateInvoiceDialog.tsx
```typescript
// Modal pro vytvoření nové faktury
// Tab 1: Linked faktura - výběr záznamů/fází
// Tab 2: Standalone faktura - ruční položky
```

#### LinkedInvoiceForm.tsx
```typescript
// 1. Výběr klienta
// 2. Filtry: datum od-do, fáze
// 3. Seznam nefakturovaných záznamů (checkbox)
// 4. Možnost seskupení: po záznamech / fázích / dnech
// 5. Nastavení DPH, splatnosti
// 6. Preview celkové částky
```

#### StandaloneInvoiceForm.tsx
```typescript
// 1. Výběr klienta (optional)
// 2. Dynamický seznam položek (přidat/odebrat)
// 3. Každá položka: popis, množství, jednotka, cena
// 4. Nastavení DPH, splatnosti
// 5. Preview celkové částky
```

#### InvoiceDetail.tsx
```typescript
// Zobrazení detailu faktury
// Seznam položek v tabulce
// Timeline změn stavu
// Akce: změna stavu, export PDF, tisk
```

---

## 6. Stránky a routing

### 6.1 Nové stránky

```
app/(dashboard)/
├── invoices/
│   ├── page.tsx              # Seznam faktur + statistiky
│   ├── new/
│   │   └── page.tsx          # Vytvoření nové faktury
│   └── [id]/
│       ├── page.tsx          # Detail faktury
│       └── edit/
│           └── page.tsx      # Editace faktury
```

### 6.2 Navigace

Přidat do `Header.tsx`:
```typescript
{ href: '/invoices', label: 'Faktury' }
```

---

## 7. Rozšíření existujících komponent

### 7.1 Úpravy v entries

**EntryCard / EntryRow** - přidat:
- Badge s billing_status
- Checkbox pro výběr k fakturaci
- Quick action "Fakturovat"

**EntriesPage** - přidat:
- Filtr podle billing_status
- Hromadné akce (vybrat více záznamů → fakturovat)

### 7.2 Úpravy v phases

**PhaseCard** - přidat:
- Tlačítko "Fakturovat fázi"
- Zobrazení nefakturované částky

### 7.3 Úpravy v reports

**ReportsPage** - přidat:
- Možnost generovat fakturu z reportu
- Export jako faktura

---

## 8. Nastavení uživatele

### 8.1 Rozšíření tabulky settings

```sql
ALTER TABLE settings ADD COLUMN company_name TEXT;
ALTER TABLE settings ADD COLUMN company_address TEXT;
ALTER TABLE settings ADD COLUMN company_ico TEXT;
ALTER TABLE settings ADD COLUMN company_dic TEXT;
ALTER TABLE settings ADD COLUMN bank_account TEXT;
ALTER TABLE settings ADD COLUMN default_due_days INTEGER DEFAULT 14;
ALTER TABLE settings ADD COLUMN default_tax_rate NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE settings ADD COLUMN invoice_note_template TEXT;
```

### 8.2 Nová sekce v Settings

Přidat do `/settings/page.tsx`:
- Firemní údaje (pro faktury)
- Bankovní spojení
- Výchozí splatnost
- Výchozí DPH
- Šablona poznámky na faktuře

---

## 9. Implementační kroky

### Fáze 1: Základy (databáze + typy)
1. Vytvořit SQL migraci s novými tabulkami
2. Aktualizovat databázové typy
3. Vytvořit TypeScript typy pro faktury

### Fáze 2: Backend služby
1. Implementovat `invoiceService`
2. Implementovat `useInvoices` hook
3. Přidat billing_status do existujících služeb

### Fáze 3: UI - Seznam a detail
1. Vytvořit stránku seznamu faktur
2. Implementovat InvoiceList a InvoiceCard
3. Vytvořit stránku detailu faktury

### Fáze 4: UI - Vytváření faktur
1. Implementovat CreateInvoiceDialog
2. Implementovat LinkedInvoiceForm s výběrem záznamů
3. Implementovat StandaloneInvoiceForm
4. Přidat validaci pomocí Zod

### Fáze 5: Integrace
1. Přidat billing_status do záznamů
2. Rozšířit existující komponenty
3. Aktualizovat navigaci

### Fáze 6: Nastavení a dokončení
1. Rozšířit nastavení o firemní údaje
2. Implementovat náhled/tisk faktury
3. Testování a opravy

---

## 10. Budoucí rozšíření (volitelné)

- **PDF export** - generování PDF faktur
- **Email odesílání** - odeslání faktury emailem
- **Šablony faktur** - různé vizuální styly
- **Opakované faktury** - automatické generování
- **Platební brány** - online platby
- **Účetní export** - export pro účetní software
- **Multi-currency** - více měn na jedné faktuře
- **Zálohy** - zálohové faktury
