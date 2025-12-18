# 🚀 Work Tracker - Strategický plán modernizace

**Datum vytvoření:** 18. prosince 2025
**Verze:** 1.0
**Status:** Schváleno - připraveno k implementaci

---

## 📋 Executive Summary

Tento dokument obsahuje kompletní strategický plán pro modernizaci aplikace Work Tracker z single-page HTML aplikace na modulární Next.js aplikaci s podporou budoucích rozšíření (Fakturace, CRM systém).

**Cíl:** Vytvořit škálovatelnou, udržovatelnou a rozšiřitelnou platformu pro time tracking, fakturaci a CRM.

**Timeline:** 2-3 týdny pro kompletní migraci core funkcionality

**Tech Stack:** Next.js 15 + TypeScript + Tailwind CSS + Supabase

---

## 🎯 Hlavní doporučení: Next.js 15 + TypeScript

### Proč Next.js?
- ✅ **Perfektní integrace s Vercel** (od stejné firmy)
- ✅ **File-based routing** - snadné přidávání modulů
- ✅ **Server/Client components** - optimální performance
- ✅ **Built-in API routes** - možnost vlastního backendu
- ✅ **TypeScript first** - type safety pro větší projekty
- ✅ **Podpora pro modularizaci** - snadno dělitelné na feature moduly
- ✅ **Plně responzivní** - Desktop i Mobile first

---

## 📐 Navrhovaná struktura projektu

```
work-tracker/
├── src/
│   ├── app/                          # Next.js 15 App Router
│   │   ├── (auth)/                   # Route group pro auth
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/              # Route group s layoutem
│   │   │   ├── layout.tsx            # Shared layout (nav, header)
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx          # Seznam klientů
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Detail klienta
│   │   │   ├── entries/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   ├── invoices/                 # 🆕 Modul fakturace
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   └── new/
│   │   ├── crm/                      # 🆕 CRM modul
│   │   │   ├── contacts/
│   │   │   ├── deals/
│   │   │   └── pipeline/
│   │   ├── api/                      # API routes (pokud potřeba)
│   │   │   └── webhooks/
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css
│   │
│   ├── components/                   # Sdílené komponenty
│   │   ├── ui/                       # Base UI komponenty
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   └── ...
│   │   ├── forms/                    # Formulářové komponenty
│   │   │   ├── ClientForm.tsx
│   │   │   ├── EntryForm.tsx
│   │   │   ├── PhaseForm.tsx
│   │   │   └── ...
│   │   ├── charts/                   # Chart komponenty
│   │   │   ├── ClientsChart.tsx
│   │   │   ├── PhasesChart.tsx
│   │   │   ├── TimelineChart.tsx
│   │   │   └── ...
│   │   └── layout/                   # Layout komponenty
│   │       ├── Header.tsx
│   │       ├── Navigation.tsx
│   │       ├── Sidebar.tsx
│   │       ├── MobileNav.tsx
│   │       └── SyncIndicator.tsx
│   │
│   ├── features/                     # Feature moduly (DDD přístup)
│   │   ├── time-tracking/
│   │   │   ├── components/
│   │   │   │   ├── QuickAddForm.tsx
│   │   │   │   ├── EntryCard.tsx
│   │   │   │   └── ...
│   │   │   ├── hooks/
│   │   │   │   ├── useClients.ts
│   │   │   │   ├── usePhases.ts
│   │   │   │   ├── useEntries.ts
│   │   │   │   └── useStats.ts
│   │   │   ├── services/
│   │   │   │   ├── clientService.ts
│   │   │   │   ├── phaseService.ts
│   │   │   │   └── entryService.ts
│   │   │   ├── types/
│   │   │   │   ├── client.types.ts
│   │   │   │   ├── phase.types.ts
│   │   │   │   └── entry.types.ts
│   │   │   └── utils/
│   │   │       ├── calculations.ts
│   │   │       └── filters.ts
│   │   │
│   │   ├── invoicing/                # 🆕 Fakturační modul
│   │   │   ├── components/
│   │   │   │   ├── InvoiceForm.tsx
│   │   │   │   ├── InvoiceList.tsx
│   │   │   │   ├── InvoicePreview.tsx
│   │   │   │   └── PDFGenerator.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useInvoices.ts
│   │   │   │   └── useInvoiceGenerator.ts
│   │   │   ├── services/
│   │   │   │   ├── invoiceService.ts
│   │   │   │   └── pdfService.ts
│   │   │   ├── types/
│   │   │   │   └── invoice.types.ts
│   │   │   └── utils/
│   │   │       └── invoiceCalculations.ts
│   │   │
│   │   └── crm/                      # 🆕 CRM modul
│   │       ├── components/
│   │       │   ├── ContactList.tsx
│   │       │   ├── DealPipeline.tsx
│   │       │   └── ActivityTimeline.tsx
│   │       ├── hooks/
│   │       │   ├── useContacts.ts
│   │       │   ├── useDeals.ts
│   │       │   └── useActivities.ts
│   │       ├── services/
│   │       │   ├── contactService.ts
│   │       │   ├── dealService.ts
│   │       │   └── activityService.ts
│   │       └── types/
│   │           ├── contact.types.ts
│   │           ├── deal.types.ts
│   │           └── activity.types.ts
│   │
│   ├── lib/                          # Knihovny a utilities
│   │   ├── supabase/
│   │   │   ├── client.ts             # Supabase client (browser)
│   │   │   ├── server.ts             # Server-side client
│   │   │   ├── middleware.ts         # Auth middleware
│   │   │   └── services/
│   │   │       └── baseService.ts    # Abstract base service
│   │   ├── hooks/                    # Global React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useSupabase.ts
│   │   │   ├── useRealtime.ts
│   │   │   └── useLocalStorage.ts
│   │   ├── stores/                   # State management (Zustand)
│   │   │   ├── authStore.ts
│   │   │   ├── dataStore.ts
│   │   │   └── uiStore.ts
│   │   └── utils/
│   │       ├── date.ts
│   │       ├── currency.ts
│   │       ├── format.ts
│   │       └── calculations.ts
│   │
│   ├── types/                        # TypeScript types
│   │   ├── database.ts               # Supabase generated types
│   │   ├── models.ts                 # Domain models
│   │   └── api.ts                    # API types
│   │
│   └── config/
│       ├── constants.ts              # App constants
│       ├── navigation.ts             # Navigation config
│       └── theme.ts                  # Theme config
│
├── public/                           # Static assets
│   ├── images/
│   └── fonts/
│
├── supabase/                         # Supabase konfigurace
│   ├── migrations/
│   │   ├── 20250101_initial.sql
│   │   ├── 20250115_invoicing.sql
│   │   └── 20250201_crm.sql
│   └── seed.sql
│
├── docs/                             # Dokumentace
│   ├── architecture.md
│   ├── modules/
│   │   ├── time-tracking.md
│   │   ├── invoicing.md
│   │   └── crm.md
│   └── api/
│
├── .env.local                        # Environment variables
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🔧 Tech Stack (Finální doporučení)

### Core Framework
- **Next.js 15** (App Router, React Server Components)
- **React 19** (latest)
- **TypeScript 5.x** (strict mode)

### Styling & UI
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - Komponenty postavené na Radix UI + Tailwind
  - Benefit: Copy-paste komponenty, plná kontrola nad kódem
  - Alternativa: Headless UI, Radix UI přímo

### State Management
- **Zustand** - Jednoduchý, lightweight state management
  - Alternativa: Jotai, Redux Toolkit (pokud potřeba větší ekosystém)

### Data Fetching & Caching
- **TanStack Query (React Query)** - Server state management
  - Cache management
  - Optimistic updates
  - Real-time synchronizace s Supabase
  - Background refetching

### Forms & Validation
- **React Hook Form** - Performantní form handling
- **Zod** - TypeScript-first schema validation
  - Type-safe validace
  - Automatické TS typy z schémat

### Charts & Visualization
- **Recharts** - React-native chart library
  - Alternativa: zachovat Chart.js (pokud preferuješ)

### Backend & Database
- **Supabase** (zachováno)
  - PostgreSQL databáze
  - Real-time subscriptions
  - Row Level Security (RLS)
  - Authentication
  - Storage (pro budoucí PDF faktury)

### PDF Generation (pro faktury)
- **@react-pdf/renderer** nebo **jsPDF**
- **Puppeteer** (pro server-side generování)

### Date/Time
- **date-fns** - Modern, tree-shakable
  - Alternativa: Day.js, Luxon

### Testing (doporučeno pro budoucnost)
- **Vitest** - Unit & Integration tests
- **Playwright** - E2E tests
- **Testing Library** - Component tests

### Development Tools
- **ESLint** - Linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **lint-staged** - Pre-commit checks

---

## 🏗️ Architekturní vzory

### 1. Feature-based Architecture (Domain-Driven Design)

Každý modul je samostatný a obsahuje vše potřebné:

```typescript
// features/invoicing/
├── components/          // UI komponenty pro fakturaci
├── hooks/              // Custom hooks (useInvoices, useInvoiceGenerator)
├── services/           // Business logika (invoiceService.ts)
├── types/              // TypeScript definice (Invoice, InvoiceItem)
└── utils/              // Utility funkce (PDF generation, calculations)
```

**Výhody:**
- Vysoká koheze - související věci pohromadě
- Nízké závislosti mezi moduly
- Snadné testování
- Jasná separace zodpovědností

### 2. Layered Architecture

```
┌─────────────────────────────────────────┐
│   Presentation Layer (Components)       │  ← React komponenty, UI
├─────────────────────────────────────────┤
│   Business Logic Layer (Hooks + Stores) │  ← Custom hooks, state management
├─────────────────────────────────────────┤
│   Data Access Layer (Services)          │  ← Supabase services, API calls
├─────────────────────────────────────────┤
│   Database Layer (Supabase/PostgreSQL)  │  ← Databáze, RLS policies
└─────────────────────────────────────────┘
```

### 3. Shared Kernel Pattern

Společné věci mezi všemi moduly:

```typescript
// lib/supabase/services/baseService.ts
export abstract class BaseService<T> {
  abstract tableName: string;

  constructor(protected supabase: SupabaseClient) {}

  async getAll(): Promise<T[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*');

    if (error) throw error;
    return data || [];
  }

  async getById(id: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create(data: Partial<T>): Promise<T> {
    const { data: created, error } = await this.supabase
      .from(this.tableName)
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return created;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const { data: updated, error } = await this.supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

// Použití v konkrétním modulu
// features/time-tracking/services/clientService.ts
export class ClientService extends BaseService<Client> {
  tableName = 'clients';

  // Specifické metody pro klienty
  async getWithStats(id: string): Promise<ClientWithStats> {
    const client = await this.getById(id);
    const entries = await this.getEntriesByClient(id);

    return {
      ...client,
      stats: calculateStats(entries)
    };
  }

  private async getEntriesByClient(clientId: string) {
    // Implementation
  }
}
```

### 4. Repository Pattern

```typescript
// Pro komplexnější dotazy
export class TimeEntryRepository {
  constructor(private supabase: SupabaseClient) {}

  async getEntriesWithFilters(filters: EntryFilters): Promise<Entry[]> {
    let query = this.supabase
      .from('entries')
      .select('*, client:clients(*), phase:phases(*)');

    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId);
    }
    if (filters.phaseId) {
      query = query.eq('phase_id', filters.phaseId);
    }
    if (filters.dateFrom) {
      query = query.gte('date', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('date', filters.dateTo);
    }

    const { data, error } = await query
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data;
  }
}
```

### 5. Custom Hooks Pattern

```typescript
// features/time-tracking/hooks/useEntries.ts
export function useEntries(filters?: EntryFilters) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: ['entries', filters],
    queryFn: async () => {
      const repo = new TimeEntryRepository(supabase);
      return repo.getEntriesWithFilters(filters || {});
    },
    // Real-time synchronizace
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });
}

// Použití v komponentě
function EntriesList() {
  const { data: entries, isLoading } = useEntries({
    clientId: selectedClient,
    dateFrom: startDate,
    dateTo: endDate
  });

  if (isLoading) return <Spinner />;

  return <div>{/* render entries */}</div>;
}
```

---

## 📦 Rozdělení do modulů a features

### ✅ Modul 1: Core (Foundation)

**Priorita:** Nejvyšší
**Závislosti:** Žádné
**Timeline:** 3-5 dní

**Obsahuje:**
- Auth systém (login, register, logout, session management)
- Layout komponenty (Header, Navigation, Sidebar, Footer)
- Base UI komponenty (Button, Modal, Card, Input, Select...)
- Supabase setup (client, middleware, base service)
- State management setup (Zustand stores)
- Theme configuration (colors, spacing, typography)
- Utility funkce (date, currency, format...)

**Výstupy:**
- Funkční přihlášení/registrace
- Base layout aplikace
- Reusable UI komponenty
- Type-safe Supabase client

---

### ✅ Modul 2: Time Tracking (Migrace stávající funkcionality)

**Priorita:** Vysoká
**Závislosti:** Core module
**Timeline:** 5-7 dní

**Features:**

#### 2.1 Clients Management
- CRUD operace pro klienty
- Detail klienta s fázemi a statistikami
- Filtrování a vyhledávání

#### 2.2 Phases Management
- CRUD operace pro fáze projektů
- Přiřazení ke klientům
- Statusy (active, completed, paused)

#### 2.3 Time Entries
- Rychlé přidání záznamu (QuickAddForm)
- CRUD operace
- Automatický výpočet duration
- Automatické určení hodinové sazby (entry > phase > client > default)
- Filtrování (klient, fáze, datum)

#### 2.4 Dashboard
- Statistiky (dnes, týden, měsíc)
- Grafy (klienti, fáze, timeline)
- Poslední záznamy
- Filtry s live update

#### 2.5 Reports
- Generování reportů podle období
- Export pro Notion
- Souhrn a detaily

**Databázové tabulky:** (stávající)
- `clients`
- `phases`
- `entries`
- `settings`

---

### 🆕 Modul 3: Invoicing (Fakturace)

**Priorita:** Střední
**Závislosti:** Core, Time Tracking
**Timeline:** 7-10 dní (po dokončení Time Tracking)

**Features:**

#### 3.1 Invoice Creation
- Vytvoření faktury z time entries
- Manuální přidání položek
- Automatický výpočet subtotal, tax, total
- Generování invoice number (auto-increment nebo custom)
- Šablony faktur

#### 3.2 Invoice Management
- Seznam faktur s filtrováním
- Statusy: draft, sent, paid, overdue, cancelled
- Edit draft faktury
- Označení jako zaplacená

#### 3.3 PDF Generation
- Profesionální PDF template
- Logo, kontaktní údaje
- Položky s quantities, unit prices
- Tax calculations
- Payment terms, notes
- Export do PDF

#### 3.4 Email Integration
- Odeslání faktury emailem klientovi
- Email template
- Připojení PDF

#### 3.5 Payment Tracking
- Sledování plateb
- Due date reminders
- Overdue notifications

**Databázové tabulky:** (nové)

```sql
-- Faktury
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')) DEFAULT 'draft',
  subtotal NUMERIC(10,2) NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 21,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'CZK',
  notes TEXT,
  payment_terms TEXT,
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Položky faktury
CREATE TABLE invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  entry_id UUID REFERENCES entries(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 21,
  total NUMERIC(10,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nastavení fakturace
CREATE TABLE invoice_settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_name TEXT,
  company_address TEXT,
  company_ico TEXT,
  company_dic TEXT,
  company_logo_url TEXT,
  invoice_prefix TEXT DEFAULT 'INV',
  next_invoice_number INTEGER DEFAULT 1,
  default_payment_terms TEXT DEFAULT '14 dní',
  default_tax_rate NUMERIC(5,2) DEFAULT 21,
  bank_account TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexy
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date DESC);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- RLS Policies
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
  ON invoices FOR DELETE
  USING (auth.uid() = user_id);

-- Podobné policies pro invoice_items a invoice_settings
```

**UI Components:**
- `InvoiceForm.tsx` - Vytvoření/editace faktury
- `InvoiceList.tsx` - Seznam faktur s filtry
- `InvoiceDetail.tsx` - Detail faktury
- `InvoicePreview.tsx` - Preview před generováním PDF
- `PDFGenerator.tsx` - Komponenta pro generování PDF
- `InvoiceItemsTable.tsx` - Tabulka položek

---

### 🆕 Modul 4: CRM (Customer Relationship Management)

**Priorita:** Nižší
**Závislosti:** Core, Time Tracking
**Timeline:** 10-14 dní (po Time Tracking nebo paralelně s Invoicing)

**Features:**

#### 4.1 Contacts Management
- CRUD operace pro kontakty
- Přiřazení ke klientům
- Role (decision maker, technical contact, finance...)
- Kontaktní údaje (email, phone, position)

#### 4.2 Deals Pipeline
- Vytvoření obchodních příležitostí (deals)
- Pipeline stages: lead → qualified → proposal → negotiation → won/lost
- Drag & drop mezi stages
- Hodnota dealu, pravděpodobnost úspěchu
- Expected close date

#### 4.3 Activity Tracking
- Zaznamenávání aktivit (call, meeting, email, note)
- Timeline aktivit
- Připomenutí (follow-ups)
- Propojení s klienty, kontakty, dealy

#### 4.4 Email Integration (budoucnost)
- Synchronizace emailů
- Tracking emailových konverzací
- Email templates

#### 4.5 Reporting
- Conversion rates
- Sales pipeline overview
- Activity reports

**Databázové tabulky:** (nové)

```sql
-- Kontakty
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  role TEXT CHECK (role IN ('decision_maker', 'technical', 'finance', 'other')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Obchodní příležitosti (deals)
CREATE TABLE deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  value NUMERIC(10,2),
  currency TEXT DEFAULT 'CZK',
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  stage TEXT CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost')) DEFAULT 'lead',
  expected_close_date DATE,
  actual_close_date DATE,
  lost_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aktivity
CREATE TABLE activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('client', 'contact', 'deal')) NOT NULL,
  entity_id UUID NOT NULL,
  type TEXT CHECK (type IN ('call', 'meeting', 'email', 'note', 'task')) NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  activity_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexy
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_client_id ON contacts(client_id);
CREATE INDEX idx_deals_user_id ON deals(user_id);
CREATE INDEX idx_deals_client_id ON deals(client_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_activities_date ON activities(activity_date DESC);

-- RLS Policies (obdobně jako u ostatních tabulek)
```

**UI Components:**
- `ContactList.tsx` - Seznam kontaktů
- `ContactForm.tsx` - Vytvoření/editace kontaktu
- `DealPipeline.tsx` - Kanban board s dealy
- `DealCard.tsx` - Karta dealu v pipeline
- `DealForm.tsx` - Vytvoření/editace dealu
- `ActivityTimeline.tsx` - Timeline aktivit
- `ActivityForm.tsx` - Přidání aktivity

---

## 🔄 Strategie migrace (Krok za krokem)

### Fáze 0: Příprava ✅ COMPLETED (18.12.2025)

**Cíl:** Backup, Git branch, environment setup

**Úkoly:**
- [x] Vytvoř full backup současné aplikace
- [x] Vytvoř nový Git branch: `feature/next-migration`
- [x] Zdokumentuj současnou funkcionalitu (checklist)
- [x] Připrav testovací data v Supabase

**Výstup:** ✅ Bezpečný výchozí bod pro migraci

**Deliverables:**
- ✅ Git tag: `v1.0-pre-migration`
- ✅ Branch: `feature/next-migration`
- ✅ `CURRENT_FEATURES.md` (120+ features)
- ✅ `TESTING_STRATEGY.md`
- ✅ `MIGRATION_LOG.md`

**Duration:** ~75 minut
**Status:** ✅ Complete

---

### Fáze 1: Next.js Setup (1-2 dny)

**Cíl:** Funkční Next.js projekt s Tailwind a základní konfigurací

**Úkoly:**
- [ ] Inicializuj Next.js 15 projekt s TypeScript
  ```bash
  npx create-next-app@latest work-tracker-next --typescript --tailwind --app
  ```
- [ ] Setup Tailwind CSS + shadcn/ui
  ```bash
  npx shadcn-ui@latest init
  ```
- [ ] Instalace dependencies
  ```bash
  npm install @supabase/supabase-js @supabase/ssr
  npm install zustand
  npm install @tanstack/react-query
  npm install react-hook-form zod @hookform/resolvers
  npm install date-fns
  npm install recharts
  npm install -D @types/node
  ```
- [ ] Konfigurace TypeScript (strict mode)
- [ ] Setup ESLint + Prettier
- [ ] Vytvoř základní folder strukturu (podle navržené struktury)
- [ ] Konfigurace `.env.local`
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  ```

**Výstup:** Funkční Next.js projekt připravený k vývoji

---

### Fáze 2: Core Infrastructure (3-5 dní)

**Cíl:** Auth, layout, base komponenty, Supabase integrace

**Úkoly:**

#### 2.1 Supabase Setup
- [ ] Vytvoř Supabase client (`lib/supabase/client.ts`)
- [ ] Vytvoř server-side client (`lib/supabase/server.ts`)
- [ ] Setup auth middleware
- [ ] Vygeneruj database types
  ```bash
  npx supabase gen types typescript --project-id tdgxfhoymdjszrsctcxh > src/types/database.ts
  ```
- [ ] Vytvoř `BaseService` abstract class
- [ ] Setup real-time subscriptions helper

#### 2.2 Authentication
- [ ] Login page (`app/(auth)/login/page.tsx`)
- [ ] Register page (`app/(auth)/register/page.tsx`)
- [ ] Auth context/store (`lib/stores/authStore.ts`)
- [ ] Protected routes middleware
- [ ] Session management
- [ ] Logout functionality

#### 2.3 Layout Components
- [ ] Root layout (`app/layout.tsx`)
- [ ] Dashboard layout (`app/(dashboard)/layout.tsx`)
- [ ] Header komponenta
- [ ] Sidebar navigace (desktop)
- [ ] Mobile navigace (bottom nav nebo hamburger)
- [ ] Sync indicator
- [ ] User menu

#### 2.4 Base UI Components
- [ ] Button (všechny varianty: primary, secondary, danger)
- [ ] Card
- [ ] Modal/Dialog
- [ ] Input
- [ ] Select
- [ ] Textarea
- [ ] Label
- [ ] Badge (pro statusy)
- [ ] Spinner/Loading

#### 2.5 Utilities & Helpers
- [ ] Date formatting (`lib/utils/date.ts`)
- [ ] Currency formatting (`lib/utils/currency.ts`)
- [ ] Time calculations (`lib/utils/time.ts`)
- [ ] Constants (`config/constants.ts`)

**Výstup:**
- Funkční přihlášení/registrace
- Base layout aplikace s navigací
- Reusable UI komponenty
- Type-safe Supabase integrace

**Testování:**
- [ ] Login/logout flow
- [ ] Session persistence
- [ ] Protected routes
- [ ] Responzivní layout (desktop + mobile)

---

### Fáze 3: Time Tracking Module (5-7 dní)

**Cíl:** Kompletní migrace stávající funkcionality

#### 3.1 Clients Management (1-2 dny)
- [ ] Client service (`features/time-tracking/services/clientService.ts`)
- [ ] Client types (`features/time-tracking/types/client.types.ts`)
- [ ] `useClients` hook
- [ ] Clients list page (`app/(dashboard)/clients/page.tsx`)
- [ ] Client detail page (`app/(dashboard)/clients/[id]/page.tsx`)
- [ ] Client form komponenta
- [ ] Client card komponenta
- [ ] CRUD operace (Create, Read, Update, Delete)

#### 3.2 Phases Management (1 den)
- [ ] Phase service
- [ ] Phase types
- [ ] `usePhases` hook
- [ ] Phase form komponenta
- [ ] Phase list/cards v client detail
- [ ] CRUD operace

#### 3.3 Time Entries (2-3 dny)
- [ ] Entry service
- [ ] Entry types
- [ ] `useEntries` hook
- [ ] Quick add form komponenta
- [ ] Entry form (plný formulář)
- [ ] Entry card/list item
- [ ] Entries list page (`app/(dashboard)/entries/page.tsx`)
- [ ] Filters komponenta
- [ ] Duration calculation logic
- [ ] Hourly rate determination logic
- [ ] CRUD operace

#### 3.4 Dashboard (1-2 dny)
- [ ] Dashboard page (`app/(dashboard)/page.tsx`)
- [ ] Stats cards komponenty
- [ ] Charts komponenty (Clients, Phases, Timeline)
- [ ] Recent entries list
- [ ] Dashboard filters
- [ ] Filtered entries list (collapsible)

#### 3.5 Reports (1 den)
- [ ] Reports page (`app/(dashboard)/reports/page.tsx`)
- [ ] Report generator
- [ ] Notion export funkce
- [ ] Report summary komponenta
- [ ] Report details komponenta

#### 3.6 Settings (0.5 dne)
- [ ] Settings page (`app/(dashboard)/settings/page.tsx`)
- [ ] Settings service
- [ ] Settings form
- [ ] Import starých dat (migrační utilita)

**Výstup:**
- Plně funkční time tracking aplikace
- Feature parity se současnou verzí
- Responzivní na všech zařízeních

**Testování:**
- [ ] Všechny CRUD operace
- [ ] Filtry a vyhledávání
- [ ] Dashboard statistiky a grafy
- [ ] Reports generování
- [ ] Real-time synchronizace
- [ ] Offline cache (localStorage)
- [ ] Mobile responzivita

---

### Fáze 4: Testing & Polish (2-3 dny)

**Cíl:** Bug fixing, optimalizace, UX vylepšení

**Úkoly:**
- [ ] Kompletní manuální testování všech flow
- [ ] Bug fixing
- [ ] Performance optimalizace
  - [ ] Lazy loading komponent
  - [ ] Image optimization
  - [ ] Code splitting
  - [ ] React Query cache tuning
- [ ] UX vylepšení
  - [ ] Loading states
  - [ ] Error handling
  - [ ] Success messages
  - [ ] Form validations
- [ ] Accessibility (a11y) check
  - [ ] Keyboard navigation
  - [ ] Screen reader support
  - [ ] ARIA labels
- [ ] SEO optimalizace (meta tags, Open Graph)
- [ ] Dark mode (pokud chceš)

**Výstup:** Production-ready aplikace

---

### Fáze 5: Deployment (1 den)

**Cíl:** Deploy na Vercel, smoke testing

**Úkoly:**
- [ ] Vercel project setup
- [ ] Environment variables konfigurace
- [ ] Build test (lokálně)
  ```bash
  npm run build
  ```
- [ ] Deploy na Vercel preview
- [ ] Smoke testing na preview URL
- [ ] Deploy na production
- [ ] Post-deployment testing
- [ ] DNS/domain konfigurace (pokud potřeba)
- [ ] Monitoring setup (Vercel Analytics)

**Výstup:** Live aplikace na Vercelu

---

### Fáze 6: Dokumentace (1-2 dny)

**Cíl:** Kompletní dokumentace projektu

**Úkoly:**
- [ ] README.md aktualizace
- [ ] Architecture dokumentace
- [ ] API dokumentace
- [ ] Component storybook/docs
- [ ] Contributing guide
- [ ] Deployment guide

---

## 📅 Timeline Overview

```
Week 1
├── Day 1-2: Fáze 0-1 (Příprava + Next.js setup)
├── Day 3-5: Fáze 2 (Core Infrastructure)
└── Day 6-7: Fáze 3 start (Clients + Phases)

Week 2
├── Day 8-12: Fáze 3 pokračování (Entries + Dashboard + Reports)
├── Day 13-14: Fáze 4 (Testing & Polish)
└── Day 15: Fáze 5 (Deployment)

Week 3
└── Day 16-17: Fáze 6 (Dokumentace) + Buffer

Total: 2-3 týdny (depending on availability)
```

---

## 💾 Databáze - Rozšíření schématu

### Pro současnou migraci
Stávající schéma zůstává **beze změn** - plně kompatibilní.

### Pro budoucí moduly

#### Invoicing Module

```sql
-- ============================================
-- INVOICING MODULE - DATABASE SCHEMA
-- ============================================

-- Faktury
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')) DEFAULT 'draft',
  subtotal NUMERIC(10,2) NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 21,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'CZK',
  notes TEXT,
  payment_terms TEXT,
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Položky faktury
CREATE TABLE invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  entry_id UUID REFERENCES entries(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 21,
  total NUMERIC(10,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nastavení fakturace
CREATE TABLE invoice_settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_name TEXT,
  company_address TEXT,
  company_ico TEXT,
  company_dic TEXT,
  company_logo_url TEXT,
  invoice_prefix TEXT DEFAULT 'INV',
  next_invoice_number INTEGER DEFAULT 1,
  default_payment_terms TEXT DEFAULT '14 dní',
  default_tax_rate NUMERIC(5,2) DEFAULT 21,
  bank_account TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexy pro rychlé dotazy
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date DESC);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_entry_id ON invoice_items(entry_id);

-- Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Invoices
CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
  ON invoices FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies - Invoice Items
CREATE POLICY "Users can view own invoice items"
  ON invoice_items FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM invoices WHERE id = invoice_items.invoice_id));

CREATE POLICY "Users can insert own invoice items"
  ON invoice_items FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM invoices WHERE id = invoice_items.invoice_id));

CREATE POLICY "Users can update own invoice items"
  ON invoice_items FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM invoices WHERE id = invoice_items.invoice_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM invoices WHERE id = invoice_items.invoice_id));

CREATE POLICY "Users can delete own invoice items"
  ON invoice_items FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM invoices WHERE id = invoice_items.invoice_id));

-- RLS Policies - Invoice Settings
CREATE POLICY "Users can view own invoice settings"
  ON invoice_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoice settings"
  ON invoice_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoice settings"
  ON invoice_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE invoice_items;
ALTER PUBLICATION supabase_realtime ADD TABLE invoice_settings;

-- Trigger pro auto-increment invoice number
CREATE OR REPLACE FUNCTION increment_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    -- Get settings for user
    WITH settings AS (
      SELECT invoice_prefix, next_invoice_number
      FROM invoice_settings
      WHERE user_id = NEW.user_id
    )
    UPDATE invoice_settings
    SET next_invoice_number = next_invoice_number + 1
    WHERE user_id = NEW.user_id
    RETURNING (SELECT invoice_prefix FROM settings) || LPAD((SELECT next_invoice_number FROM settings)::TEXT, 4, '0')
    INTO NEW.invoice_number;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_invoice_created
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION increment_invoice_number();
```

#### CRM Module

```sql
-- ============================================
-- CRM MODULE - DATABASE SCHEMA
-- ============================================

-- Kontakty
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  role TEXT CHECK (role IN ('decision_maker', 'technical', 'finance', 'other')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Obchodní příležitosti
CREATE TABLE deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  value NUMERIC(10,2),
  currency TEXT DEFAULT 'CZK',
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  stage TEXT CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost')) DEFAULT 'lead',
  expected_close_date DATE,
  actual_close_date DATE,
  lost_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aktivity
CREATE TABLE activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('client', 'contact', 'deal')) NOT NULL,
  entity_id UUID NOT NULL,
  type TEXT CHECK (type IN ('call', 'meeting', 'email', 'note', 'task')) NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  activity_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexy
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_client_id ON contacts(client_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_deals_user_id ON deals(user_id);
CREATE INDEX idx_deals_client_id ON deals(client_id);
CREATE INDEX idx_deals_contact_id ON deals(contact_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_close_date ON deals(expected_close_date);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_activities_date ON activities(activity_date DESC);

-- Row Level Security
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Contacts
CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts"
  ON contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON contacts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies - Deals (podobně jako contacts)
CREATE POLICY "Users can view own deals"
  ON deals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deals"
  ON deals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deals"
  ON deals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own deals"
  ON deals FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies - Activities (podobně jako contacts)
CREATE POLICY "Users can view own activities"
  ON activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities"
  ON activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities"
  ON activities FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities"
  ON activities FOR DELETE
  USING (auth.uid() = user_id);

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE deals;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
```

---

## 🎨 UI/UX Vylepšení

### Design System

```typescript
// config/theme.ts
export const theme = {
  colors: {
    brand: {
      primary: '#2563EB',      // Blue
      secondary: '#10B981',    // Green
      accent: '#F59E0B',       // Amber
      danger: '#EF4444',       // Red
    },
    status: {
      active: '#10B981',       // Green
      completed: '#3B82F6',    // Blue
      paused: '#F59E0B',       // Amber
      cancelled: '#6B7280',    // Gray
      draft: '#9CA3AF',        // Gray
      sent: '#3B82F6',         // Blue
      paid: '#10B981',         // Green
      overdue: '#EF4444',      // Red
    },
    text: {
      primary: '#111827',      // Gray 900
      secondary: '#6B7280',    // Gray 500
      tertiary: '#9CA3AF',     // Gray 400
    },
    background: {
      primary: '#FFFFFF',
      secondary: '#F9FAFB',    // Gray 50
      tertiary: '#F3F4F6',     // Gray 100
    }
  },
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  }
}
```

### Responzivní breakpoints

```typescript
// Tailwind default breakpoints (zachováme)
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet portrait
  lg: '1024px',  // Tablet landscape / Desktop
  xl: '1280px',  // Desktop large
  '2xl': '1536px', // Desktop extra large
}

// Layout behavior:
// < 768px: Mobile (hamburger menu, bottom nav)
// >= 768px: Desktop (sidebar navigation)
```

### Navigace - Desktop vs Mobile

**Desktop (>= 768px):**
- Sidebar navigation (collapsible)
- Persistent header s user menu
- Breadcrumbs pro deep navigation

**Mobile (< 768px):**
- Top header s hamburger menu
- Bottom navigation bar (sticky)
- Swipe gestures pro navigaci

### Dark Mode (volitelné)

```typescript
// Tailwind dark mode support
// tailwind.config.js
module.exports = {
  darkMode: 'class', // nebo 'media'
  // ...
}

// Komponenta pro toggle
export function ThemeToggle() {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
```

---

## 📊 Výhody nového řešení

### Developer Experience (DX)

✅ **TypeScript**
- Méně runtime bugů
- Lepší autocomplete a IntelliSense
- Self-documenting code
- Refactoring confidence

✅ **Komponentová architektura**
- Reusable komponenty
- Separation of concerns
- Easier testing
- Clear dependencies

✅ **Hot Module Replacement**
- Okamžité změny bez reload
- Zachování state při vývoji
- Rychlejší iterace

✅ **Modern tooling**
- ESLint + Prettier
- TypeScript compiler checks
- Next.js dev tools
- React DevTools

### Performance

✅ **Code splitting**
- Menší initial bundle
- Lazy loading pages
- Faster page loads

✅ **React Server Components**
- Méně JavaScript na klientovi
- Faster initial render
- Better SEO

✅ **Image optimization**
- Next.js Image component
- Automatic WebP conversion
- Lazy loading

✅ **Automatic static optimization**
- Static pages where possible
- ISR (Incremental Static Regeneration)
- Edge runtime support

### Scalability

✅ **Modulární architektura**
- Snadné přidávání features
- Jasné boundaries mezi moduly
- Independent deployment možnosti

✅ **Type safety**
- Compile-time checks
- Safer refactoring
- Better IDE support

✅ **Testing**
- Unit tests (Vitest)
- Integration tests
- E2E tests (Playwright)

✅ **Documentation**
- TSDoc comments
- Storybook pro komponenty
- API documentation

### Maintenance

✅ **Clear structure**
- Jasné konvence
- Predictable file locations
- Easy onboarding

✅ **Dependency management**
- npm/pnpm
- Semantic versioning
- Regular updates

✅ **Error handling**
- TypeScript catches errors early
- Error boundaries v Reactu
- Centralized error logging

✅ **Monitoring**
- Vercel Analytics
- Error tracking (Sentry možnost)
- Performance monitoring

---

## 🚀 Budoucí možnosti rozšíření

Po dokončení migrace a základních modulů lze snadno přidat:

### 1. Expense Tracking
- Sledování výdajů na projekty
- Kategorie výdajů
- Receipt management (upload)
- Propojení s fakturami

### 2. Project Management
- Projekty s milestones
- Task management
- Gantt charts
- Progress tracking

### 3. Team Collaboration
- Multi-user support
- Role-based permissions (admin, member, viewer)
- Team time tracking
- Shared clients a projekty

### 4. Advanced Reporting
- Custom report builder
- Export do Excel/CSV
- Scheduled reports (email)
- Data visualization dashboard

### 5. Integrace
- **Notion** - sync dat, export reportů
- **Google Calendar** - sync meetings
- **Slack** - notifikace
- **Stripe** - payment processing pro faktury
- **Email providers** - automatické odesílání faktur

### 6. Mobile App
- React Native app
- Shared business logic
- Offline-first
- Push notifications

### 7. API pro třetí strany
- Public API (REST nebo GraphQL)
- API dokumentace (Swagger/OpenAPI)
- Webhooks
- OAuth integration

### 8. White-label řešení
- Multi-tenant architektura
- Custom branding
- Subdomain/custom domain support
- Per-tenant configuration

### 9. Advanced Features
- Time tracking timer (real-time)
- Screenshot tracking (optional)
- Automatic time categorization (AI)
- Predictive analytics

---

## 💡 Best Practices

### 1. Code Organization

```typescript
// ✅ DO: Feature-based struktura
features/
  time-tracking/
    components/
    hooks/
    services/

// ❌ DON'T: Type-based struktura
components/
  TimeEntryComponent.tsx
  ClientComponent.tsx
services/
  timeEntryService.ts
  clientService.ts
```

### 2. Component Composition

```typescript
// ✅ DO: Malé, composable komponenty
function ClientCard({ client }) {
  return (
    <Card>
      <CardHeader>
        <ClientName name={client.name} />
        <ClientActions clientId={client.id} />
      </CardHeader>
      <CardContent>
        <ClientStats stats={client.stats} />
      </CardContent>
    </Card>
  )
}

// ❌ DON'T: Velké monolitické komponenty
function ClientCard({ client }) {
  return (
    <div className="...">
      {/* 200+ řádků kódu */}
    </div>
  )
}
```

### 3. Custom Hooks

```typescript
// ✅ DO: Business logika v hooks
function useClient(id: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientService.getById(id)
  })

  return { client: data, isLoading }
}

// ❌ DON'T: Business logika přímo v komponentách
function ClientDetail({ id }) {
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // fetch logic...
  }, [id])

  // ...
}
```

### 4. Type Safety

```typescript
// ✅ DO: Explicitní typy
interface Client {
  id: string
  name: string
  hourlyRate: number | null
  note?: string
}

function ClientCard({ client }: { client: Client }) {
  // ...
}

// ❌ DON'T: Any types
function ClientCard({ client }: { client: any }) {
  // ...
}
```

### 5. Error Handling

```typescript
// ✅ DO: Centralizované error handling
async function fetchClients() {
  try {
    const clients = await clientService.getAll()
    return { data: clients, error: null }
  } catch (error) {
    console.error('Error fetching clients:', error)
    toast.error('Nepodařilo se načíst klienty')
    return { data: null, error }
  }
}

// ❌ DON'T: Ignorovat errors
async function fetchClients() {
  const clients = await clientService.getAll()
  return clients
}
```

---

## 📝 Checklist před začátkem migrace

### Příprava

- [ ] Backup současné aplikace (Git + databáze)
- [ ] Dokumentace současné funkcionality
- [ ] Seznam všech features (checklist)
- [ ] Příprava testovacích dat
- [ ] Supabase API keys ready
- [ ] Vercel account ready

### Rozhodnutí

- [ ] Dark mode: ANO / NE?
- [ ] Mobile app v plánu: ANO / NE?
- [ ] Multi-user support v plánu: ANO / NE?
- [ ] Priorita modulů: Time Tracking → Invoicing → CRM (správně?)

### Team

- [ ] Kdo bude implementovat?
- [ ] Kdo bude testovat?
- [ ] Kdo bude reviewovat?
- [ ] Communication channel?

---

## 🎯 Success Criteria

Migrace bude považována za úspěšnou, když:

### Funkční požadavky
- ✅ Všechny features současné aplikace fungují
- ✅ Real-time synchronizace funguje
- ✅ Offline cache funguje
- ✅ Responzivní na mobile i desktop
- ✅ Import ze staré verze funguje

### Non-funkční požadavky
- ✅ Page load < 2s (LCP)
- ✅ Time to Interactive < 3s
- ✅ Zero runtime TypeScript errors
- ✅ 100% feature parity
- ✅ Zero critical bugs

### DevEx požadavky
- ✅ Build čas < 30s
- ✅ Hot reload < 1s
- ✅ TypeScript strict mode
- ✅ ESLint 0 warnings
- ✅ Dokumentace kompletní

---

## 📞 Kontakt & Support

**Pro otázky během implementace:**
- GitHub Issues (private repo)
- Team komunikace (Slack/Discord/Email)

**Užitečné zdroje:**
- [Next.js dokumentace](https://nextjs.org/docs)
- [Supabase dokumentace](https://supabase.com/docs)
- [Tailwind CSS dokumentace](https://tailwindcss.com/docs)
- [shadcn/ui dokumentace](https://ui.shadcn.com)
- [TanStack Query dokumentace](https://tanstack.com/query/latest)

---

## 🔄 Verzování dokumentu

| Verze | Datum | Změny | Autor |
|-------|-------|-------|-------|
| 1.0 | 18.12.2025 | Iniciální verze strategického plánu | Claude |

---

## ✅ Schválení

**Status:** ✅ Schváleno - připraveno k implementaci

**Poznámky:**
- Plán je komplexní a pokrývá všechny aspekty migrace
- Modularita umožní snadné přidávání dalších features
- Next.js + Vercel je ideální kombinace pro tento projekt
- Timeline 2-3 týdny je realistický pro kompletní migraci

**Next Steps:**
1. Vytvoř nový Git branch: `feature/next-migration`
2. Začni s Fází 1: Next.js Setup
3. Postupuj podle timeline v tomto dokumentu

---

**Konec dokumentu**
