import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Clock, Headphones, Mic, Globe } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import TextToSpeech from './TextToSpeech'
import SpeechToText from './SpeechToText'
import Translate from './Translate'
import { getHistory } from '@/lib/persistence'
import type { HistoryEntry } from '@/lib/types'
import { UmvaAiLauncher } from '@/components/UmvaAiLauncher'

type ActiveTool = 'tts' | 'stt' | 'translate'

export default function Home() {
    const { t } = useTranslation()
    const [searchParams, setSearchParams] = useSearchParams()
    const requestedTool = searchParams.get('tool')
    const activeTool: ActiveTool = requestedTool === 'tts' || requestedTool === 'stt' ? requestedTool : 'translate'
    const setActiveTool = (tool: ActiveTool) => setSearchParams(current => {
        const next = new URLSearchParams(current)
        next.set('tool', tool)
        return next
    })
    const [recentActivity, setRecentActivity] = useState<HistoryEntry[]>([])

    useEffect(() => {
        const refresh = () => getHistory().then((entries) => setRecentActivity(entries.slice(0, 3))).catch(() => setRecentActivity([]))
        void refresh()
        window.addEventListener('umvalearn:history', refresh)
        return () => window.removeEventListener('umvalearn:history', refresh)
    }, [])

    const tools: { id: ActiveTool; label: string; icon: React.ElementType }[] = [
        { id: 'tts', label: t('tool.tts'), icon: Headphones },
        { id: 'stt', label: t('tool.stt'), icon: Mic },
        { id: 'translate', label: t('tool.translate'), icon: Globe },
    ]

    return (
        <div className="relative min-h-screen overflow-hidden bg-transparent">
            <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
                <div className="text-center mb-6 sm:mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-2">{t('home.heading')}</h1>
                    <p className="text-gray-500 text-base">{t('home.subheading')}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6" role="tablist" aria-label="Study tools">
                    {tools.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setActiveTool(id)}
                            onKeyDown={event => {
                                const index = tools.findIndex(tool => tool.id === id)
                                const nextIndex = event.key === 'ArrowRight' ? (index + 1) % tools.length : event.key === 'ArrowLeft' ? (index + tools.length - 1) % tools.length : event.key === 'Home' ? 0 : event.key === 'End' ? tools.length - 1 : -1
                                if (nextIndex < 0) return
                                event.preventDefault()
                                const next = tools[nextIndex]!
                                setActiveTool(next.id)
                                document.getElementById(`dashboard-${next.id}-tab`)?.focus()
                            }}
                            className={cn(
                                'min-w-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-5 py-2.5 rounded-xl border-2 text-xs sm:text-sm font-semibold transition-all duration-200',
                                activeTool === id
                                    ? 'bg-emerald-700 border-emerald-700 text-white shadow-md'
                                    : 'bg-white/95 border-gray-200 text-gray-700 hover:border-emerald-300 hover:text-emerald-700'
                            )}
                            role="tab"
                            id={`dashboard-${id}-tab`}
                            tabIndex={activeTool === id ? 0 : -1}
                            aria-selected={activeTool === id}
                            aria-controls={`dashboard-${id}-panel`}
                        >
                            <Icon size={16} /> {label}
                        </button>
                    ))}
                </div>

                <div id="dashboard-translate-panel" role="tabpanel" aria-labelledby="dashboard-translate-tab" className={activeTool === 'translate' ? 'block mb-8' : 'hidden'}><Translate embedded /></div>
                <div id="dashboard-tts-panel" role="tabpanel" aria-labelledby="dashboard-tts-tab" className={activeTool === 'tts' ? 'block mb-8' : 'hidden'}><TextToSpeech embedded /></div>
                <div id="dashboard-stt-panel" role="tabpanel" aria-labelledby="dashboard-stt-tab" className={activeTool === 'stt' ? 'block mb-8' : 'hidden'}><SpeechToText embedded /></div>

                <div className="flex items-center justify-between mb-4">
                    <h2 className="flex items-center gap-2 font-bold text-navy-900 text-lg"><Clock size={18} className="text-gray-400" />{t('home.recent_activity')}</h2>
                    <Link to="/history" className="text-sm text-emerald-700 hover:text-emerald-800 font-medium">{t('home.view_all')} →</Link>
                </div>
                {recentActivity.length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {recentActivity.map((entry) => {
                            const Icon = entry.tool === 'tts' ? Headphones : entry.tool === 'stt' ? Mic : Globe
                            return <div key={entry.id} className="bg-white/95 backdrop-blur-sm rounded-xl border border-emerald-100 shadow-sm p-4 hover:border-emerald-300 hover:shadow-md transition-all">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-emerald-50"><Icon size={16} className="text-emerald-700" /></div>
                                <p className="text-sm font-semibold text-navy-900 line-clamp-1">{entry.output_text || entry.input_text}</p>
                                <p className="text-xs text-gray-400 mt-0.5 capitalize">{entry.tool} · {entry.source_lang}{entry.target_lang ? ` → ${entry.target_lang}` : ''}</p>
                                <p className="text-xs text-gray-400 mt-1">{new Date(entry.created_at).toLocaleString()}</p>
                            </div>
                        })}
                    </div>
                ) : <div className="rounded-xl border border-dashed border-emerald-200 bg-white/70 p-6 text-center text-sm text-gray-500">{t('home.no_activity')}</div>}
            </div>
            <UmvaAiLauncher />
        </div>
    )
}
