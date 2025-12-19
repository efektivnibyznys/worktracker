# Current Features Checklist - Work Tracker v1.0

**Datum vytvoření:** 18. prosince 2025
**Účel:** Checklist pro ověření feature parity po migraci na Next.js

---

## ✅ Authentication & Security

- [x] **Email + heslo registrace**
  - Minimálně 6 znaků heslo
  - Email verification
  - Location: `index.html:191-210`

- [x] **Přihlášení**
  - Email + heslo login
  - Session management
  - Location: `index.html:168-188`

- [x] **Odhlášení**
  - Logout button v headeru
  - Clear session
  - Location: `index.html:822-830`

- [x] **Row Level Security (RLS)**
  - Každý uživatel vidí pouze svá data
  - Automatické filtrování podle user_id
  - Location: `supabase-setup.sql:77-184`

- [x] **User info display**
  - Zobrazení emailu v headeru
  - Location: `index.html:223-226`

---

## 👥 Clients Management

- [x] **Seznam klientů**
  - Zobrazení všech klientů
  - Cards s informacemi
  - Location: `index.html:405-414`, `index.html:2187-2199`

- [x] **Přidat klienta**
  - Formulář: name, hourly_rate, note
  - Modal dialog
  - Location: `index.html:537-567`, `index.html:1593-1617`

- [x] **Upravit klienta**
  - Edit existujícího klienta
  - Stejný formulář jako pro přidání
  - Location: `index.html:917-936`

- [x] **Smazat klienta**
  - Confirm dialog
  - Cascade delete fází a záznamů
  - Location: `index.html:938-950`

- [x] **Detail klienta**
  - Zobrazení fází projektu
  - Statistiky (hodiny, částka)
  - Location: `index.html:2196-2280`

- [x] **Hodinová sazba klienta**
  - Volitelná sazba per client
  - Použita pokud není sazba na fázi/záznamu
  - Location: `index.html:16-17`, `index.html:552-553`

---

## 🎯 Phases Management

- [x] **Seznam fází**
  - Zobrazení v rámci klienta
  - Filtered by client_id
  - Location: `index.html:2218-2275`

- [x] **Přidat fázi**
  - Formulář: name, description, hourly_rate, status
  - Modal dialog
  - Přiřazení ke klientovi
  - Location: `index.html:569-607`, `index.html:1619-1645`

- [x] **Upravit fázi**
  - Edit existující fáze
  - Location: `index.html:1009-1029`

- [x] **Smazat fázi**
  - Confirm dialog
  - Entries zůstanou (phase_id → NULL)
  - Location: `index.html:1031-1043`

- [x] **Stavy fází**
  - active ✅
  - completed ☑️
  - paused ⏸️
  - Color-coded badges
  - Location: `index.html:93-111`, `index.html:593-597`

- [x] **Hodinová sazba fáze**
  - Override client rate
  - Priorita: entry > phase > client > default
  - Location: `index.html:28-30`, `index.html:588-590`

---

## ⏰ Time Entries

### CRUD Operations

- [x] **Quick add form (Dashboard)**
  - Klient, fáze, datum, čas od-do, popis, sazba
  - Automatický výpočet duration
  - Automatické určení hodinové sazby
  - Location: `index.html:325-369`, `index.html:1545-1573`

- [x] **Plný formulář (Entry modal)**
  - Stejné pole jako quick add
  - Modal dialog
  - Location: `index.html:609-663`, `index.html:1647-1675`

- [x] **Upravit záznam**
  - Edit existujícího entry
  - Location: `index.html:1105-1129`

- [x] **Smazat záznam**
  - Confirm dialog
  - Location: `index.html:1131-1143`

### Calculations

- [x] **Automatický výpočet duration**
  - Z start_time a end_time
  - V minutách
  - Location: `index.html:1377-1381`

- [x] **Automatické určení hodinové sazby**
  - Priorita: entry rate > phase rate > client rate > default rate
  - Logic v prepareEntry()
  - Location: `index.html:1376-1409`

### Display

- [x] **Seznam záznamů**
  - Paginated/scrollable list
  - Zobrazení: klient, fáze, datum, čas, popis, duration, částka
  - Location: `index.html:416-448`

- [x] **Poslední záznamy (Dashboard)**
  - Top 5 nejnovějších
  - Cards s informacemi
  - Location: `index.html:371-378`, `index.html:1891-1920`

- [x] **Filtered entries list (Dashboard)**
  - Collapsible seznam
  - Zobrazuje filtrované výsledky
  - Location: `index.html:296-304`, `index.html:1932-1983`

### Filtering

- [x] **Filtrování v Entries sekci**
  - By client
  - By phase
  - By date range (from-to)
  - Location: `index.html:418-444`, `index.html:1686-1690`

- [x] **Dashboard filtry**
  - Stejné filtry jako v Entries
  - Live update statistik a grafů
  - Location: `index.html:248-277`, `index.html:1696-1732`

---

## 📊 Dashboard

### Statistics Cards

- [x] **Dnes**
  - Hodiny + částka
  - Filtered by current date
  - Location: `index.html:306-311`, `index.html:1869-1883`

- [x] **Tento týden**
  - Hodiny + částka
  - Od pondělí
  - Location: `index.html:312-317`, `index.html:1884-1886`

- [x] **Tento měsíc**
  - Hodiny + částka
  - Od 1. dne měsíce
  - Location: `index.html:318-322`, `index.html:1887-1889`

### Filtered Statistics

- [x] **Celkem hodin (filtrovaných)**
  - Location: `index.html:282-284`, `index.html:1939`

- [x] **Celková částka (filtrovaná)**
  - Location: `index.html:285-287`, `index.html:1940`

- [x] **Počet činností (filtrovaných)**
  - Location: `index.html:288-292`, `index.html:1941`

### Charts

- [x] **Clients chart (koláčový)**
  - Rozdělení hodin podle klientů
  - Pro aktuální měsíc
  - Chart.js doughnut
  - Location: `index.html:384-388`, `index.html:2004-2058`

- [x] **Phases chart (koláčový)**
  - Rozdělení hodin podle fází
  - Pro aktuální měsíc
  - Chart.js doughnut
  - Location: `index.html:390-394`, `index.html:2061-2121`

- [x] **Timeline chart (sloupcový)**
  - Hodiny po dnech v měsíci
  - Chart.js bar
  - Location: `index.html:397-401`, `index.html:2124-2184`

---

## 📈 Reports

- [x] **Report generování**
  - Filter by client (optional)
  - Filter by date range (from-to)
  - Location: `index.html:450-474`, `index.html:1693-1694`

- [x] **Report souhrn**
  - Celkem hodin
  - K fakturaci (částka)
  - Počet záznamů
  - Location: `index.html:476-493`

- [x] **Report detaily**
  - Seznam všech záznamů v období
  - Grouped nebo flat view
  - Location: `index.html:495-500`, `index.html:2496-2609`

- [x] **Notion export**
  - Formátovaný text pro Notion
  - Copy to clipboard
  - Markdown-like format
  - Location: `index.html:472`, `index.html:2611-2630`

---

## ⚙️ Settings

- [x] **Výchozí hodinová sazba**
  - Nastavení default rate
  - Použita když není sazba na entry/phase/client
  - Location: `index.html:505-520`, `index.html:1575-1591`

- [x] **Měna**
  - Nastavení currency (default: Kč)
  - Location: `index.html:514-516`

- [x] **User settings v DB**
  - Tabulka settings s user_id
  - Auto-create při registraci (trigger)
  - Location: `supabase-setup.sql:48-54`, `supabase-setup.sql:187-205`

- [x] **Import lokálních dat**
  - Migrace ze staré localStorage verze
  - Import clients, phases, entries
  - ID mapping
  - Location: `index.html:523-527`, `index.html:2634-2719`

---

## 🔄 Synchronization

### Supabase Integration

- [x] **Supabase client setup**
  - URL a ANON_KEY konfigurace
  - Location: `index.html:670-674`

- [x] **CRUD services**
  - Clients: getAll, create, update, delete
  - Phases: getAll, getByClient, create, update, delete
  - Entries: getAll (with filters), create, update, delete
  - Settings: get, create, update
  - Location: `index.html:873-1254`

- [x] **Cache management**
  - localStorage cache pro offline
  - saveToCache() / loadFromCache()
  - Location: `index.html:1276-1295`

- [x] **Sync from Supabase**
  - Načtení všech dat z DB
  - Transformace snake_case → camelCase
  - Update cache
  - Location: `index.html:1300-1355`

### Real-time

- [x] **Real-time subscriptions**
  - Poslouchá změny na clients, phases, entries, settings
  - Filtered by user_id
  - Auto-refresh UI
  - Location: `index.html:1764-1811`

- [x] **Real-time publication v DB**
  - Supabase realtime enabled
  - Location: `supabase-setup.sql:207-215`

### Sync Indicator

- [x] **Visual feedback**
  - Fixed position indicator
  - States: syncing 🔄, success ✅, error ⚠️, offline 📡
  - Auto-hide after 2s (success)
  - Location: `index.html:158-161`, `index.html:1226-1253`

---

## 🎨 UI/UX Features

### Layout

- [x] **Header**
  - App title
  - User email
  - Logout button
  - Location: `index.html:218-230`

- [x] **Navigation**
  - Tabs: Dashboard, Klienti, Záznamy, Reporty, Nastavení
  - Active state indication
  - Location: `index.html:232-242`, `index.html:1518-1542`

- [x] **Section switching**
  - Show/hide sections
  - Only one active at a time
  - Location: `index.html:1527-1542`

### Components

- [x] **Modals**
  - Client modal
  - Phase modal
  - Entry modal
  - Backdrop overlay
  - Location: `index.html:130-154`, `index.html:537-663`

- [x] **Cards**
  - Styled containers
  - Shadow, rounded corners
  - Location: `index.html:69-74`

- [x] **Buttons**
  - Primary (blue)
  - Secondary (gray)
  - Danger (red)
  - Hover states
  - Location: `index.html:33-68`

- [x] **Forms**
  - Input fields with styling
  - Labels
  - Validation (HTML5 required)
  - Location: `index.html:75-92`

- [x] **Status badges**
  - Color-coded (active, completed, paused)
  - Small, rounded
  - Location: `index.html:93-111`

### Responsive

- [x] **Tailwind responsive classes**
  - Grid layouts (grid-cols-1 md:grid-cols-2)
  - Mobile-friendly spacing
  - Location: Throughout HTML

---

## 🗄️ Database Schema

### Tables

- [x] **clients**
  - id, user_id, name, hourly_rate, note, created_at
  - RLS enabled
  - Indexes: user_id, created_at
  - Location: `supabase-setup.sql:12-19`

- [x] **phases**
  - id, user_id, client_id, name, description, hourly_rate, status, created_at
  - RLS enabled
  - Indexes: user_id, client_id, status
  - Location: `supabase-setup.sql:22-31`

- [x] **entries**
  - id, user_id, client_id, phase_id, date, start_time, end_time, duration_minutes, description, hourly_rate, created_at
  - RLS enabled
  - Indexes: user_id, client_id, phase_id, date, user_id+date
  - Location: `supabase-setup.sql:34-46`

- [x] **settings**
  - user_id (PK), default_hourly_rate, currency, updated_at
  - RLS enabled
  - Location: `supabase-setup.sql:49-54`

### Security

- [x] **RLS policies (všechny tabulky)**
  - SELECT: auth.uid() = user_id
  - INSERT: auth.uid() = user_id
  - UPDATE: auth.uid() = user_id
  - DELETE: auth.uid() = user_id
  - Location: `supabase-setup.sql:86-184`

### Triggers

- [x] **Auto-create settings**
  - Při vytvoření nového uživatele
  - Default rate: 850 Kč
  - Location: `supabase-setup.sql:191-205`

---

## 🛠️ Utility Functions

### Date/Time

- [x] **formatDate()**
  - Czech locale (dd.mm.yyyy)
  - Location: `index.html:1439-1442`

- [x] **formatTime()**
  - Hours + minutes
  - Format: "5 h 30 min" or "5 h"
  - Location: `index.html:1432-1437`

- [x] **getTodayDate()**
  - ISO format (YYYY-MM-DD)
  - Location: `index.html:1444-1446`

- [x] **getWeekStart()**
  - Monday of current week
  - Location: `index.html:1448-1453`

- [x] **getMonthStart()**
  - 1st day of current month
  - Location: `index.html:1455-1458`

### Currency

- [x] **formatCurrency()**
  - Czech number format
  - Append " Kč"
  - Location: `index.html:1428-1430`

### Calculations

- [x] **calculateStats()**
  - Sum duration_minutes
  - Calculate total amount
  - Return: hours, minutes, totalMinutes, amount
  - Location: `index.html:1411-1422`

- [x] **prepareEntry()**
  - Calculate duration from times
  - Determine hourly rate (priority logic)
  - Location: `index.html:1377-1409`

---

## 📦 External Dependencies (CDN)

- [x] **Tailwind CSS**
  - Version: latest from CDN
  - Location: `index.html:7`

- [x] **Chart.js**
  - Version: latest from CDN
  - For doughnut and bar charts
  - Location: `index.html:8`

- [x] **Supabase JS Client**
  - Version: 2.x from CDN
  - Location: `index.html:9`

---

## ✅ Feature Completeness

**Total Features:** 120+

**Critical Features:** ✅ All implemented
**Nice-to-have Features:** ✅ All implemented

---

## 🎯 Migration Goals

Po migraci na Next.js musí fungovat **všechny** výše uvedené funkce.
Feature parity je KRITICKÁ - žádná funkce nesmí chybět.

---

## 📝 Notes

- Single-page HTML aplikace (~2740 řádků)
- Vanilla JavaScript (žádný framework)
- Velmi čistý kód s jasnou strukturou (třídy: AuthManager, SupabaseService, DataManager, App)
- Real-time sync funguje perfektně
- Offline cache podporována
- RLS security je solid

---

**Konec checklistu**
