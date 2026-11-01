import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
    Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, BookOpen,
    CheckCircle2, ChevronLeft, ChevronRight, CircleHelp, Clock3, Copy,
    Globe2, Headphones, LayoutDashboard, MessageSquare, Mic, RefreshCw,
    Search, ShieldCheck, Users, X, type LucideIcon,
} from 'lucide-react'
import type { AdminActivity, AdminData } from '@/lib/adminAccess'
import { activitySeries, adminCsv, inPeriod, toolKey, toolName, type AdminPeriod } from '@/lib/adminAnalytics'

const sections = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, title: 'Workspace overview', description: 'A clear view of recorded activity and the people supporting your learners.' },
    { id: 'activity', label: 'Activity log', icon: Activity, title: 'Activity log', description: 'Explore recorded requests, provider results, and errors.' },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare, title: 'Learner feedback', description: 'Review submitted feedback and identify what needs attention.' },
    { id: 'administrators', label: 'Team & access', icon: Users, title: 'Team & access', description: 'Review the administrator roles that protect your workspace.' },
] as const
const stamp = (value: string | number) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const toolIcon = (key: string): LucideIcon => ({ tts: Headphones, stt: Mic, translate: Globe2 })[key] || BookOpen
const panel = 'rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30'

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'green' | 'red' | 'amber' | 'neutral' }) {
    const colors = { green: 'bg-emerald-50 text-emerald-800 ring-emerald-600/15', red: 'bg-red-50 text-red-700 ring-red-600/15', amber: 'bg-amber-50 text-amber-800 ring-amber-600/15', neutral: 'bg-slate-100 text-slate-600 ring-slate-500/10' }
    return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${colors[tone]}`}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{children}</span>
}

function Empty({ icon: Icon = Activity, title, description, action }: { icon?: LucideIcon; title: string; description: string; action?: ReactNode }) {
    return <div className="flex flex-col items-center justify-center px-5 py-10 text-center"><div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400"><Icon size={22} strokeWidth={1.5} /></div><h3 className="text-sm font-semibold text-slate-800">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p>{action && <div className="mt-4">{action}</div>}</div>
}

function PanelHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
    return <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5"><div><h2 className="font-semibold tracking-tight text-slate-900">{title}</h2>{subtitle && <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>}</div>{action}</div>
}

function EventList({ events }: { events: AdminActivity[] }) {
    return <>
        <div className="hidden overflow-x-auto md:block"><table className="mt-5 w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3 font-medium">Event / tool</th><th className="px-5 py-3 font-medium">Provider</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Recorded</th></tr></thead><tbody>{events.map(event => {
            const key = toolKey(event), Icon = toolIcon(key)
            return <tr key={event.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={16} /></span><div><p className="font-medium text-slate-800">{toolName(key)}</p><p className="mt-0.5 text-xs text-slate-500">{event.event_type.replaceAll('_', ' ')}</p></div></div></td><td className="px-5 py-4 text-slate-500">{event.provider || 'Not recorded'}</td><td className="px-5 py-4"><Badge tone={event.success ? 'green' : 'red'}>{event.success ? 'Successful' : 'Failed'}</Badge>{!event.success && event.error_code && <p className="mt-1 max-w-48 break-words text-xs text-red-600">{event.error_code}</p>}</td><td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500"><time dateTime={event.created_at}>{stamp(event.created_at)}</time></td></tr>
        })}</tbody></table></div>
        <div className="mt-4 divide-y divide-slate-100 md:hidden">{events.map(event => <article key={event.id} className="space-y-3 px-5 py-4"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-800">{toolName(toolKey(event))}</h3><Badge tone={event.success ? 'green' : 'red'}>{event.success ? 'Successful' : 'Failed'}</Badge></div><p className="break-words text-xs text-slate-500">{event.provider || 'Provider not recorded'} · {stamp(event.created_at)}</p>{!event.success && event.error_code && <p className="break-words text-xs text-red-600">{event.error_code}</p>}</article>)}</div>
    </>
}

function TrendChart({ series }: { series: ReturnType<typeof activitySeries> }) {
    const days = series.length
    const maximum = Math.max(3, ...series.map(day => day.success + day.failed))
    const gap = 624 / days
    return <div className="px-4 pb-5 pt-6"><svg viewBox="0 0 700 230" role="img" aria-label={`Daily recorded activity over ${days} days. ${series.reduce((total, day) => total + day.success, 0)} successful and ${series.reduce((total, day) => total + day.failed, 0)} failed events.`} className="w-full">
        {[0, 1, 2, 3].map(index => <g key={index}><line x1="42" x2="676" y1={24 + index * 52} y2={24 + index * 52} stroke="#e8edf0" strokeDasharray="4 5" /><text x="30" y={28 + index * 52} fill="#94a3b8" textAnchor="end" fontSize="10">{Math.ceil(maximum * (3 - index) / 3)}</text></g>)}
        {series.map((day, index) => {
            const successHeight = day.success / maximum * 156, failedHeight = day.failed / maximum * 156
            const x = 48 + gap * index, width = Math.max(4, gap * .56)
            return <g key={day.key}><title>{day.date.toLocaleDateString()}: {day.success} successful, {day.failed} failed</title><rect x={x} y={180 - successHeight} width={width} height={successHeight} rx="3" fill="#07977c" /><rect x={x} y={180 - successHeight - failedHeight} width={width} height={failedHeight} rx="2" fill="#f28b82" />{(days === 7 || index % 5 === 0 || index === days - 1) && <text x={x + width / 2} y="208" textAnchor="middle" fontSize="10" fill="#64748b">{day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>}</g>
        })}
    </svg></div>
}

export function AdminDashboard({ data, email, userId, refreshedAt, refreshing, onRefresh }: { data: AdminData; email?: string; userId: string; refreshedAt: number; refreshing: boolean; onRefresh: () => void }) {
    const [params, setParams] = useSearchParams()
    const [notice, setNotice] = useState('')
    const section = sections.find(item => item.id === params.get('view')) ?? sections[0]
    const view = section.id
    const period: AdminPeriod = params.get('range') === '30' ? '30' : params.get('range') === 'all' ? 'all' : '7'
    const query = params.get('q') || '', status = params.get('status') || '', tool = params.get('tool') || ''
    const update = (key: string, value: string) => {
        const next = new URLSearchParams(params)
        if (value) next.set(key, value); else next.delete(key)
        if (key !== 'page') next.delete('page')
        setParams(next, { replace: true })
        setNotice('')
    }
    const href = (id: string) => `/admin?view=${id}&range=${period}`
    const snapshotDate = new Date(refreshedAt)
    const recentEvents = data.events.filter(event => inPeriod(event.created_at, period, snapshotDate))
    const recentFeedback = data.feedback.filter(item => inPeriod(item.created_at, period, snapshotDate))
    const series = activitySeries(recentEvents, period === '7' ? 7 : 30, snapshotDate)
    const successes = recentEvents.filter(event => event.success).length
    const successRate = recentEvents.length ? `${Math.round(successes / recentEvents.length * 100)}%` : '—'
    const openFeedback = recentFeedback.filter(item => item.status === 'open').length
    const activeRoles = data.roles.filter(role => role.is_active).length
    const mine = data.roles.find(role => role.user_id === userId && role.is_active && role.role === 'super_admin') || data.roles.find(role => role.user_id === userId && role.is_active)
    const needle = query.trim().toLowerCase()
    const events = recentEvents.filter(event => (!needle || `${event.id} ${event.event_type} ${event.provider || ''} ${event.error_code || ''} ${toolName(toolKey(event))}`.toLowerCase().includes(needle)) && (!status || (status === 'success' ? event.success : !event.success)) && (!tool || toolKey(event) === tool))
    const feedback = recentFeedback.filter(item => (!needle || `${item.category} ${item.message}`.toLowerCase().includes(needle)) && (!status || item.status === status))
    const roles = data.roles.filter(role => (!needle || `${role.user_id} ${role.role}`.toLowerCase().includes(needle)) && (!status || (status === 'active' ? role.is_active : !role.is_active)))
    const count = view === 'feedback' ? feedback.length : view === 'administrators' ? roles.length : events.length
    const pageCount = Math.max(1, Math.ceil(count / 10)), requestedPage = Number(params.get('page') || 1)
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, pageCount) : 1
    const start = (page - 1) * 10
    const tools = [...new Set(recentEvents.map(toolKey))]
    const mix = [...new Set(recentEvents.map(toolKey))].map(key => ({ key, count: recentEvents.filter(event => toolKey(event) === key).length })).sort((a, b) => b.count - a.count)
    const filtered = !!query || !!status || !!tool
    const clearFilters = () => { const next = new URLSearchParams(params); for (const key of ['q', 'status', 'tool', 'page']) next.delete(key); setParams(next, { replace: true }) }
    const exportData = () => {
        let csv: string
        if (view === 'feedback') csv = adminCsv(['ID', 'Category', 'Message', 'Status', 'Recorded'], feedback.map(item => [item.id, item.category, item.message, item.status, item.created_at]))
        else if (view === 'administrators') csv = adminCsv(['User ID', 'Role', 'Active', 'Granted'], roles.map(role => [role.user_id, role.role, role.is_active, role.granted_at]))
        else csv = adminCsv(['Event ID', 'Event', 'Tool', 'Provider', 'Success', 'Error code', 'Recorded'], events.map(event => [event.id, event.event_type, event.tool, event.provider, event.success, event.error_code, event.created_at]))
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
        const anchor = document.createElement('a')
        anchor.href = url; anchor.download = `umvalearn-${view}-${new Date(refreshedAt).toISOString().slice(0, 10)}.csv`
        anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
        setNotice(`Exported ${count} ${view === 'administrators' ? 'role records' : view === 'feedback' ? 'feedback records' : 'events'}.`)
    }
    const copyId = async (id: string) => { try { await navigator.clipboard.writeText(id); setNotice('User ID copied.') } catch { setNotice('Unable to copy. Select the user ID and copy it manually.') } }
    const clearAction = filtered ? <button className="text-xs font-semibold text-emerald-700 hover:underline" onClick={clearFilters}>Clear filters</button> : undefined
    const pageControls = <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500"><p>{count ? `${start + 1}–${Math.min(start + 10, count)} of ${count} records` : '0 records'}</p><div className="flex items-center gap-2"><button aria-label="Previous page" className="admin-icon-button" disabled={page === 1} onClick={() => update('page', String(page - 1))}><ChevronLeft size={15} /></button><span>Page {page} of {pageCount}</span><button aria-label="Next page" className="admin-icon-button" disabled={page === pageCount} onClick={() => update('page', String(page + 1))}><ChevronRight size={15} /></button></div></div>
    return <div className="min-h-[calc(100dvh-4rem)] bg-[#f6f8fa] text-slate-700"><div className="mx-auto grid max-w-[1600px] gap-5 px-3 py-5 sm:px-6 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-7 lg:py-7">
        <aside className="self-start overflow-hidden rounded-2xl bg-[#102f31] text-white lg:sticky lg:top-24">
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-emerald-300"><ShieldCheck size={22} strokeWidth={1.5} /></span><div><p className="text-sm font-semibold tracking-wide">UmvaLearn</p><p className="mt-0.5 text-[10px] uppercase tracking-[.18em] text-emerald-200/60">Administration</p></div></div>
            <p className="hidden px-5 pb-2 pt-6 text-[10px] font-medium uppercase tracking-[.18em] text-white/35 lg:block">Workspace</p>
            <nav className="grid grid-cols-2 gap-1 p-3 sm:grid-cols-4 lg:grid-cols-1" aria-label="Admin sections">{sections.map(item => { const Icon = item.icon; return <Link key={item.id} to={href(item.id)} aria-current={view === item.id ? 'page' : undefined} className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-3 text-xs font-medium transition-colors lg:text-sm ${view === item.id ? 'bg-[#1a4944] text-emerald-200 ring-1 ring-inset ring-white/10' : 'text-white/65 hover:bg-white/5 hover:text-white'}`}><Icon size={17} strokeWidth={1.7} className="shrink-0" /><span>{item.label}</span>{item.id === 'feedback' && openFeedback > 0 && <span className="ml-auto rounded-md bg-emerald-300/15 px-1.5 py-0.5 text-[10px] text-emerald-200">{openFeedback}</span>}</Link> })}</nav>
            <div className="hidden px-5 pb-5 pt-12 lg:block"><div className="rounded-xl border border-white/10 bg-white/[.03] p-3.5"><ShieldCheck size={17} className="mb-2 text-emerald-300" /><p className="text-xs font-medium text-white/85">Protected workspace</p><p className="mt-1.5 text-[11px] leading-5 text-white/45">Read-only records. Access is verified through your administrator role.</p></div><Link to="/home" className="mt-5 flex items-center justify-between text-xs text-white/60 hover:text-white">Back to learning <ArrowUpRight size={15} /></Link></div>
        </aside>
        <section className="min-w-0 space-y-6" aria-label="Admin workspace">
            <header><div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-[11px]"><p className="flex items-center gap-2 text-slate-400">Administration <ChevronRight size={12} /><span className="text-slate-600">{section.label}</span></p><Badge tone="green"><ShieldCheck size={11} />{mine?.role === 'super_admin' ? 'Super administrator' : 'Administrator'}</Badge></div><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">{section.title}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{section.description}</p></div><button className="admin-button shrink-0" disabled={refreshing} onClick={onRefresh}><RefreshCw size={15} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} />{refreshing ? 'Refreshing…' : 'Refresh data'}</button></div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5"><div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><Clock3 size={13} /><span>Updated {stamp(refreshedAt)}</span><span aria-hidden="true" className="mx-1 text-slate-300">|</span><span>Latest 100 per section</span></div><div className="flex flex-wrap items-center gap-2">{view !== 'administrators' && <label className="sr-only" htmlFor="admin-date-range">Date range</label>}{view !== 'administrators' && <select id="admin-date-range" className="admin-select" value={period} onChange={event => update('range', event.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All loaded records</option></select>}<button className="admin-button" onClick={exportData} disabled={count === 0}><ArrowDownToLine size={14} />Export CSV</button></div></div>
            </header>
            {notice && <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={14} /></button></div>}
            {view === 'overview' ? <>
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[
                    { label: 'Recorded requests', value: recentEvents.length.toLocaleString(), note: period === 'all' ? 'Across loaded events' : `In the last ${period} days`, icon: Activity, color: 'bg-emerald-50 text-emerald-700' },
                    { label: 'Success rate', value: successRate, note: recentEvents.length ? `${successes} of ${recentEvents.length} succeeded` : 'No requests in this period', icon: CheckCircle2, color: 'bg-blue-50 text-blue-600' },
                    { label: 'Open feedback', value: String(openFeedback), note: 'Awaiting review in this period', icon: MessageSquare, color: 'bg-amber-50 text-amber-700' },
                    { label: 'Active administrators', value: String(activeRoles), note: 'Across loaded role records', icon: Users, color: 'bg-violet-50 text-violet-600' },
                ].map(metric => <div key={metric.label} className={`${panel} p-4 sm:p-5`}><div className="mb-4 flex items-center justify-between gap-2"><p className="text-xs font-medium text-slate-500">{metric.label}</p><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${metric.color}`}><metric.icon size={16} strokeWidth={1.8} /></span></div><p className="text-3xl font-semibold tracking-tight text-slate-900">{metric.value}</p><p className="mt-2 text-[10px] leading-5 text-slate-400 sm:text-xs">{metric.note}</p></div>)}
                </div>
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(240px,1fr)]"><section className={panel}><PanelHeading title="Activity over time" subtitle={`Daily recorded events · last ${period === '7' ? 7 : 30} days`} action={<div className="flex gap-3 text-[10px] text-slate-500"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#07977c]" />Success</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#f28b82]" />Failed</span></div>} />{series.some(day => day.success || day.failed) ? <TrendChart series={series} /> : <Empty title="No recorded activity yet" description="Activity will appear here when your integrations write events to the activity log." />}</section>
                    <section className={panel}><PanelHeading title="Study tool usage" subtitle="Share of recorded events in this period" />{mix.length ? <div className="space-y-5 p-5">{mix.map((item, index) => { const Icon = toolIcon(item.key), share = Math.round(item.count / recentEvents.length * 100); return <div key={item.key}><div className="mb-2 flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-2 text-slate-600"><Icon size={14} />{toolName(item.key)}</span><span className="font-semibold text-slate-800">{item.count}<span className="ml-2 font-normal text-slate-400">{share}%</span></span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${['bg-emerald-600', 'bg-sky-500', 'bg-amber-400', 'bg-violet-400'][index % 4]}`} style={{ width: `${share}%` }} /></div></div> })}</div> : <Empty icon={BookOpen} title="No usage breakdown" description="Recorded requests will populate this breakdown." />}</section>
                </div>
                <section className={panel}><PanelHeading title="Recent activity" subtitle="The latest recorded events for your selected period" action={<Link to={href('activity')} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline">View activity <ArrowRight size={13} /></Link>} />{recentEvents.length ? <EventList events={recentEvents.slice(0, 5)} /> : <Empty icon={Clock3} title="Your activity log is ready" description="No events are available for this period. An empty log is not a count of site visitors." />}</section>
                <div className="grid gap-4 sm:grid-cols-2"><Link to={href('feedback')} className={`${panel} group flex items-center gap-4 p-5 hover:border-emerald-300`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><MessageSquare size={19} /></span><div className="flex-1"><h2 className="text-sm font-semibold text-slate-800">Listen to your learners</h2><p className="mt-1 text-xs text-slate-500">Review feedback and reported issues.</p></div><ArrowUpRight size={17} className="text-slate-400 group-hover:text-emerald-700" /></Link><Link to={href('administrators')} className={`${panel} group flex items-center gap-4 p-5 hover:border-emerald-300`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600"><ShieldCheck size={19} /></span><div className="flex-1"><h2 className="text-sm font-semibold text-slate-800">Review workspace access</h2><p className="mt-1 text-xs text-slate-500">Check administrator roles and status.</p></div><ArrowUpRight size={17} className="text-slate-400 group-hover:text-emerald-700" /></Link></div>
            </> : <section className={panel}>
                <PanelHeading title={view === 'activity' ? 'Recorded events' : view === 'feedback' ? 'Feedback inbox' : 'Administrator directory'} subtitle={view === 'administrators' ? 'The latest 100 role grants · account and role changes are managed in Supabase' : `${count} matching records · newest first`} />
                <div className="flex flex-wrap items-center gap-3 px-5 pb-1 pt-5"><label className="relative min-w-0 flex-1 basis-48"><span className="sr-only">Search {section.label}</span><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="admin-search" value={query} onChange={event => update('q', event.target.value)} placeholder={view === 'activity' ? 'Search events, providers, errors…' : view === 'feedback' ? 'Search messages or categories…' : 'Search user ID or role…'} /></label><label><span className="sr-only">Filter by status</span><select className="admin-select" value={status} onChange={event => update('status', event.target.value)}><option value="">All statuses</option>{(view === 'activity' ? [['success', 'Successful'], ['failed', 'Failed']] : view === 'feedback' ? [['open', 'Open'], ['investigating', 'Investigating'], ['resolved', 'Resolved']] : [['active', 'Active'], ['inactive', 'Inactive']]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{view === 'activity' && <label><span className="sr-only">Filter by tool</span><select className="admin-select" value={tool} onChange={event => update('tool', event.target.value)}><option value="">All tools</option>{tools.map(key => <option key={key} value={key}>{toolName(key)}</option>)}</select></label>}{clearAction}</div>
                {!count ? <Empty icon={view === 'feedback' ? MessageSquare : view === 'administrators' ? Users : Search} title={filtered ? 'No matching records' : view === 'feedback' ? 'No feedback in this period' : view === 'administrators' ? 'No role records available' : 'No activity in this period'} description={filtered ? 'Try another search term or clear your filters.' : view === 'administrators' ? 'Role records are displayed when they are available to your account.' : 'Try a wider date range. This view only includes records written to the database.'} action={clearAction} /> : view === 'activity' ? <EventList events={events.slice(start, start + 10)} /> : view === 'feedback' ? <div className="mt-4 divide-y divide-slate-100">{feedback.slice(start, start + 10).map(item => <article key={item.id} className="p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-slate-400"><MessageSquare size={15} /></span><h3 className="text-sm font-semibold capitalize text-slate-800">{item.category}</h3></div><Badge tone={item.status === 'resolved' ? 'green' : item.status === 'open' ? 'amber' : 'neutral'}>{item.status}</Badge></div><p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{item.message}</p><time dateTime={item.created_at} className="mt-3 block text-[11px] text-slate-400">{stamp(item.created_at)}</time></article>)}</div> : <div className="mt-4 divide-y divide-slate-100">{roles.slice(start, start + 10).map(role => <article key={role.id} className="flex flex-wrap items-start gap-3 p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 font-semibold text-emerald-700"><ShieldCheck size={18} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-slate-800">{role.user_id === userId ? 'Your account' : 'Administrator account'}</h3>{role.user_id === userId && <span className="text-[10px] font-medium text-slate-400">YOU</span>}</div>{role.user_id === userId && email && <p className="mt-1 break-all text-xs text-slate-500">{email}</p>}<p className="mt-2 flex items-center gap-2"><code className="break-all text-[10px] text-slate-400">{role.user_id}</code><button aria-label={`Copy user ID ${role.user_id}`} className="shrink-0 text-slate-400 hover:text-emerald-700" onClick={() => void copyId(role.user_id)}><Copy size={12} /></button></p><p className="mt-2 text-[11px] text-slate-400">Granted {stamp(role.granted_at)}</p></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-600">{role.role === 'super_admin' ? 'Super admin' : 'Admin'}</span><Badge tone={role.is_active ? 'green' : 'neutral'}>{role.is_active ? 'Active' : 'Inactive'}</Badge></div></article>)}</div>}
                {pageControls}
            </section>}
            <footer className="flex flex-wrap items-center justify-between gap-3 pb-2 text-[10px] leading-5 text-slate-400"><p className="flex items-center gap-1.5"><ShieldCheck size={12} />Protected by Supabase access policies · Read-only workspace</p><Link to="/help" className="flex items-center gap-1.5 hover:text-emerald-700"><CircleHelp size={12} />Help center <ArrowUpRight size={11} /></Link></footer>
        </section>
    </div></div>
}
