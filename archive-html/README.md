# 🗄️ Archiv - Původní HTML Verze

**Status:** ⚠️ **ARCHIVOVÁNO - NEPOUŽÍVAT**

Tento adresář obsahuje původní HTML verzi aplikace Work Tracker, která byla nahrazena moderní Next.js verzí.

---

## ⚠️ DŮLEŽITÉ UPOZORNĚNÍ

**TATO VERZE SE UŽ NEPOUŽÍVÁ A NEBUDE DÁLE VYVÍJENA**

- ❌ **Nepoužívejte tuto verzi** pro nové projekty
- ❌ **Nebude dostávat security updates**
- ❌ **Obsahuje známé bezpečnostní zranitelnosti** (viz níže)
- ✅ **Použijte místo toho `/next-app/`** - moderní Next.js verzi

---

## 📁 Obsah archivu

### Aplikační soubory
- **`index.html`** (124 KB)
  - Původní single-page HTML aplikace
  - 2740 řádků vanilla JavaScript
  - Poslední aktualizace: 19. prosince 2025
  - ⚠️ Obsahuje opravené XSS zranitelnosti (pro referenci)

- **`index.html.backup`**
  - Záloha před security opravami
  - Obsahuje původní nezabezpečený kód

### Konfigurační soubory
- **`config.js`**
  - Supabase credentials (lokální, není v gitu)
  - ⚠️ NECOMMITUJTE tento soubor

- **`config.example.js`**
  - Template pro konfiguraci
  - Použito pro setup nové instance

### Data soubory
- **`data.json`** (11 KB)
  - Exportovaná data z localStorage

- **`Sledování práce data.json`** (11 KB)
  - Starší export dat

---

## 🔍 Proč byla archivována?

### Bezpečnostní problémy (opravené v této verzi, ale stále přítomné v historii)

1. **XSS zranitelnosti** ✅ Opraveno v poslední verzi
   - 8+ míst používalo `innerHTML` bez sanitizace
   - Implementována `escapeHtml()` funkce

2. **Hardcoded credentials** ✅ Opraveno
   - Credentials externalizovány do `config.js`

3. **Inline event handlers** ⚠️ Stále přítomno
   - `onclick="app.method()"` porušuje CSP
   - 10+ míst v kódu

4. **Debug kód v produkci** ⚠️ Stále přítomno
   - 45 `console.log` statements

### Technické nedostatky

- **God Class antipattern** - 2740 řádků v jednom souboru
- **Žádný code splitting** - vše načteno najednou
- **Žádné error boundaries** - crash = bílá obrazovka
- **Obtížná údržba** - vše v jednom místě
- **Žádné testy** - nemožnost regression testing
- **Žádný TypeScript** - runtime chyby

---

## ✅ Migrace na Next.js verzi

### Co bylo migrováno

✅ **100% feature parity**
- Všechny funkce z HTML verze byly přeneseny
- Stejná databáze (Supabase)
- Stejné RLS polícy
- Real-time synchronizace
- Offline cache

### Výhody Next.js verze

1. **Bezpečnost** 🔒
   - Automatické XSS escapování
   - Správné CSP headers
   - Error boundaries
   - TypeScript type safety

2. **Výkon** ⚡
   - Code splitting
   - React Query caching
   - Optimized re-renders
   - Lazy loading

3. **Developer Experience** 👨‍💻
   - TypeScript
   - Feature-based struktura
   - Hot reload
   - ESLint + Prettier

4. **Údržba** 🛠️
   - Modulární kód
   - Separation of concerns
   - Testovatelné
   - Snadné rozšíření

---

## 📊 Statistiky

### HTML verze
- **Řádků kódu:** 2740
- **Soubory:** 1 (+ config)
- **Framework:** Žádný
- **Bezpečnost:** 6.5/10 (po opravách)
- **Výkon:** 5/10
- **Údržba:** 3/10

### Next.js verze (`/next-app/`)
- **Řádků kódu:** ~3000 (rozděleno do 50+ souborů)
- **Soubory:** 50+
- **Framework:** Next.js 15 + React 19
- **Bezpečnost:** 8/10
- **Výkon:** 7/10
- **Údržba:** 9/10

---

## 🔗 Související dokumentace

Pro více informací viz:
- **[/DEVELOPMENT_STRATEGY.md](../DEVELOPMENT_STRATEGY.md)** - Celková strategie vývoje
- **[/SECURITY_AUDIT_LOG.md](../SECURITY_AUDIT_LOG.md)** - Detailní security audit
- **[/MIGRATION_LOG.md](../MIGRATION_LOG.md)** - Historie migrace
- **[/next-app/README.md](../next-app/README.md)** - Dokumentace Next.js verze

---

## 📅 Timeline

| Datum | Událost |
|-------|---------|
| 2024-2025 | Vývoj HTML verze |
| 12.12.2025 | Poslední data export |
| 18.12.2025 | Začátek migrace na Next.js |
| 19.12.2025 | Security audit HTML verze |
| 19.12.2025 | Oprava XSS a credentials |
| 19.12.2025 | **Archivace HTML verze** |
| 20.12.2025 | Dokončení Next.js migrace (plánováno) |

---

## ⚙️ Jak spustit (pouze pro referenci)

⚠️ **Nedoporučujeme používat tuto verzi!**

Pokud ji ale potřebujete spustit (např. pro migraci dat):

1. Zkopírujte `config.example.js` → `config.js`
2. Vyplňte Supabase credentials
3. Otevřete `index.html` v prohlížeči
4. **NEPOUŽÍVEJTE pro produkci!**

---

## 🎯 Doporučení

### Pro nové uživatele
➡️ **Použijte `/next-app/` verzi**

### Pro existující uživatele HTML verze
1. ✅ Exportujte data (Settings → Export)
2. ✅ Přejděte na Next.js verzi (`/next-app/`)
3. ✅ Importujte data (pokud potřeba)
4. ❌ Nepoužívejte tuto HTML verzi dále

---

**Datum archivace:** 19. prosince 2025
**Důvod:** Nahrazeno modernější a bezpečnější Next.js verzí
**Status:** Read-only archiv pro referenci
