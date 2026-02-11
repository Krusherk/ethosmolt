import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://asxjsyjlneqopcqoiysh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const RPC = "https://rpc.monad.xyz"
const PK = process.env.PRIVATE_KEY

// ERC-8004 Identity Registry
const IDENTITY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
const ABI = ["function register(string agentURI) returns (uint256)"]

const provider = new ethers.JsonRpcProvider(RPC)
const wallet = new ethers.Wallet(PK, provider)
const contract = new ethers.Contract(IDENTITY, ABI, wallet)

console.log("🦞 MoltEthos Worker started (Supabase + ERC-8004)")

// Track processed IDs to avoid duplicates
const processed = new Set()

// Update registration using delete + insert (anon can't UPDATE due to RLS)
const updateRegistration = async (id, originalData, updates) => {
  // Delete the old row
  await supabase.from('registrations').delete().eq('id', id)
  // Insert updated row with same ID
  const { error } = await supabase.from('registrations').insert({
    id,
    api_key: originalData.api_key,
    agent_type: originalData.agent_type,
    webpage_url: originalData.webpage_url,
    created_at: originalData.created_at,
    ...updates
  })
  if (error) console.error('Update error:', error)
}

// Poll Supabase for pending registrations
const processPending = async () => {
  const { data: pending, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('status', 'pending')

  if (error) { console.error('Supabase fetch error:', error); return }
  if (!pending || pending.length === 0) return

  for (const reg of pending) {
    // Skip if already processed
    if (processed.has(reg.id)) continue
    processed.add(reg.id)

    console.log(`Processing: ${reg.id}`)
    try {
      // Get agent name from Moltbook
      const res = await fetch('https://www.moltbook.com/api/v1/agents/me', {
        headers: { 'Authorization': `Bearer ${reg.api_key}` }
      })
      const moltData = await res.json()
      if (!moltData.success) throw new Error('Invalid API key')

      const name = moltData.agent.name

      // Build agent metadata
      const agentURI = JSON.stringify({
        name,
        agentType: reg.agent_type || 'other',
        webpageUrl: reg.webpage_url || '',
        registeredAt: new Date().toISOString()
      })

      // Register on ERC-8004 Identity Registry
      const tx = await contract.register(agentURI)
      await tx.wait()

      await updateRegistration(reg.id, reg, {
        status: 'registered',
        agent_name: name,
        tx_hash: tx.hash
      })

      console.log(`✓ Registered ${name} (tx: ${tx.hash})`)
    } catch (e) {
      await updateRegistration(reg.id, reg, {
        status: 'error',
        error: e.message
      })

      console.log(`✗ Error: ${e.message}`)
    }
  }
}

// Poll every 30 seconds
setInterval(processPending, 30000)
processPending() // Initial check

// Keep alive
setInterval(() => console.log('💓'), 60000)
