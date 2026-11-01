import { useEffect, useMemo, useState } from 'react'
import { Clock, Trash2, Search, Globe, Mic, Volume2, LoaderCircle } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { clearHistory, deleteHistoryItem, getHistory, saveLibraryItem } from '@/lib/persistence'
import { useAuth } from '@/hooks/useAuth'
import type { HistoryEntry } from '@/lib/types'

const toolIcons = { translate: Globe, tts: Volume2, stt: Mic }
const toolColors = { translate: 'bg-purple-50 text-purple-600', tts: 'bg-emerald-50 text-emerald-600', stt: 'bg-blue-50 text-blue-600' }

export default function HistoryPage() {
    const { t } = useTranslation()
    const { user, isLoading: authLoading } = useAuth()
    const [entries, setEntries] = useState<HistoryEntry[]>([])
    const [query, setQuery] = useState('')
    const [tool, setTool] = useState<'all' | HistoryEntry['tool']>('all')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        setLoading(true)
        getHistory().then(setEntries).finally(() => setLoading(false))
    }, [authLoading, user])

    const filtered = useMemo(() => entries.filter((entry) => {
        const needle = query.trim().toLowerCase()
        return (tool === 'all' || entry.tool === tool) && (!needle || entry.input_text.toLowerCase().includes(needle) || entry.output_text?.toLowerCase().includes(needle))
    }), [entries, query, tool])

    const remove = async (id: string) => {
        await deleteHistoryItem(id)
        setEntries((current) => current.filter((entry) => entry.id !== id))
    }

    const clear = async () => {
        if (!window.confirm('Clear all history? Saved Library items will not be deleted.')) return
        await clearHistory()
        setEntries([])
    }

    const save = async (entry: HistoryEntry) => {
        if (!user) return
        await saveLibraryItem({
            type: entry.tool === 'stt' ? 'transcript' : entry.tool === 'translate' ? 'translation' : 'text',
            title: `${entry.tool === 'stt' ? 'Transcript' : entry.tool === 'translate' ? 'Translation' : 'Speech text'} · ${new Date(entry.created_at).toLocaleDateString()}`,
            content: entry.output_text || entry.input_text,
            source_lang: entry.source_lang,
            target_lang: entry.target_lang,
        })
        setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, is_saved: true } : item))
    }

    return (
        <div className="min-h-screen bg-mint-50 py-5 sm:py-8">
            <div className="max-w-4xl mx-auto px-3 sm:px-6">
                <div className="mb-5 sm:mb-8 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Clock size={20} className="text-blue-600" /></div><div><h1 className="text-2xl font-bold text-navy-900">{t('nav.history')}</h1><p className="text-sm text-gray-500">Your real study activity</p></div></div>
                    {!!entries.length && <button onClick={() => void clear()} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50"><Trash2 size={14} /> Clear all</button>}
                </div>

                <div className="mb-5 flex flex-wrap gap-3">
                    <div className="relative min-w-[200px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search history..." className="input-field pl-9" /></div>
                    <select value={tool} onChange={(event) => setTool(event.target.value as typeof tool)} className="input-field w-auto"><option value="all">All tools</option><option value="translate">Translate</option><option value="tts">Text to Speech</option><option value="stt">Speech to Text</option></select>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 mb-5">🔒 {user ? 'Your account history is private and available across devices.' : 'Guest history is stored only on this device. Sign in for cross-device history.'}</div>

                {loading ? <div className="flex justify-center py-16"><LoaderCircle className="animate-spin text-emerald-700" /></div> : filtered.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center"><Clock className="mx-auto mb-3 text-gray-300" /><h2 className="font-bold text-navy-900">No history yet</h2><p className="mt-1 text-sm text-gray-500">Completed translations, speech, and transcriptions will appear here.</p></div>
                ) : (
                    <div className="space-y-3">{filtered.map((entry) => { const Icon = toolIcons[entry.tool]; return (
                        <article key={entry.id} className="group flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toolColors[entry.tool]}`}><Icon size={16} /></div>
                            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-navy-900">{entry.output_text || entry.input_text}</p><p className="mt-0.5 text-xs text-gray-400 capitalize">{entry.tool} · {entry.source_lang}{entry.target_lang ? ` → ${entry.target_lang}` : ''}</p><p className="mt-1 text-xs text-gray-300">{new Date(entry.created_at).toLocaleString()}</p></div>
                            {user && <button disabled={entry.is_saved} onClick={() => void save(entry)} className="rounded-lg px-2 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:text-gray-400">{entry.is_saved ? 'Saved' : 'Save'}</button>}
                            <button onClick={() => void remove(entry.id)} className="p-2 text-gray-400 hover:text-red-500" aria-label="Delete entry"><Trash2 size={15} /></button>
                        </article>
                    )})}</div>
                )}
            </div>
        </div>
    )
}
