# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Context7 Documentation Access

**IMPORTANT:** When working with external libraries or frameworks (React, Next.js, Supabase, TypeScript, Tailwind, etc.), ALWAYS use Context7 to get up-to-date documentation.

**How to use:**
Add `use context7` to your prompts when you need current documentation:
- "use context7: How to implement Server Actions in Next.js 15?"
- "use context7: What's the latest Supabase client API for authentication?"
- "use context7: Show me React 19 hooks best practices"

This ensures you have the most current, version-specific documentation and prevents using outdated patterns or deprecated APIs.

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
  group_by: 'entry' | 'phase' | 'project' | 'day' | 'custom'
  custom_description?: string  // Required for one custom-text summary item
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
  → InvoiceService.createLinkedInvoice() calls create_linked_invoice RPC:
      1. Database validates ownership and locks every selected unbilled entry
      2. Allocates the next user/year invoice number
      3. Creates invoice and rate-correct line items in one transaction
      4. Updates entry billing status and invoice_id in the same transaction
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
3. `handleFormSubmit` resolves the client from preselected entries; the shared schema leaves the form client optional and validates all description fields in both flows

### Production login/data unavailable after Supabase email
If production still serves `/login` from Vercel but sign-in, registration, or dashboard data fails, check Supabase first. A paused Supabase project makes Auth/PostgREST unavailable while the static Next.js frontend can still load. Resume/restore the project in the Supabase dashboard, then verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel still point to the active project. If the old project cannot be restored, create a new Supabase project, run `supabase-setup.sql` and migrations, then update the Vercel environment variables and redeploy.

### Local lint and build commands fail before validating application code
With Next.js 16, use `npm run lint` (ESLint flat configuration); `next lint` was removed. A local `npm run build` requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; without them, prerendering dashboard routes fails while creating the Supabase client.

### Invoice creation fails or a billed entry cannot be edited
Apply `supabase/migrations/20260928_secure_invoices.sql` before deploying the matching client code. Invoice writes use authenticated RPCs, not direct table mutations. The migration stops if historical `(user_id, invoice_number)` duplicates exist; resolve them manually without silently changing issued invoices. To edit a billed work entry, delete its invoice first so the entry returns to `unbilled`, then edit and create a new invoice. A failed RPC rolls back its header, items, number allocation and entry changes together.

### Short work entries or invalid numeric inputs produce confusing invoice amounts
PostgreSQL accepts `NaN` as a `numeric` value, so a lower-bound-only check does not protect invoice totals. The invoice RPCs validate both lower and finite upper bounds on amounts and rates. Linked invoice lines use fixed-price items calculated from exact minutes; rounding hours to two decimals made a one-minute entry appear as `0.02 hod` even though the amount was calculated from exactly one minute.

### Invoice descriptions contain duration/rate suffixes or the footer repeats payment details
The September 2026 invoice RPC appended ` (159 min při sazbě 850.00 Kč/h)` to work descriptions. Apply `supabase/migrations/20261002_clean_invoice_descriptions.sql` after the secure invoice migration to keep new descriptions clean while retaining exact-minute prices and separate rate groups. `formatInvoiceItemDescription` hides only the generated trailing suffix on historical linked fixed-price items in both the detail page and PDF, without modifying stored invoices. Standalone descriptions remain untouched. Keep supplier IČO and bank account in the PDF supplier section only; the footer retains the logo, name/address, notes and electronic-issuance text.

### Custom invoice text is rejected or its total differs from short entries
Select `Vlastní text (jedna položka)` under `Seskupení položek` and enter a nonblank description of at most 1000 characters. Both manual and preselected forms use `linkedInvoiceSchema` through React Hook Form validation. The RPC requires the same text for `group_by=custom`, makes one `ks` item with the sum of per-entry rounded amounts, and retains entry invoice links. The preview uses `calculateCustomInvoiceSubtotal` with the same cent rounding. Apply `20261002_clean_invoice_descriptions.sql` with this release; without it, the RPC rejects the new grouping mode. Custom text is preserved verbatim apart from surrounding whitespace and is never cleaned as a historical generated suffix.

### PDF download asks for supplier details
Enter company name, address, IČO and bank account in Settings. The app refuses a payable PDF until these are present; it never substitutes hardcoded personal or bank details. New invoices snapshot the configured bank account, while old invoices can use the current setting.

### Logo upload or backup fails after security migration
Apply `supabase/migrations/20260928_secure_logos.sql`. New uploads use one stable `<user-id>/logo` key and a 2 MB bucket limit; old logo paths remain readable. Backup now needs GitHub secrets `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in addition to the database URL and passphrase. Use a new `sb_secret_...` key, not a legacy `service_role` key. Run the workflow manually and rehearse a restore as described in `docs/BACKUPS.md`.
Historical logo MIME types or sizes can exceed the new bucket limits. The restore command temporarily widens the bucket settings for verified archived files and resets them afterward. If a restore is interrupted, inspect and restore the bucket limits before resuming normal use.

### Turbopack rejects direct WOFF imports used by React PDF
Next.js 16 Turbopack reports `Unknown module type` when a client component directly imports `.woff` files for `@react-pdf/renderer`. Keep `@fontsource/roboto` as a dependency, run `scripts/prepare-report-fonts.mjs` from the `predev` and `prebuild` hooks, and register the resulting same-origin `/fonts/report-roboto-*.woff` URLs with React PDF. This preserves Czech glyphs without a runtime CDN dependency or a custom Turbopack loader.

### A full Supabase dump fails to restore into an initialized test database

An initialized Supabase PostgreSQL database already has managed schemas such as `graphql`; restoring a full platform dump there can fail with duplicate-object errors. For the backup rehearsal, create a disposable database with `createdb -T template0`, then run `pg_restore --no-owner --no-acl --exit-on-error` against that fresh database. The manual backup workflow performs this restore, compares row counts, applies the security migrations to the restored production data, and verifies unchanged business and Storage metadata rows. Do not use `pg_restore --clean` against the live project.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Detailed Documentation

For comprehensive architecture documentation, data flows, and component details, see:
- `docs/ARCHITECTURE.md` - Full technical documentation

---

## Development Guidelines

### Continuous Documentation Updates

**IMPORTANT:** When developing or debugging this application, if you encounter:
- A new bug or unexpected behavior
- A tricky problem that took time to solve
- A non-obvious solution or workaround
- A pattern that might confuse future development

**You MUST:**
1. Add the problem and solution to the "Common Debugging" section above
2. If it's a complex issue, also add it to `docs/ARCHITECTURE.md` in the Debugging Guide
3. Update any relevant sections if the architecture changes

This ensures the documentation stays current and useful for future development sessions.
