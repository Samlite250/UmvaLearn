import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Library, Search, Filter, Heart, Pencil, Trash2, ExternalLink, Download, LoaderCircle } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuth } from '@/hooks/useAuth'
import { deleteLibraryItem, getLibraryItems, updateLibraryItem } from '@/lib/persistence'
import { supabase } from '@/lib/supabase'
import type { LibraryItem } from '@/lib/types'

const TYPE_LABELS: Record<LibraryItem['type'], string> = {
    text: 'Text',
    transcript: 'Transcript',
    translation: 'Translation',
    explanation: 'Explanation',
    audio: 'Audio',
}

export default function LibraryPage() {
    const { t } = useTranslation()
    const { user, isLoading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [items, setItems] = useState<LibraryItem[]>([])
    const [query, setQuery] = useState('')
    const [type, setType] = useState<'all' | LibraryItem['type']>('all')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (authLoading) return
        setLoading(true)
        getLibraryItems()
            .then(setItems)
            .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load your Library.'))
            .finally(() => setLoading(false))
    }, [authLoading, user])

    const filteredItems = useMemo(() => items.filter((item) => {
        const matchesType = type === 'all' || item.type === type
        const needle = query.trim().toLowerCase()
        return matchesType && (!needle || item.title.toLowerCase().includes(needle) || item.content.toLowerCase().includes(needle))
    }), [items, query, type])

    const toggleFavourite = async (item: LibraryItem) => {
        const value = !item.is_favourite
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_favourite: value } : entry))
        try {
            await updateLibraryItem(item.id, { is_favourite: value })
        } catch (reason) {
            setItems((current) => current.map((entry) => entry.id === item.id ? item : entry))
            setError(reason instanceof Error ? reason.message : 'Could not update favourite.')
        }
    }

    const renameItem = async (item: LibraryItem) => {
        const title = window.prompt('Rename this item', item.title)?.trim()
        if (!title || title === item.title) return
        await updateLibraryItem(item.id, { title })
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, title } : entry))
    }

    const removeItem = async (item: LibraryItem) => {
        if (!window.confirm(`Delete “${item.title}” from your Library?`)) return
        await deleteLibraryItem(item.id)
        if (item.audio_path) await supabase.storage.from('audio').remove([item.audio_path])
        setItems((current) => current.filter((entry) => entry.id !== item.id))
    }

    const downloadItem = async (item: LibraryItem) => {
        if (item.audio_path) {
            const { data, error: signedError } = await supabase.storage.from('audio').createSignedUrl(item.audio_path, 60)
            if (signedError) throw signedError
            window.location.assign(data.signedUrl)
            return
        }
        const blob = new Blob([item.content], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `${item.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'umvalearn'}.txt`
        anchor.click()
        URL.revokeObjectURL(url)
    }

    const reopenItem = (item: LibraryItem) => {
        if (item.type === 'audio' || item.type === 'text') navigate('/tools/tts', { state: { text: item.content, language: item.source_lang } })
        else if (item.type === 'transcript') navigate('/tools/stt', { state: { transcript: item.content, language: item.source_lang } })
        else navigate('/tools/translate', { state: { text: item.content, sourceLang: item.source_lang, targetLang: item.target_lang } })
    }

    return (
        <div className="min-h-screen bg-mint-50 py-5 sm:py-8">
            <div className="max-w-5xl mx-auto px-3 sm:px-6">
                <div className="mb-5 sm:mb-8 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><Library size={20} className="text-amber-600" /></div>
                        <div><h1 className="text-2xl font-bold text-navy-900">{t('nav.my_library')}</h1><p className="text-sm text-gray-500">Your saved study materials</p></div>
                    </div>
                    {user && <span className="text-sm text-gray-500">{items.length} {items.length === 1 ? 'item' : 'items'}</span>}
                </div>

                {user && (
                    <div className="flex gap-3 mb-6 flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search your library..." className="input-field pl-9" />
                        </div>
                        <label className="relative flex items-center">
                            <Filter size={14} className="absolute left-3 text-gray-400 pointer-events-none" />
                            <select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="input-field pl-9 pr-8 appearance-none">
                                <option value="all">All types</option>
                                {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </label>
                    </div>
                )}

                {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

                {loading ? (
                    <div className="flex justify-center py-16"><LoaderCircle className="animate-spin text-emerald-700" /></div>
                ) : !user ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-10 sm:p-16 text-center">
                        <Library size={30} className="mx-auto mb-4 text-amber-500" />
                        <h2 className="text-lg font-bold text-navy-900 mb-2">Sign in to use your Library</h2>
                        <p className="text-sm text-gray-500 mb-6">Save translations, transcripts, explanations, and audio securely across your devices.</p>
                        <button onClick={() => navigate('/auth/signin')} className="btn-primary">Sign in</button>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-10 sm:p-16 text-center">
                        <Library size={30} className="mx-auto mb-4 text-amber-500" />
                        <h2 className="text-lg font-bold text-navy-900 mb-2">{items.length ? 'No matching items' : 'Your library is empty'}</h2>
                        <p className="text-sm text-gray-500">Save a result from any study tool and it will appear here.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredItems.map((item) => (
                            <article key={item.id} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
                                <div className="flex items-start justify-between gap-3">
                                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{TYPE_LABELS[item.type]}</span>
                                    <button onClick={() => void toggleFavourite(item)} className="p-1 text-gray-400 hover:text-red-500" aria-label={item.is_favourite ? 'Remove favourite' : 'Add favourite'}><Heart size={17} fill={item.is_favourite ? 'currentColor' : 'none'} className={item.is_favourite ? 'text-red-500' : ''} /></button>
                                </div>
                                <h2 className="mt-3 font-bold text-navy-900 line-clamp-1">{item.title}</h2>
                                <p className="mt-1 flex-1 text-sm text-gray-500 line-clamp-3">{item.content || 'Saved audio'}</p>
                                <p className="mt-3 text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</p>
                                <div className="mt-4 flex items-center gap-1 border-t border-gray-100 pt-3">
                                    <button onClick={() => reopenItem(item)} className="p-2 text-gray-400 hover:text-emerald-700" aria-label="Open"><ExternalLink size={16} /></button>
                                    <button onClick={() => void downloadItem(item)} className="p-2 text-gray-400 hover:text-emerald-700" aria-label="Download"><Download size={16} /></button>
                                    <button onClick={() => void renameItem(item)} className="p-2 text-gray-400 hover:text-emerald-700" aria-label="Rename"><Pencil size={16} /></button>
                                    <button onClick={() => void removeItem(item)} className="ml-auto p-2 text-gray-400 hover:text-red-600" aria-label="Delete"><Trash2 size={16} /></button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
