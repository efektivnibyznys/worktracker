# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Development server with Turbopack
npm run build        # Production build
npm start            # Start production server
npm run lint         # ESLint
npm run type-check   # TypeScript type checking (tsc --noEmit)
```

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript (strict mode)
- **Database:** Supabase (PostgreSQL with Row Level Security)
- **State:** Zustand (auth) + React Query (server state)
- **UI:** Tailwind CSS + shadcn/ui (Radix primitives)
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts

## Architecture

### Feature-Based Structure
```
features/
├── time-tracking/          # Core time tracking
│   ├── types/             # Entry, Client, Phase types
│   ├── services/          # EntryService, ClientService extend BaseService
│   ├── hooks/             # useEntries, useClients (React Query wrappers)
│   └── components/        # QuickAddForm, EditEntryDialog, charts/
└── billing/               # Invoicing module
    ├── types/             # Invoice types
    ├── services/          # InvoiceService
    ├── hooks/             # useInvoices, useEntrySelection
    └── components/        # InvoiceCard, EntrySelector, etc.
```

### Service Pattern (lib/supabase/services/baseService.ts)
Abstract `BaseService<TableName>` provides typed CRUD operations. Feature services extend it:
```typescript
class EntryService extends BaseService<'entries'> {
  protected readonly tableName = 'entries'
  // Add domain methods: getAllWithFilters(), getToday(), getThisMonth()
}
```

### Hook + Service Pattern
Hooks wrap services with React Query. Always memoize service instances:
```typescript
const supabase = useMemo(() => createSupabaseClient(), [])
const entryService = useMemo(() => new EntryService(supabase), [supabase])
```

Query keys: `ENTRIES_KEY`, `CLIENTS_KEY`, `INVOICES_KEY`, etc. Mutations auto-invalidate related queries.

### Route Groups
- `app/(auth)/` - Login, register pages (public)
- `app/(dashboard)/` - All protected pages with shared layout

### Auth Flow
- `middleware.ts` - Protects routes, refreshes sessions
- `lib/stores/authStore.ts` - Zustand store for user state
- `components/providers/AuthProvider.tsx` - Listens to Supabase auth changes

## Key Files

| File | Purpose |
|------|---------|
| `middleware.ts` | Auth protection, session refresh |
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/services/baseService.ts` | Generic typed CRUD base class |
| `lib/stores/authStore.ts` | Global auth state (Zustand) |
| `types/database.ts` | Auto-generated Supabase types |
| `supabase-setup.sql` | Database schema |

## Database Schema

### Tables Overview
| Table | Key Fields | Relations |
|-------|------------|-----------|
| `clients` | id, user_id, name, hourly_rate | → entries, phases, invoices |
| `phases` | id, user_id, client_id, name, hourly_rate, status | → entries, invoice_items |
| `entries` | id, user_id, client_id, phase_id?, date, duration_minutes, hourly_rate, billing_status, invoice_id? | ← client, phase, invoice |
| `settings` | user_id (PK), default_hourly_rate, company_*, default_due_days, default_tax_rate | - |
| `invoices` | id, user_id, client_id?, invoice_number, status, total_amount, invoice_type | → invoice_items, ← entries |
| `invoice_items` | id, invoice_id, entry_id?, description, quantity, unit_price | ← invoice, entry |

### Key Enums
- **billing_status:** `'unbilled' | 'billed' | 'paid'`
- **invoice_status:** `'draft' | 'issued' | 'sent' | 'paid' | 'cancelled' | 'overdue'`
- **invoice_type:** `'linked' | 'standalone'`
- **phase_status:** `'active' | 'completed' | 'paused'`

All tables have RLS policies scoped to `auth.uid()`. Schema in `supabase-setup.sql`.

## Key Types

### EntryWithRelations (features/time-tracking/types/entry.types.ts)
```typescript
interface EntryWithRelations extends Entry {
  client?: { id: string; name: string }      // Joined from clients table
  phase?: { id: string; name: string } | null // Joined from phases table
}
// Entry base has: id, user_id, client_id, phase_id, date, start_time, end_time,
//                 duration_minutes, description, hourly_rate, billing_status, invoice_id
```

### Invoice Types (features/billing/types/invoice.types.ts)
```typescript
interface InvoiceWithRelations extends Invoice {
  client?: { id: string; name: string }
  items?: InvoiceItem[]
}

interface CreateLinkedInvoiceInput {
  client_id: string
  entry_ids: string[]
  group_by: 'entry' | 'phase' | 'day'  // How to group entries into invoice items
  issue_date: string
  due_date: string
  tax_rate?: number
  notes?: string
}
```

## Data Flow Patterns

### Creating Time Entry
```
QuickAddForm → useEntries().createEntry.mutateAsync(data)
  → EntryService.create(data) → Supabase INSERT
  → onSuccess: invalidateQueries([ENTRIES_KEY])
  → UI re-renders with new data
```

### Creating Invoice from Entries
```
Entries page: select entries → useEntrySelection() tracks selectedIds
  → Click "Vytvořit fakturu" → CreateInvoiceDialog opens
  → LinkedInvoiceForm receives preselectedEntries
  → Submit → useInvoices().createLinkedInvoice.mutateAsync(input)
  → InvoiceService.createLinkedInvoice():
      1. Fetch entries, calculate totals
      2. Generate invoice_number (YYYY-NNNN)
      3. INSERT invoice
      4. INSERT invoice_items (grouped by entry/phase/day)
      5. UPDATE entries SET billing_status='billed', invoice_id=...
  → onSuccess: invalidateQueries([INVOICES_KEY, ENTRIES_KEY])
```

### Hourly Rate Priority
When creating entry: `entry.hourly_rate > phase.hourly_rate > client.hourly_rate > settings.default_hourly_rate`

## React Query Keys

| Key Pattern | Used By | Invalidated By |
|-------------|---------|----------------|
| `['entries']` | useEntries | createEntry, updateEntry, deleteEntry |
| `['entries', filters]` | useEntries(filters) | same |
| `['entries', 'month']` | useDashboardEntries | entry mutations |
| `['entries', 'unbilled', clientId]` | useUnbilledEntries | entry/invoice mutations |
| `['clients']` | useClients | createClient, updateClient, deleteClient |
| `['phases', clientId]` | usePhases | phase mutations |
| `['invoices']` | useInvoices | invoice mutations |
| `['invoices', 'stats']` | useInvoices (stats) | invoice mutations |
| `['settings', userId]` | useSettings | updateSettings |

## Common Debugging

### Data not updating after mutation
Check that `queryClient.invalidateQueries()` is called with correct key in mutation's `onSuccess`.

### Entry/Invoice relations not loading
Services use Supabase select with joins:
```typescript
.select('*, client:clients(id, name), phase:phases(id, name)')
```
Check that the relation syntax is correct.

### Form validation issues
Forms use Zod schemas. Check:
1. Schema matches expected data shape
2. `zodResolver(schema)` passed to `useForm`
3. Error messages display: `{errors.fieldName?.message}`

### Preselected data not working in dialogs
When passing data to dialog components:
1. Check props are passed correctly from parent
2. Check `useMemo` dependencies include the data
3. For forms, may need `useEffect` to `setValue()` when props change
4. Consider bypassing react-hook-form validation for preselected data

### Invoice creation from entries fails
Check:
1. `preselectedEntries` has `client_id` field (not just `client.id`)
2. All entries are from same client
3. `handleDirectSubmit` bypasses form validation for preselected flow

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Detailed Documentation

For comprehensive architecture documentation, data flows, and component details, see:
- `docs/ARCHITECTURE.md` - Full technical documentation
