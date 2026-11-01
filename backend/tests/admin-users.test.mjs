import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const ids = { super: '00000000-0000-0000-0000-000000000001', admin: '00000000-0000-0000-0000-000000000002', user: '00000000-0000-0000-0000-000000000003', other: '00000000-0000-0000-0000-000000000004', secondSuper: '00000000-0000-0000-0000-000000000005' }

test('user-management migration enforces permissions, paging, updates, and audits in PostgreSQL', async t => {
    const db = await PGlite.create()
    t.after(() => db.close())
    await db.exec(`
        CREATE ROLE anon; CREATE ROLE authenticated;
        CREATE SCHEMA auth;
        GRANT USAGE ON SCHEMA auth, public TO anon, authenticated;
        CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT, created_at TIMESTAMPTZ DEFAULT now(), last_sign_in_at TIMESTAMPTZ, email_confirmed_at TIMESTAMPTZ, banned_until TIMESTAMPTZ, deleted_at TIMESTAMPTZ, encrypted_password TEXT);
        CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        CREATE TABLE public.profiles (id UUID PRIMARY KEY REFERENCES auth.users, display_name TEXT, study_level TEXT DEFAULT 'secondary', interface_lang TEXT DEFAULT 'en', updated_at TIMESTAMPTZ DEFAULT now());
        CREATE TABLE public.admin_roles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users, role TEXT, is_active BOOLEAN DEFAULT TRUE, granted_by UUID REFERENCES auth.users, granted_at TIMESTAMPTZ DEFAULT now());
        ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
        CREATE TABLE public.admin_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), event_type TEXT, user_id UUID, is_guest BOOLEAN, tool TEXT, success BOOLEAN, created_at TIMESTAMPTZ DEFAULT now());
        CREATE FUNCTION public.is_active_admin(check_user_id UUID DEFAULT auth.uid()) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$ SELECT EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = check_user_id AND is_active) $$;
        REVOKE ALL ON FUNCTION public.is_active_admin(UUID) FROM PUBLIC;
        GRANT EXECUTE ON FUNCTION public.is_active_admin(UUID) TO authenticated;
    `)
    const migration = await readFile(new URL('../supabase/migrations/005_admin_user_management.sql', import.meta.url), 'utf8')
    await db.exec(migration)
    await db.exec(migration) // A rerun must be safe.
    for (const [kind, id] of Object.entries(ids)) {
        await db.query('INSERT INTO auth.users (id,email,email_confirmed_at,encrypted_password) VALUES ($1,$2,now(),$3)', [id, `${kind}@example.test`, 'PRIVATE-HASH'])
        await db.query('INSERT INTO public.profiles (id,display_name) VALUES ($1,$2)', [id, kind === 'user' ? 'Alice Learner' : kind])
    }
    await db.query('INSERT INTO public.admin_roles (user_id,role) VALUES ($1,$2),($3,$4),($5,$2)', [ids.super, 'super_admin', ids.admin, 'admin', ids.secondSuper])
    await db.exec(`INSERT INTO auth.users (id,email,email_confirmed_at) SELECT md5('learner-' || n)::uuid, 'learner-' || n || '@example.test', now() FROM generate_series(1,31) n;`)
    const as = async (role, id, work) => {
        await db.exec(`SET ROLE ${role}`)
        await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id || ''])
        try { return await work() } finally { await db.exec('RESET ROLE') }
    }
    const list = async (...params) => (await db.query('SELECT public.admin_list_users($1,$2,$3,$4,$5) AS directory', params.length ? params : ['', 'all', 'all', 1, 20])).rows[0].directory
    const update = (target, name, role = 'user') => db.query('SELECT public.admin_update_user($1,$2,$3,$4,$5)', [target, name, 'university', 'rw', role])

    await t.test('anonymous and regular accounts cannot list, edit, or read audits', async () => {
        await as('anon', null, () => assert.rejects(list(), error => error.code === '42501'))
        await as('authenticated', ids.user, async () => {
            await assert.rejects(list(), error => error.code === '42501')
            await assert.rejects(update(ids.user, 'Unauthorized'), error => error.code === '42501')
            await assert.rejects(db.query('SELECT public.admin_user_audit_log($1)', [ids.user]), error => error.code === '42501')
        })
    })
    await t.test('admins can page and search all accounts without receiving authentication secrets', async () => {
        await as('authenticated', ids.admin, async () => {
            const all = await list()
            assert.equal(all.total, 36)
            assert.equal(all.items.length, 20)
            assert.equal(all.stats.total, 36)
            assert.equal(all.can_manage_roles, false)
            assert.ok(all.items.every(item => !('encrypted_password' in item)))
            const result = await list('ALICE', 'all', 'all', 1, 20)
            assert.equal(result.items[0].id, ids.user)
            assert.equal(result.total, 1)
            assert.equal((await list('%', 'all', 'all', 1, 20)).total, 0)
            assert.equal((await list("' OR true --", 'all', 'all', 1, 20)).total, 0)
            assert.equal((await list('', 'super_admin', 'all', 1, 20)).total, 2)
            const last = await list('', 'all', 'all', 999, 20)
            assert.equal(last.page, 2)
            assert.equal(last.items.length, 16)
            assert.equal((await list('', 'all', 'all', 1, 1000)).page_size, 50)
            await assert.rejects(list('', 'invalid', 'all', 1, 20), error => error.code === '22023')
        })
    })
    await t.test('regular admins can edit learner profiles but cannot grant roles or edit another admin', async () => {
        await as('authenticated', ids.admin, async () => {
            await update(ids.user, ' Alice Updated ')
            await assert.rejects(update(ids.other, 'Escalation', 'admin'), error => error.code === '42501')
            await assert.rejects(update(ids.super, 'Changed', 'super_admin'), error => error.code === '42501')
            await assert.rejects(update(ids.admin, 'Changed', 'super_admin'), error => error.code === '42501')
            const audit = (await db.query('SELECT public.admin_user_audit_log($1) AS audit', [ids.user])).rows[0].audit
            assert.equal(audit.length, 1)
            assert.equal(audit[0].actor_id, ids.admin)
            assert.equal(audit[0].action, 'profile_updated')
            await assert.rejects(db.query('SELECT * FROM public.admin_user_audit'), error => error.code === '42501')
        })
        const profile = (await db.query('SELECT * FROM public.profiles WHERE id=$1', [ids.user])).rows[0]
        assert.equal(profile.display_name, 'Alice Updated')
        assert.equal(profile.study_level, 'university')
        assert.equal(profile.interface_lang, 'rw')
    })
    await t.test('super admins can grant and revoke roles while preserving role history', async () => {
        await as('authenticated', ids.super, async () => {
            assert.equal((await list()).can_manage_roles, true)
            await update(ids.other, 'Other Administrator', 'admin')
            assert.equal((await list('other@example.test', 'admin', 'all', 1, 20)).total, 1)
            await update(ids.other, 'Other Super Admin', 'super_admin')
            await update(ids.other, 'Other User', 'user')
            assert.equal((await list('other@example.test', 'user', 'all', 1, 20)).total, 1)
            await assert.rejects(update(ids.super, 'Self', 'user'), /cannot change your own/)
        })
        const roles = (await db.query('SELECT * FROM public.admin_roles WHERE user_id=$1', [ids.other])).rows
        assert.equal(roles.length, 2)
        assert.ok(roles.every(role => !role.is_active))
    })
    await t.test('invalid updates leave both profile and audit trail unchanged', async () => {
        const before = (await db.query('SELECT count(*) AS count FROM public.admin_user_audit')).rows[0].count
        await as('authenticated', ids.super, async () => {
            await assert.rejects(update(ids.user, ''), error => error.code === '22023')
            await assert.rejects(db.query('SELECT public.admin_update_user($1,$2,$3,$4,$5)', [ids.user, 'Name', 'invalid', 'rw', 'user']), error => error.code === '22023')
            await assert.rejects(update('10000000-0000-0000-0000-000000000000', 'Unknown'), error => error.code === 'P0002')
        })
        assert.equal((await db.query('SELECT count(*) AS count FROM public.admin_user_audit')).rows[0].count, before)
    })
    await t.test('the last super administrator stays protected and revoked admins lose access', async () => {
        await db.query("UPDATE auth.users SET banned_until=now()+interval '1 day' WHERE id=$1", [ids.admin])
        await as('authenticated', ids.admin, async () => {
            await assert.rejects(list(), error => error.code === '42501')
            await assert.rejects(update(ids.user, 'Suspended actor'), error => error.code === '42501')
        })
        await db.query('UPDATE auth.users SET banned_until=NULL WHERE id=$1', [ids.admin])
        await db.query('UPDATE public.admin_roles SET is_active=FALSE WHERE user_id=$1', [ids.secondSuper])
        await as('authenticated', ids.super, () => assert.rejects(update(ids.super, 'Self', 'user'), /cannot change your own/))
        await db.query('UPDATE public.admin_roles SET is_active=FALSE WHERE user_id=$1', [ids.admin])
        await as('authenticated', ids.admin, () => assert.rejects(list(), error => error.code === '42501'))
    })
})
