import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readAdminData } from '../src/lib/adminAccess.ts'

test('admin records are never requested when authorization fails or is not explicitly true', async () => {
    for (const data of [false, null, 'true', 1]) {
        const client = { rpc: async name => { assert.equal(name, 'is_active_admin'); return { data, error: null } }, from: () => assert.fail('unauthorized table read') }
        assert.equal(await readAdminData(client), null)
    }
    const error = new Error('Authorization unavailable')
    await assert.rejects(readAdminData({ rpc: async () => ({ data: true, error }), from: () => assert.fail('read after authorization error') }), error)
})

test('authorized admin reads are bounded and a database denial never returns partial records', async () => {
    const tables = []
    const failure = new Error('Permission denied')
    const client = error => ({
        rpc: async () => ({ data: true, error: null }),
        from: table => {
            tables.push(table)
            return { select: () => ({ order: () => ({ limit: async amount => {
                assert.equal(amount, 100)
                return { data: table === 'admin_events' ? [{ id: 'example' }] : [], error: table === 'feedback' ? error : null }
            } }) }) }
        },
    })
    assert.deepEqual(await readAdminData(client(null)), { events: [{ id: 'example' }], feedback: [], roles: [] })
    assert.deepEqual(tables, ['admin_events', 'feedback', 'admin_roles'])
    await assert.rejects(readAdminData(client(failure)), failure)
})
