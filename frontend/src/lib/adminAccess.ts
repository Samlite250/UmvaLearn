import type { SupabaseClient } from '@supabase/supabase-js'

export type AdminActivity = { id: string; event_type: string; tool: string | null; provider: string | null; success: boolean; error_code: string | null; created_at: string }
export type AdminFeedback = { id: string; category: string; message: string; status: string; created_at: string }
export type AdminRole = { id: string; user_id: string; role: string; is_active: boolean; granted_at: string }
export type AdminData = { events: AdminActivity[]; feedback: AdminFeedback[]; roles: AdminRole[] }

export async function readAdminData(client: Pick<SupabaseClient, 'rpc' | 'from'>): Promise<AdminData | null> {
    const access = await client.rpc('is_active_admin')
    if (access.error) throw access.error
    if (access.data !== true) return null
    const [events, feedback, roles] = await Promise.all([
        client.from('admin_events').select('id,event_type,tool,provider,success,error_code,created_at').order('created_at', { ascending: false }).limit(100),
        client.from('feedback').select('id,category,message,status,created_at').order('created_at', { ascending: false }).limit(100),
        client.from('admin_roles').select('id,user_id,role,is_active,granted_at').order('granted_at', { ascending: false }).limit(100),
    ])
    const error = events.error || feedback.error || roles.error
    if (error) throw error
    return { events: (events.data ?? []) as AdminActivity[], feedback: (feedback.data ?? []) as AdminFeedback[], roles: (roles.data ?? []) as AdminRole[] }
}
