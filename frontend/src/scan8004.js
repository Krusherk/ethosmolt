// 8004scan data — reads from Supabase scan_cache table
// (Worker syncs 8004scan data every 5 minutes to avoid CORS issues)
import { supabase } from './supabase'

// Get all cached 8004scan stats from Supabase
export const getAll8004Stats = async () => {
    const { data, error } = await supabase
        .from('scan_cache')
        .select('*')

    if (error) {
        console.warn('scan_cache fetch failed:', error)
        return {}
    }

    // Build map of tokenId -> stats
    const stats = {}
    for (const agent of (data || [])) {
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
}

// Get cached stats for a specific agent token_id
export const get8004Stats = async (tokenId) => {
    const { data, error } = await supabase
        .from('scan_cache')
        .select('*')
        .eq('token_id', String(tokenId))
        .single()

    if (error || !data) return null

    return {
        totalFeedbacks: data.total_feedbacks || 0,
        totalScore: data.total_score || 0,
        averageScore: data.average_score || 0,
        isVerified: data.is_verified || false,
        starCount: data.star_count || 0
    }
}
