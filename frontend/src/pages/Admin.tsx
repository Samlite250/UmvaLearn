import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LockKeyhole, ShieldCheck, LoaderCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { readAdminData, type AdminData } from '@/lib/adminAccess'
import { AdminDashboard } from '@/components/admin/AdminDashboard'

type Result = { userId: string; status: 'allowed' | 'denied' | 'error'; message?: string; data?: AdminData; refreshedAt?: number }

export default function Admin() {
    const { user, isLoading, isConfigured } = useAuth()
    const [revision, setRevision] = useState(0)
    const [refreshing, setRefreshing] = useState(false)
    const [result, setResult] = useState<Result | null>(null)
    useEffect(() => {
        if (!user || isLoading || !isConfigured) return
        const userId = user.id
        let active = true
        const load = async () => {
            const data = await readAdminData(supabase)
            if (!active) return
            setResult(data ? { userId, status: 'allowed', data, refreshedAt: Date.now() } : { userId, status: 'denied' })
        }
        void load().catch(reason => {
            if (active) setResult({ userId, status: 'error', message: reason instanceof Error ? reason.message : typeof reason?.message === 'string' ? reason.message : 'Unable to load administration data.' })
        }).finally(() => { if (active) setRefreshing(false) })
        return () => { active = false }
    }, [user, isLoading, isConfigured, revision])
    const refresh = () => { setRefreshing(true); setRevision(value => value + 1) }
    const current = user && result?.userId === user.id ? result : null
    if (isConfigured && !isLoading && user && current?.status === 'allowed' && current.data) {
        return <AdminDashboard data={current.data} email={user.email} userId={user.id} refreshedAt={current.refreshedAt!} refreshing={refreshing} onRefresh={refresh} />
    }
    const loading = isConfigured && (isLoading || (!!user && !current))
    const title = !isConfigured ? 'Account services unavailable' : loading ? 'Checking your access' : !user ? 'Administrator sign in required' : current?.status === 'denied' ? 'Administrator access required' : 'Unable to load administration'
    return <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center bg-[#f6f8fa] px-4 py-12">
        <div className="mb-6 flex items-center gap-2 text-xs font-medium uppercase tracking-[.18em] text-emerald-700"><ShieldCheck size={17} />UmvaLearn administration</div>
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-9">
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">{loading ? <LoaderCircle size={24} className="animate-spin motion-reduce:animate-none" /> : <LockKeyhole size={24} strokeWidth={1.6} />}</div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {loading ? <p role="status" className="mt-3 text-sm text-slate-500">Verifying your session and administrator role.</p> : !isConfigured ? <p className="mt-3 text-sm leading-6 text-slate-500">Administrator access cannot be verified right now. Please try again later.</p> : !user ? <><p className="mt-3 text-sm leading-6 text-slate-500">Sign in with an account that has an active administrator role to open your workspace.</p><Link className="btn-primary mt-6 w-full" to="/auth/signin?next=/admin">Sign in to administration</Link></> : current?.status === 'denied' ? <><p className="mt-3 text-sm leading-6 text-slate-500">Your account does not have an active administrator role. Ask the project owner to grant access through Supabase.</p>{user.email && <p className="mt-3 break-all text-xs text-slate-400">Signed in as {user.email}</p>}<button onClick={refresh} disabled={refreshing} className="admin-button mt-5">{refreshing ? 'Checking…' : 'Check access again'}</button></> : <><p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{current?.message}</p><p className="mt-3 text-xs leading-5 text-slate-500">For a new setup, the project owner should verify that database migrations 001–004 have been applied.</p><button className="admin-button mt-5" onClick={refresh} disabled={refreshing}>{refreshing ? 'Retrying…' : 'Try again'}</button></>}
        </section>
        <Link className="mt-6 text-xs font-medium text-slate-500 hover:text-emerald-700" to="/home">← Back to learning</Link>
    </div>
}
