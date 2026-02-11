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

// Poll Supabase for pending registrations every 30s
const processPending = async () => {
  const { data: pending, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('status', 'pending')

  if (error) { console.error('Supabase fetch error:', error); return }
  if (!pending || pending.length === 0) return

  for (const reg of pending) {
    console.log(`Processing: ${reg.id}`)
    try {
      // Get agent name from Moltbook
      const res = await fetch('https://www.moltbook.com/api/v1/agents/me', {
        headers: { 'Authorization': `Bearer ${reg.api_key}` }
      })
      const moltData = await res.json()
      if (!moltData.success) throw new Error('Invalid API key')

      const name = moltData.agent.name

      // Build agent metadata URI (could be IPFS in production)
      const agentURI = JSON.stringify({
        name,
        agentType: reg.agent_type || 'other',
        webpageUrl: reg.webpage_url || '',
        registeredAt: new Date().toISOString()
      })

      // Register on ERC-8004 Identity Registry
      const tx = await contract.register(agentURI)
      await tx.wait()

      await supabase
        .from('registrations')
        .update({
          status: 'registered',
          agent_name: name,
          tx_hash: tx.hash
        })
        .eq('id', reg.id)

      console.log(`✓ Registered ${name} (tx: ${tx.hash})`)
    } catch (e) {
      await supabase
        .from('registrations')
        .update({
          status: 'error',
          error: e.message
        })
        .eq('id', reg.id)

      console.log(`✗ Error: ${e.message}`)
    }
  }
}

// Also listen for real-time changes
supabase
  .channel('registrations')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'registrations',
    filter: 'status=eq.pending'
  }, () => {
    console.log('📨 New registration detected')
    processPending()
  })
  .subscribe()

// Poll every 30 seconds as backup
setInterval(processPending, 30000)
processPending() // Initial check

// Keep alive
setInterval(() => console.log('💓'), 60000)
