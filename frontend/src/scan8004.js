// 8004scan API helper — fetches on-chain agent data from the ERC-8004 explorer
const SCAN_API = 'https://www.8004scan.io/api/v1'
const API_KEY = '8004_goX1jSjDTgxVDdXwGSxm5L_5RV8yKlI7_77f8f10a'

const headers = {
    'X-Access-Token': API_KEY,
    'Content-Type': 'application/json'
}

// Search agents on 8004scan by keyword
export const searchAgents = async (query, chainId = null, limit = 50) => {
    const params = new URLSearchParams({ query, limit })
    if (chainId) params.set('chainId', chainId)
    const res = await fetch(`${SCAN_API}/agents/search?${params}`, { headers })
    if (!res.ok) return { items: [], total: 0 }
    return res.json()
}

// Get a specific agent by chain_id + token_id
export const getAgent = async (chainId, tokenId) => {
    const res = await fetch(`${SCAN_API}/agents/${chainId}/${tokenId}`, { headers })
    if (!res.ok) return null
    return res.json()
}

// Get feedbacks for a specific agent from 8004scan
export const getAgentFeedbacks = async (chainId, tokenId, limit = 10) => {
    const params = new URLSearchParams({ limit })
    const res = await fetch(`${SCAN_API}/agents/${chainId}/${tokenId}/feedbacks?${params}`, { headers })
    if (!res.ok) return { items: [], total: 0 }
    return res.json()
}

// Fetch all agents registered on Monad from 8004scan
// chain_id 10143 = Monad Testnet, but the contract is shared across chains
// We search by contract address to find our agents
export const getMonadAgents = async (limit = 100) => {
    const params = new URLSearchParams({
        chainId: 'monad',
        limit: limit.toString()
    })
    const res = await fetch(`${SCAN_API}/agents?${params}`, { headers })
    if (!res.ok) return { items: [], total: 0 }
    return res.json()
}

// Get 8004scan stats for a specific agent by token_id (searches Monad chain)
export const get8004Stats = async (tokenId) => {
    try {
        // Try to find the agent by searching
        const data = await getMonadAgents(200)
        const agent = (data.items || []).find(a => a.token_id === String(tokenId))
        if (agent) {
            return {
                totalFeedbacks: agent.total_feedbacks || 0,
                totalScore: agent.total_score || 0,
                averageScore: agent.average_score || 0,
                isVerified: agent.is_verified || false,
                starCount: agent.star_count || 0
            }
        }
    } catch (e) {
        console.warn('8004scan lookup failed:', e)
    }
    return null
}

// Fetch all 8004scan data for enriching our agents
// Returns a map of tokenId -> { totalFeedbacks, totalScore, averageScore, ... }
export const getAll8004Stats = async () => {
    try {
        const data = await getMonadAgents(200)
        const stats = {}
        for (const agent of (data.items || [])) {
            stats[agent.token_id] = {
                totalFeedbacks: agent.total_feedbacks || 0,
                totalScore: agent.total_score || 0,
                averageScore: agent.average_score || 0,
                isVerified: agent.is_verified || false,
                starCount: agent.star_count || 0,
                name: agent.name || '',
                description: agent.description || '',
                imageUrl: agent.image_url || null
            }
        }
        return stats
    } catch (e) {
        console.warn('8004scan fetch failed:', e)
        return {}
    }
}
