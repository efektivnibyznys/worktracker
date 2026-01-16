# Billing Module - Stav implementace

Poslední aktualizace: 2026-01-16

---

## ✅ HOTOVO

### Fáze 1: Databáze a typy
- [x] SQL migrace `supabase/migrations/002_billing.sql`
  - [x] Tabulka `invoices`
  - [x] Tabulka `invoice_items`
  - [x] Rozšíření `entries` o `billing_status` a `invoice_id`
  - [x] Rozšíření `settings` o firemní údaje
  - [x] RLS politiky
  - [x] Indexy
  - [x] Trigger pro `updated_at`
- [x] Aktualizace `types/database.ts`
- [x] Typy `features/billing/types/invoice.types.ts`

### Fáze 2: Services a Hooks
- [x] `features/billing/services/invoiceService.ts`
  - [x] `getAllWithFilters()` - seznam faktur
  - [x] `getByIdWithItems()` - detail s položkami
  - [x] `getStats()` - statistiky
  - [x] `getUnbilledEntries()` - nefakturované záznamy
  - [x] `createLinkedInvoice()` - z vybraných záznamů
  - [x] `createStandaloneInvoice()` - vlastní položky
  - [x] `updateStatus()` - změna stavu
  - [x] `deleteInvoice()` - smazání
  - [x] `generateInvoiceNumber()` - generování čísla
  - [x] `groupEntriesForInvoice()` - seskupení
- [x] `features/billing/hooks/useInvoices.ts`
- [x] `features/billing/hooks/useEntrySelection.ts`

### Fáze 3: UI Komponenty
- [x] `components/ui/checkbox.tsx` - vlastní checkbox
- [x] `features/billing/components/InvoiceStatusBadge.tsx`
- [x] `features/billing/components/BillingStatusBadge.tsx`
- [x] `features/billing/components/InvoiceStats.tsx`
- [x] `features/billing/components/InvoiceCard.tsx`
- [x] `features/billing/components/InvoiceFilters.tsx`
- [x] `features/billing/components/EntrySelector.tsx`
- [x] `features/billing/components/LinkedInvoiceForm.tsx`
- [x] `features/billing/components/StandaloneInvoiceForm.tsx`
- [x] `features/billing/components/CreateInvoiceDialog.tsx`
- [x] `features/billing/components/index.ts`

---

### Fáze 4: Stránky a Navigace
- [x] `app/(dashboard)/invoices/page.tsx` - seznam faktur
  - [x] Statistiky nahoře
  - [x] Filtry
  - [x] Grid s kartami faktur
  - [x] Tlačítko "Nová faktura"
  - [x] Dialog pro vytvoření faktury (linked/standalone)
- [x] `app/(dashboard)/invoices/[id]/page.tsx` - detail faktury
  - [x] Zobrazení hlavičky faktury
  - [x] Tabulka položek
  - [x] Akce (změna stavu, smazání)
  - [x] Souhrn s mezisoučtem, DPH a celkem
- [x] Přidat link "Faktury" do `components/layout/Header.tsx`

---

### Fáze 5: Integrace do stránky Záznamy
- [x] Přidat `billing_status` badge k záznamům
- [x] Přidat checkboxy pro výběr záznamů
- [x] Přidat floating action bar pro vytvoření faktury
- [x] Přidat filtr podle `billing_status`

---

### Fáze 6: Rozšíření Nastavení
- [x] Přidat sekci "Fakturační údaje" do `/settings`
  - [x] Název firmy, adresa, IČO, DIČ
  - [x] Bankovní účet
  - [x] Výchozí splatnost (dny)
  - [x] Výchozí DPH

---

## 🔲 ZBÝVÁ DODĚLAT

### Fáze 7: Databáze (ruční krok)
- [ ] Aplikovat SQL migraci v Supabase Dashboard

---

## 📊 Celkový progres

| Fáze | Popis | Stav |
|------|-------|------|
| 1 | Databáze a typy | ✅ 100% |
| 2 | Services a Hooks | ✅ 100% |
| 3 | UI Komponenty | ✅ 100% |
| 4 | Stránky a Navigace | ✅ 100% |
| 5 | Integrace Záznamy | ✅ 100% |
| 6 | Rozšíření Nastavení | ✅ 100% |
| 7 | Aplikace migrace | 🔲 0% |

**Celkem: ~95% hotovo** (zbývá pouze aplikovat SQL migraci v Supabase)

---

## 📁 Struktura vytvořených souborů

```
features/billing/
├── types/
│   └── invoice.types.ts
├── services/
│   └── invoiceService.ts
├── hooks/
│   ├── useInvoices.ts
│   └── useEntrySelection.ts
└── components/
    ├── index.ts
    ├── InvoiceStatusBadge.tsx
    ├── BillingStatusBadge.tsx
    ├── InvoiceStats.tsx
    ├── InvoiceCard.tsx
    ├── InvoiceFilters.tsx
    ├── EntrySelector.tsx
    ├── LinkedInvoiceForm.tsx
    ├── StandaloneInvoiceForm.tsx
    └── CreateInvoiceDialog.tsx

app/(dashboard)/invoices/
├── page.tsx (seznam faktur)
└── [id]/
    └── page.tsx (detail faktury)

app/(dashboard)/entries/
└── page.tsx (aktualizováno - billing integrace)

app/(dashboard)/settings/
└── page.tsx (aktualizováno - fakturační údaje)

features/time-tracking/
├── types/entry.types.ts (aktualizováno - BillingStatus)
└── services/entryService.ts (aktualizováno - billing filter)

supabase/migrations/
└── 002_billing.sql

types/
└── database.ts (aktualizováno)

components/
├── layout/
│   └── Header.tsx (aktualizováno - přidán link Faktury)
└── ui/
    └── checkbox.tsx (nový)
```

---

## 🚀 Další kroky (doporučené pořadí)

1. ~~**Vytvořit stránku `/invoices`** - seznam faktur se všemi komponentami~~ ✅
2. ~~**Přidat do navigace** - link v Header.tsx~~ ✅
3. ~~**Vytvořit detail faktury** - `/invoices/[id]`~~ ✅
4. ~~**Integrovat do stránky Záznamy** - multi-select a floating bar~~ ✅
5. ~~**Rozšířit Nastavení** - firemní údaje~~ ✅
6. **Aplikovat migraci** - v Supabase Dashboard
7. **Testovat vytváření faktur** - linked i standalone
