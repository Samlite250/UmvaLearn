import { readApiResponse } from '@/lib/apiResponse'
import { SpeechInput } from '@/components/SpeechInput'
import { TranslatedSpeech } from '@/components/TranslatedSpeech'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
    ArrowLeftRight, Globe, Copy,
    CheckSquare, Info, Zap, ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AuthDialog } from '@/components/auth/AuthDialog'
import { useTranslation } from '@/hooks/useTranslation'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'
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

export default function Translate({ embedded = false }: { embedded?: boolean }) {
    const { t } = useTranslation()
    const studyLevel = useAppStore((s) => s.studyLevel)
    const { user } = useAuth()
    const location = useLocation()
    const reopened = location.state as { text?: string; sourceLang?: ContentLanguage; targetLang?: ContentLanguage } | null
    const [sourceLang, setSourceLang] = useState<ContentLanguage>(reopened?.sourceLang ?? 'en')
    const [targetLang, setTargetLang] = useState<ContentLanguage>(reopened?.targetLang ?? 'rw')
    const [sourceText, setSourceText] = useState(reopened?.text ?? '')
    const [translatedText, setTranslatedText] = useState('')
    const [autoTranslate, setAutoTranslate] = useState(false)
    const [isTranslating, setIsTranslating] = useState(false)
    const [translationProvider, setTranslationProvider] = useState('')
    const [translationError, setTranslationError] = useState('')
    const [showExplanation, setShowExplanation] = useState(false)
    const [explanation, setExplanation] = useState('')
    const [isExplaining, setIsExplaining] = useState(false)
    const [explanationError, setExplanationError] = useState<string | null>(null)
    const [authOpen, setAuthOpen] = useState(false)
    const [authFeature, setAuthFeature] = useState('')
    const [copiedSrc, setCopiedSrc] = useState(false)
    const [copiedTgt, setCopiedTgt] = useState(false)
    const translateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const automaticTranslationBlocked = useRef(false)
    const abortRef = useRef<AbortController | null>(null)

    const swapLangs = () => {
        setSourceLang(targetLang)
        setTargetLang(sourceLang)
        setSourceText(translatedText)
        setTranslatedText(sourceText)
    }

    /** Core translate function — calls backend API */
    const doTranslate = useCallback(async (text: string, from: ContentLanguage, to: ContentLanguage, saveToHistory = false) => {
        if (automaticTranslationBlocked.current && !saveToHistory) return
        abortRef.current?.abort()
        setTranslationError('')
        if (!text.trim()) {
            setIsTranslating(false)
            setTranslatedText('')
            return
        }
        if (from === to) {
            setIsTranslating(false)
            setTranslatedText(text)
            return
        }

        // Cancel any in-flight request
        if (abortRef.current) abortRef.current.abort()
        const controller = new AbortController()
        abortRef.current = controller

        setIsTranslating(true)
        try {
            const res = await fetch(apiUrl('/api/translate'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, sourceLang: from, targetLang: to }),
                signal: controller.signal,
            })
            const data = await readApiResponse(res, ['translatedText'])
            if (!res.ok) {
                if (data.retryable === false) automaticTranslationBlocked.current = true
                throw new Error(typeof data.error === 'string' ? data.error : 'Translation failed')
            }
            automaticTranslationBlocked.current = false
            if (controller.signal.aborted) return
            const result = data.translatedText
            if (!result) throw new Error('The translation was empty. Please try again.')
            setTranslatedText(result)
            setTranslationProvider(data.provider || '')
            if (saveToHistory) {
                await recordHistory({ tool: 'translate', input_text: text, output_text: result, source_lang: from, target_lang: to })
            }
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === 'AbortError') return
            setTranslatedText('')
            setTranslationError(err instanceof Error ? err.message : 'Translation failed')
        } finally {
            if (!controller.signal.aborted) setIsTranslating(false)
        }
    }, [])

    /** Auto-translate with 500ms debounce on every keystroke / language change */
    useEffect(() => {
        if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current)
        abortRef.current?.abort()
        setIsTranslating(false)
        setTranslatedText('')
        setShowExplanation(false)

        if (!sourceText.trim()) {
            setTranslatedText('')
            return
        }

        if (!autoTranslate) return
        translateTimeoutRef.current = setTimeout(() => {
            doTranslate(sourceText, sourceLang, targetLang)
        }, 500)

        return () => {
            if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current)
            abortRef.current?.abort()
        }
    }, [sourceText, sourceLang, targetLang, doTranslate, autoTranslate])

    /** Manual translate button — immediate, no debounce */
    const handleTranslate = () => {
        if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current)
        void doTranslate(sourceText, sourceLang, targetLang, true)
    }

    const handleExplain = async () => {
        if (!translatedText) return
        setIsExplaining(true)
        setShowExplanation(true)
        setExplanationError(null)
        try {
            const res = await fetch(apiUrl('/api/explain'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: translatedText, level: studyLevel, language: targetLang }),
            })
            const data = await readApiResponse(res, ['explanation'])
            if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Explanation failed')
            setExplanation(data.explanation ?? '')
        } catch (err: unknown) {
            setExplanation('')
            setExplanationError(err instanceof Error ? err.message : 'Explanation failed. Please try again.')
        } finally {
            setIsExplaining(false)
        }
    }

    const requireAuth = (feature: string) => {
        setAuthFeature(feature)
        setAuthOpen(true)
    }

    const saveResult = async (kind: 'translation' | 'explanation') => {
        if (!user) {
            requireAuth(`Save ${kind}`)
            return
        }
        const content = kind === 'translation' ? translatedText : explanation
        if (!content) return
        await saveLibraryItem({
            type: kind,
            title: `${kind === 'translation' ? 'Translation' : 'Explanation'} · ${new Date().toLocaleDateString()}`,
            content,
            source_lang: sourceLang,
            target_lang: targetLang,
        })
    }

    return (
        <div className={embedded ? 'py-1' : 'min-h-screen bg-mint-50 py-5 sm:py-8'}>
            <div className={embedded ? 'max-w-4xl mx-auto' : 'max-w-4xl mx-auto px-3 sm:px-6'}>
                {!embedded && <div className="mb-5 sm:mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                            <Globe size={20} className="text-purple-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-navy-900">{t('tool.translate')}</h1>
                            <p className="text-sm text-gray-500">Faithfully translate between English, French, and Kinyarwanda</p>
                        </div>
                    </div>
                </div>}

                <div className="space-y-5">
                    {translationError && <p role="alert" className="text-sm text-red-700">{translationError}</p>}
                    {/* Main translation card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Text areas with language selectors and swap button between */}
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-start">
                            {/* Source column */}
                            <div className="p-3 sm:p-5">
                                {/* From language selector */}
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-sm text-gblue-600 font-semibold shrink-0">{t('translate.from')}</span>
                                    <div className="relative flex-1 min-w-0">
                                        <select
                                            value={sourceLang}
                                            onChange={(e) => setSourceLang(e.target.value as ContentLanguage)}
                                            className="input-field py-2 pr-8 appearance-none w-full"
                                            aria-label="Source language"
                                        >
                                            {LANG_OPTIONS.map((l) => (
                                                <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                <textarea
                                    value={sourceText}
                                    onChange={(e) => setSourceText(e.target.value.slice(0, 1000))}
                                    placeholder={t('translate.placeholder')}
                                    rows={6}
                                    className="textarea-field"
                                    aria-label="Source text"
                                />
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                                    <span className="text-xs text-gray-400">{sourceText.length}/1000</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(sourceText); setCopiedSrc(true); setTimeout(() => setCopiedSrc(false), 2000) }}
                                            className="text-xs text-gray-400 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                                        >
                                            <Copy size={11} /> {copiedSrc ? 'Copied!' : 'Copy'}
                                        </button>
                                        <button onClick={() => setSourceText('')} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Swap button — centered between textareas */}
                            <div className="hidden md:flex items-center justify-center self-center py-8">
                                <button
                                    onClick={swapLangs}
                                    className="p-2.5 rounded-full border-2 border-gblue-200 bg-gblue-50 hover:bg-gblue-100 hover:border-gblue-400 transition-all shadow-sm"
                                    aria-label={t('translate.swap')}
                                >
                                    <ArrowLeftRight size={18} className="text-gblue-600" />
                                </button>
                            </div>
                            {/* Mobile swap button */}
                            <div className="flex md:hidden items-center justify-center py-2">
                                <button
                                    onClick={swapLangs}
                                    className="p-2.5 rounded-full border-2 border-gblue-200 bg-gblue-50 hover:bg-gblue-100 hover:border-gblue-400 transition-all shadow-sm"
                                    aria-label={t('translate.swap')}
                                >
                                    <ArrowLeftRight size={18} className="text-gblue-600" />
                                </button>
                            </div>

                            {/* Target column */}
                            <div className="p-3 sm:p-5 bg-mint-50/50">
                                {/* To language selector */}
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-sm text-gblue-600 font-semibold shrink-0">{t('translate.to')}</span>
                                    <div className="relative flex-1 min-w-0">
                                        <select
                                            value={targetLang}
                                            onChange={(e) => setTargetLang(e.target.value as ContentLanguage)}
                                            className="input-field py-2 pr-8 appearance-none w-full"
                                            aria-label="Target language"
                                        >
                                            {LANG_OPTIONS.map((l) => (
                                                <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                {isTranslating ? (
                                    <div className="textarea-field min-h-[130px] flex items-center gap-2 text-gray-400 text-sm cursor-default">
                                        <span className="w-4 h-4 border-2 border-gblue-200 border-t-gblue-500 rounded-full animate-spin shrink-0" />
                                        Translating…
                                    </div>
                                ) : translatedText ? (
                                    <>
                                        <textarea
                                            value={translatedText}
                                            readOnly
                                            rows={6}
                                            className="textarea-field cursor-default"
                                            aria-label="Translated text"
                                        />
                                        {translationProvider.startsWith('local/') && <p className="text-xs text-gray-500 mt-2">Translated on this computer. No API credits needed. Review automatic translations for accuracy.</p>}
                                        {translationProvider === 'mymemory' && <p className="text-xs text-gray-500 mt-2">Translated by MyMemory. Free usage limits apply. {sourceLang === 'rw' || targetLang === 'rw' ? 'Kinyarwanda results can be inaccurate; review the translation carefully.' : 'Review automatic translations for accuracy.'}</p>}
                                        <TranslatedSpeech text={translatedText} sourceLanguage={targetLang} fixedLanguage={targetLang} />
                                        <div className="flex items-center gap-2 mt-2">
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(translatedText); setCopiedTgt(true); setTimeout(() => setCopiedTgt(false), 2000) }}
                                                className="text-xs text-gray-400 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                                            >
                                                <Copy size={12} /> {copiedTgt ? 'Copied!' : 'Copy'}
                                            </button>
                                            <button
                                                onClick={() => void saveResult('translation')}
                                                className="text-xs text-gray-400 hover:text-emerald-700 flex items-center gap-1 transition-colors ml-auto"
                                            >
                                                Save to Library
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="textarea-field min-h-[130px] flex items-center text-gray-400 cursor-default">
                                        Translation will appear here…
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action bar */}
                        <div className={cn(
                            'flex flex-wrap items-center gap-3 px-5 py-4 border-t border-gray-100',
                            'bg-gray-50/50'
                        )}>
                            <SpeechInput language={sourceLang} onText={setSourceText} />
                            <label className="flex items-center gap-2 text-xs text-gray-500"><input type="checkbox" checked={autoTranslate} onChange={event => setAutoTranslate(event.target.checked)} />Auto-translate as I type</label>
                            <Button
                                variant="primary"
                                size="md"
                                className="ml-auto"
                                icon={<Globe size={16} />}
                                loading={isTranslating}
                                onClick={handleTranslate}
                                disabled={!sourceText.trim()}
                            >
                                {t('translate.btn')}
                            </Button>
                            {translatedText && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={<CheckSquare size={14} />}
                                    onClick={handleExplain}
                                >
                                    {t('translate.explain')}
                                    <Info size={12} className="text-gray-400 ml-0.5" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Level Explanation panel */}
                    {showExplanation && (
                        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-sm font-bold text-navy-900">Level Explanation</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        <span className="capitalize text-emerald-700 font-semibold">{studyLevel}</span> level · {LANG_OPTIONS.find((item) => item.code === targetLang)?.label}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon={<Copy size={12} />}
                                        disabled={!explanation}
                                        onClick={() => navigator.clipboard.writeText(explanation)}
                                    >
                                        Copy
                                    </Button>
                                    
                                </div>
                            </div>
                            {isExplaining ? (
                                <div className="flex items-center gap-2 py-4">
                                    <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                                    <span className="text-sm text-gray-500">Generating explanation…</span>
                                </div>
                            ) : explanationError ? (
                                <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700" role="alert">
                                    {explanationError}
                                </div>
                            ) : (
                                <p className="text-sm text-navy-900 leading-relaxed">{explanation}</p>
                            )}
                            <TranslatedSpeech text={explanation} sourceLanguage={targetLang} fixedLanguage={targetLang} />
                            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                                <Button variant="secondary" size="sm" icon={<Zap size={12} />} onClick={() => void saveResult('explanation')}>
                                    Save to Library
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {authOpen && (
                <AuthDialog
                    onClose={() => setAuthOpen(false)}
                    onCreateAccount={() => { setAuthOpen(false); window.location.href = '/auth/signup' }}
                    onSignIn={() => { setAuthOpen(false); window.location.href = '/auth/signin' }}
                    featureMessage={`Sign in to: ${authFeature}. Download your audio, upload study materials, and keep your work together.`}
                />
            )}
        </div>
    )
}
