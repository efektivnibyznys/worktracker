-- ============================================
-- MIGRATION: Add projects feature
-- ============================================
-- Projekty umožňují rozdělit záznamy u klienta na jednotlivé projekty
-- Podobné jako fáze, ale pro vysokoúrovňové rozdělení práce

-- ============================================
-- TABULKA PROJECTS
-- ============================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  hourly_rate NUMERIC(10,2),
  status TEXT CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PŘIDAT project_id DO ENTRIES
-- ============================================

ALTER TABLE entries ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- ============================================
-- PŘIDAT project_id DO INVOICE_ITEMS
-- ============================================

ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- ============================================
-- CONSTRAINTS
-- ============================================

-- Zajistit nezápornou hodinovou sazbu v projects
ALTER TABLE projects DROP CONSTRAINT IF EXISTS check_positive_project_rate;
ALTER TABLE projects ADD CONSTRAINT check_positive_project_rate
  CHECK (hourly_rate IS NULL OR hourly_rate >= 0);

-- ============================================
-- INDEXY
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_entries_project_id ON entries(project_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS politiky pro projects
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);
