import { readApiResponse } from '@/lib/apiResponse'
import { TranslatedSpeech } from '@/components/TranslatedSpeech'
import { useState, useRef, useEffect } from 'react'
import { Mic, Square, UploadCloud, Copy, Download, Bookmark, RefreshCw, Play, Pause, Zap, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AuthDialog } from '@/components/auth/AuthDialog'
import { useTranslation } from '@/hooks/useTranslation'
import { useAppStore } from '@/store/appStore'
import type { ContentLanguage } from '@/lib/types'
import { apiUrl } from '@/lib/api'
import { recordHistory, saveLibraryItem } from '@/lib/persistence'
import { useAuth } from '@/hooks/useAuth'
import { useLocation } from 'react-router-dom'

const LANG_OPTIONS: { code: ContentLanguage; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'rw', label: 'Kinyarwanda', flag: '🇷🇼' },
]

type RecordState = 'idle' | 'recording' | 'preview' | 'transcribing' | 'done'

export default function SpeechToText({ embedded = false }: { embedded?: boolean }) {
    const { t } = useTranslation()
    const studyLevel = useAppStore((s) => s.studyLevel)
    const { user } = useAuth()
    const location = useLocation()
    const reopened = location.state as { transcript?: string; language?: ContentLanguage } | null
    const [recordState, setRecordState] = useState<RecordState>(reopened?.transcript ? 'done' : 'idle')
    const [language, setLanguage] = useState<ContentLanguage>(reopened?.language ?? 'en')
    const [editedTranscript, setEditedTranscript] = useState(reopened?.transcript ?? '')
    const [timer, setTimer] = useState(0)
    const [micError, setMicError] = useState<string | null>(null)
    const [authOpen, setAuthOpen] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [copied, setCopied] = useState(false)
    const [sttError, setSttError] = useState<string | null>(null)
    const [explanation, setExplanation] = useState('')
    const [isExplaining, setIsExplaining] = useState(false)

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const audioBlobRef = useRef<Blob | null>(null)
    const previewAudioRef = useRef<HTMLAudioElement | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => () => {
        if (timerRef.current) clearInterval(timerRef.current)
        const recorder = mediaRecorderRef.current
        if (recorder) {
            recorder.onstop = null
            if (recorder.state !== 'inactive') recorder.stop()
            recorder.stream.getTracks().forEach(track => track.stop())
        }
        if (previewAudioRef.current) {
            previewAudioRef.current.pause()
            URL.revokeObjectURL(previewAudioRef.current.src)
        }
    }, [])
    const clearPreview = () => {
        if (previewAudioRef.current) {
            previewAudioRef.current.pause()
            URL.revokeObjectURL(previewAudioRef.current.src)
        }
        setIsPlaying(false)
    }

    const startRecording = async () => {
        try {
            clearPreview()
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            setMicError(null)
            setSttError(null)
            chunksRef.current = []

            const mr = new MediaRecorder(stream)
            mediaRecorderRef.current = mr

            mr.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }
            mr.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
                audioBlobRef.current = blob
                // Create preview audio
                const url = URL.createObjectURL(blob)
                previewAudioRef.current = new Audio(url)
                previewAudioRef.current.onended = () => setIsPlaying(false)
                // Stop all tracks
                stream.getTracks().forEach((t) => t.stop())
                setRecordState('preview')
            }

            mr.start(250) // collect chunks every 250ms
            setRecordState('recording')
            setTimer(0)
            timerRef.current = setInterval(() => setTimer((v) => v + 1), 1000)
        } catch {
            setMicError(
                'Microphone access was denied. Please allow microphone access in your browser settings and try again.'
            )
        }
    }

    const stopRecording = () => {
        if (timerRef.current) clearInterval(timerRef.current)
        mediaRecorderRef.current?.stop()
    }

    const discardRecording = () => {
        clearPreview()
        audioBlobRef.current = null
        previewAudioRef.current = null
        setRecordState('idle')
        setTimer(0)
    }

    const transcribeRecording = async () => {
        if (!audioBlobRef.current) return
        setRecordState('transcribing')
        setSttError(null)

        try {
            // Convert blob to base64
            const arrayBuffer = await audioBlobRef.current.arrayBuffer()
            const uint8 = new Uint8Array(arrayBuffer)
            let binary = ''
            uint8.forEach((b) => { binary += String.fromCharCode(b) })
            const audioBase64 = btoa(binary)
            const mimeType = audioBlobRef.current.type || 'audio/webm'

            const res = await fetch(apiUrl('/api/stt'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioBase64, mimeType, language }),
            })

            if (!res.ok) {
                const err = await readApiResponse(res)
                throw new Error(err.error ?? 'Transcription failed')
            }

            const data = await readApiResponse(res, ['transcript'])
            const text = data.transcript ?? ''
            setEditedTranscript(text)
            setRecordState('done')
            await recordHistory({ tool: 'stt', input_text: '[Audio recording]', output_text: text, source_lang: language })
        } catch (err: unknown) {
            setSttError(err instanceof Error ? err.message : 'Transcription failed')
            setRecordState('preview') // allow retry
        }
    }

    const handleAudioUpload = (file: File | undefined) => {
        if (!file) return
        const acceptedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/mp4']
        if (!acceptedTypes.includes(file.type)) {
            setSttError('Unsupported file format. Upload MP3, WAV, M4A, OGG, or WebM audio.')
            return
        }
        if (file.size > 25 * 1024 * 1024) {
            setSttError('Audio file exceeds the 25 MB limit.')
            return
        }
        clearPreview()
        audioBlobRef.current = file
        const url = URL.createObjectURL(file)
        previewAudioRef.current = new Audio(url)
        previewAudioRef.current.onended = () => setIsPlaying(false)
        setTimer(0)
        setSttError(null)
        setRecordState('preview')
    }

    const saveTranscript = async () => {
        if (!user) {
            setAuthOpen(true)
            return
        }
        await saveLibraryItem({
            type: 'transcript',
            title: `Transcript · ${new Date().toLocaleDateString()}`,
            content: editedTranscript,
            source_lang: language,
        })
    }

    const explainTranscript = async () => {
        if (!editedTranscript.trim()) return
        setIsExplaining(true)
        setSttError(null)
        try {
            const response = await fetch(apiUrl('/api/explain'), {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: editedTranscript, level: studyLevel, language }),
            })
            const data = await readApiResponse(response, ['explanation'])
            if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Explanation failed')
            setExplanation(data.explanation ?? '')
        } catch (reason) {
            setSttError(reason instanceof Error ? reason.message : 'Explanation failed')
        } finally {
            setIsExplaining(false)
        }
    }

    const handlePlayPause = async () => {
        if (!previewAudioRef.current) return
        if (isPlaying) {
            previewAudioRef.current.pause()
        } else {
            try { await previewAudioRef.current.play() } catch { setSttError('Unable to play the recording. Please try again.'); return }
        }
        setIsPlaying((v) => !v)
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(editedTranscript)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDownload = () => {
        const blob = new Blob([editedTranscript], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'transcript.txt'
        a.click()
        URL.revokeObjectURL(url)
    }

    const formatTime = (s: number) =>
        `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

    return (
        <div className={embedded ? 'py-1' : 'min-h-screen bg-mint-50 py-5 sm:py-8'}>
            <div className={embedded ? 'max-w-3xl mx-auto' : 'max-w-3xl mx-auto px-3 sm:px-6'}>
                {!embedded && <div className="mb-5 sm:mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Mic size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-navy-900">{t('tool.stt')}</h1>
                            <p className="text-sm text-gray-500">Record audio and get an editable transcript</p>
                        </div>
                    </div>
                </div>}

                <div className="space-y-5">
                    {/* Language selector */}
                    <div className="tool-panel rounded-2xl shadow-sm p-4 sm:p-5">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Spoken Language</label>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as ContentLanguage)}
                            className="input-field max-w-xs"
                            disabled={recordState === 'recording'}
                        >
                            {LANG_OPTIONS.map((l) => (
                                <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-2">Choose the language spoken in the recording for better accuracy.</p>
                    </div>

                    {/* Mic error */}
                    {micError && (
                        <div className="flex gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <p>{micError}</p>
                        </div>
                    )}

                    {/* STT API error */}
                    {sttError && (
                        <div className="flex gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <p>{sttError}</p>
                        </div>
                    )}

                    {/* Recording section */}
                    <div className="tool-panel rounded-2xl shadow-sm p-4 sm:p-5">
                        {recordState === 'idle' && (
                            <div className="flex flex-col items-center gap-4 py-6">
                                <p className="text-sm text-gray-500 font-medium">
                                    Guests may record up to 3 minutes. <button onClick={() => setAuthOpen(true)} className="text-emerald-700 hover:underline">Sign in</button> for longer recordings.
                                </p>
                                <button
                                    onClick={startRecording}
                                    className="w-20 h-20 rounded-full bg-red-50 border-4 border-red-200 flex items-center justify-center hover:bg-red-100 hover:border-red-300 transition-all group"
                                    aria-label="Start recording"
                                >
                                    <Mic size={32} className="text-red-500 group-hover:scale-110 transition-transform" />
                                </button>
                                <span className="text-sm text-gray-400">Click to start recording</span>

                                <div className="w-full border-t border-gray-100 pt-4 flex items-center justify-center">
                                    <button
                                        onClick={() => user ? fileInputRef.current?.click() : setAuthOpen(true)}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                                    >
                                        <UploadCloud size={16} />
                                        Upload audio file (sign in required)
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/webm,.mp3,.wav,.m4a,.ogg,.webm"
                                        className="hidden"
                                        onChange={(event) => handleAudioUpload(event.target.files?.[0])}
                                    />
                                </div>
                                <p className="text-xs text-gray-400">Accepted: MP3, WAV, M4A, OGG · Max 25 MB</p>
                            </div>
                        )}

                        {recordState === 'recording' && (
                            <div className="flex flex-col items-center gap-4 py-6">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-sm font-semibold text-red-600">Recording — {formatTime(timer)}</span>
                                </div>
                                <div className="flex items-center gap-0.5 h-12">
                                    {Array.from({ length: 30 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="bg-red-400 rounded-full w-1.5 animate-pulse"
                                            style={{ height: `${8 + ((i * 13) % 32)}px`, animationDelay: `${i * 50}ms` }}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={stopRecording}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
                                >
                                    <Square size={16} fill="white" />
                                    Stop Recording
                                </button>
                            </div>
                        )}

                        {recordState === 'preview' && (
                            <div className="flex flex-col items-center gap-4 py-4">
                                <p className="text-sm font-semibold text-navy-900">Recording ready — {formatTime(timer)}</p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handlePlayPause}
                                        className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center hover:bg-emerald-800 transition-colors"
                                        aria-label={isPlaying ? 'Pause' : 'Play preview'}
                                    >
                                        {isPlaying ? <Pause size={16} fill="white" color="white" /> : <Play size={16} fill="white" color="white" />}
                                    </button>
                                    <div className="flex items-center gap-0.5">
                                        {Array.from({ length: 30 }).map((_, i) => (
                                            <div key={i} className="bg-emerald-300 rounded-full w-1.5" style={{ height: `${6 + ((i * 9) % 20)}px` }} />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                                    <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={discardRecording}>
                                        Discard &amp; re-record
                                    </Button>
                                    <Button variant="primary" size="sm" onClick={transcribeRecording}>
                                        Transcribe
                                    </Button>
                                </div>
                            </div>
                        )}

                        {recordState === 'transcribing' && (
                            <div className="flex flex-col items-center gap-3 py-6">
                                <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                                <p className="text-sm text-gray-500">Transcribing your audio…</p>
                            </div>
                        )}
                    </div>

                    {/* Transcript */}
                    {recordState === 'done' && (
                        <div className="tool-panel rounded-2xl shadow-sm p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                <h2 className="text-sm font-bold text-navy-900">Transcript</h2>
                                <div className="flex flex-wrap gap-3 sm:gap-2">
                                    <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-700 transition-colors">
                                        <Copy size={13} /> {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                    <button onClick={handleDownload} className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-700 transition-colors">
                                        <Download size={13} /> Download
                                    </button>
                                    <button onClick={() => void saveTranscript()} className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-700 transition-colors">
                                        <Bookmark size={13} /> Save
                                    </button>
                                </div>
                            </div>
                            <textarea
                                value={editedTranscript}
                                onChange={(e) => setEditedTranscript(e.target.value)}
                                rows={5}
                                className="textarea-field"
                                aria-label="Editable transcript"
                            />
                            <TranslatedSpeech text={editedTranscript} sourceLanguage={language} />
                            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                                <Button variant="secondary" size="sm" icon={<Zap size={13} />} loading={isExplaining} onClick={() => void explainTranscript()}>
                                    Explain at my <span className="capitalize font-semibold text-emerald-700 ml-1">{studyLevel}</span> level
                                </Button>
                                <Button variant="secondary" size="sm" icon={<Mic size={13} />}>
                                    Read aloud
                                </Button>
                                <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={discardRecording} className="ml-auto">
                                    New recording
                                </Button>
                            </div>
                            {explanation && <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm leading-relaxed text-navy-900">{explanation}</div>}
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
