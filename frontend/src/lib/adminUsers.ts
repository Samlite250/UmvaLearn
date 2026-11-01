import type { SupabaseClient } from '@supabase/supabase-js'

export type SystemRole = 'user' | 'admin' | 'super_admin'
export type SystemUser = {
    id: string; email: string | null; display_name: string; study_level: 'primary' | 'secondary' | 'university';
    interface_lang: 'en' | 'fr' | 'rw'; system_role: SystemRole; status: 'confirmed' | 'unconfirmed' | 'suspended';
    created_at: string; last_sign_in_at: string | null; email_confirmed_at: string | null;
}
export type UserDirectory = { items: SystemUser[]; total: number; page: number; page_size: number; can_manage_roles: boolean; stats: { total: number; confirmed: number; new_this_week: number; administrators: number } }
export type UserAudit = { id: string; actor_id: string | null; action: string; previous_role: string; new_role: string; created_at: string }
type RpcClient = Pick<SupabaseClient, 'rpc'>

export function userManagementError(error: unknown): Error {
    const failure = error as { code?: string; message?: string }
    if (failure?.code === 'PGRST202' || failure?.code === '42883') return new Error('User management needs database migration 005. Apply 005_admin_user_management.sql in the Supabase SQL editor, then retry.')
    return new Error(failure?.message || 'Unable to complete the user-management request. Please try again.')
}

export async function listSystemUsers(client: RpcClient, filters: { search: string; role: string; status: string; page: number }, signal?: AbortSignal): Promise<UserDirectory> {
    const request = client.rpc('admin_list_users', { p_search: filters.search.trim().slice(0, 200), p_role: filters.role, p_status: filters.status, p_page: filters.page, p_page_size: 20 })
    const { data, error } = await (signal ? request.abortSignal(signal) : request)
    if (error) throw userManagementError(error)
    if (!data || !Array.isArray(data.items) || !data.stats || typeof data.total !== 'number') throw new Error('The server returned an invalid user directory.')
    return data as UserDirectory
}

export async function updateSystemUser(client: RpcClient, userId: string, changes: Pick<SystemUser, 'display_name' | 'study_level' | 'interface_lang' | 'system_role'>): Promise<void> {
    const { error } = await client.rpc('admin_update_user', { p_user_id: userId, p_display_name: changes.display_name.trim(), p_study_level: changes.study_level, p_interface_lang: changes.interface_lang, p_role: changes.system_role })
    if (error) throw userManagementError(error)
}

export async function systemUserAudit(client: RpcClient, userId: string, signal: AbortSignal): Promise<UserAudit[]> {
    const { data, error } = await client.rpc('admin_user_audit_log', { p_user_id: userId }).abortSignal(signal)
    if (error) throw userManagementError(error)
    return Array.isArray(data) ? data as UserAudit[] : []
}
