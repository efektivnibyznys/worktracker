-- ============================================
-- BILLING MODULE - DATABASE MIGRATION
-- ============================================
-- Migrace pro fakturační modul Work Tracker
-- Spusťte v Supabase SQL Editor

-- ============================================
-- 1. NOVÉ TABULKY
-- ============================================

-- Hlavní tabulka faktur
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

    -- Základní údaje
    invoice_number TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,

    -- Typ faktury: 'linked' = z vybraných záznamů, 'standalone' = vlastní položky
    invoice_type TEXT NOT NULL DEFAULT 'standalone'
        CHECK (invoice_type IN ('linked', 'standalone')),

    -- Stav faktury
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'issued', 'sent', 'paid', 'cancelled', 'overdue')),

    -- Finanční údaje
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5, 2) DEFAULT 0,
    tax_amount NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'CZK',

    -- Platební údaje
    variable_symbol TEXT,
    bank_account TEXT,

    -- Poznámky
    notes TEXT,
    internal_notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Položky faktury
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,

    -- Vazba na původní záznamy (pro linked faktury)
    entry_id UUID REFERENCES entries(id) ON DELETE SET NULL,
    phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,

    -- Popis položky
    description TEXT NOT NULL,

    -- Množství a cena
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'hod',
    unit_price NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL,

    -- Pořadí na faktuře
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. ROZŠÍŘENÍ EXISTUJÍCÍCH TABULEK
-- ============================================

-- Rozšíření entries o billing_status a invoice_id
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

-- ============================================
-- 3. CHECK CONSTRAINTS
-- ============================================

-- Zajistit nezáporné částky na faktuře
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS check_positive_subtotal;
ALTER TABLE invoices ADD CONSTRAINT check_positive_subtotal
    CHECK (subtotal >= 0);

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS check_positive_tax_rate;
ALTER TABLE invoices ADD CONSTRAINT check_positive_tax_rate
    CHECK (tax_rate >= 0);

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS check_positive_total;
ALTER TABLE invoices ADD CONSTRAINT check_positive_total
    CHECK (total_amount >= 0);

-- Zajistit kladné množství a cenu u položek
ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS check_positive_quantity;
ALTER TABLE invoice_items ADD CONSTRAINT check_positive_quantity
    CHECK (quantity > 0);

ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS check_positive_unit_price;
ALTER TABLE invoice_items ADD CONSTRAINT check_positive_unit_price
    CHECK (unit_price >= 0);

-- ============================================
-- 4. INDEXY
-- ============================================

-- Indexy pro invoices
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON invoices(user_id, status);

-- Indexy pro invoice_items
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_entry_id ON invoice_items(entry_id) WHERE entry_id IS NOT NULL;

-- Indexy pro rozšířené entries sloupce
CREATE INDEX IF NOT EXISTS idx_entries_billing_status ON entries(billing_status);
CREATE INDEX IF NOT EXISTS idx_entries_invoice_id ON entries(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entries_unbilled ON entries(user_id, billing_status) WHERE billing_status = 'unbilled';

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================

-- RLS pro invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
    ON invoices FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own invoices"
    ON invoices FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own invoices"
    ON invoices FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own invoices"
    ON invoices FOR DELETE
    USING ((select auth.uid()) = user_id);

-- RLS pro invoice_items (přes parent invoice)
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoice items"
    ON invoice_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_items.invoice_id
            AND invoices.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can insert own invoice items"
    ON invoice_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_items.invoice_id
            AND invoices.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can update own invoice items"
    ON invoice_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_items.invoice_id
            AND invoices.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can delete own invoice items"
    ON invoice_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_items.invoice_id
            AND invoices.user_id = (select auth.uid())
        )
    );

-- ============================================
-- 6. TRIGGER PRO updated_at
-- ============================================

-- Funkce pro automatickou aktualizaci updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pro invoices
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. REALTIME
-- ============================================

-- Povolení real-time aktualizací pro nové tabulky
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE invoice_items;

-- ============================================
-- HOTOVO!
-- ============================================
-- Billing modul databáze je připravena.
