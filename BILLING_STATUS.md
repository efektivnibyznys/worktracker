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

## 🔲 ZBÝVÁ DODĚLAT

### Fáze 4: Stránky
- [ ] `app/(dashboard)/invoices/page.tsx` - seznam faktur
  - [ ] Statistiky nahoře
  - [ ] Filtry
  - [ ] Grid s kartami faktur
  - [ ] Tlačítko "Nová faktura"
- [ ] `app/(dashboard)/invoices/[id]/page.tsx` - detail faktury
  - [ ] Zobrazení hlavičky faktury
  - [ ] Tabulka položek
  - [ ] Akce (změna stavu, tisk)
  - [ ] Pro linked faktury: seznam propojených záznamů

### Fáze 5: Navigace
- [ ] Přidat link "Faktury" do `components/layout/Header.tsx`

### Fáze 6: Integrace do stránky Záznamy
- [ ] Přidat `billing_status` badge k záznamům
- [ ] Přidat checkboxy pro výběr záznamů
- [ ] Přidat floating action bar pro vytvoření faktury
- [ ] Přidat filtr podle `billing_status`

### Fáze 7: Rozšíření Nastavení
- [ ] Přidat sekci "Fakturační údaje" do `/settings`
  - [ ] Název firmy, adresa, IČO, DIČ
  - [ ] Bankovní účet
  - [ ] Výchozí splatnost (dny)
  - [ ] Výchozí DPH

### Fáze 8: Databáze (ruční krok)
- [ ] Aplikovat SQL migraci v Supabase Dashboard

---

## 📊 Celkový progres

| Fáze | Popis | Stav |
|------|-------|------|
| 1 | Databáze a typy | ✅ 100% |
| 2 | Services a Hooks | ✅ 100% |
| 3 | UI Komponenty | ✅ 100% |
| 4 | Stránky | 🔲 0% |
| 5 | Navigace | 🔲 0% |
| 6 | Integrace Záznamy | 🔲 0% |
| 7 | Rozšíření Nastavení | 🔲 0% |
| 8 | Aplikace migrace | 🔲 0% |

**Celkem: ~40% hotovo** (backend kompletní, frontend částečně)

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

supabase/migrations/
└── 002_billing.sql

types/
└── database.ts (aktualizováno)

components/ui/
└── checkbox.tsx (nový)
```

---

## 🚀 Další kroky (doporučené pořadí)

1. **Vytvořit stránku `/invoices`** - seznam faktur se všemi komponentami
2. **Přidat do navigace** - link v Header.tsx
3. **Testovat vytváření faktur** - linked i standalone
4. **Vytvořit detail faktury** - `/invoices/[id]`
5. **Integrovat do stránky Záznamy** - multi-select a floating bar
6. **Rozšířit Nastavení** - firemní údaje
7. **Aplikovat migraci** - v Supabase Dashboard
