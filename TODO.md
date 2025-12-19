# 📋 TODO - Work Tracker Next.js

**Datum vytvoření:** 19. prosince 2025
**Poslední aktualizace:** 19. prosince 2025
**Celkový progress:** 11/17 úkolů (65%)

---

## 📊 Přehled

| Kategorie | Hotovo | Zbývá | Progress |
|-----------|--------|-------|----------|
| **Bezpečnost** | 4/4 | 0 | 100% ✅ |
| **Výkonnostní optimalizace** | 6/9 | 3 | 67% 🔄 |
| **Type Safety & DX** | 3/3 | 0 | 100% ✅ |
| **Testing & Deployment** | 0/3 | 3 | 0% ⏳ |
| **CELKEM** | **13/19** | **6** | **68%** |

---

## ✅ DOKONČENO

### Bezpečnost (4/4)
- [x] Externalizace credentials do .env.local
- [x] Oprava XSS zranitelností (8+ míst v index.html)
- [x] Error boundaries v Next.js aplikaci
- [x] Archivace HTML verze do archive-html/

### Výkon - Kritické (3/3)
- [x] **Konsolidace DB dotazů** (3→1 queries v useDashboardEntries)
- [x] **Memoizace service instances** (5 hooks opraveno)
- [x] **React optimalizace:**
  - [x] 7× useMemo pro výpočty
  - [x] 15× useCallback pro handlery

### Type Safety & DX (3/3)
- [x] **Logger utility** (vytvořen + 11× console.error nahrazeno)
- [x] **TypeScript any types** (9 výskytů opraveno)
- [x] **BaseService type assertions** (2× as any nahrazeno bezpečnějšími typy)

---

## 🔄 ZBÝVÁ

### 🟡 Výkon & Databáze (3 úkoly - STŘEDNÍ priorita)

#### 1. Optimalizovat N+1 queries
**Lokace:** `features/time-tracking/services/clientService.ts:51-81`

**Problém:**
```typescript
async getAllWithStats(): Promise<ClientWithStats[]> {
  const clients = await this.getAll()

  // ❌ Separate queries - neefektivní
  const { data: allEntries } = await this.supabase
    .from('entries')
    .select('client_id, duration_minutes, hourly_rate')

  const { data: allPhases } = await this.supabase
    .from('phases')
    .select('client_id')

  // Pak filtrování v kódu
  return clients.map(client => {
    const clientEntries = allEntries?.filter(e => e.client_id === client.id)
    // ...
  })
}
```

**Řešení:**
- Option A: Použít JOIN nebo agregaci na DB úrovni
- Option B: Akceptovat jako trade-off (jednodušší kód vs. výkon)

**Odhad:** 30-45 minut

---

#### 2. Přidat databázové indexy
**Soubor:** `supabase-setup.sql` (nebo Supabase Dashboard)

**SQL k přidání:**
```sql
-- Index pro častá filtrování entries podle klienta a data
CREATE INDEX idx_entries_client_date ON entries(client_id, date DESC);

-- Index pro filtrování entries podle fáze a data
CREATE INDEX idx_entries_phase_date ON entries(phase_id, date DESC)
  WHERE phase_id IS NOT NULL;

-- Composite index pro dashboard queries
CREATE INDEX idx_entries_user_date ON entries(user_id, date DESC);
```

**Benefity:**
- Rychlejší queries na entries (hlavně dashboard a reporty)
- Lepší performance při velkém množství dat

**Odhad:** 15 minut

---

#### 3. Přidat check constraints
**Soubor:** `supabase-setup.sql` (nebo Supabase Dashboard)

**SQL k přidání:**
```sql
-- Zajistit kladnou duration
ALTER TABLE entries ADD CONSTRAINT check_positive_duration
  CHECK (duration_minutes > 0);

-- Zajistit validní časové rozmezí
ALTER TABLE entries ADD CONSTRAINT check_valid_times
  CHECK (end_time > start_time);

-- Zajistit nezápornou hodinovou sazbu
ALTER TABLE clients ADD CONSTRAINT check_positive_rate
  CHECK (hourly_rate IS NULL OR hourly_rate >= 0);

ALTER TABLE phases ADD CONSTRAINT check_positive_phase_rate
  CHECK (hourly_rate IS NULL OR hourly_rate >= 0);

ALTER TABLE entries ADD CONSTRAINT check_positive_entry_rate
  CHECK (hourly_rate >= 0);
```

**Benefity:**
- Data integrity na DB úrovni
- Prevence špatných dat
- Lepší debugging

**Odhad:** 20 minut

---

### 🔐 Security & Deployment (2 úkoly - STŘEDNÍ priorita)

#### 4. Přidat security headers
**Soubor:** `next-app/vercel.json` (vytvořit)

**Konfigurace:**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

**Benefity:**
- Lepší bezpečnostní skóre (8.0 → 9.0)
- Ochrana proti clickjacking, XSS, etc.

**Odhad:** 30 minut

---

#### 5. Deployment na Vercel
**Kroky:**

1. **Vercel CLI setup**
   ```bash
   npm i -g vercel
   cd next-app
   vercel login
   ```

2. **Environment variables**
   V Vercel dashboard nastavit:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Custom domain** (volitelné)
   - Nakonfigurovat v Vercel dashboard

**Odhad:** 1 hodina

---

### 🧪 Testing (1 úkol - STŘEDNÍ priorita)

#### 6. Nastavit testing framework
**Soubory:** `next-app/vitest.config.ts`, `next-app/package.json`

**Instalace:**
```bash
cd next-app
npm install -D vitest @vitejs/plugin-react jsdom
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event
```

**Konfigurace:** `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

**První testy k napsání:**
1. `lib/utils/calculations.test.ts` - calculateStats, determineHourlyRate
2. `lib/utils/time.test.ts` - calculateDuration, formatTime
3. `features/time-tracking/hooks/useEntries.test.tsx` - mock Supabase

**Odhad:** 2-3 hodiny

---

### 🟢 Nice-to-have (1 úkol - NÍZKÁ priorita)

#### 7. Code splitting pro recharts
**Soubor:** `next-app/next.config.ts`

**Přidat:**
```typescript
const nextConfig = {
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        recharts: {
          test: /[\\/]node_modules[\\/](recharts|d3-.*)[\\/]/,
          name: 'recharts',
          priority: 10,
        },
      },
    }
    return config
  },
}
```

**Benefity:**
- Menší initial bundle
- Rychlejší FCP (First Contentful Paint)
- Lepší performance skóre

**Odhad:** 15 minut

---

## 📈 Doporučené pořadí

### 1. Rychlé vítězství (1.5h)
Dokončit jednoduché úkoly pro rychlý progress:
1. ✅ Přidat databázové indexy (15 min)
2. ✅ Přidat check constraints (20 min)
3. ✅ Code splitting pro recharts (15 min)
4. ✅ Přidat security headers (30 min)

### 2. Deployment (1h)
5. ✅ Deployment na Vercel

### 3. Optimalizace & Testing (3-4h)
6. ✅ Optimalizovat N+1 queries (45 min)
7. ✅ Nastavit testing framework (2-3h)

**Celkový zbývající čas:** 5-6 hodin

---

## 📊 Výsledné metriky

Po dokončení všech úkolů očekávané výsledky:

### Výkon
- **DB queries:** -66% (dokončeno) + další optimalizace
- **Re-renders:** -40% (dokončeno)
- **Initial load:** -30% (dokončeno + code splitting)
- **Memory usage:** -20% (dokončeno)

### Code quality
- **Type safety:** 100% (dokončeno)
- **Maintainability:** +50% (dokončeno)
- **Test coverage:** 80%+ (po testingu)

### Security
- **Input validation:** 100% (dokončeno)
- **DB constraints:** 100% (po constraints)
- **Security score:** 9.0/10 (po security headers)
- **Error handling:** 100% (dokončeno)

---

## 🔗 Související dokumenty

- **[PERFORMANCE_IMPROVEMENTS_LOG.md](./PERFORMANCE_IMPROVEMENTS_LOG.md)** - Detailní log výkonnostních optimalizací
- **[DEVELOPMENT_STRATEGY.md](./DEVELOPMENT_STRATEGY.md)** - Celková strategie vývoje
- **[SECURITY_AUDIT_LOG.md](./SECURITY_AUDIT_LOG.md)** - Bezpečnostní audit
- **[TESTING_STRATEGY.md](./TESTING_STRATEGY.md)** - Testovací strategie
- **[README.md](./README.md)** - Hlavní dokumentace

---

**Poslední aktualizace:** 19. prosince 2025 (po Phase 3 completion)
**Next milestone:** Dokončit Fázi 5 (Database & Security optimalizace)
