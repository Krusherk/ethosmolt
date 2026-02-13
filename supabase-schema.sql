-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Add agent_id column to registrations table
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS agent_id TEXT;

-- 2. Create feedbacks table
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL,
  reviewer_name TEXT NOT NULL DEFAULT 'Anonymous',
  value INTEGER NOT NULL DEFAULT 0,
  comment TEXT DEFAULT '',
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS on feedbacks
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- 4. Allow anonymous users to insert and read feedbacks
CREATE POLICY "Allow anonymous insert" ON feedbacks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous select" ON feedbacks FOR SELECT TO anon USING (true);

-- 5. Allow anonymous users to delete+insert registrations (worker uses this pattern)
-- If these policies already exist, these will error — that's fine
CREATE POLICY "Allow anonymous delete registrations" ON registrations FOR DELETE TO anon USING (true);
