import { test } from 'node:test'
import assert from 'node:assert/strict'
import { listSystemUsers, updateSystemUser, userManagementError } from '../src/lib/adminUsers.ts'

test('system-user searches are bounded and use the authorized server directory', async () => {
    let called
    const response = { items: [], total: 0, page: 1, page_size: 20, stats: {} }
    const client = { rpc: async (name, params) => { called = { name, params }; return { data: response, error: null } } }
    assert.equal(await listSystemUsers(client, { search: ' Alice ', role: 'all', status: 'all', page: 2 }), response)
    assert.equal(called.name, 'admin_list_users')
    assert.deepEqual(called.params, { p_search: 'Alice', p_role: 'all', p_status: 'all', p_page: 2, p_page_size: 20 })
})

test('profile changes go through a server-authorized RPC and database errors stay actionable', async () => {
    let request
    const client = { rpc: async (name, params) => { request = { name, params }; return { error: null } } }
    await updateSystemUser(client, 'target-id', { display_name: ' Alice ', study_level: 'primary', interface_lang: 'rw', system_role: 'user' })
    assert.equal(request.name, 'admin_update_user')
    assert.equal(request.params.p_display_name, 'Alice')
    assert.equal(request.params.p_user_id, 'target-id')
    assert.match(userManagementError({ code: 'PGRST202' }).message, /migration 005/)
    await assert.rejects(updateSystemUser({ rpc: async () => ({ error: { code: '42501', message: 'Administrator access required' } }) }, 'id', { display_name: 'Alice', study_level: 'primary', interface_lang: 'rw', system_role: 'user' }), /Administrator access required/)
})
