import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://asxjsyjlneqopcqoiysh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const RPC = process.env.RPC_URL || "https://rpc.monad.xyz"
const PK = process.env.PRIVATE_KEY

// 8004scan API
const SCAN_API = 'https://www.8004scan.io/api/v1'
const SCAN_KEY = '8004_goX1jSjDTgxVDdXwGSxm5L_5RV8yKlI7_77f8f10a'

if (!PK) {
  console.error("❌ PRIVATE_KEY not set! Worker cannot register agents on-chain.")
  console.error("Set PRIVATE_KEY env var with a funded Monad wallet.")
  process.exit(1)
}

if (!SUPABASE_KEY) {
  console.error("❌ SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY not set!")
  process.exit(1)
}

// ERC-8004 Identity Registry
const IDENTITY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
const ABI = [
  "function register(string agentURI) returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "event AgentRegistered(uint256 indexed agentId, address indexed owner, string agentURI)"
]

const provider = new ethers.JsonRpcProvider(RPC)
const wallet = new ethers.Wallet(PK, provider)
const contract = new ethers.Contract(IDENTITY, ABI, wallet)

console.log("🦞 MoltEthos Worker started (Supabase + ERC-8004 + 8004scan)")
console.log(`   Wallet: ${wallet.address}`)
console.log(`   RPC: ${RPC}`)
console.log(`   Contract: ${IDENTITY}`)

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
    agent_id: originalData.agent_id,
    ...updates
  })
  if (error) console.error('Update error:', error)
}

// ===== 8004scan Data Sync =====
// Fetches on-chain data from 8004scan and stores in Supabase scan_cache table
const sync8004Data = async () => {
  try {
    console.log('📡 Syncing 8004scan data...')
    const res = await fetch(`${SCAN_API}/agents?chainId=monad&limit=200`, {
      headers: {
        'X-Access-Token': SCAN_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (!res.ok) {
      console.warn(`8004scan API returned ${res.status}`)
      return
    }

    const data = await res.json()
    const agents = data.items || []
    console.log(`   Found ${agents.length} agents on 8004scan`)

    // Upsert scan data into scan_cache table
    for (const agent of agents) {
      const row = {
        token_id: agent.token_id,
        chain_id: agent.chain_id,
        name: agent.name || '',
        description: agent.description || '',
        total_feedbacks: agent.total_feedbacks || 0,
        total_score: agent.total_score || 0,
        average_score: agent.average_score || 0,
        is_verified: agent.is_verified || false,
        star_count: agent.star_count || 0,
        image_url: agent.image_url || null,
        owner_address: agent.owner_address || '',
        agent_wallet: agent.agent_wallet || '',
        updated_at: new Date().toISOString()
      }

      // Try delete + insert (same pattern as registrations)
      await supabase.from('scan_cache').delete().eq('token_id', agent.token_id)
      const { error } = await supabase.from('scan_cache').insert(row)
      if (error && !error.message.includes('duplicate')) {
        console.warn(`   scan_cache error for token ${agent.token_id}:`, error.message)
      }
    }

    console.log(`✓ Synced ${agents.length} agents from 8004scan`)
  } catch (e) {
    console.error('8004scan sync error:', e.message)
  }
}

// ===== Registration Processing =====
const processPending = async () => {
  try {
    const { data: pending, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('status', 'pending')

    if (error) { console.error('Supabase fetch error:', error); return }
    if (!pending || pending.length === 0) return

    console.log(`📋 Found ${pending.length} pending registration(s)`)

    for (const reg of pending) {
      // Skip if already processed
      if (processed.has(reg.id)) continue
      processed.add(reg.id)

      console.log(`Processing: ${reg.id} (${reg.agent_name || 'unknown'})`)
      try {
        // Use agent_name from registration if available, otherwise try Moltbook
        let name = reg.agent_name
        if (!name && reg.api_key) {
          try {
            const res = await fetch('https://www.moltbook.com/api/v1/agents/me', {
              headers: { 'Authorization': `Bearer ${reg.api_key}` }
            })
            const moltData = await res.json()
            if (moltData.success) {
              name = moltData.agent.name
            }
          } catch (e) {
            console.warn('Moltbook API call failed:', e.message)
          }
        }
        if (!name) name = 'Unknown Agent'

        // Build agent metadata
        const agentURI = JSON.stringify({
          name,
          agentType: reg.agent_type || 'other',
          webpageUrl: reg.webpage_url || '',
          registeredAt: new Date().toISOString()
        })

        console.log(`   Registering ${name} on ERC-8004...`)

        // Check wallet balance first
        const balance = await provider.getBalance(wallet.address)
        console.log(`   Wallet balance: ${ethers.formatEther(balance)} MON`)
        if (balance === 0n) {
          throw new Error('Wallet has no MON for gas fees')
        }

        // Register on ERC-8004 Identity Registry
        const tx = await contract.register(agentURI)
        console.log(`   Tx sent: ${tx.hash}`)
        const receipt = await tx.wait()
        console.log(`   Tx confirmed in block ${receipt.blockNumber}`)

        // Extract agent_id from AgentRegistered event
        let agentId = null
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog({
              topics: log.topics,
              data: log.data
            })
            if (parsed && parsed.name === 'AgentRegistered') {
              agentId = parsed.args.agentId.toString()
              console.log(`   Agent ID (NFT #): ${agentId}`)
              break
            }
          } catch (e) {
            // Not our event, skip
          }
        }

        // If we couldn't parse the event, try totalSupply as fallback
        if (!agentId) {
          try {
            const supply = await contract.totalSupply()
            agentId = supply.toString()
            console.log(`   Agent ID (from totalSupply): ${agentId}`)
          } catch (e) {
            console.warn('   Could not get agent ID:', e.message)
          }
        }

        await updateRegistration(reg.id, reg, {
          status: 'registered',
          agent_name: name,
          tx_hash: tx.hash,
          agent_id: agentId
        })

        console.log(`✓ Registered ${name} — ID: ${agentId} — tx: ${tx.hash}`)
      } catch (e) {
        console.error(`✗ Error processing ${reg.id}:`, e.message)

        // Remove from processed set so we retry next cycle
        processed.delete(reg.id)

        await updateRegistration(reg.id, reg, {
          status: 'error',
          agent_name: reg.agent_name || 'Unknown',
          error: e.message
        })
      }
    }
  } catch (e) {
    console.error('processPending error:', e.message)
  }
}

// ===== Schedules =====

// Process pending registrations every 30s
setInterval(processPending, 30000)
processPending()

// Sync 8004scan data every 5 minutes
setInterval(sync8004Data, 5 * 60 * 1000)
sync8004Data() // Initial sync

// Keep alive
setInterval(() => console.log('💓 Worker alive'), 60000)
