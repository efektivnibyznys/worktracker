# Poznatky z Vercel Deploymentu

**Datum:** 19. 12. 2024
**Projekt:** Work Tracker - migrace z HTML na Next.js 16

---

## 🚨 Problémy a Řešení

### 1. Next.js Version Conflicts

**Problém:**
- Next.js 15.5.9 měl build tracing chyby s route groups `(dashboard)`, `(auth)`
- Error: `ENOENT: no such file or directory, open '.next/server/app/(dashboard)/page_client-reference-manifest.js'`

**Neúspěšné pokusy:**
- ❌ Přidání `output: 'standalone'` - nepomohlo
- ❌ Downgrade na Next.js 15.0.3 - React peer dependency konflikt
- ❌ Next.js 15.1.0 - security vulnerability CVE-2025-66478

**Řešení:**
- ✅ Upgrade na **Next.js 16.1.0** (latest)
- Vyřešilo všechny build problémy + security vulnerabilities

**Doporučení:**
- U nových projektů rovnou použít nejnovější stabilní verzi Next.js
- Před deploymentem zkontrolovat `npm audit` pro security issues

---

### 2. Webpack vs Turbopack Conflict

**Problém:**
```
This build is using Turbopack, with a webpack config and no turbopack config
```

**Příčina:**
- Next.js 16 používá Turbopack jako výchozí bundler
- Měli jsme webpack config pro code splitting, který kolidoval

**Řešení:**
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {},  // Prázdná konfigurace pro Turbopack
  // Odstraněno: webpack: (config) => { ... }
}
```

**Doporučení:**
- Next.js 16+ používá Turbopack automaticky
- Pokud potřebujete custom webpack config, musíte explicitně vypnout Turbopack
- Pro code splitting použít dynamic imports místo webpack magic comments

---

### 3. Blank White Screen - Root Page

**Problém:**
- Po přihlášení se zobrazila pouze bílá obrazovka
- HTML obsahovalo pouze prázdný `<div id="__next"></div>`

**Příčina:**
```typescript
// app/page.tsx - špatně
export default function RootPage() {
  return null  // Renderuje prázdnou stránku
}
```

**Řešení:**
```typescript
// app/page.tsx - správně
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/clients')  // Server-side redirect
}
```

**Doporučení:**
- Root page (`app/page.tsx`) NIKDY nevrací null
- Použít `redirect()` z `next/navigation` pro server-side redirecty
- Middleware už redirect nezvládne, protože page se renderuje

---

### 4. Dynamic Routes 404 Error

**Problém:**
- `/clients/[id]` vracel 404 Not Found
- Dynamická route se nenačetla správně

**Řešení:**
```typescript
// app/(dashboard)/clients/[id]/page.tsx
'use client'

export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default function ClientDetailPage() {
  // ...
}
```

**Vysvětlení:**
- `dynamic = 'force-dynamic'` - vypne statickou optimalizaci
- `dynamicParams = true` - povolí dynamické parametry (nejen předgenerované)
- Nutné pro pages s databázovými dotazy a dynamickými daty

**Doporučení:**
- U všech dynamic routes s databází přidat tyto exporty
- Zejména pokud používáte Supabase RLS nebo real-time data

---

### 5. Select Component Empty String Value

**Problém:**
```
Error: A <Select.Item /> must have a value prop that is not an empty string
```

**Příčina:**
```typescript
// Špatně - prázdný string v value
<Select value={filters.clientId || ''}>
  <SelectItem value="">Všichni klienti</SelectItem>
</Select>
```

**Řešení:**
```typescript
// Správně - použít 'all' nebo jiný non-empty string
<Select
  value={filters.clientId || 'all'}
  onValueChange={(value) => handleFilterChange('clientId', value === 'all' ? '' : value)}
>
  <SelectItem value="all">Všichni klienti</SelectItem>
</Select>
```

**Doporučení:**
- Radix UI Select **nikdy** nepoužívá prázdný string jako value
- Pro "nevybráno" použít placeholder hodnotu jako 'all', 'none', 'default'
- V onValueChange převést zpět na prázdný string nebo undefined

---

### 6. TypeScript Type Error - undefined vs string

**Problém:**
```typescript
Type error: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.

onValueChange={(value) => handleFilterChange('clientId', value === 'all' ? undefined : value)}
                                                         ^
```

**Příčina:**
- Funkce `handleFilterChange` očekává `string`, ale předávali jsme `undefined`

**Řešení - Option 1 (použito):**
```typescript
// Předat prázdný string místo undefined
onValueChange={(value) => handleFilterChange('clientId', value === 'all' ? '' : value)}

// Funkce už má logiku pro převod na undefined
const handleFilterChange = (key: string, value: string) => {
  setFilters(prev => ({
    ...prev,
    [key]: value || undefined,  // '' se převede na undefined
  }))
}
```

**Řešení - Option 2 (alternativa):**
```typescript
// Změnit signaturu funkce
const handleFilterChange = (key: string, value: string | undefined) => {
  setFilters(prev => ({
    ...prev,
    [key]: value,
  }))
}
```

**Doporučení:**
- Pokud funkce už má logiku pro prázdný string, použít prázdný string
- Jinak upravit type signature aby akceptovala undefined
- Vždy kontrolovat TypeScript errors před pushem

---

### 7. Environment Variables

**Problém:**
- Build selhal s: `@supabase/ssr: Your project's URL and API key are required`

**Řešení:**
1. Vercel Dashboard → Project Settings → Environment Variables
2. Importovat `.env.local` soubor (nejjednodušší)
3. Nebo přidat ručně:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Důležité poznámky:**
- ⚠️ `NEXT_PUBLIC_*` proměnné jsou viditelné v browseru
- ANON_KEY je OK být public - Supabase RLS chrání data
- Pro skutečné secrets (service_role key) NIKDY nepoužít NEXT_PUBLIC_

**Doporučení:**
- Před prvním deploymentem nastavit env variables ve Vercel
- Použít import `.env.local` pro rychlejší setup
- Dokumentovat všechny potřebné env variables v README

---

### 8. Middleware Deprecation Warning

**Problém:**
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

**Status:**
- ⚠️ Warning, ne error - build pokračuje
- Next.js 16 preferuje nový "proxy" koncept

**TODO (budoucnost):**
- Migrovat z `middleware.ts` na nový proxy pattern
- Zatím funguje, ale při Next.js 17+ bude potřeba změnit

---

## 📋 Deployment Checklist

Před deploymentem na Vercel zkontrolovat:

### Pre-deployment
- [ ] Latest Next.js version (`npm install next@latest`)
- [ ] Zero security vulnerabilities (`npm audit`)
- [ ] TypeScript kompilace bez chyb (`npm run build`)
- [ ] Root page má redirect nebo content (ne null)
- [ ] Dynamic routes mají `export const dynamic = 'force-dynamic'`

### Environment
- [ ] Všechny env variables nastavené ve Vercel
- [ ] NEXT_PUBLIC_* proměnné správně pojmenované
- [ ] Secrets NEJSOU v NEXT_PUBLIC_* proměnných

### UI Components
- [ ] Select/Radix komponenty nemají empty string values
- [ ] Všechny onChange/onValueChange handlery mají správné typy
- [ ] Form komponenty mají správnou validaci

### Next.js Config
- [ ] `output: 'standalone'` pro Vercel deployment
- [ ] Turbopack config místo webpack (Next.js 16+)
- [ ] Security headers správně nastavené

### Post-deployment
- [ ] Zkontrolovat všechny routes (včetně dynamic)
- [ ] Otestovat formuláře a selecty
- [ ] Zkontrolovat console errors v browseru
- [ ] Zkontrolovat Vercel build logs

---

## 🎯 Best Practices

### 1. Next.js 16 Specifika
```typescript
// ✅ Správně
const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {},  // Pro Turbopack (default v Next.js 16)
}

// ❌ Špatně
const nextConfig: NextConfig = {
  webpack: (config) => { ... }  // Koliduje s Turbopack
}
```

### 2. Dynamic Routes s Databází
```typescript
// ✅ VŽDY přidat pro database-driven pages
'use client'

export const dynamic = 'force-dynamic'
export const dynamicParams = true
```

### 3. Radix UI Select Pattern
```typescript
// ✅ Správný pattern
<Select
  value={filter || 'all'}
  onValueChange={(val) => setFilter(val === 'all' ? '' : val)}
>
  <SelectItem value="all">Všechny</SelectItem>
  <SelectItem value="option1">Option 1</SelectItem>
</Select>

// ❌ NIKDY
<Select value={filter || ''}>
  <SelectItem value="">Všechny</SelectItem>  {/* CRASH! */}
</Select>
```

### 4. Root Page Pattern
```typescript
// ✅ Server-side redirect
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}

// ❌ Client-side redirect (bílá obrazovka)
'use client'
export default function RootPage() {
  useEffect(() => router.push('/dashboard'), [])
  return null  // ŠPATNĚ!
}
```

---

## 📊 Deployment Timeline

| Čas | Akce | Výsledek |
|-----|------|----------|
| 1. | Initial deploy s Next.js 15.5.9 | ❌ Build tracing error |
| 2. | Upgrade na Next.js 16.1.0 | ❌ Webpack/Turbopack conflict |
| 3. | Remove webpack, add turbopack | ✅ Build OK, ❌ Blank screen |
| 4. | Fix root page redirect | ✅ Content visible, ❌ Dynamic routes 404 |
| 5. | Add force-dynamic export | ✅ Routes OK, ❌ Select crashes |
| 6. | Fix Select empty strings | ❌ TypeScript error |
| 7. | Fix TypeScript undefined | ✅ DEPLOYED & WORKING |

**Celkový čas:** ~2 hodiny
**Počet commitů:** 7
**Naučené lekce:** 8

---

## 🔗 Užitečné Odkazy

- [Next.js 16 Release Notes](https://nextjs.org/blog/next-16)
- [Turbopack Documentation](https://turbo.build/pack)
- [Radix UI Select](https://www.radix-ui.com/primitives/docs/components/select)
- [Vercel Deployment](https://vercel.com/docs/deployments/overview)
- [Next.js Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)

---

**Poznámka:** Tento dokument aktualizovat při každém problematickém deploymentu.
