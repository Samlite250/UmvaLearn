import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ShieldCheck, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { readAdminData, type AdminData } from '@/lib/adminAccess'

type Result = { userId: string; status: 'loading' | 'allowed' | 'denied' | 'error'; message?: string; data?: AdminData }
const tabs = [{ id: 'overview', label: 'Overview' }, { id: 'activity', label: 'Activity' }, { id: 'feedback', label: 'Feedback' }, { id: 'administrators', label: 'Administrators' }] as const
const date = (value: string) => new Date(value).toLocaleString()

export default function Admin() {
    const { user, isLoading, isConfigured } = useAuth()
    const [params] = useSearchParams()
    const requested = params.get('view')
    const view = tabs.find(tab => tab.id === requested)?.id ?? 'overview'
    const [revision, setRevision] = useState(0)
    const [result, setResult] = useState<Result | null>(null)
    useEffect(() => {
        if (!user || isLoading || !isConfigured) return
        const userId = user.id
        let active = true
        const load = async () => {
            // Authorization and all subsequent reads are enforced by database RLS.
            const data = await readAdminData(supabase)
            if (!active) return
            setResult(data ? { userId, status: 'allowed', data } : { userId, status: 'denied' })
        }
        void load().catch(reason => {
            if (active) setResult({ userId, status: 'error', message: reason instanceof Error ? reason.message : typeof reason?.message === 'string' ? reason.message : 'Unable to load administration data.' })
        })
        return () => { active = false }
    }, [user, isLoading, isConfigured, revision])
    const refresh = () => {
        if (user) setResult({ userId: user.id, status: 'loading' })
        setRevision(value => value + 1)
    }
    const current = user && result?.userId === user.id ? result : null
    const data = current?.status === 'allowed' ? current.data : undefined
    return <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-navy-900"><ShieldCheck className="text-emerald-700" />Admin dashboard</h1><p className="mt-2 text-sm text-gray-600">Review recorded activity, feedback, and administrator access.</p></div>{data && <button className="btn-secondary" onClick={refresh}><RefreshCw size={16} />Refresh</button>}</header>
        {!isConfigured ? <section className="tool-panel rounded-2xl p-6"><h2 className="text-lg font-semibold">Account services unavailable</h2><p className="mt-2 text-gray-600">Administrator access cannot be verified right now. Please try again later.</p></section>
            : isLoading ? <p role="status">Checking your session…</p>
            : !user ? <section className="tool-panel space-y-4 rounded-2xl p-6"><h2 className="text-lg font-semibold">Administrator sign in required</h2><p className="text-gray-600">Sign in with an account that has an active administrator role.</p><Link className="btn-primary" to="/auth/signin?next=/admin">Sign in to administration</Link></section>
            : !current || current.status === 'loading' ? <p role="status">Verifying administrator access…</p>
            : current.status === 'denied' ? <section className="tool-panel space-y-4 rounded-2xl p-6"><h2 className="text-lg font-semibold">Administrator access required</h2><p className="text-gray-600">Your account does not have an active administrator role. Ask the project owner to grant access through Supabase.</p><Link className="btn-secondary" to="/home">Back to dashboard</Link></section>
            : current.status === 'error' ? <section className="tool-panel space-y-4 rounded-2xl p-6"><h2 className="text-lg font-semibold">Unable to load administration</h2><p role="alert" className="text-sm text-red-700">{current.message}</p><p className="text-sm text-gray-600">If this is a new setup, the project owner should check that database migrations 001–004 have been applied.</p><button className="btn-secondary" onClick={refresh}>Try again</button></section>
            : data && <>
                <nav className="mb-6 flex flex-wrap gap-2" aria-label="Admin sections">{tabs.map(tab => <Link key={tab.id} to={`/admin?view=${tab.id}`} aria-current={view === tab.id ? 'page' : undefined} className={view === tab.id ? 'btn-primary' : 'btn-secondary'}>{tab.label}</Link>)}</nav>
                {view === 'overview' && <section aria-label="Administration overview" className="space-y-5"><div className="grid gap-4 sm:grid-cols-3">{[{ label: 'Recorded events', value: data.events.length }, { label: 'Open feedback in latest 100', value: data.feedback.filter(item => item.status === 'open').length }, { label: 'Active roles in latest 100', value: data.roles.filter(item => item.is_active).length }].map(item => <div key={item.label} className="tool-panel rounded-2xl p-5"><p className="text-sm text-gray-600">{item.label}</p><p className="mt-2 text-3xl font-bold text-navy-900">{item.value}</p></div>)}</div><div className="tool-panel rounded-2xl p-5"><h2 className="font-semibold">About these records</h2><p className="mt-2 text-sm leading-relaxed text-gray-600">Each section shows up to 100 of the latest database records. Events appear only when an integration records them; an empty log does not mean the site has had no visitors. This dashboard provides read-only access. Account and role changes are managed in Supabase.</p></div></section>}
                {view === 'activity' && <section className="tool-panel overflow-hidden rounded-2xl"><h2 className="p-5 text-lg font-semibold">Latest recorded activity</h2>{!data.events.length ? <p className="px-5 pb-5 text-gray-600">No events have been recorded yet.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-mint-50"><tr>{['Event', 'Tool / provider', 'Result', 'Date'].map(label => <th className="px-5 py-3" key={label}>{label}</th>)}</tr></thead><tbody>{data.events.map(event => <tr key={event.id} className="border-t border-gray-100"><td className="px-5 py-3">{event.event_type}</td><td className="px-5 py-3">{event.tool || '—'} / {event.provider || '—'}</td><td className="px-5 py-3">{event.success ? 'Success' : event.error_code || 'Failed'}</td><td className="whitespace-nowrap px-5 py-3">{date(event.created_at)}</td></tr>)}</tbody></table></div>}</section>}
                {view === 'feedback' && <section className="tool-panel space-y-4 rounded-2xl p-5"><h2 className="text-lg font-semibold">Latest feedback</h2>{!data.feedback.length ? <p className="text-gray-600">No feedback has been submitted yet.</p> : data.feedback.map(item => <article key={item.id} className="rounded-xl border border-emerald-100 p-4"><div className="flex flex-wrap justify-between gap-2 text-sm"><h3 className="font-semibold capitalize">{item.category}</h3><span className="capitalize">{item.status}</span></div><p className="my-3 whitespace-pre-wrap break-words text-sm text-gray-700">{item.message}</p><time className="text-xs text-gray-500" dateTime={item.created_at}>{date(item.created_at)}</time></article>)}</section>}
                {view === 'administrators' && <section className="tool-panel space-y-4 rounded-2xl p-5"><h2 className="text-lg font-semibold">Administrator roles</h2>{!data.roles.length ? <p className="text-gray-600">No role records are available.</p> : data.roles.map(role => <article key={role.id} className="rounded-xl border border-emerald-100 p-4 text-sm"><p className="font-semibold">{role.role === 'super_admin' ? 'Super administrator' : 'Administrator'} · {role.is_active ? 'Active' : 'Inactive'}</p><p className="my-2 break-all font-mono text-xs text-gray-600">{role.user_id}</p><p className="text-xs text-gray-500">Granted {date(role.granted_at)}</p></article>)}</section>}
            </>}
    </div>
}
