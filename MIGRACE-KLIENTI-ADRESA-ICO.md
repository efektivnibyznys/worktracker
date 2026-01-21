# DŮLEŽITÁ MIGRACE DATABÁZE - Přidání adresy a IČO ke klientům

## ⚠️ UPOZORNĚNÍ
**PŘED POUŽITÍM NOVÉ FUNKCIONALITY JE NUTNÉ PROVÉST MIGRACI DATABÁZE!**

## 🔒 Bezpečnostní záruka
**Tato migrace je 100% bezpečná a NEMAŽE ŽÁDNÁ DATA!**

Migrace pouze:
- ✅ **PŘIDÁVÁ** nové sloupce do existujících tabulek
- ✅ Zachovává všechna stávající data
- ✅ Nemodifikuje existující sloupce
- ✅ Používá `IF NOT EXISTS` - lze spustit opakovaně bez problémů

## 📋 Co migrace dělá?

Přidává nové sloupce pro ukládání adresy a IČO klientů:

### Do tabulky `clients`:
- `address` (TEXT) - adresa klienta
- `ico` (TEXT) - identifikační číslo organizace

### Do tabulky `invoices`:
- `client_name` (TEXT) - jméno klienta (snapshot)
- `client_address` (TEXT) - adresa klienta (snapshot)
- `client_ico` (TEXT) - IČO klienta (snapshot)

**Poznámka:** Sloupce v tabulce `invoices` slouží jako snapshot (uložená kopie) dat klienta v době vytvoření faktury. I když později změníte údaje klienta, faktura si zachová původní hodnoty.

## 🚀 Jak spustit migraci?

### Postup:

1. **Otevřete Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/tdgxfhoymdjszrsctcxh
   - Nebo přes https://supabase.com/dashboard

2. **Přejděte na SQL Editor**
   - V levém menu klikněte na "SQL Editor"

3. **Vytvořte nový query**
   - Klikněte na "New query"

4. **Zkopírujte a vložte SQL kód**
   - Zkopírujte celý obsah souboru `migration-add-client-address-ico.sql`
   - Nebo použijte SQL níže

5. **Spusťte migraci**
   - Klikněte na tlačítko "Run" nebo stiskněte `Ctrl/Cmd + Enter`

6. **Ověřte úspěch**
   - Měli byste vidět hlášku "Success. No rows returned"
   - To je správně - migrace pouze přidává sloupce

## 📝 SQL kód pro migraci

```sql
-- ============================================
-- MIGRACE: Přidání adresy a IČO ke klientům
-- ============================================

-- 1. Přidat sloupce do tabulky clients
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS ico TEXT;

-- 2. Přidat sloupce do tabulky invoices (snapshot)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS client_name TEXT;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS client_address TEXT;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS client_ico TEXT;
```

## ✅ Po migraci

Po úspěšném spuštění migrace:

1. **Nové funkce budou k dispozici:**
   - Při vytváření/editaci klienta můžete vyplnit adresu a IČO
   - Při vytváření faktury se údaje klienta automaticky zkopírují do faktury
   - Na detailu faktury se zobrazí sekce "Údaje o klientovi"

2. **Stávající data zůstávají nedotčena:**
   - Všichni stávající klienti budou mít nové pole prázdná (NULL)
   - Můžete je kdykoliv doplnit editací klienta
   - Stávající faktury budou mít údaje klienta prázdné (vytvořeny před migrací)

## 🔄 Lze spustit opakovaně?

**ANO!** Díky použití `IF NOT EXISTS` lze migraci bezpečně spustit i vícekrát. Pokud sloupce už existují, nic se nestane.

## ❓ Řešení problémů

### Chyba: "column already exists"
- **Řešení:** Ignorujte, sloupec už existuje. Migrace proběhla dříve.

### Chyba: "permission denied"
- **Řešení:** Ujistěte se, že jste přihlášeni jako vlastník projektu v Supabase.

### Chyba: "relation does not exist"
- **Řešení:** Zkontrolujte, že tabulky `clients` a `invoices` existují. Možná jste ještě nespustili hlavní setup databáze (`supabase-setup.sql`).

## 📞 Podpora

Pokud máte jakékoliv problémy s migrací, kontaktujte vývojáře.

---

**Datum vytvoření:** 2025-01-21
**Soubor s SQL:** `migration-add-client-address-ico.sql`
**Status:** ⏳ Čeká na spuštění
