# Bezpečnostní upozornění

## ✅ VYŘEŠENO: API klíč byl rotován

**Stav:** API klíč byl úspěšně rotován a aplikace používá nový Publishable klíč.

**Historie problému:**
Byl objeven Supabase API klíč (starý JWT formát) commitnutý do veřejného repozitáře v commitu 763af81. Soubor byl odebrán z verzování a klíč byl rotován na nový Publishable formát (`sb_publishable_*`).

**Vyřešeno:**
- ✅ Soubor `archive-html/config.js` odebrán z Git verzování
- ✅ Přidán do `.gitignore`
- ✅ Nový Publishable klíč vygenerován
- ✅ Lokální konfigurace aktualizována

**Doporučení:** Vypněte staré Legacy JWT klíče v Supabase Dashboard → Settings → API → "Disable JWT-based API keys"

### Projekt:
- URL: `https://tdgxfhoymdjszrsctcxh.supabase.co`
- Odhalený klíč: SUPABASE_ANON_KEY
- Commit: 763af8140779c25435888511635ce598d2211853

## 🔧 Kroky k nápravě

### 1. Rotace API klíče v Supabase (URGENTNÍ)

1. Přihlaste se do [Supabase Dashboard](https://app.supabase.com)
2. Vyberte projekt `tdgxfhoymdjszrsctcxh`
3. Přejděte na **Settings** → **API**
4. V sekci **Project API keys** klikněte na **Regenerate** u anon/public klíče
5. Zkopírujte nový klíč

### 2. Lokální konfigurace

Po vygenerování nového klíče:

1. Vytvořte lokální `archive-html/config.js` (soubor je nyní v .gitignore):
```javascript
// Supabase Configuration
// This file contains your actual credentials and should NOT be committed to git

const SUPABASE_URL = 'https://tdgxfhoymdjszrsctcxh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_...' // Nový formát klíče
```

**Poznámka:** Nové Publishable klíče mají formát `sb_publishable_*` (ne starý JWT formát).

2. Soubor **NIKDY** necommitujte - je automaticky ignorován přes .gitignore

### 3. Pro ostatní vývojáře

Pokud potřebují klíč:
- Použijte vzorový soubor `archive-html/config.example.js`
- Vyžádejte si klíč od správce projektu bezpečným kanálem
- Vytvořte si lokální `config.js` podle vzoru

## 🛡️ Doporučení pro budoucnost

### Co dělat:
- ✅ Používejte `.env` soubory pro citlivé údaje
- ✅ Vždy přidávejte `.env` a config soubory do `.gitignore`
- ✅ Používejte `.env.example` nebo `config.example.js` pro dokumentaci
- ✅ Kontrolujte před commitem obsah staged souborů
- ✅ Nastavte Row Level Security (RLS) v Supabase pro všechny tabulky

### Co nedělat:
- ❌ Necommitujte skutečné API klíče, hesla nebo tokeny
- ❌ Nespoléhejte na to, že "to je jen anon klíč"
- ❌ Neukládejte credentials přímo v kódu

## 📝 Kontrola před commitem

Před každým commitem zkontrolujte:
```bash
git diff --cached | grep -i "key\|token\|password\|secret"
```

## 🔍 Kontrola celého repozitáře

Pro kontrolu celého repozitáře na citlivé údaje:
```bash
# Kontrola současného stavu
grep -r -i "api[_-]\?key\|token\|password\|secret" --include="*.js" --include="*.ts" .

# Kontrola git historie
git log --all --full-history --source --pretty=format:'%H' -- '*env*' '*.pem' '*.key'
```

## 📞 Nahlášení bezpečnostních problémů

Pokud objevíte bezpečnostní problém, prosím:
1. **NEOTEVÍREJTE** veřejný GitHub issue
2. Kontaktujte správce projektu přímo
3. Popište problém a jeho dopad
