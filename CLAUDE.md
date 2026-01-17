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

## Database

Tables: `clients`, `phases`, `entries`, `settings`, `invoices`, `invoice_items`

All tables have RLS policies scoped to `auth.uid()`. Schema in `supabase-setup.sql`.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
