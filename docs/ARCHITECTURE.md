# Work Tracker - Technical Architecture

Comprehensive technical documentation for the Work Tracker application.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Database Schema](#database-schema)
3. [Features & Modules](#features--modules)
4. [Services Architecture](#services-architecture)
5. [Hooks Architecture](#hooks-architecture)
6. [Components](#components)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [Authentication](#authentication)
9. [State Management](#state-management)
10. [Utilities](#utilities)
11. [Routing](#routing)
12. [Debugging Guide](#debugging-guide)

---

## Project Structure

```
worktracker/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Public auth routes
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/                  # Protected routes with layout
│   │   ├── layout.tsx               # Dashboard layout (Header + main)
│   │   ├── page.tsx                 # Dashboard home
│   │   ├── entries/page.tsx         # Entries list
│   │   ├── clients/
│   │   │   ├── page.tsx             # Clients list
│   │   │   └── [id]/page.tsx        # Client detail
│   │   ├── invoices/
│   │   │   ├── page.tsx             # Invoices list
│   │   │   └── [id]/page.tsx        # Invoice detail
│   │   ├── reports/page.tsx
│   │   └── settings/page.tsx
│   ├── layout.tsx                   # Root layout
│   └── globals.css
│
├── features/                         # Feature modules
│   ├── time-tracking/               # Time tracking feature
│   │   ├── types/
│   │   │   ├── entry.types.ts
│   │   │   ├── client.types.ts
│   │   │   ├── phase.types.ts
│   │   │   └── settings.types.ts
│   │   ├── services/
│   │   │   ├── entryService.ts
│   │   │   ├── clientService.ts
│   │   │   ├── phaseService.ts
│   │   │   └── settingsService.ts
│   │   ├── hooks/
│   │   │   ├── useEntries.ts
│   │   │   ├── useClients.ts
│   │   │   ├── usePhases.ts
│   │   │   └── useSettings.ts
│   │   └── components/
│   │       ├── QuickAddForm.tsx
│   │       ├── EditEntryDialog.tsx
│   │       ├── ClientForm.tsx
│   │       ├── PhaseForm.tsx
│   │       └── charts/
│   │           ├── TimelineChart.tsx
│   │           └── DistributionChart.tsx
│   │
│   └── billing/                     # Billing/invoicing feature
│       ├── types/
│       │   └── invoice.types.ts
│       ├── services/
│       │   └── invoiceService.ts
│       ├── hooks/
│       │   ├── useInvoices.ts
│       │   ├── useInvoice.ts
│       │   └── useEntrySelection.ts
│       └── components/
│           ├── InvoiceCard.tsx
│           ├── InvoiceFilters.tsx
│           ├── InvoiceStats.tsx
│           ├── CreateInvoiceDialog.tsx
│           ├── LinkedInvoiceForm.tsx
│           ├── StandaloneInvoiceForm.tsx
│           ├── EntrySelector.tsx
│           ├── InvoiceStatusBadge.tsx
│           └── BillingStatusBadge.tsx
│
├── lib/                             # Core utilities
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   ├── server.ts               # Server Supabase client
│   │   └── services/
│   │       └── baseService.ts      # Abstract base service
│   ├── stores/
│   │   └── authStore.ts            # Zustand auth store
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── usePageMetadata.ts
│   └── utils/
│       ├── calculations.ts         # Stats calculations
│       ├── time.ts                 # Time/date formatting
│       ├── currency.ts             # Currency formatting
│       ├── chart-data.ts           # Chart data preparation
│       └── logger.ts               # Logging utility
│
├── components/                      # Shared components
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   └── QueryProvider.tsx
│   ├── layout/
│   │   └── Header.tsx
│   └── ui/                         # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── select.tsx
│       └── ...
│
├── types/
│   └── database.ts                 # Auto-generated Supabase types
│
├── middleware.ts                   # Auth middleware
├── supabase-setup.sql             # Database schema
└── package.json
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   clients   │       │   phases    │       │   entries   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │←──┐   │ id (PK)     │←──┐   │ id (PK)     │
│ user_id     │   │   │ user_id     │   │   │ user_id     │
│ name        │   │   │ client_id   │───┘   │ client_id   │───┐
│ hourly_rate │   │   │ name        │       │ phase_id    │───┤
│ note        │   │   │ hourly_rate │       │ date        │   │
│ created_at  │   │   │ status      │       │ start_time  │   │
└─────────────┘   │   │ description │       │ end_time    │   │
                  │   │ created_at  │       │ duration_m  │   │
                  │   └─────────────┘       │ description │   │
                  │                         │ hourly_rate │   │
                  │                         │ billing_st  │   │
                  │                         │ invoice_id  │───┼───┐
                  │                         │ created_at  │   │   │
                  │                         └─────────────┘   │   │
                  │                                           │   │
                  │   ┌─────────────┐       ┌─────────────┐   │   │
                  │   │  settings   │       │  invoices   │←──┼───┘
                  │   ├─────────────┤       ├─────────────┤   │
                  │   │ user_id(PK) │       │ id (PK)     │   │
                  │   │ default_hr  │       │ user_id     │   │
                  │   │ currency    │       │ client_id   │───┘
                  │   │ company_*   │       │ inv_number  │
                  │   │ bank_acct   │       │ issue_date  │
                  │   │ due_days    │       │ due_date    │
                  │   │ tax_rate    │       │ inv_type    │
                  │   └─────────────┘       │ status      │
                  │                         │ subtotal    │
                  │                         │ tax_*       │
                  │                         │ total_amt   │
                  │                         │ notes       │
                  │                         │ paid_at     │
                  │                         └─────────────┘
                  │                                ↓
                  │                         ┌─────────────┐
                  │                         │invoice_items│
                  │                         ├─────────────┤
                  │                         │ id (PK)     │
                  │                         │ invoice_id  │
                  │                         │ entry_id    │
                  │                         │ phase_id    │
                  │                         │ description │
                  │                         │ quantity    │
                  │                         │ unit_price  │
                  │                         │ total_price │
                  │                         │ sort_order  │
                  └─────────────────────────└─────────────┘
```

### Table Details

#### clients
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  hourly_rate NUMERIC(10,2),           -- Optional client-level rate
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: user_id = auth.uid()
```

#### phases
```sql
CREATE TABLE phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  hourly_rate NUMERIC(10,2),           -- Optional phase-level rate
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: user_id = auth.uid()
```

#### entries
```sql
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  phase_id UUID REFERENCES phases(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  description TEXT NOT NULL,
  hourly_rate NUMERIC(10,2) NOT NULL CHECK (hourly_rate > 0),
  billing_status TEXT DEFAULT 'unbilled' CHECK (billing_status IN ('unbilled', 'billed', 'paid')),
  invoice_id UUID REFERENCES invoices(id),
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_times CHECK (end_time > start_time)
);
-- RLS: user_id = auth.uid()
-- Indexes: (user_id, date), (client_id, date), (phase_id, date)
```

#### settings
```sql
CREATE TABLE settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  default_hourly_rate NUMERIC(10,2) DEFAULT 850,
  currency TEXT DEFAULT 'Kč',
  company_name TEXT,
  company_address TEXT,
  company_ico TEXT,                    -- Czech business ID
  company_dic TEXT,                    -- Czech VAT ID
  bank_account TEXT,
  default_due_days INTEGER DEFAULT 14,
  default_tax_rate NUMERIC(5,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: user_id = auth.uid()
```

#### invoices
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID REFERENCES clients(id),  -- NULL for standalone
  invoice_number TEXT UNIQUE NOT NULL,    -- Format: YYYY-NNNN
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('linked', 'standalone')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'sent', 'paid', 'cancelled', 'overdue')),
  subtotal NUMERIC(10,2) NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'Kč',
  variable_symbol TEXT,                   -- Czech payment reference
  bank_account TEXT,
  notes TEXT,
  internal_notes TEXT,
  paid_at TIMESTAMPTZ,                    -- Set when status = 'paid'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: user_id = auth.uid()
```

#### invoice_items
```sql
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES entries(id),   -- NULL for standalone items
  phase_id UUID REFERENCES phases(id),
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  unit TEXT DEFAULT 'hod',                -- Hours
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: inherits from invoices
```

---

## Features & Modules

### Time Tracking Module (`features/time-tracking/`)

**Purpose:** Core functionality for tracking work hours

#### Services

**EntryService** (`services/entryService.ts`)
```typescript
class EntryService extends BaseService<'entries'> {
  getAllWithFilters(filters?: EntryFilters): Promise<EntryWithRelations[]>
  getByDateRange(dateFrom: string, dateTo: string): Promise<Entry[]>
  getToday(): Promise<Entry[]>
  getThisWeek(): Promise<Entry[]>
  getThisMonth(): Promise<Entry[]>
}
```

**ClientService** (`services/clientService.ts`)
```typescript
class ClientService extends BaseService<'clients'> {
  getAllWithStats(): Promise<ClientWithStats[]>  // Includes hours, amount, entry count
  getWithStats(id: string): Promise<ClientWithStats>
}
```

**PhaseService** (`services/phaseService.ts`)
```typescript
class PhaseService extends BaseService<'phases'> {
  getByClient(clientId: string): Promise<Phase[]>
  getByClientWithStats(clientId: string): Promise<PhaseWithStats[]>
  getWithStats(id: string): Promise<PhaseWithStats>
}
```

**SettingsService** (`services/settingsService.ts`)
```typescript
class SettingsService {
  get(userId: string): Promise<Settings>          // Creates defaults if not exists
  update(userId: string, updates: Partial<Settings>): Promise<Settings>
}
```

#### Types

```typescript
// entry.types.ts
interface Entry {
  id: string
  user_id: string
  client_id: string
  phase_id: string | null
  date: string                    // ISO date
  start_time: string              // HH:mm
  end_time: string                // HH:mm
  duration_minutes: number
  description: string
  hourly_rate: number
  billing_status: 'unbilled' | 'billed' | 'paid'
  invoice_id: string | null
  created_at: string
}

interface EntryWithRelations extends Entry {
  client?: { id: string; name: string }
  phase?: { id: string; name: string } | null
}

interface EntryFilters {
  clientId?: string
  phaseId?: string
  dateFrom?: string
  dateTo?: string
  billingStatus?: 'unbilled' | 'billed' | 'paid'
}

// client.types.ts
interface ClientWithStats extends Client {
  totalHours: number
  totalAmount: number
  entryCount: number
  phaseCount: number
}

// phase.types.ts
interface PhaseWithStats extends Phase {
  totalHours: number
  totalAmount: number
  entryCount: number
}
```

### Billing Module (`features/billing/`)

**Purpose:** Invoice creation, management, and tracking

#### Services

**InvoiceService** (`services/invoiceService.ts`)
```typescript
class InvoiceService extends BaseService<'invoices'> {
  // Queries
  getAllWithFilters(filters?: InvoiceFilters): Promise<InvoiceWithRelations[]>
  getByIdWithItems(id: string): Promise<InvoiceWithRelations>
  getStats(): Promise<InvoiceStats>
  getUnbilledEntries(clientId?: string): Promise<EntryWithRelations[]>

  // Mutations
  createLinkedInvoice(input: CreateLinkedInvoiceInput): Promise<Invoice>
  createStandaloneInvoice(input: CreateStandaloneInvoiceInput): Promise<Invoice>
  updateStatus(id: string, status: InvoiceStatus): Promise<Invoice>
  deleteInvoice(id: string): Promise<void>

  // Helpers
  generateInvoiceNumber(): Promise<string>  // Format: YYYY-NNNN
  groupEntriesForInvoice(entries, groupBy): InvoiceItemData[]
}
```

#### Key Types

```typescript
// invoice.types.ts
type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'paid' | 'cancelled' | 'overdue'
type InvoiceType = 'linked' | 'standalone'
type GroupBy = 'entry' | 'phase' | 'day'

interface Invoice {
  id: string
  user_id: string
  client_id: string | null
  invoice_number: string
  issue_date: string
  due_date: string
  invoice_type: InvoiceType
  status: InvoiceStatus
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  currency: string
  variable_symbol: string | null
  bank_account: string | null
  notes: string | null
  internal_notes: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

interface InvoiceWithRelations extends Invoice {
  client?: { id: string; name: string }
  items?: InvoiceItem[]
}

interface CreateLinkedInvoiceInput {
  client_id: string
  entry_ids: string[]
  group_by: GroupBy
  issue_date: string
  due_date: string
  tax_rate?: number
  notes?: string
  variable_symbol?: string
  bank_account?: string
}

interface CreateStandaloneInvoiceInput {
  client_id?: string
  items: StandaloneItemInput[]
  issue_date: string
  due_date: string
  tax_rate?: number
  notes?: string
}

interface InvoiceStats {
  total: number
  draft: number
  issued: number
  sent: number
  paid: number
  overdue: number
  cancelled: number
  totalAmount: number
  paidAmount: number
  unpaidAmount: number
}
```

#### Invoice Creation Flow (Linked)

```
1. User selects entries on Entries page
   └── useEntrySelection() tracks selectedIds

2. Click "Vytvořit fakturu"
   └── Opens CreateInvoiceDialog with preselectedEntries

3. LinkedInvoiceForm
   ├── Auto-detects client from entries
   ├── Shows entries summary (read-only)
   ├── User sets: group_by, dates, tax_rate, notes
   └── Submit triggers handleDirectSubmit()

4. InvoiceService.createLinkedInvoice()
   ├── Fetch entries by IDs
   ├── Validate all unbilled, same client
   ├── Calculate subtotal, tax, total
   ├── Generate invoice_number (YYYY-NNNN)
   ├── INSERT invoice
   ├── Group entries by strategy (entry/phase/day)
   ├── INSERT invoice_items
   └── UPDATE entries SET billing_status='billed', invoice_id=...

5. React Query invalidation
   └── Refetch invoices and entries lists
```

---

## Services Architecture

### Base Service Pattern

Location: `lib/supabase/services/baseService.ts`

```typescript
abstract class BaseService<TableName extends keyof Database['public']['Tables']> {
  protected readonly supabase: SupabaseClient<Database>
  protected abstract readonly tableName: TableName

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
  }

  // Generic CRUD with full type safety
  async getAll(): Promise<Row[]>
  async getById(id: string): Promise<Row>
  async create(data: Insert): Promise<Row>
  async update(id: string, data: Update): Promise<Row>
  async delete(id: string): Promise<void>
}
```

**Benefits:**
- Automatic type inference from `Database` types
- Consistent error handling
- Single source of truth for CRUD operations

### Service Inheritance

```
BaseService<TableName>
    ├── EntryService extends BaseService<'entries'>
    ├── ClientService extends BaseService<'clients'>
    ├── PhaseService extends BaseService<'phases'>
    └── InvoiceService extends BaseService<'invoices'>

SettingsService (standalone - different table structure)
```

---

## Hooks Architecture

### Pattern: Service + React Query Wrapper

```typescript
export function useEntries(filters?: EntryFilters) {
  // 1. Memoize to prevent recreation on every render
  const supabase = useMemo(() => createSupabaseClient(), [])
  const entryService = useMemo(() => new EntryService(supabase), [supabase])
  const queryClient = useQueryClient()

  // 2. Query with proper key structure
  const { data: entries, isLoading, error } = useQuery({
    queryKey: [ENTRIES_KEY, filters],
    queryFn: () => entryService.getAllWithFilters(filters),
  })

  // 3. Mutations with auto-invalidation
  const createEntry = useMutation({
    mutationFn: (data: EntryInsert) => entryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ENTRIES_KEY] })
    },
  })

  // 4. Return data + mutations
  return { entries: entries || [], isLoading, error, createEntry, updateEntry, deleteEntry }
}
```

### Query Key Strategy

```typescript
// Constants
const ENTRIES_KEY = 'entries'
const CLIENTS_KEY = 'clients'
const PHASES_KEY = 'phases'
const INVOICES_KEY = 'invoices'
const SETTINGS_KEY = 'settings'

// Key patterns
['entries']                    // All entries
['entries', filters]           // Filtered entries
['entries', 'month']           // Dashboard optimization
['entries', 'unbilled', clientId]  // For billing

['clients']                    // All clients
['clients', id]                // Single client

['phases', clientId]           // Phases for client

['invoices']                   // All invoices (with filters in object)
['invoices', 'stats']          // Invoice statistics
['invoices', id]               // Single invoice

['settings', userId]           // User settings
```

### Invalidation Rules

| Mutation | Invalidates |
|----------|-------------|
| createEntry | `['entries']` |
| updateEntry | `['entries']` |
| deleteEntry | `['entries']` |
| createClient | `['clients']` |
| updateClient | `['clients']` |
| deleteClient | `['clients']`, `['phases']` |
| createPhase | `['phases']` |
| updatePhase | `['phases']` |
| deletePhase | `['phases']` |
| createInvoice | `['invoices']`, `['entries']` |
| updateInvoiceStatus | `['invoices']`, `['entries']` |
| deleteInvoice | `['invoices']`, `['entries']` |

---

## Components

### Layout Components

**Header** (`components/layout/Header.tsx`)
- Fixed navigation bar
- Desktop/mobile responsive
- Active link highlighting
- Sign out functionality

**Dashboard Layout** (`app/(dashboard)/layout.tsx`)
- Wraps all protected pages
- Includes Header
- Responsive container

### Feature Components

#### Time Tracking

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `QuickAddForm` | Create new entry | `onSuccess` |
| `EditEntryDialog` | Edit existing entry | `entry`, `open`, `onSubmit` |
| `ClientForm` | Create/edit client | `client?`, `onSubmit`, `onCancel` |
| `PhaseForm` | Create/edit phase | `phase?`, `clientId`, `onSubmit` |
| `TimelineChart` | Line chart (hours over time) | `entries`, `grouping`, `metric` |
| `DistributionChart` | Pie chart (by client/phase) | `entries`, `groupBy` |

#### Billing

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `CreateInvoiceDialog` | Invoice creation modal | `open`, `preselectedEntries?` |
| `LinkedInvoiceForm` | Form for linked invoices | `preselectedEntries`, `onSubmit` |
| `StandaloneInvoiceForm` | Form for standalone invoices | `onSubmit` |
| `EntrySelector` | Checkbox list for entries | `entries`, `selectedIds`, `onToggle` |
| `InvoiceCard` | Invoice display card | `invoice` |
| `InvoiceFilters` | Filter UI | `filters`, `onFilterChange` |
| `InvoiceStats` | Stats cards | `stats` |
| `InvoiceStatusBadge` | Status badge | `status` |
| `BillingStatusBadge` | Billing status badge | `status` |

---

## Data Flow Diagrams

### Creating Time Entry

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│ QuickAddForm │ ──→ │ useEntries()    │ ──→ │ EntryService │
│              │     │ createEntry     │     │ .create()    │
└──────────────┘     │ .mutateAsync()  │     └──────────────┘
       │             └─────────────────┘            │
       │                     │                      ↓
       │                     │             ┌──────────────┐
       │                     │             │  Supabase    │
       │                     │             │  INSERT      │
       │                     │             └──────────────┘
       │                     │                      │
       │                     ↓                      │
       │             ┌─────────────────┐            │
       │             │ onSuccess:      │ ←──────────┘
       │             │ invalidate      │
       │             │ ['entries']     │
       │             └─────────────────┘
       │                     │
       ↓                     ↓
┌──────────────┐     ┌─────────────────┐
│ toast.success│     │ UI re-renders   │
│              │     │ with new entry  │
└──────────────┘     └─────────────────┘
```

### Creating Invoice from Entries

```
┌─────────────────┐     ┌────────────────────┐
│ Entries Page    │     │ useEntrySelection  │
│ Select entries  │ ──→ │ selectedIds: Set   │
└─────────────────┘     └────────────────────┘
        │                        │
        ↓                        │
┌─────────────────┐              │
│ Click "Vytvořit │              │
│ fakturu"        │              │
└─────────────────┘              │
        │                        │
        ↓                        ↓
┌─────────────────────────────────────────┐
│ CreateInvoiceDialog                      │
│ preselectedEntries = entries.filter(...) │
└─────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────┐
│ LinkedInvoiceForm                        │
│ - Auto-detect clientId from entries      │
│ - Show entries summary                   │
│ - Collect: group_by, dates, tax, notes   │
└─────────────────────────────────────────┘
                    │
                    ↓ handleDirectSubmit()
┌─────────────────────────────────────────┐
│ useInvoices().createLinkedInvoice       │
│ .mutateAsync(input)                     │
└─────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────┐
│ InvoiceService.createLinkedInvoice()    │
│ 1. Fetch entries                        │
│ 2. Calculate totals                     │
│ 3. Generate invoice_number              │
│ 4. INSERT invoice                       │
│ 5. INSERT invoice_items (grouped)       │
│ 6. UPDATE entries billing_status        │
└─────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────┐
│ onSuccess:                              │
│ - invalidateQueries(['invoices'])       │
│ - invalidateQueries(['entries'])        │
│ - clearSelection()                      │
│ - closeDialog()                         │
│ - toast.success()                       │
└─────────────────────────────────────────┘
```

---

## Authentication

### Stack
- Supabase Auth (email/password)
- `@supabase/ssr` for cookie-based sessions
- Next.js Middleware for route protection

### Flow

```
1. User visits protected route
        ↓
2. middleware.ts intercepts
   ├── Refresh session token
   ├── Check if authenticated
   └── Redirect to /login if not
        ↓
3. AuthProvider listens to auth changes
   └── Updates Zustand store (user, loading)
        ↓
4. Protected components render
   └── Access user via useAuthStore()
```

### Key Files

| File | Purpose |
|------|---------|
| `middleware.ts` | Route protection, session refresh |
| `lib/supabase/client.ts` | Browser client factory |
| `lib/supabase/server.ts` | Server client factory |
| `lib/stores/authStore.ts` | Global auth state |
| `lib/hooks/useAuth.ts` | signIn, signUp, signOut |
| `components/providers/AuthProvider.tsx` | Auth state listener |

---

## State Management

### Zustand (Global Client State)

**AuthStore** (`lib/stores/authStore.ts`)
```typescript
interface AuthState {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => void
}
```

### React Query (Server State)

**Configuration** (`components/providers/QueryProvider.tsx`)
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,       // 1 minute
      refetchOnWindowFocus: true,
    },
  },
})
```

---

## Utilities

### Calculations (`lib/utils/calculations.ts`)
```typescript
calculateStats(entries: Entry[]): { totalHours, totalMinutes, totalAmount, entryCount }
determineHourlyRate(entryRate?, phaseRate?, clientRate?, defaultRate): number
```

### Time/Date (`lib/utils/time.ts`)
```typescript
formatTime(minutes: number): string          // "5 h 30 min"
calculateDuration(start, end): number        // minutes
formatDate(date: string): string             // "dd.MM.yyyy"
getTodayDate(): string                       // ISO format
getWeekStart(): string                       // ISO format
getMonthStart(): string                      // ISO format
```

### Currency (`lib/utils/currency.ts`)
```typescript
formatCurrency(amount: number): string       // "1 234,56 Kč"
```

### Chart Data (`lib/utils/chart-data.ts`)
```typescript
prepareTimelineData(entries, grouping): ChartData[]
prepareDistributionData(entries, groupBy): ChartData[]
determineTimelineGrouping(dateRange): 'day' | 'week' | 'month'
```

---

## Routing

### Public Routes (no auth required)
- `/login` - Login page
- `/register` - Registration page

### Protected Routes (auth required)
- `/` - Dashboard (stats, quick add)
- `/entries` - All entries with filters
- `/clients` - Clients list
- `/clients/[id]` - Client detail with phases
- `/invoices` - Invoices list with filters
- `/invoices/[id]` - Invoice detail
- `/reports` - Reports page
- `/settings` - User settings

---

## Debugging Guide

### Common Issues

#### 1. Data not updating after mutation
**Cause:** Query invalidation not working
**Solution:** Check `queryClient.invalidateQueries()` is called with correct key in `onSuccess`

#### 2. Relations not loading
**Cause:** Incorrect Supabase select syntax
**Solution:** Verify join syntax:
```typescript
.select('*, client:clients(id, name), phase:phases(id, name)')
```

#### 3. Form validation errors
**Cause:** Zod schema mismatch
**Solution:**
1. Check schema matches data shape
2. Verify `zodResolver(schema)` passed to `useForm`
3. Check error display: `{errors.fieldName?.message}`

#### 4. Preselected data not working in dialogs
**Cause:** Timing issues with props/state
**Solution:**
1. Props must be passed from parent correctly
2. Use `useMemo` with correct dependencies
3. May need `useEffect` to `setValue()` when props change
4. Consider bypassing form validation for preselected data

#### 5. Invoice creation fails with "select client" error
**Cause:** Client ID not being set properly
**Solution:**
1. Check `preselectedEntries` has `client_id` field
2. Verify `handleDirectSubmit` is used (bypasses form validation)
3. Ensure all entries from same client

### Debug Techniques

1. **React Query DevTools** - Check query states, cache
2. **Console logging** - Add logs in hooks/services
3. **Network tab** - Verify Supabase requests/responses
4. **Supabase Dashboard** - Check RLS policies, data

### Performance Tips

1. **Memoize service instances** - Prevents recreation
2. **Use specific query keys** - Better cache invalidation
3. **Dashboard optimization** - Single query + client-side filtering
4. **Stale time balance** - 60s is good for most cases
