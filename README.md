# ⏱️ Work Tracker - Supabase Edition

Moderní webová aplikace pro sledování odpracovaného času s cloudovou synchronizací a multi-device podporou.

## ✨ Funkce

- 📊 **Dashboard** s přehlednými statistikami a grafy
- 👥 **Správa klientů** s nastavitelnými hodinovými sazbami
- 🎯 **Fáze projektů** pro lepší organizaci práce
- ⏰ **Záznamy práce** s automatickým výpočtem doby a částky
- 📈 **Reporty** s možností exportu do Notionu
- ☁️ **Cloud synchronizace** přes Supabase
- 🔄 **Real-time sync** mezi zařízeními
- 🔐 **Autentizace** (email + heslo)
- 📱 **Offline režim** s localStorage cache
- 📤 **Import** dat ze starší verze

## 🚀 Rychlý start

### 1. Vytvoření Supabase projektu

1. Jdi na [https://supabase.com](https://supabase.com)
2. Vytvoř nový účet (pokud ho ještě nemáš)
3. Vytvoř nový projekt
   - Zvol název projektu
   - Nastav silné heslo pro databázi
   - Vyber region (nejlépe EU pro Evropu)

### 2. Setup databáze

1. V Supabase dashboardu jdi na **SQL Editor**
2. Otevři soubor `supabase-setup.sql` z tohoto repozitáře
3. Zkopíruj celý obsah souboru
4. Vlož ho do SQL Editoru v Supabase
5. Klikni na **Run** (spustit)

✅ To vytvoří:
- Všechny potřebné tabulky (clients, phases, entries, settings)
- Indexy pro rychlé dotazy
- Row Level Security (RLS) politiky
- Real-time publikaci
- Trigger pro automatické vytvoření nastavení

### 3. Získání API klíčů

1. V Supabase dashboardu jdi na **Project Settings** (⚙️ vpravo dole)
2. Vyber **API** v levém menu
3. Zkopíruj:
   - **Project URL** (např. `https://abc123.supabase.co`)
   - **anon public** klíč (dlouhý řetězec)

### 4. Konfigurace aplikace

1. Otevři soubor `index.html`
2. Najdi řádky s konfigurací Supabase (cca řádek 666-667):

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = 'your-anon-key-here'
```

3. Nahraď hodnoty svými skutečnými údaji z kroku 3

### 5. Spuštění aplikace

Aplikace je single-page HTML soubor, takže můžeš:

**Možnost A: Otevřít přímo v prohlížeči**
- Dvojklik na `index.html`
- Nebo pravý klik → Otevřít v prohlížeči

**Možnost B: Použít lokální server**
```bash
# Python 3
python -m http.server 8000

# Node.js (s npx)
npx serve

# VS Code
# Nainstaluј rozšíření "Live Server" a klikni na "Go Live"
```

Poté otevři [http://localhost:8000](http://localhost:8000)

### 6. První přihlášení

1. Klikni na **Registrovat se**
2. Zadej email a heslo (min. 6 znaků)
3. Supabase ti pošle potvrzovací email
4. Klikni na odkaz v emailu
5. Přihlaš se se svými údaji

## 📱 Použití

### Přidání klienta

1. Jdi na sekci **Klienti**
2. Klikni **+ Přidat klienta**
3. Vyplň:
   - Jméno klienta
   - Hodinovou sazbu (volitelné)
   - Poznámku (volitelné)

### Přidání fáze projektu

1. V detailu klienta klikni **+ Přidat fázi**
2. Vyplň název, popis, sazbu a stav

### Zaznamenání práce

**Rychlé přidání z Dashboardu:**
1. Vyber klienta
2. Vyber fázi (volitelné)
3. Nastav datum a čas
4. Napiš popis
5. Klikni **Přidat záznam**

**Nebo přes sekci Záznamy:**
- Přehled všech záznamů s filtrováním

### Generování reportu

1. Jdi na **Reporty**
2. Vyber klienta a období
3. Klikni **Vygenerovat report**
4. Pro export do Notionu klikni **📋 Export pro Notion**

### Import starých dat

Pokud jsi používal starší verzi aplikace s localStorage:

1. Jdi do **Nastavení**
2. Klikni **📤 Importovat lokální data**
3. Potvrď import

⚠️ **Upozornění:** Import vytvoří nové záznamy (nemažeš stará data)

## 🔄 Synchronizace

Aplikace automaticky synchronizuje data:

- ✅ **Při každé změně** - ukládá do Supabase
- 🔄 **Real-time** - poslouchá změny z jiných zařízení
- 📦 **Cache** - ukládá do localStorage pro offline režim

### Indikátory synchronizace:

- 🔄 **Synchronizuji...** - ukládá se
- ✅ **Synchronizováno** - úspěch
- ⚠️ **Chyba** - problém s připojením
- 📡 **Offline režim** - pracuje s cache

## 🔐 Bezpečnost

### Row Level Security (RLS)

Všechna data jsou chráněna pomocí RLS politik:
- Každý uživatel vidí **pouze svá data**
- Data jsou automaticky filtrována podle `user_id`
- Nemůžeš přistupovat k datům jiných uživatelů

### API klíče

- **anon key** je veřejný (může být v HTML)
- Je bezpečný díky RLS politikám
- Nikdy nesdílej **service_role** klíč

## 🛠️ Struktura databáze

```sql
clients
├── id (UUID)
├── user_id (UUID) → auth.users
├── name
├── hourly_rate
└── note

phases
├── id (UUID)
├── user_id (UUID) → auth.users
├── client_id (UUID) → clients
├── name
├── description
├── hourly_rate
└── status (active|completed|paused)

entries
├── id (UUID)
├── user_id (UUID) → auth.users
├── client_id (UUID) → clients
├── phase_id (UUID) → phases
├── date
├── start_time
├── end_time
├── duration_minutes
├── description
└── hourly_rate

settings
├── user_id (UUID) → auth.users
├── default_hourly_rate
└── currency
```

## 🐛 Řešení problémů

### Aplikace se nezobrazuje

1. Zkontroluj konzoli prohlížeče (F12)
2. Ověř, že jsou správně nastavené API klíče
3. Zkontroluj, že SQL setup byl spuštěn úspěšně

### Nemohu se přihlásit

1. Zkontroluj, že jsi potvrdil email
2. Zkus resetovat heslo
3. V Supabase dashboardu jdi na **Authentication** → **Users** a zkontroluj svůj účet

### Data se nesynchronizují

1. Zkontroluj připojení k internetu
2. Otevři konzoli (F12) a hledej chyby
3. Ověř, že RLS politiky jsou správně nastavené:
   ```sql
   -- V SQL Editoru
   SELECT * FROM clients; -- Měl by vrátit pouze tvá data
   ```

### Real-time nefunguje

1. V Supabase dashboardu jdi na **Database** → **Replication**
2. Zkontroluj, že jsou tabulky povolené pro real-time
3. Ověř, že publikace obsahuje všechny tabulky:
   ```sql
   SELECT * FROM pg_publication_tables
   WHERE pubname = 'supabase_realtime';
   ```

## 📊 Limity Supabase (Free tier)

- **Database**: 500 MB
- **Storage**: 1 GB
- **Bandwidth**: 5 GB/měsíc
- **Realtime connections**: 200 concurrent

Pro běžné použití (1 uživatel, několik klientů) je free tier dostatečný.

## 🔄 Aktualizace

Pro aktualizaci aplikace:

1. Stáhni novou verzi `index.html`
2. Zkopíruj své API klíče ze staré verze
3. Vlož je do nové verze
4. Nahraď starý soubor novým

Data v Supabase zůstanou zachovaná.

## 📝 License

MIT License - můžeš volně používat a upravovat.

## 🙋 Podpora

Máš problém nebo nápad na vylepšení?
- Otevři issue na GitHubu
- Nebo kontaktuj vývojáře

---

**Vytvořeno s ❤️ pomocí Supabase**
