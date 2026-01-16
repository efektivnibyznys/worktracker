# Billing Module - Implementační log

Tento dokument slouží jako dokumentace problémů, řešení a best practices při implementaci fakturačního modulu.

---

## Fáze 1: Databáze a typy

### Datum: 2026-01-16

#### Stav: DOKONČENO

### Vytvořené soubory

1. `supabase/migrations/002_billing.sql` - SQL migrace
2. `types/database.ts` - Aktualizované databázové typy
3. `features/billing/types/invoice.types.ts` - TypeScript typy pro billing

### Co bylo implementováno

1. **Tabulka `invoices`**
   - Hlavní tabulka faktur
   - Podpora linked a standalone typu
   - Stavy: draft, issued, sent, paid, cancelled, overdue
   - RLS politiky

2. **Tabulka `invoice_items`**
   - Položky faktury
   - Vazba na entries a phases (pro linked faktury)
   - RLS přes parent invoice

3. **Rozšíření `entries`**
   - Nový sloupec `billing_status` (unbilled/billed/paid)
   - Nový sloupec `invoice_id` (FK na invoices)

4. **Rozšíření `settings`**
   - company_name, company_address, company_ico, company_dic
   - bank_account, default_due_days, default_tax_rate

---

## Problémy a řešení

### [P001] - TypeScript check selhával kvůli chybějícím node_modules
- **Problém:** `npx tsc --noEmit` hlásil chyby o chybějících modulech (react, next)
- **Příčina:** Závislosti nebyly nainstalované
- **Řešení:** Spustit `npm install` před TypeScript checkem
- **Poučení:** Vždy nejprve nainstalovat závislosti před kontrolou typů

---

## Best practices zjištěné během implementace

1. **Vždy používat `IF NOT EXISTS` / `IF EXISTS`** - Umožňuje opakované spouštění migrace
2. **RLS politiky pro child tabulky** - Používat EXISTS subquery na parent tabulku
3. **Indexy pro WHERE podmínky** - Přidat partial index pro časté filtry (např. `WHERE billing_status = 'unbilled'`)
4. **Konzistentní typy** - Používat `Database['public']['Tables']` pattern pro odvození typů

---

## Checklist před další fází

- [x] SQL migrace vytvořena
- [x] Typy aktualizovány v database.ts
- [x] Billing typy vytvořeny
- [x] Žádné TypeScript errory
- [ ] SQL migrace aplikována v Supabase (nutno ručně)

---

## Fáze 2: Services a Hooks

### Datum: 2026-01-16

#### Stav: DOKONČENO

### Vytvořené soubory

1. `features/billing/services/invoiceService.ts` - Hlavní service pro faktury
2. `features/billing/hooks/useInvoices.ts` - React Query hooks
3. `features/billing/hooks/useEntrySelection.ts` - Hook pro multi-select

### Co bylo implementováno

1. **InvoiceService**
   - `getAllWithFilters()` - Seznam faktur s filtry
   - `getByIdWithItems()` - Detail faktury s položkami
   - `getStats()` - Statistiky faktur
   - `getUnbilledEntries()` - Nefakturované záznamy
   - `createLinkedInvoice()` - Vytvoření z vybraných záznamů
   - `createStandaloneInvoice()` - Vytvoření s vlastními položkami
   - `updateStatus()` - Změna stavu faktury
   - `deleteInvoice()` - Smazání s resetem záznamů
   - `generateInvoiceNumber()` - Generování čísla faktury
   - `groupEntriesForInvoice()` - Seskupení položek

2. **useInvoices hook**
   - Query pro seznam faktur
   - Query pro statistiky
   - Mutations: create, updateStatus, delete
   - Toast notifikace

3. **useEntrySelection hook**
   - Multi-select logika
   - toggle, selectAll, clearSelection
   - areAllSelected, areSomeSelected
   - Optimalizované pomocí useCallback/useMemo

---

## Další fáze: UI Komponenty

Připraveno k implementaci:
- `features/billing/components/InvoiceStatusBadge.tsx`
- `features/billing/components/InvoiceStats.tsx`
- `features/billing/components/InvoiceCard.tsx`
- `features/billing/components/EntrySelector.tsx`
- `features/billing/components/CreateInvoiceDialog.tsx`
