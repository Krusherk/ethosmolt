-- MoltEthos Supabase Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/asxjsyjlneqopcqoiysh/sql

CREATE TABLE registrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'error')),
  agent_name text,
  agent_type text,
  webpage_url text,
  agent_id integer,
  tx_hash text,
  error text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for registration form)
CREATE POLICY "Anyone can insert registrations" ON registrations
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anyone to read their own registration by ID
CREATE POLICY "Anyone can read registrations" ON registrations
  FOR SELECT TO anon USING (true);

-- Allow service role to update (for the worker)
CREATE POLICY "Service role can update registrations" ON registrations
  FOR UPDATE TO service_role USING (true);

-- Enable Realtime for the registrations table
ALTER PUBLICATION supabase_realtime ADD TABLE registrations;
