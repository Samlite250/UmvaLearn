import { readApiResponse } from '@/lib/apiResponse'
import { speechVoice, speak } from '@/lib/browserSpeech'
import { translateForFree } from '@/lib/freeTranslation'
import { useEffect, useRef, useState } from 'react'
import { apiUrl } from '@/lib/api'
import type { ContentLanguage } from '@/lib/types'

export function TranslatedSpeech({ text, sourceLanguage, fixedLanguage }: { text: string; sourceLanguage: ContentLanguage; fixedLanguage?: ContentLanguage }) {
    const [target, setTarget] = useState<ContentLanguage>(sourceLanguage)
    const language = fixedLanguage ?? target
    const [output, setOutput] = useState('')
    const [url, setUrl] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null)
    const [speaking, setSpeaking] = useState(false)
    const request = useRef<AbortController | null>(null)
    useEffect(() => {
        request.current?.abort()
        window.speechSynthesis?.cancel()
        setVoice(null); setSpeaking(false)
        setOutput(''); setUrl(''); setError(''); setBusy(false)
        return () => { request.current?.abort(); window.speechSynthesis?.cancel() }
    }, [text, sourceLanguage, language])
    useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
    const generate = async () => {
        request.current?.abort()
        const controller = new AbortController()
        request.current = controller
        window.speechSynthesis?.cancel()
        setVoice(null); setSpeaking(false)
        setBusy(true); setError(''); setUrl('')
        const post = async (path: `/api/${string}`, body: unknown) => {
            const res = await fetch(apiUrl(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal })
            const data = await readApiResponse(res, path === '/api/tts' ? ['audioBase64', 'audioMimeType'] : ['translatedText'])
            if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Unable to generate speech. Please try again.')
            return data
        }
        try {
            const spoken = await translateForFree(text, sourceLanguage, language, controller.signal)
            if (controller.signal.aborted) return
            setOutput(spoken)
            if (spoken.length > 5000) throw new Error('Spoken output is limited to 5,000 characters. Shorten the text and try again.')
            const localVoice = await speechVoice(language)
            if (controller.signal.aborted) return
            if (localVoice) { setVoice(localVoice); return }
            if (language !== 'rw') throw new Error('Install a matching English or French speech voice in your device settings to listen for free.')
            const data = await post('/api/tts', { text: spoken, language })
            if (controller.signal.aborted) return
            const bytes = Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))
            setUrl(URL.createObjectURL(new Blob([bytes], { type: data.audioMimeType })))
        } catch (reason) {
            if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to generate speech.')
        } finally { if (!controller.signal.aborted) setBusy(false) }
    }
    return <div className="space-y-3 mt-4">
        {language !== sourceLanguage && (language === 'rw' || sourceLanguage === 'rw') && <p className="text-xs text-gray-500">Translation sends text to MyMemory. Daily free limits apply.</p>}
        {!fixedLanguage && <label className="block text-sm text-gray-600">Listen in
            <select className="input-field mt-2" value={target} onChange={e => setTarget(e.target.value as ContentLanguage)}>
                <option value="en">English</option><option value="fr">French</option><option value="rw">Kinyarwanda</option>
            </select>
        </label>}
        <button className="text-sm font-semibold text-emerald-700" disabled={busy || !text.trim()} onClick={() => void generate()}>{busy ? 'Preparing audio…' : 'Generate spoken output'}</button>
        {busy && <button className="ml-3 text-sm text-emerald-700" onClick={() => { request.current?.abort(); setBusy(false) }}>Cancel</button>}
        {output && !fixedLanguage && <p className="text-sm whitespace-pre-wrap" lang={language}>{output}</p>}
        {url && <audio key={url} src={url} controls className="w-full" aria-label="Spoken output" />}
        {voice && <button className="text-sm font-semibold text-emerald-700" onClick={() => {
            if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false) }
            else { setSpeaking(true); speak(output, voice, () => setSpeaking(false), () => { setSpeaking(false); setError('Speech playback failed. Please retry.') }) }
        }}>{speaking ? 'Stop speaking' : 'Play speech'}</button>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
}
