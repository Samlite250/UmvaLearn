import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, Search, ArrowUpRight, ChevronLeft, ChevronRight, X, ShieldCheck, CheckCircle2, UserPlus, Clock3, AlertCircle, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { listSystemUsers, updateSystemUser, systemUserAudit, type SystemUser, type UserDirectory, type UserAudit } from '@/lib/adminUsers'

const date = (value: string | null) => value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'
const roleLabel = (role: string) => role === 'super_admin' ? 'Super admin' : role === 'admin' ? 'Admin' : 'User'

function UserEditor({ user, actorId, canManageRoles, onClose, onSaved }: { user: SystemUser; actorId: string; canManageRoles: boolean; onClose: () => void; onSaved: () => void }) {
    const dialog = useRef<HTMLDialogElement>(null)
    const [name, setName] = useState(user.display_name)
    const [level, setLevel] = useState(user.study_level)
    const [language, setLanguage] = useState(user.interface_lang)
    const [role, setRole] = useState(user.system_role)
    const [confirmed, setConfirmed] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [audit, setAudit] = useState<UserAudit[] | null>(null)
    const [auditError, setAuditError] = useState('')
    const canEdit = canManageRoles || user.system_role === 'user' || user.id === actorId
    const changedRole = role !== user.system_role
    useEffect(() => {
        const element = dialog.current
        element?.showModal()
        return () => element?.close()
    }, [])
    useEffect(() => {
        const controller = new AbortController()
        void systemUserAudit(supabase, user.id, controller.signal).then(setAudit).catch(reason => {
            if (!controller.signal.aborted) setAuditError(reason instanceof Error ? reason.message : 'Unable to load audit history.')
        })
        return () => controller.abort()
    }, [user.id])
    const save = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!canEdit || saving || (changedRole && !confirmed)) return
        setSaving(true); setError('')
        try { await updateSystemUser(supabase, user.id, { display_name: name, study_level: level, interface_lang: language, system_role: role }); onSaved() }
        catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save changes.'); setSaving(false) }
    }
    return <dialog ref={dialog} onCancel={event => { if (saving) event.preventDefault(); else onClose() }} aria-labelledby="user-editor-title" className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-lg border-0 bg-white p-0 text-slate-700 shadow-2xl backdrop:bg-slate-950/40">
        <div className="flex h-full flex-col"><header className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 sm:p-6"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-700">User management</p><h2 id="user-editor-title" className="mt-2 text-xl font-semibold text-slate-900">{canEdit ? 'Manage account' : 'Account details'}</h2></div><button className="admin-icon-button shrink-0" disabled={saving} onClick={onClose} aria-label="Close user details"><X size={17} /></button></header>
            <form onSubmit={save} className="flex min-h-0 flex-1 flex-col"><div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
                <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="break-all text-sm font-semibold text-slate-800">{user.email || 'No email address'}</p><p className="mt-2 break-all font-mono text-[10px] text-slate-400">{user.id}</p><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-400">Joined</dt><dd className="mt-1 text-slate-700">{date(user.created_at)}</dd></div><div><dt className="text-slate-400">Last sign in</dt><dd className="mt-1 text-slate-700">{date(user.last_sign_in_at)}</dd></div><div><dt className="text-slate-400">Account status</dt><dd className="mt-1 capitalize text-slate-700">{user.status}</dd></div><div><dt className="text-slate-400">Current role</dt><dd className="mt-1 text-slate-700">{roleLabel(user.system_role)}</dd></div></dl></section>
                {!canEdit && <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">Only super administrators can edit another administrator's account.</p>}
                <fieldset disabled={!canEdit || saving} className="space-y-4 disabled:opacity-70"><legend className="mb-4 text-sm font-semibold text-slate-900">Profile</legend><label className="block text-xs font-medium text-slate-600">Display name<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} className="input-field mt-2" /></label><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="block text-xs font-medium text-slate-600">Study level<select value={level} onChange={event => setLevel(event.target.value as SystemUser['study_level'])} className="input-field mt-2"><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="university">University</option></select></label><label className="block text-xs font-medium text-slate-600">Interface language<select value={language} onChange={event => setLanguage(event.target.value as SystemUser['interface_lang'])} className="input-field mt-2"><option value="en">English</option><option value="fr">Français</option><option value="rw">Kinyarwanda</option></select></label></div></fieldset>
                <section><h3 className="text-sm font-semibold text-slate-900">System access</h3><label className="mt-4 block text-xs font-medium text-slate-600">Role<select value={role} disabled={!canManageRoles || user.id === actorId || saving} onChange={event => { setRole(event.target.value as SystemUser['system_role']); setConfirmed(false) }} className="input-field mt-2 disabled:bg-slate-50 disabled:text-slate-400"><option value="user">User</option><option value="admin">Admin</option><option value="super_admin">Super admin</option></select></label><p className="mt-2 text-[11px] leading-5 text-slate-400">{user.id === actorId ? 'You cannot change your own administrator role.' : !canManageRoles ? 'Role changes require a super administrator.' : 'Admin grants access to system records. Super admin can also manage administrator roles.'}</p>{changedRole && <label className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><input required type="checkbox" className="mt-1" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={saving} /><span>Confirm changing this account from {roleLabel(user.system_role)} to {roleLabel(role)}.</span></label>}</section>
                <section><h3 className="mb-3 text-sm font-semibold text-slate-900">Recent account changes</h3>{auditError ? <p className="text-xs text-red-700">{auditError}</p> : audit === null ? <p role="status" className="text-xs text-slate-400">Loading audit history…</p> : !audit.length ? <p className="text-xs leading-5 text-slate-400">No account changes have been recorded through this dashboard.</p> : <ol className="space-y-3">{audit.map(item => <li key={item.id} className="border-l-2 border-emerald-100 pl-3 text-xs"><p className="font-medium text-slate-700">{item.action === 'profile_updated' ? 'Profile updated' : `Role changed: ${roleLabel(item.previous_role)} → ${roleLabel(item.new_role)}`}</p><p className="mt-1 text-[10px] text-slate-400">{date(item.created_at)} · {item.actor_id === actorId ? 'By you' : `Admin ${item.actor_id?.slice(0, 8) || 'removed'}`}</p></li>)}</ol>}</section>
                {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</p>}
            </div><footer className="flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><button type="button" className="admin-button" disabled={saving} onClick={onClose}>{canEdit ? 'Cancel' : 'Close'}</button>{canEdit && <button className="btn-primary text-xs" type="submit" disabled={saving || !name.trim() || (changedRole && !confirmed)}>{saving ? 'Saving…' : 'Save changes'}</button>}</footer></form>
        </div>
    </dialog>
}

export function AdminUsers({ actorId, refreshedAt, onChange }: { actorId: string; refreshedAt: number; onChange: () => void }) {
    const [params, setParams] = useSearchParams()
    const query = params.get('uq') || ''
    const role = ['user', 'admin', 'super_admin'].includes(params.get('urole') || '') ? params.get('urole')! : 'all'
    const status = ['confirmed', 'unconfirmed', 'suspended'].includes(params.get('ustatus') || '') ? params.get('ustatus')! : 'all'
    const requestedPage = Number(params.get('upage') || 1)
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const [debouncedQuery, setDebouncedQuery] = useState(query)
    const [result, setResult] = useState<{ key: string; data?: UserDirectory; error?: string } | null>(null)
    const [selected, setSelected] = useState<SystemUser | null>(null)
    const [revision, setRevision] = useState(0)
    const [notice, setNotice] = useState('')
    const key = JSON.stringify([debouncedQuery, role, status, page, revision, refreshedAt, actorId])
    useEffect(() => { const timer = setTimeout(() => setDebouncedQuery(query), 300); return () => clearTimeout(timer) }, [query])
    useEffect(() => {
        const controller = new AbortController()
        void listSystemUsers(supabase, { search: debouncedQuery, role, status, page }, controller.signal).then(data => {
            if (!controller.signal.aborted) setResult({ key, data })
        }).catch(reason => { if (!controller.signal.aborted) setResult({ key, error: reason instanceof Error ? reason.message : 'Unable to load users.' }) })
        return () => controller.abort()
    }, [key, debouncedQuery, role, status, page])
    const data = result?.key === key ? result.data : undefined
    const error = result?.key === key ? result.error : undefined
    const busy = (!data && !error) || query !== debouncedQuery
    const change = (field: string, value: string) => { const next = new URLSearchParams(params); if (value && value !== 'all') next.set(field, value); else next.delete(field); if (field !== 'upage') next.delete('upage'); setParams(next, { replace: true }) }
    const clear = () => { const next = new URLSearchParams(params); for (const field of ['uq', 'urole', 'ustatus', 'upage']) next.delete(field); setParams(next, { replace: true }) }
    const saved = () => { setSelected(null); setNotice('Account updated. The change has been recorded in the audit log.'); setRevision(value => value + 1); onChange() }
    const hasFilters = !!query || role !== 'all' || status !== 'all'
    return <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[{ label: 'Registered users', value: data?.stats.total, icon: Users }, { label: 'Confirmed emails', value: data?.stats.confirmed, icon: CheckCircle2 }, { label: 'Joined this week', value: data?.stats.new_this_week, icon: UserPlus }, { label: 'Administrators', value: data?.stats.administrators, icon: ShieldCheck }].map(item => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between gap-2"><p className="text-xs text-slate-500">{item.label}</p><item.icon size={17} className="shrink-0 text-emerald-600" /></div><p className="mt-4 text-3xl font-semibold text-slate-900">{item.value === undefined ? '—' : item.value.toLocaleString()}</p><p className="mt-2 text-[10px] text-slate-400">Across all registered accounts</p></div>)}</div>
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="System users" aria-busy={busy}>
            <div className="flex flex-wrap items-start justify-between gap-3 p-5"><div><h2 className="font-semibold text-slate-900">User directory</h2><p className="mt-1 text-xs leading-5 text-slate-500">Search registered accounts and manage their profile and access.</p></div><span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-400">20 users per page</span></div>
            <div className="flex flex-wrap items-center gap-3 px-5 pb-5"><label className="relative min-w-0 flex-1 basis-52"><span className="sr-only">Search system users</span><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input maxLength={200} className="admin-search" placeholder="Search name, email, or user ID…" value={query} onChange={event => change('uq', event.target.value)} /></label><label><span className="sr-only">Filter users by role</span><select className="admin-select" value={role} onChange={event => change('urole', event.target.value)}><option value="all">All roles</option><option value="user">Users</option><option value="admin">Admins</option><option value="super_admin">Super admins</option></select></label><label><span className="sr-only">Filter users by status</span><select className="admin-select" value={status} onChange={event => change('ustatus', event.target.value)}><option value="all">All statuses</option><option value="confirmed">Confirmed email</option><option value="unconfirmed">Unconfirmed email</option><option value="suspended">Suspended</option></select></label>{hasFilters && <button onClick={clear} className="text-xs font-semibold text-emerald-700">Clear filters</button>}</div>
            {error ? <div className="border-t border-slate-100 px-5 py-10 text-center"><AlertCircle className="mx-auto mb-3 text-amber-600" size={27} /><h3 className="font-semibold text-slate-900">Unable to load the user directory</h3><p role="alert" className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">{error}</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button className="admin-button" onClick={() => setRevision(value => value + 1)}><RefreshCw size={14} />Retry</button>{error.includes('migration 005') && <a className="admin-button" href="https://github.com/Samlite250/UmvaLearn/blob/main/backend/supabase/migrations/005_admin_user_management.sql" target="_blank" rel="noreferrer">View setup SQL <ArrowUpRight size={14} /></a>}</div></div> : busy ? <div role="status" className="space-y-4 border-t border-slate-100 p-5"><p className="text-xs text-slate-400">Loading users…</p>{[0, 1, 2, 3].map(index => <div key={index} className="h-12 animate-pulse rounded-lg bg-slate-50 motion-reduce:animate-none" />)}</div> : !data?.items.length ? <div className="border-t border-slate-100 px-5 py-12 text-center"><Users size={27} className="mx-auto mb-4 text-slate-300" /><h3 className="text-sm font-semibold text-slate-800">{hasFilters ? 'No matching users' : 'No users found'}</h3><p className="mt-2 text-sm text-slate-500">{hasFilters ? 'Try another name or email, or clear your filters.' : 'Registered accounts will appear here.'}</p></div> : <>
                <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr>{['User', 'Role', 'Status', 'Joined', ''].map((label, index) => <th key={index} scope="col" className="px-5 py-3 font-medium">{label || <span className="sr-only">Actions</span>}</th>)}</tr></thead><tbody>{data.items.map(user => <tr key={user.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700">{(user.display_name || user.email || '?').slice(0, 2).toUpperCase()}</span><div className="min-w-0"><p className="font-medium text-slate-800">{user.display_name || 'Unnamed user'}{user.id === actorId && <span className="ml-2 text-[9px] text-slate-400">YOU</span>}</p><p className="mt-1 break-all text-xs text-slate-400">{user.email || 'No email address'}</p></div></div></td><td className="px-5 py-4"><span className={`rounded-md px-2 py-1 text-[10px] font-medium ${user.system_role === 'user' ? 'bg-slate-100 text-slate-500' : 'bg-violet-50 text-violet-700'}`}>{roleLabel(user.system_role)}</span></td><td className="px-5 py-4"><span className={`text-xs ${user.status === 'confirmed' ? 'text-emerald-700' : user.status === 'suspended' ? 'text-red-700' : 'text-amber-700'}`}>{user.status === 'confirmed' ? 'Confirmed' : user.status === 'suspended' ? 'Suspended' : 'Unconfirmed'}</span></td><td className="whitespace-nowrap px-5 py-4 text-xs text-slate-400">{date(user.created_at)}</td><td className="px-5 py-4"><button className="admin-button" onClick={() => setSelected(user)} aria-label={`Manage ${user.email || user.id}`}>Manage <ArrowUpRight size={13} /></button></td></tr>)}</tbody></table></div>
                <div className="divide-y divide-slate-100 border-t border-slate-100 md:hidden">{data.items.map(user => <article key={user.id} className="space-y-3 p-5"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words text-sm font-semibold text-slate-800">{user.display_name || 'Unnamed user'}{user.id === actorId ? ' (you)' : ''}</h3><p className="mt-1 break-all text-xs text-slate-400">{user.email || 'No email address'}</p></div><button className="admin-icon-button shrink-0" onClick={() => setSelected(user)} aria-label={`Manage ${user.email || user.id}`}><ArrowUpRight size={15} /></button></div><div className="flex flex-wrap items-center gap-2 text-[10px]"><span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{roleLabel(user.system_role)}</span><span className={user.status === 'confirmed' ? 'text-emerald-700' : 'text-amber-700'}>{user.status}</span><span className="ml-auto flex items-center gap-1 text-slate-400"><Clock3 size={10} />{date(user.created_at)}</span></div></article>)}</div>
            </>}
            {data && !busy && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-400"><p>{data.total ? `${(data.page - 1) * data.page_size + 1}–${Math.min(data.page * data.page_size, data.total)} of ${data.total} users` : '0 users'}</p><div className="flex items-center gap-2"><button className="admin-icon-button" disabled={data.page <= 1} onClick={() => change('upage', String(data.page - 1))} aria-label="Previous users page"><ChevronLeft size={15} /></button><span>Page {data.page} of {Math.max(1, Math.ceil(data.total / data.page_size))}</span><button className="admin-icon-button" disabled={data.page * data.page_size >= data.total} onClick={() => change('upage', String(data.page + 1))} aria-label="Next users page"><ChevronRight size={15} /></button></div></div>}
        </section>
        {selected && <UserEditor key={selected.id} user={selected} actorId={actorId} canManageRoles={data?.can_manage_roles === true} onClose={() => setSelected(null)} onSaved={saved} />}
    </div>
}
