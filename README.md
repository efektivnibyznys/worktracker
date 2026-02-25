# Work Tracker

Moderní aplikace pro sledování času a fakturaci, postavená na Next.js 16, React 19 a TypeScript. Určena primárně pro freelancery a OSVČ v českém prostředí.

**Status:** ✅ Production Ready

---

## Obsah

- [Funkce](#funkce)
- [Tech Stack](#tech-stack)
- [Architektura](#architektura)
- [Struktura projektu](#struktura-projektu)
- [Databáze](#databáze)
- [Rychlý start](#rychlý-start)
- [Vývoj](#vývoj)
- [Nasazení](#nasazení)
- [Bezpečnost](#bezpečnost)

---

## Funkce

### Sledování času
- **Rychlé zadání záznamu** – Formulář s automatickým výpočtem doby trvání z časů zahájení/ukončení
- **Správa záznamů** – Přehled, editace a mazání záznamů s pokročilými filtry (klient, fáze, projekt, stav fakturace, datum)
- **Hromadný výběr** – Multi-select záznamů s plovoucí akcní lištou

### Klienti a projekty
- **Správa klientů** – Vytváření a editace klientů s hodinovou sazbou, adresou, IČO
- **Fáze projektu** – Organizace práce do fází s vlastní hodinovou sazbou a stavem (aktivní / dokončeno / pozastaveno)
- **Projekty** – Správa projektů přiřazených ke klientům

### Fakturace
- **Faktura z vybraných záznamů** – Automatické vytvoření faktury z označených záznamů s volbou seskupení (po záznamu / fázi / dni)
- **Standalone faktura** – Manuální vytvoření faktury s vlastními položkami
- **Správa faktur** – Přehled, detail, změna stavu (draft → vydaná → odeslaná → zaplacená / zrušená / po splatnosti)
- **Export do PDF** – Generování PDF faktury přes `@react-pdf/renderer`
- **QR kód platby** – Automatický QR kód pro českou platbu s variabilním symbolem
- **Sledování stavu fakturace** – Workflow: Nevyfakturováno → Vyfakturováno → Zaplaceno

### Dashboard a analytika
- **Statistiky** – Přehled za dnes / týden / měsíc / rok
- **8 interaktivních grafů** (Recharts):
  - Přehled v čase (hodiny/příjmy)
  - Distribuce podle klienta/fáze
  - Měsíční hodiny a příjmy
  - Týdenní aktivita
  - Průměrná hodinová sazba
  - Stav fakturace
  - Top klienti
- **Výběr roku** – Filtrování statistik podle roku

### Nastavení
- Výchozí hodinová sazba a měna
- Fakturační údaje: název firmy, adresa, IČO, DIČ, bankovní účet
- Výchozí splatnost a sazba DPH

### Autentizace
- Přihlášení a registrace (email + heslo)
- Správa relací přes Supabase Auth
- Ochrana routes pomocí Next.js middleware

---

## Tech Stack

### Frontend
| Technologie | Verze | Účel |
|---|---|---|
| Next.js | 16.1.0 | Framework (App Router) |
| React | 19.0.0 | UI knihovna |
| TypeScript | 5 | Typová bezpečnost (strict mode) |
| Tailwind CSS | 3.4 | Utility-first stylování |
| shadcn/ui + Radix UI | – | Headless UI komponenty |
| Recharts | 3.6 | Grafy |

### State Management
| Technologie | Účel |
|---|---|
| Zustand 5 | Globální stav (autentizace) |
| TanStack React Query 5 | Server state, caching, synchronizace |

### Formuláře a validace
| Technologie | Účel |
|---|---|
| React Hook Form 7 | Správa stavu formulářů |
| Zod 4 | TypeScript-first validace schémat |

### Backend a databáze
| Technologie | Účel |
|---|---|
| Supabase (PostgreSQL) | Databáze s Row Level Security |
| Supabase Auth | Autentizace uživatelů |
| Supabase SSR | Server-side rendering podpora |

### Utility knihovny
| Knihovna | Účel |
|---|---|
| @react-pdf/renderer 4 | Generování PDF faktur |
| date-fns 4 | Práce s datumy |
| qrcode | QR kódy pro platby |
| sonner | Toast notifikace |
| lucide-react | Ikony |

---

## Architektura

### Feature-Based modularita

Aplikace je rozdělena do feature modulů. Každý modul obsahuje vlastní typy, služby, hooks a komponenty:

```
features/
├── time-tracking/      # Sledování času, klienti, fáze, projekty
│   ├── types/
│   ├── services/
│   ├── hooks/
│   └── components/
└── billing/            # Fakturace a správa faktur
    ├── types/
    ├── services/
    ├── hooks/
    └── components/
```

### Service Pattern

Abstraktní `BaseService<TableName>` poskytuje typované CRUD operace. Feature služby ji rozšiřují:

```typescript
class EntryService extends BaseService<'entries'> {
  protected readonly tableName = 'entries'
  // Doménové metody: getAllWithFilters(), getToday(), getThisMonth()
}
```

### Hook + Service vzor

Hooks obalují služby pomocí React Query. Instance služeb jsou vždy memoizované:

```typescript
const supabase = useMemo(() => createSupabaseClient(), [])
const entryService = useMemo(() => new EntryService(supabase), [supabase])
```

### Priorita hodinové sazby

Při vytváření záznamu se sazba určuje takto:
```
záznam > fáze > klient > výchozí sazba v nastavení
```

---

## Struktura projektu

```
worktracker/
├── app/                            # Next.js App Router
│   ├── (auth)/                     # Veřejné stránky
│   │   ├── login/
│   │   └── register/
│   └── (dashboard)/                # Chráněné stránky
│       ├── layout.tsx
│       ├── page.tsx                # Dashboard
│       ├── entries/                # Záznamy
│       ├── clients/                # Klienti
│       │   └── [id]/               # Detail klienta
│       ├── invoices/               # Faktury
│       │   └── [id]/               # Detail faktury
│       ├── reports/                # Reporty
│       └── settings/               # Nastavení
├── components/
│   ├── providers/                  # AuthProvider, QueryProvider
│   ├── layout/                     # Header, Navigation
│   └── ui/                         # shadcn/ui komponenty
├── features/
│   ├── time-tracking/
│   │   ├── types/                  # Entry, Client, Phase, Project, Settings types
│   │   ├── services/               # EntryService, ClientService, PhaseService…
│   │   ├── hooks/                  # useEntries, useClients, usePhases…
│   │   └── components/             # QuickAddForm, EditEntryDialog, charts/…
│   └── billing/
│       ├── types/                  # Invoice types
│       ├── services/               # InvoiceService
│       ├── hooks/                  # useInvoices, useEntrySelection
│       └── components/             # InvoiceCard, CreateInvoiceDialog, InvoicePdf…
├── lib/
│   ├── supabase/                   # Client, server, BaseService
│   ├── stores/                     # authStore (Zustand)
│   ├── hooks/                      # useAuth, usePageMetadata
│   └── utils/                      # date, time, currency, calculations, chartData…
├── types/
│   └── database.ts                 # Auto-generované Supabase typy
├── supabase-setup.sql              # Hlavní databázové schéma
├── middleware.ts                   # Ochrana routes + session refresh
├── next.config.ts                  # Konfigurace + security headers
└── vercel.json                     # Vercel security headers
```

---

## Databáze

### Tabulky

| Tabulka | Klíčová pole |
|---|---|
| `clients` | id, user_id, name, address, ico, hourly_rate |
| `phases` | id, user_id, client_id, name, hourly_rate, status |
| `projects` | id, user_id, client_id, name, hourly_rate, status |
| `entries` | id, user_id, client_id, phase_id?, project_id?, date, start_time, end_time, duration_minutes, hourly_rate, billing_status, invoice_id? |
| `settings` | user_id (PK), default_hourly_rate, currency, company_name, company_ico, company_dic, bank_account, default_due_days, default_tax_rate |
| `invoices` | id, user_id, client_id?, invoice_number (YYYY-NNNN), status, invoice_type, subtotal, tax_rate, total_amount, variable_symbol, bank_account |
| `invoice_items` | id, invoice_id, entry_id?, phase_id?, description, quantity, unit_price, total_price |

### Enums

```
billing_status:  'unbilled' | 'billed' | 'paid'
invoice_status:  'draft' | 'issued' | 'sent' | 'paid' | 'cancelled' | 'overdue'
invoice_type:    'linked' | 'standalone'
phase_status:    'active' | 'completed' | 'paused'
```

Všechny tabulky mají povolené **Row Level Security (RLS)** s políčkami vázanými na `auth.uid()`.

---

## Rychlý start

### Požadavky

- Node.js 18+
- Účet a projekt na Supabase

### Instalace

1. **Klonování repozitáře**
   ```bash
   git clone <repo-url>
   cd worktracker
   ```

2. **Instalace závislostí**
   ```bash
   npm install
   ```

3. **Nastavení environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Editujte `.env.local` a přidejte přihlašovací údaje Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Nastavení databáze**
   - Otevřete Supabase SQL Editor
   - Spusťte SQL z `supabase-setup.sql`
   - Pro fakturaci spusťte také migraci `supabase/migrations/002_billing.sql`

5. **Spuštění vývojového serveru**
   ```bash
   npm run dev
   ```

   Otevřete [http://localhost:3000](http://localhost:3000)

---

## Vývoj

```bash
npm run dev          # Dev server s Turbopack
npm run build        # Produkční build
npm start            # Spuštění produkčního serveru
npm run lint         # ESLint
npm run type-check   # TypeScript kontrola (tsc --noEmit)
```

---

## Nasazení

### Vercel (doporučeno)

1. **Propojení s Vercel**
   - Importujte GitHub repozitář do Vercel
   - Vercel automaticky detekuje Next.js

2. **Nastavení environment variables**
   - Project Settings → Environment Variables
   - Přidejte `NEXT_PUBLIC_SUPABASE_URL`
   - Přidejte `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Nasazení**
   - Push na main → automatické nasazení
   - nebo: `vercel --prod`

---

## Bezpečnost

- ✅ **Row Level Security** – všechna data jsou izolována na úrovni uživatele v databázi
- ✅ **CSRF ochrana** – Supabase JWT tokeny
- ✅ **XSS ochrana** – React automatické escapování + CSP hlavičky
- ✅ **Security headers** – CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- ✅ **TypeScript strict mode** – typová bezpečnost v celé aplikaci
- ✅ **Zod validace** – validace všech formulářových vstupů
- ✅ **Error boundaries** – ošetření chyb na úrovni komponent i globálně
- ✅ **Databázová integrita** – constrainty a indexy na klíčových sloupcích

---

## Dokumentace

- `docs/ARCHITECTURE.md` – Kompletní technická dokumentace architektury
- `CLAUDE.md` – Instrukce pro práci s kódem (pro Claude Code)
- `supabase-setup.sql` – Databázové schéma
- `supabase/migrations/` – Migrace databáze

---

**Verze:** 2.0.0 | **Next.js:** 16 | **React:** 19 | **TypeScript:** strict
