-- ============================================
-- WORK TRACKER - SUPABASE DATABASE SETUP
-- ============================================
-- Tento soubor obsahuje kompletní setup databáze pro Work Tracker aplikaci
-- Spusťte všechny příkazy v Supabase SQL Editor

-- ============================================
-- TABULKY
-- ============================================

-- Tabulka clients - správa klientů
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  hourly_rate NUMERIC(10,2),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabulka phases - fáze projektů pro klienty
CREATE TABLE IF NOT EXISTS phases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  hourly_rate NUMERIC(10,2),
  status TEXT CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabulka entries - záznamy odpracovaného času
CREATE TABLE IF NOT EXISTS entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT NOT NULL,
  hourly_rate NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabulka settings - uživatelská nastavení
CREATE TABLE IF NOT EXISTS settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  default_hourly_rate NUMERIC(10,2) DEFAULT 850,
  currency TEXT DEFAULT 'Kč',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXY PRO RYCHLÉ DOTAZY
-- ============================================

-- Indexy pro clients
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);

-- Indexy pro phases
CREATE INDEX IF NOT EXISTS idx_phases_user_id ON phases(user_id);
CREATE INDEX IF NOT EXISTS idx_phases_client_id ON phases(client_id);
CREATE INDEX IF NOT EXISTS idx_phases_status ON phases(status);

-- Indexy pro entries
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_client_id ON entries(client_id);
CREATE INDEX IF NOT EXISTS idx_entries_phase_id ON entries(phase_id);
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, date DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Zapnutí RLS pro všechny tabulky
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLITIKY - Clients
-- ============================================

-- Uživatelé vidí pouze své klienty
CREATE POLICY "Users can view own clients"
  ON clients FOR SELECT
  USING (auth.uid() = user_id);

-- Uživatelé mohou vytvářet vlastní klienty
CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Uživatelé mohou upravovat vlastní klienty
CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Uživatelé mohou mazat vlastní klienty
CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLITIKY - Phases
-- ============================================

-- Uživatelé vidí pouze své fáze
CREATE POLICY "Users can view own phases"
  ON phases FOR SELECT
  USING (auth.uid() = user_id);

-- Uživatelé mohou vytvářet vlastní fáze
CREATE POLICY "Users can insert own phases"
  ON phases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Uživatelé mohou upravovat vlastní fáze
CREATE POLICY "Users can update own phases"
  ON phases FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Uživatelé mohou mazat vlastní fáze
CREATE POLICY "Users can delete own phases"
  ON phases FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLITIKY - Entries
-- ============================================

-- Uživatelé vidí pouze své záznamy
CREATE POLICY "Users can view own entries"
  ON entries FOR SELECT
  USING (auth.uid() = user_id);

-- Uživatelé mohou vytvářet vlastní záznamy
CREATE POLICY "Users can insert own entries"
  ON entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Uživatelé mohou upravovat vlastní záznamy
CREATE POLICY "Users can update own entries"
  ON entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Uživatelé mohou mazat vlastní záznamy
CREATE POLICY "Users can delete own entries"
  ON entries FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLITIKY - Settings
-- ============================================

-- Uživatelé vidí pouze vlastní nastavení
CREATE POLICY "Users can view own settings"
  ON settings FOR SELECT
  USING (auth.uid() = user_id);

-- Uživatelé mohou vytvářet vlastní nastavení
CREATE POLICY "Users can insert own settings"
  ON settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Uživatelé mohou upravovat vlastní nastavení
CREATE POLICY "Users can update own settings"
  ON settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Uživatelé mohou mazat vlastní nastavení
CREATE POLICY "Users can delete own settings"
  ON settings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FUNKCE PRO AUTOMATICKÉ VYTVOŘENÍ NASTAVENÍ
-- ============================================

-- Funkce, která automaticky vytvoří nastavení pro nového uživatele
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.settings (user_id, default_hourly_rate, currency)
  VALUES (NEW.id, 850, 'Kč')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger, který spustí funkci při vytvoření nového uživatele
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- REALTIME PUBLICATION (pro real-time sync)
-- ============================================

-- Povolení real-time aktualizací pro všechny tabulky
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE phases;
ALTER PUBLICATION supabase_realtime ADD TABLE entries;
ALTER PUBLICATION supabase_realtime ADD TABLE settings;

-- ============================================
-- HOTOVO!
-- ============================================
-- Setup databáze je kompletní.
-- Nyní můžete získat své Supabase URL a ANON KEY z Project Settings > API
-- a použít je v aplikaci.
