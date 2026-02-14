-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Add agent_id column to registrations table
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS agent_id TEXT;

-- 2. Create feedbacks table (for Supabase text feedback from agents)
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL,
  reviewer_name TEXT NOT NULL DEFAULT 'Anonymous',
  value INTEGER NOT NULL DEFAULT 0,
  comment TEXT DEFAULT '',
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create scan_cache table (worker syncs 8004scan data here)
CREATE TABLE IF NOT EXISTS scan_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id TEXT NOT NULL UNIQUE,
  chain_id INTEGER,
  name TEXT DEFAULT '',
  description TEXT DEFAULT '',
  total_feedbacks INTEGER DEFAULT 0,
  total_score REAL DEFAULT 0,
  average_score REAL DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  star_count INTEGER DEFAULT 0,
  image_url TEXT,
  owner_address TEXT DEFAULT '',
  agent_wallet TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_cache ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for feedbacks
CREATE POLICY "Allow anonymous insert feedbacks" ON feedbacks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous select feedbacks" ON feedbacks FOR SELECT TO anon USING (true);

-- 6. RLS policies for scan_cache (worker writes, frontend reads)
CREATE POLICY "Allow anonymous insert scan_cache" ON scan_cache FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous select scan_cache" ON scan_cache FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous delete scan_cache" ON scan_cache FOR DELETE TO anon USING (true);

-- 7. Allow anonymous delete on registrations (worker uses delete+insert pattern)
-- This may already exist — if it errors, that's fine
CREATE POLICY "Allow anonymous delete registrations" ON registrations FOR DELETE TO anon USING (true);
