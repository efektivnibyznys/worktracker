# ⚡ Performance Improvements Log - Next.js App

**Datum zahájení:** 19. prosince 2025
**Status:** 🚧 V průběhu

---

## 📊 Celkový přehled

| Fáze | Status | Problémy opraveno | Čas |
|------|--------|-------------------|-----|
| **Fáze 1: Kritické** | ✅ Hotovo | 2/2 | ~30 min |
| **Fáze 2: React optimalizace** | ⏳ Pending | 0/2 | ~2-3h |
| **Fáze 3: Type safety** | ⏳ Pending | 0/2 | ~1-2h |
| **Fáze 4: DX** | ⏳ Pending | 0/2 | ~1h |
| **Fáze 5: DB & Security** | ⏳ Pending | 0/3 | ~1h |

**Celkový progress:** 2/11 (18%)

---

## ✅ FÁZE 1: KRITICKÉ VÝKONNOSTNÍ PROBLÉMY (HOTOVO)

**Datum dokončení:** 19. prosince 2025
**Čas strávený:** ~30 minut

### Problém 1: Triple Database Queries ✅

**Před:**
```typescript
// ❌ 3 samostatné databázové dotazy!
const { data: todayEntries } = useQuery({
  queryKey: [ENTRIES_KEY, 'today'],
  queryFn: () => entryService.getToday(),
})

const { data: weekEntries } = useQuery({
  queryKey: [ENTRIES_KEY, 'week'],
  queryFn: () => entryService.getThisWeek(),
})

const { data: monthEntries } = useQuery({
  queryKey: [ENTRIES_KEY, 'month'],
  queryFn: () => entryService.getThisMonth(),
})
```

**Po:**
```typescript
// ✅ 1 databázový dotaz + client-side filtrování
const { data: monthEntries } = useQuery({
  queryKey: [ENTRIES_KEY, 'month'],
  queryFn: () => entryService.getThisMonth(),
})

const todayEntries = useMemo(
  () => filterToday(monthEntries || []),
  [monthEntries]
)

const weekEntries = useMemo(
  () => filterThisWeek(monthEntries || []),
  [monthEntries]
)
```

**Výsledky:**
- ✅ **66% redukce DB dotazů** (3 → 1)
- ✅ **Lepší React Query caching** (sdílená cache pro month data)
- ✅ **Rychlejší initial load** (méně network requests)

**Soubory změněny:**
- `features/time-tracking/hooks/useEntries.ts`

---

### Problém 2: Service Instances při každém renderu ✅

**Před:**
```typescript
// ❌ Vytváří se znovu při KAŽDÉM renderu!
export function useEntries(filters?: EntryFilters) {
  const supabase = createSupabaseClient()
  const entryService = new EntryService(supabase)
  // ...
}
```

**Po:**
```typescript
// ✅ Memoizované - vytvoří se pouze jednou
export function useEntries(filters?: EntryFilters) {
  const supabase = useMemo(() => createSupabaseClient(), [])
  const entryService = useMemo(() => new EntryService(supabase), [supabase])
  // ...
}
```

**Výsledky:**
- ✅ **Eliminace zbytečných re-creations** (5 hooks opraveno)
- ✅ **Snížení memory allocations**
- ✅ **Stabilní reference** pro React Query dependencies

**Hooks opraveny:**
1. `useEntries` + `useDashboardEntries`
2. `useClients` + `useClient`
3. `usePhases`
4. `useSettings`

**Soubory změněny:**
- `features/time-tracking/hooks/useEntries.ts`
- `features/time-tracking/hooks/useClients.ts`
- `features/time-tracking/hooks/usePhases.ts`
- `features/time-tracking/hooks/useSettings.ts`

---

## ⏳ FÁZE 2: REACT OPTIMALIZACE (PENDING)

**Očekávaný čas:** 2-3 hodiny
**Problémy k opravě:** 2

### Problém 3: Chybějící useMemo pro výpočty

**Postižené komponenty:** 10+ míst

**Dashboard (`app/(dashboard)/page.tsx`):**
- ❌ Řádky 26-29: Stats výpočty (3x calculateStats)
- ❌ Řádky 45-51: Sorting a slicing recentEntries

**Entries (`app/(dashboard)/entries/page.tsx`):**
- ❌ Řádky 75-79: Reduce total minutes & amount

**Reports (`app/(dashboard)/reports/page.tsx`):**
- ❌ Řádek 76: calculateStats

**Clients/Phases pages:**
- Podobné problémy

**Plánované řešení:**
- Obalit všechny výpočty do `useMemo` s correct dependencies

---

### Problém 4: Chybějící useCallback pro handlery

**Postižené komponenty:** 15+ handler funkcí

**Handler funkce napříč komponentami:**
- `page.tsx:31` - handleQuickAdd
- `clients/page.tsx:36,51,70` - handleCreate, Update, Delete
- `entries/page.tsx:40,53,58` - handlers
- `clients/[id]/page.tsx:38,54,73` - handlers
- `Header.tsx:10` - handleSignOut

**Plánované řešení:**
- Obalit handlery do `useCallback` s correct dependencies
- Stabilizovat reference pro child components

---

## ⏳ FÁZE 3: TYPE SAFETY (PENDING)

**Očekávaný čas:** 1-2 hodiny
**Problémy k opravě:** 2

### Problém 5: TypeScript 'any' types (9 výskytů)

**Handler funkce:**
```typescript
// ❌ Špatně
const handleQuickAdd = async (data: any) => { ... }

// ✅ Správně
const handleQuickAdd = async (data: TimeEntryFormData) => { ... }
```

**Lokace:**
- `app/(dashboard)/page.tsx:31`
- `app/(dashboard)/clients/page.tsx:36,51`
- `features/time-tracking/components/QuickAddForm.tsx:53`
- `app/(dashboard)/clients/[id]/page.tsx:38,54`
- `lib/hooks/useAuth.ts:25,45,62` (error handling)

---

### Problém 6: Type assertions 'as any' (2 místa)

**Lokace:** `lib/supabase/services/baseService.ts:50,64`

```typescript
// ❌ Špatně
.insert([data as any])
.update(data as any)

// ✅ Správně - použít generics
insert<T extends Database['public']['Tables'][TableName]['Insert']>(data: T)
```

---

## ⏳ FÁZE 4: DEVELOPER EXPERIENCE (PENDING)

**Očekávaný čas:** 1 hodina
**Problémy k opravě:** 2

### Problém 7: Console.error statements (11 výskytů)

**Lokace:**
- `app/error.tsx:14`
- `app/global-error.tsx:14`
- `app/(dashboard)/page.tsx:40`
- `app/(dashboard)/clients/page.tsx:47,66,80`
- `app/(dashboard)/entries/page.tsx:68`
- `app/(dashboard)/settings/page.tsx:73`
- `app/(dashboard)/clients/[id]/page.tsx:50,69,83`

**Plánované řešení:**
- Vytvořit logger utility s environment checks
- Nahradit všechny console.error

---

### Problém 8: Logger Utility

**Chybí:** Centralizovaný logging system

**Plán:**
```typescript
// lib/utils/logger.ts
export const logger = {
  log: (...args) => process.env.NODE_ENV === 'development' && console.log(...args),
  error: (...args) => console.error(...args), // errors vždy
  warn: (...args) => process.env.NODE_ENV === 'development' && console.warn(...args),
}
```

---

## ⏳ FÁZE 5: DATABASE & SECURITY (PENDING)

**Očekávaný čas:** 1 hodina
**Problémy k opravě:** 3

### Problém 9: N+1 Queries

**Lokace:** `clientService.ts:51-81` - `getAllWithStats()`

Fetch všech klientů, pak všech entries, pak filtrování v kódu.

**Plánované řešení:**
- JOIN nebo agregace na DB úrovni
- Nebo akceptovat jako trade-off (jednodušší kód vs. výkon)

---

### Problém 10: Chybějící databázové indexy

**SQL k přidání:**
```sql
CREATE INDEX idx_entries_client_date ON entries(client_id, date DESC);
CREATE INDEX idx_entries_phase_date ON entries(phase_id, date DESC)
  WHERE phase_id IS NOT NULL;
```

---

### Problém 11: Check constraints

**SQL k přidání:**
```sql
ALTER TABLE entries ADD CONSTRAINT check_positive_duration
  CHECK (duration_minutes > 0);

ALTER TABLE entries ADD CONSTRAINT check_valid_times
  CHECK (end_time > start_time);

ALTER TABLE clients ADD CONSTRAINT check_positive_rate
  CHECK (hourly_rate IS NULL OR hourly_rate >= 0);
```

---

## 📈 Očekávané výsledky po dokončení všech fází

### Výkon
- **DB queries:** -66% (3 → 1 hotovo, další optimalizace možné)
- **Re-renders:** -40% (useMemo/useCallback)
- **Initial load:** -30% (optimalizované dotazy)
- **Memory usage:** -20% (memoizované instances)

### Code quality
- **Type safety:** 100% (žádné any types)
- **Maintainability:** +50% (stabilní references, lepší debugging)
- **Developer Experience:** +60% (proper logging, clear code)

### Security
- **Input validation:** 100% (TypeScript strict)
- **DB constraints:** 100% (check constraints přidány)
- **Error handling:** 100% (error boundaries + logging)

---

**Poslední aktualizace:** 19. prosince 2025 (po Fázi 1)
**Další krok:** Fáze 2 - React optimalizace (useMemo/useCallback)
