# Testing Strategy - Work Tracker Migration

**Datum vytvoření:** 18. prosince 2025
**Účel:** Strategie testování během a po migraci na Next.js

---

## 📊 Existující testovací data

### Produkční data v Supabase

**Status:** ✅ Dostupná

Aplikace již obsahuje **reálná produkční data**:
- **Klient:** Anna Marešová (Shopify e-shop project)
- **Fáze:** 2 fáze projektu (Část 1 - completed, Část 2 - active)
- **Entries:** Několik desítek time entries
- **Data soubor:** `data.json` (325 řádků, ~11KB)

**Lokace dat:**
- Supabase databáze (live)
- Lokální backup: `data.json`, `Sledování práce data.json`

### Backup strategie

✅ **Již implementováno:**
- Git tag: `v1.0-pre-migration` (lokální)
- Branch: `feature/next-migration`
- Data backup soubory v repozitáři

⚠️ **Doporučení:**
Před spuštěním migrace dat vytvořit **Supabase databázový backup**:

```sql
-- V Supabase SQL Editor
-- Export všech dat pro backup

-- Clients
SELECT * FROM clients WHERE user_id = auth.uid();

-- Phases
SELECT * FROM phases WHERE user_id = auth.uid();

-- Entries
SELECT * FROM entries WHERE user_id = auth.uid();

-- Settings
SELECT * FROM settings WHERE user_id = auth.uid();
```

Nebo použít Supabase Dashboard → Database → Backups (automatické denní backupy na paid plánech).

---

## 🧪 Testing Environment Setup

### Možnost A: Testovat na produkčních datech (Doporučeno pro začátek)

**Výhody:**
- ✅ Reálná data - real-world testing
- ✅ Rychlý start - není třeba vytvářet test data
- ✅ Validace na skutečných use cases

**Nevýhody:**
- ⚠️ Risk of data corruption (ale máme backup)
- ⚠️ Nelze testovat edge cases

**Bezpečnostní opatření:**
1. ✅ Git backup (hotovo)
2. ✅ Lokální data backup (hotovo)
3. 🔜 Supabase backup (doporučeno před migrací)
4. 🔜 Test na development URL (ne production domain)

### Možnost B: Vytvořit separátní testovací účet

**Postup:**
1. Vytvořit nový email (např. `test@example.com`)
2. Registrovat nový účet v aplikaci
3. Vytvořit testovací dataset:
   - 3-5 testovacích klientů
   - 5-10 fází
   - 20-30 time entries (různé měsíce pro chart testing)
4. Export dat do `test-data.json`

**Výhody:**
- ✅ Bezpečné - produkční data nedotčena
- ✅ Možnost testovat edge cases
- ✅ Repeatable testing

**Nevýhody:**
- ⏱️ Čas na setup
- 📊 Méně realistic data

**Doporučení:** Vytvořit později, až bude základní migrace hotová.

---

## ✅ Testing Checklist

### Fáze 1: Příprava (Fáze 0-2)

- [x] Backup produkčních dat (Git + lokální soubory)
- [ ] Supabase database backup
- [ ] Porovnat data.json s Supabase (verify consistency)
- [ ] Dokumentovat edge cases k testování

### Fáze 2: Core Infrastructure Testing (Fáze 2)

**Authentication:**
- [ ] Registrace nového uživatele
- [ ] Přihlášení existujícího uživatele
- [ ] Odhlášení
- [ ] Session persistence (refresh page)
- [ ] Protected routes (redirect when not logged in)
- [ ] Email verification flow

**Layout:**
- [ ] Header zobrazení (user email, logout)
- [ ] Navigation funguje (všechny sekce)
- [ ] Responzivita (desktop + mobile)
- [ ] Sync indicator

**Supabase Connection:**
- [ ] Client inicializace
- [ ] Auth state management
- [ ] RLS policies fungují (vidím jen svá data)

### Fáze 3: Time Tracking Testing (Fáze 3)

**Clients:**
- [ ] Seznam klientů se načte
- [ ] Přidat nového klienta
- [ ] Upravit existujícího klienta
- [ ] Smazat klienta (s confirm)
- [ ] Detail klienta se zobrazí
- [ ] Statistiky klienta jsou správné

**Phases:**
- [ ] Seznam fází se načte
- [ ] Přidat novou fázi ke klientovi
- [ ] Upravit fázi
- [ ] Smazat fázi
- [ ] Změnit status fáze
- [ ] Filtry fází podle klienta

**Entries:**
- [ ] Seznam záznamů se načte
- [ ] Quick add form funguje
- [ ] Duration se vypočítá správně
- [ ] Hourly rate se určí správně (priority logic)
- [ ] Upravit záznam
- [ ] Smazat záznam
- [ ] Filtry fungují (klient, fáze, datum)

**Dashboard:**
- [ ] Statistiky "Dnes" jsou správně
- [ ] Statistiky "Týden" jsou správně
- [ ] Statistiky "Měsíc" jsou správně
- [ ] Filtry ovlivňují statistiky
- [ ] Charts se zobrazují
  - [ ] Clients chart
  - [ ] Phases chart
  - [ ] Timeline chart
- [ ] Poslední záznamy
- [ ] Filtered entries list

**Reports:**
- [ ] Generování reportu funguje
- [ ] Filtry fungují (klient, datum)
- [ ] Souhrn je správný
- [ ] Detaily se zobrazují
- [ ] Notion export funguje (copy to clipboard)

**Settings:**
- [ ] Default hourly rate se načte
- [ ] Změna default rate funguje
- [ ] Změna currency funguje
- [ ] Import lokálních dat (pokud existují)

**Real-time:**
- [ ] Změny v druhém zařízení se projeví
- [ ] Sync indicator zobrazuje stav
- [ ] Offline cache funguje

### Fáze 4: Polish & Bug Fixing

**Performance:**
- [ ] Page load < 2s
- [ ] Time to Interactive < 3s
- [ ] Charts render rychle
- [ ] No memory leaks

**UX:**
- [ ] Loading states všude
- [ ] Error handling graceful
- [ ] Success messages
- [ ] Form validations
- [ ] Confirm dialogs před delete

**Accessibility:**
- [ ] Keyboard navigation
- [ ] Tab order správný
- [ ] ARIA labels
- [ ] Screen reader friendly

**Mobile:**
- [ ] Layout responsive
- [ ] Touch targets dostatečně velké
- [ ] Forms použitelné na mobilu
- [ ] Charts čitelné

### Fáze 5: Pre-deployment

**Build:**
- [ ] `npm run build` úspěšný
- [ ] Zero TypeScript errors
- [ ] Zero ESLint warnings
- [ ] Bundle size přijatelný

**Environment:**
- [ ] .env.local správně nakonfigurované
- [ ] Supabase credentials fungují
- [ ] Production build lokálně funguje

**Deployment:**
- [ ] Vercel project setup
- [ ] Environment variables na Vercelu
- [ ] Preview deployment funguje
- [ ] Production deployment

---

## 🐛 Bug Tracking

### Template pro bug report

```markdown
**Bug ID:** BUG-001
**Severity:** Critical / High / Medium / Low
**Component:** (Auth / Clients / Entries / Dashboard / ...)
**Description:** Krátký popis problému
**Steps to reproduce:**
1. Krok 1
2. Krok 2
3. Výsledek

**Expected:** Co by mělo být
**Actual:** Co se stalo
**Screenshot:** (pokud relevantní)
**Console errors:** (pokud jsou)
**Status:** Open / In Progress / Fixed / Closed
```

### Bug log lokace

Bugy zaznamenat do: `MIGRATION_LOG.md` (bude vytvořen)

---

## 📊 Test Data Requirements

### Minimální testovací dataset

Pro kompletní testování je třeba:

**Clients:** Alespoň 3
- S hourly rate
- Bez hourly rate
- S poznámkou i bez

**Phases:** Alespoň 5
- Active status
- Completed status
- Paused status
- S rate i bez rate
- Na různých klientech

**Entries:** Alespoň 20
- Různá data (min. 2 měsíce)
- Různé časy (různé duration)
- S fází i bez fáze
- Různí klienti
- Pro testování chart generování

### Edge Cases k testování

1. **Prázdný stav:** Žádná data
2. **Velké množství dat:** 100+ entries
3. **Dlouhé texty:** Velmi dlouhý popis entry
4. **Speciální znaky:** V názvech, poznámkách
5. **Datum edge cases:**
   - Přechod měsíce
   - Přechod roku
   - Víkend vs všední den
6. **Time edge cases:**
   - Práce přes půlnoc (23:00 - 01:00)
   - Velmi krátká doba (5 minut)
   - Velmi dlouhá doba (12 hodin)
7. **Rate calculations:**
   - Žádná rate definována nikde
   - Rate override na všech úrovních
   - Nulová rate

---

## 🎯 Success Criteria

Migrace bude považována za úspěšnou, když:

### Funkční kritéria
- ✅ Všechny features z `CURRENT_FEATURES.md` fungují
- ✅ 100% feature parity s původní verzí
- ✅ Žádné data corruption
- ✅ Real-time sync funguje
- ✅ Offline cache funguje

### Performance kritéria
- ✅ Page load < 2s (LCP - Largest Contentful Paint)
- ✅ Time to Interactive < 3s
- ✅ Charts render < 500ms
- ✅ Form submission < 1s

### Quality kritéria
- ✅ Zero critical bugs
- ✅ Zero TypeScript errors
- ✅ Zero ESLint warnings
- ✅ 95%+ feature test coverage (manual)

### UX kritéria
- ✅ Lepší než původní (nebo stejná) UX
- ✅ Responzivní na všech zařízeních
- ✅ Loading states všude
- ✅ Error handling graceful

---

## 📝 Test Execution Log

Log testování bude zaznamenán v `MIGRATION_LOG.md` po dokončení každé fáze.

**Format zápisu:**

```markdown
### Fáze X Testing - [Datum]

**Tester:** [Jméno]
**Duration:** [Čas]

**Tests passed:** X/Y
**Bugs found:** Z

**Details:**
- ✅ Feature A: OK
- ✅ Feature B: OK
- ❌ Feature C: BUG-001 (popis)

**Notes:** [Poznámky]
```

---

## 🔄 Continuous Testing

Po dokončení migrace:

### Regression testing
- Před každým větším update
- Před přidáním nového modulu
- Před deploy na production

### User Acceptance Testing (UAT)
- Test reálným uživatelem (ty!)
- Real-world workflow
- Edge cases z praxe

---

## 📞 Testovací prostředí

### Development
- **URL:** http://localhost:3000
- **Data:** Produkční nebo testovací
- **Purpose:** Aktivní vývoj

### Preview (Vercel)
- **URL:** `https://work-tracker-xxxx.vercel.app`
- **Data:** Produkční (read-only doporučeno)
- **Purpose:** Preview před merge

### Production
- **URL:** [Production domain]
- **Data:** Produkční
- **Purpose:** Live aplikace

---

**Status:** ✅ Připraveno
**Next:** Begin Phase 1 - Next.js Setup

---

**Konec dokumentu**
