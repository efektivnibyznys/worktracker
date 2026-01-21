-- ============================================
-- MIGRACE: Přidání adresy a IČO ke klientům
-- ============================================
-- Tato migrace přidá sloupce pro adresu a IČO do tabulky clients
-- a do tabulky invoices (pro snapshot dat při vytvoření faktury)

-- ============================================
-- 1. Přidat sloupce do tabulky clients
-- ============================================

-- Přidat adresu klienta
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS address TEXT;

-- Přidat IČO klienta
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS ico TEXT;

-- ============================================
-- 2. Přidat sloupce do tabulky invoices
-- ============================================
-- Uložení snapshot dat klienta v době vytvoření faktury

-- Přidat jméno klienta (snapshot)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Přidat adresu klienta (snapshot)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS client_address TEXT;

-- Přidat IČO klienta (snapshot)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS client_ico TEXT;

-- ============================================
-- HOTOVO!
-- ============================================
-- Spusťte tento SQL v Supabase SQL Editor
