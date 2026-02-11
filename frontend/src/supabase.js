import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://asxjsyjlneqopcqoiysh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzeGpzeWpsbmVxb3BjcW9peXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MzYyMTksImV4cCI6MjA4NjQxMjIxOX0.HctoliV9C6pk3FKvb8jb4wlQQ0aYfoKtSf28R-pFsvU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Submit a new agent registration
export const submitRegistration = async (apiKey, agentType, webpageUrl) => {
    const { data, error } = await supabase
        .from('registrations')
        .insert({
            api_key: apiKey,
            status: 'pending',
            agent_type: agentType || null,
            webpage_url: webpageUrl || null
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

// Get all agents (registered ones for display)
export const getAllAgents = async () => {
    const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('status', 'registered')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
}
