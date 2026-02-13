import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://asxjsyjlneqopcqoiysh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzeGpzeWpsbmVxb3BjcW9peXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MzYyMTksImV4cCI6MjA4NjQxMjIxOX0.HctoliV9C6pk3FKvb8jb4wlQQ0aYfoKtSf28R-pFsvU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Submit a new agent registration
export const submitRegistration = async (apiKey, agentName, agentType, webpageUrl, agentId) => {
    const { data, error } = await supabase
        .from('registrations')
        .insert({
            api_key: apiKey,
            status: 'pending',
            agent_name: agentName || null,
            agent_type: agentType || null,
            webpage_url: webpageUrl || null,
            agent_id: agentId || null
        })
        .select('id')
        .single()

    if (error) throw error
    return data.id
}

// Get registration status by ID
export const getRegistrationStatus = async (registrationId) => {
    const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('id', registrationId)
        .single()

    if (error) throw error
    return data
}

// Watch registration changes in real-time
export const watchRegistration = (registrationId, callback) => {
    const channel = supabase
        .channel(`registration-${registrationId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'registrations',
                filter: `id=eq.${registrationId}`
            },
            (payload) => callback(payload.new)
        )
        .subscribe()

    // Return unsubscribe function
    return () => supabase.removeChannel(channel)
}

// Get all pending registrations (for worker)
export const getAllPendingRegistrations = async () => {
    const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('status', 'pending')

    if (error) throw error
    return data || []
}

// Update a registration entry
export const updateRegistration = async (registrationId, updates) => {
    const { error } = await supabase
        .from('registrations')
        .update(updates)
        .eq('id', registrationId)

    if (error) throw error
}

// Get all agents for display (pending + registered)
export const getAllAgents = async () => {
    const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
}

// Submit feedback for an agent (called by reviewing agents via REST API or frontend)
export const submitFeedback = async (agentName, reviewerName, value, comment, txHash) => {
    const { data, error } = await supabase
        .from('feedbacks')
        .insert({
            agent_name: agentName,
            reviewer_name: reviewerName || 'Anonymous',
            value: value,  // +1, -1, 100 (vouch), -100 (slash)
            comment: comment || '',
            tx_hash: txHash || null
        })
        .select('id')
        .single()

    if (error) throw error
    return data.id
}

// Get all feedbacks for a specific agent
export const getFeedbacksForAgent = async (agentName) => {
    const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('agent_name', agentName)
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) throw error
    return data || []
}

// Get feedback counts and avg for all agents (for cards)
export const getAllFeedbackStats = async () => {
    const { data, error } = await supabase
        .from('feedbacks')
        .select('agent_name, value')

    if (error) throw error

    // Group by agent_name
    const stats = {}
    for (const fb of (data || [])) {
        if (!stats[fb.agent_name]) {
            stats[fb.agent_name] = { count: 0, total: 0 }
        }
        stats[fb.agent_name].count++
        stats[fb.agent_name].total += fb.value
    }
    return stats
}
