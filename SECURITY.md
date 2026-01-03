# Bezpečnostní upozornění

## ✅ KOMPLETNĚ VYŘEŠENO: API klíč byl rotován a zabezpečen

**Stav:** Bezpečnostní incident byl plně vyřešen. Všechny potřebné kroky byly dokončeny.

**Historie problému:**
Byl objaven Supabase API klíč (starý JWT formát) commitnutý do veřejného repozitáře v commitu 763af81. Klíč byl veřejně přístupný v Git historii.

**Kompletní řešení:**
- ✅ Celá složka `archive-html/` smazána (zastaralá verze aplikace)
- ✅ Nový Publishable klíč vygenerován (`sb_publishable_*` formát)
- ✅ Klíč aktualizován v Next.js aplikaci (`.env`, Vercel)
- ✅ Legacy JWT klíče vypnuty v Supabase (starý klíč už nefunguje)
- ✅ Projekt nyní používá pouze bezpečné Publishable API keys

**Bezpečnostní status:** 🔒 Zabezpečeno - starý odhalený klíč je neplatný a nemůže být zneužit

---

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
