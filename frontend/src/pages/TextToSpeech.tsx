import { readApiResponse } from '@/lib/apiResponse'
import { useState, useRef, useEffect } from 'react'
import { Volume2, Play, Pause, Download, Copy, Bookmark, Zap, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AuthDialog } from '@/components/auth/AuthDialog'
import { useTranslation } from '@/hooks/useTranslation'
import { useAppStore } from '@/store/appStore'
import type { ContentLanguage } from '@/lib/types'
import { apiUrl } from '@/lib/api'
import { recordHistory, saveLibraryItem } from '@/lib/persistence'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useLocation } from 'react-router-dom'

const LANG_OPTIONS: { code: ContentLanguage; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'rw', label: 'Kinyarwanda', flag: '🇷🇼' },
]

// ElevenLabs voice IDs — matched to language defaults in the backend
const VOICE_OPTIONS: Record<ContentLanguage, { label: string; id: string }[]> = {
    en: [
        { label: 'Sarah — Female (English)', id: 'EXAVITQu4vr4xnSDxMaL' },
        { label: 'Adam — Male (English)', id: 'pNInz6obpgDQGcFmaJgB' },
        { label: 'Elli — Female (English)', id: 'MF3mGyEYCl7XYWbV9V6O' },
    ],
    fr: [
        { label: 'Sarah - Multilingual (French)', id: 'EXAVITQu4vr4xnSDxMaL' },
        { label: 'Charlotte - French (may require paid plan)', id: 'XB0fDUnXU5powFXDhCwa' },
        { label: 'Thomas - French (may require paid plan)', id: 'GBv7mTt0atIp3Br8iCZE' },
    ],
    rw: [
        { label: 'Kinyarwanda - Pindo voice', id: 'EXAVITQu4vr4xnSDxMaL' },
    ],
}

export default function TextToSpeech({ embedded = false }: { embedded?: boolean }) {
    const { t } = useTranslation()
    const studyLevel = useAppStore((s) => s.studyLevel)
    const { user } = useAuth()
    const location = useLocation()
    const reopened = location.state as { text?: string; language?: ContentLanguage } | null
    const [text, setText] = useState(reopened?.text ?? '')
    const [language, setLanguage] = useState<ContentLanguage>(reopened?.language ?? 'en')
    const [sourceLanguage, setSourceLanguage] = useState<ContentLanguage>(reopened?.language ?? 'en')
    const [spokenText, setSpokenText] = useState('')
    const [voiceId, setVoiceId] = useState(VOICE_OPTIONS[reopened?.language ?? 'en'][0].id)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [audioDuration, setAudioDuration] = useState('0:00')
    const [durationSeconds, setDurationSeconds] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [playbackRate, setPlaybackRate] = useState(1)
    const [volume, setVolume] = useState(1)
    const [authOpen, setAuthOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [explanation, setExplanation] = useState('')
    const [isExplaining, setIsExplaining] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        audioRef.current?.pause()
        setIsPlaying(false); setAudioUrl(null); setSpokenText(''); setCurrentTime(0)
    }, [text, language, sourceLanguage, voiceId])
    useEffect(() => () => { audioRef.current?.pause(); if (audioUrl) URL.revokeObjectURL(audioUrl) }, [audioUrl])

    const handleLanguageChange = (lang: ContentLanguage) => {
        setLanguage(lang)
        setVoiceId(VOICE_OPTIONS[lang][0].id)
        setAudioUrl(null)
        setIsPlaying(false)
    }

    const handleGenerate = async () => {
        if (!text.trim()) return
        setIsGenerating(true)
        setError(null)
        setAudioUrl(null)
        audioRef.current?.pause()
        setIsPlaying(false)

        try {
            let output = text
            if (sourceLanguage !== language) {
                const response = await fetch(apiUrl('/api/translate'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, sourceLang: sourceLanguage, targetLang: language }) })
                const result = await readApiResponse(response, ['translatedText'])
                if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Translation failed')
                output = result.translatedText
            }
            setSpokenText(output)
            const res = await fetch(apiUrl('/api/tts'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: output, language, voice: voiceId }),
            })
            if (!res.ok) {
                const err = await readApiResponse(res)
                throw new Error(err.error ?? 'TTS failed')
            }
            const data = await readApiResponse(res, ['audioBase64', 'audioMimeType'])

            // Convert base64 to blob URL
            const bytes = Uint8Array.from(atob(data.audioBase64), (c) => c.charCodeAt(0))
            const blob = new Blob([bytes], { type: data.audioMimeType })
            const url = URL.createObjectURL(blob)
            setAudioUrl(url)

            // Create audio element to get duration
            const audio = new Audio(url)
            audioRef.current = audio
            audio.playbackRate = playbackRate
            audio.volume = volume
            audio.onloadedmetadata = () => {
                const m = Math.floor(audio.duration / 60)
                const s = Math.floor(audio.duration % 60)
                setAudioDuration(`${m}:${String(s).padStart(2, '0')}`)
                setDurationSeconds(audio.duration)
            }
            audio.ontimeupdate = () => setCurrentTime(audio.currentTime)
            audio.onended = () => setIsPlaying(false)
            await recordHistory({ tool: 'tts', input_text: text, source_lang: sourceLanguage, target_lang: language, output_text: output })
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to generate audio')
        } finally {
            setIsGenerating(false)
        }
    }

    const handlePlayPause = async () => {
        if (!audioRef.current) return
        if (isPlaying) {
            audioRef.current.pause()
        } else {
            try { await audioRef.current.play() } catch { setError('Audio playback failed. Please try again.'); return }
        }
        setIsPlaying((v) => !v)
    }

    const handleDownload = () => {
        if (!audioUrl) return
        if (!user) {
            setAuthOpen(true)
            return
        }
        const a = document.createElement('a')
        a.href = audioUrl
        a.download = `umvalearn-tts-${language}.${language === 'rw' ? 'wav' : 'mp3'}`
        a.click()
    }

    const saveAudio = async () => {
        if (!audioUrl || !user) {
            setAuthOpen(true)
            return
        }
        const blob = await fetch(audioUrl).then((response) => response.blob())
        const path = `${user.id}/${crypto.randomUUID()}.${language === 'rw' ? 'wav' : 'mp3'}`
        const { error: uploadError } = await supabase.storage.from('audio').upload(path, blob, { contentType: blob.type })
        if (uploadError) throw uploadError
        await saveLibraryItem({
            type: 'audio',
            title: `Speech · ${new Date().toLocaleDateString()}`,
            content: spokenText,
            source_lang: language,
            audio_path: path,
        })
    }

    const formatAudioTime = (seconds: number) => {
        if (!Number.isFinite(seconds)) return '0:00'
        return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const explainText = async () => {
        if (!text.trim()) return
        setIsExplaining(true)
        setError(null)
        try {
            const response = await fetch(apiUrl('/api/explain'), {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, level: studyLevel, language }),
            })
            const data = await readApiResponse(response, ['explanation'])
            if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Explanation failed')
            setExplanation(data.explanation ?? '')
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Explanation failed')
        } finally {
            setIsExplaining(false)
        }
    }

    const saveExplanation = async () => {
        if (!user) { setAuthOpen(true); return }
        await saveLibraryItem({ type: 'explanation', title: `Explanation · ${new Date().toLocaleDateString()}`, content: explanation, source_lang: language })
    }

    return (
        <div className={embedded ? 'py-1' : 'min-h-screen bg-mint-50 py-5 sm:py-8'}>
            <div className={embedded ? 'max-w-3xl mx-auto' : 'max-w-3xl mx-auto px-3 sm:px-6'}>
                {/* Header */}
                {!embedded && <div className="mb-5 sm:mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <Volume2 size={20} className="text-emerald-700" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-navy-900">{t('tool.tts')}</h1>
                            <p className="text-sm text-gray-500">Convert your text into natural-sounding speech</p>
                        </div>
                    </div>
                </div>}

                <div className="space-y-5">
                    {/* Language + Voice selectors */}
                    <div className="tool-panel rounded-2xl shadow-sm p-4 sm:p-5">
                        <div className="flex flex-wrap gap-4">
                            <label className="flex-1 min-w-[160px] text-xs font-semibold text-gray-500">Input language
                                <select className="input-field mt-2" value={sourceLanguage} disabled={isGenerating} onChange={e => setSourceLanguage(e.target.value as ContentLanguage)}>
                                    {LANG_OPTIONS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                                </select>
                            </label>
                            <div className="flex-1 min-w-[160px]">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Output language</label>
                                <div className="relative">
                                    <select
                                        value={language}
                                        disabled={isGenerating}
                                        onChange={(e) => handleLanguageChange(e.target.value as ContentLanguage)}
                                        className="input-field pr-9 appearance-none"
                                    >
                                        {LANG_OPTIONS.map((l) => (
                                            <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-[min(220px,100%)]">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Voice</label>
                                <div className="relative">
                                    <select
                                        value={voiceId}
                                        disabled={isGenerating}
                                        onChange={(e) => setVoiceId(e.target.value)}
                                        className="input-field pr-9 appearance-none"
                                    >
                                        {VOICE_OPTIONS[language].map((v) => (
                                            <option key={v.id} value={v.id}>{v.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                        {language === 'rw' && (
                            <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
                                Kinyarwanda audio uses Pindo. The public service has usage limits.
                            </div>
                        )}
                    </div>

                    {/* Text input */}
                    <div className="tool-panel rounded-2xl shadow-sm p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Text</label>
                            <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-700 transition-colors">
                                <Copy size={13} />
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <textarea
                            value={text}
                            disabled={isGenerating}
                            onChange={(e) => setText(e.target.value.slice(0, 2000))}
                            placeholder="Type or paste your text here..."
                            rows={6}
                            className="textarea-field"
                            aria-label="Text to convert to speech"
                        />
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                            <span className="text-xs text-gray-400">{text.length}/2000</span>
                            <button onClick={() => setText('')} className="text-xs text-gray-400 hover:text-gray-600 transition-colors" disabled={!text || isGenerating}>
                                Clear
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Generate button */}
                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full gap-2"
                        icon={<Zap size={18} />}
                        onClick={handleGenerate}
                        loading={isGenerating}
                        disabled={!text.trim()}
                    >
                        {isGenerating ? 'Generating audio…' : 'Generate Audio'}
                    </Button>

                    {spokenText && sourceLanguage !== language && <div className="tool-panel rounded-xl p-4"><p className="text-xs text-gray-500 mb-2">Translated spoken text</p><p lang={language}>{spokenText}</p></div>}
                    {/* Audio player — shown when audio is ready */}
                    {audioUrl && (
                        <div className="tool-panel rounded-2xl shadow-sm p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <button
                                    onClick={handlePlayPause}
                                    className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center hover:bg-emerald-800 transition-colors shrink-0"
                                    aria-label={isPlaying ? 'Pause' : 'Play'}
                                >
                                    {isPlaying
                                        ? <Pause size={16} fill="white" color="white" />
                                        : <Play size={16} fill="white" color="white" />}
                                </button>
                                {/* Waveform */}
                                <div className="flex items-center gap-0.5 flex-1">
                                    {Array.from({ length: 40 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`rounded-full w-1 transition-all ${isPlaying && i < 20 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-200'}`}
                                            style={{ height: `${8 + ((i * 11) % 20)}px` }}
                                        />
                                    ))}
                                </div>
                                <span className="text-xs text-gray-400 shrink-0">{audioDuration}</span>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] items-center mb-4">
                                <label className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="w-9 tabular-nums">{formatAudioTime(currentTime)}</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max={durationSeconds || 0}
                                        step="0.1"
                                        value={Math.min(currentTime, durationSeconds || 0)}
                                        onChange={(event) => {
                                            const nextTime = Number(event.target.value)
                                            setCurrentTime(nextTime)
                                            if (audioRef.current) audioRef.current.currentTime = nextTime
                                        }}
                                        className="w-full accent-emerald-700"
                                        aria-label="Seek audio"
                                    />
                                    <span className="w-9 tabular-nums text-right">{audioDuration}</span>
                                </label>
                                <label className="flex items-center gap-2 text-xs text-gray-500">
                                    Speed
                                    <select
                                        value={playbackRate}
                                        onChange={(event) => {
                                            const rate = Number(event.target.value)
                                            setPlaybackRate(rate)
                                            if (audioRef.current) audioRef.current.playbackRate = rate
                                        }}
                                        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5"
                                    >
                                        {[0.75, 1, 1.25, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}
                                    </select>
                                </label>
                                <label className="flex items-center gap-2 text-xs text-gray-500">
                                    <Volume2 size={14} />
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={volume}
                                        onChange={(event) => {
                                            const nextVolume = Number(event.target.value)
                                            setVolume(nextVolume)
                                            if (audioRef.current) audioRef.current.volume = nextVolume
                                        }}
                                        className="w-20 accent-emerald-700"
                                        aria-label="Volume"
                                    />
                                </label>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button variant="secondary" size="sm" icon={<Copy size={13} />} onClick={handleCopy}>Copy text</Button>
                                <Button variant="secondary" size="sm" icon={<Bookmark size={13} />} onClick={() => void saveAudio()}>Save to Library</Button>
                                <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={handleDownload} className="ml-auto">Download MP3</Button>
                            </div>
                        </div>
                    )}

                    {/* Explanation panel */}
                    {text.trim() && (
                        <div className="tool-panel rounded-2xl shadow-sm p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-navy-900">Explain at my level</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Get a <span className="text-emerald-700 font-semibold capitalize">{studyLevel}</span>-level explanation
                                    </p>
                                </div>
                                <Button variant="secondary" size="sm" icon={<Zap size={13} />} loading={isExplaining} onClick={() => void explainText()}>Explain</Button>
                            </div>
                            {explanation && (
                                <div className="mt-4 border-t border-gray-100 pt-4">
                                    <p className="text-sm leading-relaxed text-navy-900">{explanation}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Button variant="secondary" size="sm" icon={<Copy size={13} />} onClick={() => navigator.clipboard.writeText(explanation)}>Copy</Button>
                                        <Button variant="secondary" size="sm" icon={<Bookmark size={13} />} onClick={() => void saveExplanation()}>Save explanation</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {authOpen && (
                <AuthDialog
                    onClose={() => setAuthOpen(false)}
                    onCreateAccount={() => { setAuthOpen(false); window.location.href = '/auth/signup' }}
                    onSignIn={() => { setAuthOpen(false); window.location.href = '/auth/signin' }}
                />
            )}
        </div>
    )
}
