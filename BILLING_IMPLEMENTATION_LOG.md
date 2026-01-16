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

## Fáze 3: UI Komponenty

### Datum: 2026-01-16

#### Stav: DOKONČENO

### Vytvořené soubory

1. `components/ui/checkbox.tsx` - Vlastní Checkbox komponenta
2. `features/billing/components/InvoiceStatusBadge.tsx`
3. `features/billing/components/BillingStatusBadge.tsx`
4. `features/billing/components/InvoiceStats.tsx`
5. `features/billing/components/InvoiceCard.tsx`
6. `features/billing/components/InvoiceFilters.tsx`
7. `features/billing/components/EntrySelector.tsx`
8. `features/billing/components/LinkedInvoiceForm.tsx`
9. `features/billing/components/StandaloneInvoiceForm.tsx`
10. `features/billing/components/CreateInvoiceDialog.tsx`
11. `features/billing/components/index.ts`

### Co bylo implementováno

1. **Badge komponenty**
   - InvoiceStatusBadge - barevné zobrazení stavu faktury
   - BillingStatusBadge - stav fakturace záznamu

2. **InvoiceStatsCards**
   - 4 karty se statistikami (celkem, nezaplacené, zaplacené, po splatnosti)
   - Loading skeleton

3. **InvoiceCard**
   - Zobrazení faktury v seznamu
   - Akce: detail, změna stavu, smazání
   - Detekce po splatnosti

4. **InvoiceFiltersCard**
   - Filtry: klient, stav, typ, datum od/do
   - Tlačítko vymazat filtry

5. **EntrySelector**
   - Multi-select s checkboxy
   - Vybrat vše / zrušit výběr
   - Sticky header a footer
   - Zobrazení součtů

6. **LinkedInvoiceForm**
   - Výběr klienta → načtení nefakturovaných záznamů
   - Seskupení položek (entry/phase/day)
   - Náhled částky s DPH

7. **StandaloneInvoiceForm**
   - Dynamické přidávání položek
   - useFieldArray pro položky
   - Průběžný výpočet celkové částky

8. **CreateInvoiceDialog**
   - Přepínání mezi linked a standalone
   - Předvýběr záznamů

---

## Problémy a řešení (Fáze 3)

### [P002] - shadcn/ui checkbox nelze nainstalovat
- **Problém:** `npx shadcn add checkbox` selhává s autentizační chybou
- **Příčina:** Omezení přístupu k shadcn registry
- **Řešení:** Vytvořit vlastní Checkbox komponentu kompatibilní se shadcn API
- **Poučení:** Mít připravenou fallback variantu pro shadcn komponenty

---

## Fáze 4: Stránky

### Datum: 2026-01-16

#### Stav: DOKONČENO

### Vytvořené soubory

1. `app/(dashboard)/invoices/page.tsx` - Seznam faktur
2. `app/(dashboard)/invoices/[id]/page.tsx` - Detail faktury
3. `components/layout/Header.tsx` - Aktualizovaná navigace

### Co bylo implementováno

1. **Seznam faktur (`/invoices`)**
   - Statistické karty (celkem, nezaplacené, zaplacené, po splatnosti)
   - Filtry (klient, stav, typ, datum)
   - Grid zobrazení faktur
   - Dialog pro vytvoření faktury (linked/standalone)

2. **Detail faktury (`/invoices/[id]`)**
   - Hlavička s číslem faktury a klientem
   - Informační karty (datum vystavení, splatnost, typ, částka)
   - Tabulka položek
   - Souhrn s mezisoučtem, DPH a celkem
   - Akce: změna stavu, smazání
   - Platební údaje a poznámky

3. **Navigace**
   - Přidán odkaz "Faktury" do hlavní navigace

---

## Fáze 5: Integrace do stránky Záznamy

### Datum: 2026-01-16

#### Stav: DOKONČENO

### Upravené soubory

1. `app/(dashboard)/entries/page.tsx` - Integrace billing funkcí
2. `features/time-tracking/types/entry.types.ts` - Přidán BillingStatus typ a filtr
3. `features/time-tracking/services/entryService.ts` - Podpora billing filtru

### Co bylo implementováno

1. **Billing status badge**
   - Každý záznam zobrazuje BillingStatusBadge (nefakturováno/fakturováno/zaplaceno)
   - Barevné rozlišení stavů

2. **Multi-select checkboxy**
   - Checkboxy pouze u nefakturovaných záznamů
   - "Vybrat všechny nefakturované" tlačítko
   - Vizuální zvýraznění vybraných záznamů (ring)

3. **Floating action bar**
   - Zobrazuje se při výběru záznamů
   - Počet vybraných, celkový čas a částka
   - Tlačítka "Zrušit výběr" a "Vytvořit fakturu"
   - Fixed position dole na stránce

4. **Filtr podle billing_status**
   - Nový select v sekci filtrů
   - Možnosti: Všechny stavy, Nefakturováno, Fakturováno, Zaplaceno
   - Podpora v EntryService a useEntries hook

---

## Další fáze: Rozšíření Nastavení

Připraveno k implementaci:
- Přidání sekce "Fakturační údaje" do stránky Nastavení
- Formulář pro firemní údaje (název, adresa, IČO, DIČ)
- Nastavení bankovního účtu, výchozí splatnosti a DPH
